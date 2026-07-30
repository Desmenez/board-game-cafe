import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Player, TtrAction, TtrPlayerView, TtrTrainColor } from 'shared';
import { TTR_TRAIN_COLORS, getTtrMap, ttrMapIndex } from 'shared';
import { ticketToRideGame, type TtrState } from '../src/games/ticket-to-ride/engine.js';

const MAP = getTtrMap('united-states');

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    avatar: { style: 'adventurer', seed: `p${i + 1}` },
    connected: true,
  })) as Player[];
}

function emptyHand(): Record<TtrTrainColor, number> {
  return Object.fromEntries(TTR_TRAIN_COLORS.map((c) => [c, 0])) as Record<TtrTrainColor, number>;
}

/**
 * Deterministic mid-game state: fixed seating, empty hands, no tickets, nothing claimed.
 * Tests hand-place exactly the cards they need.
 */
function playingState(n: number): TtrState {
  const s = ticketToRideGame.setup(makePlayers(n)) as TtrState;
  s.phase = 'playing';
  s.currentTurnIndex = 0;
  s.playerOrder = makePlayers(n).map((p) => p.id);
  for (const pid of s.playerOrder) {
    s.hand[pid] = emptyHand();
    s.tickets[pid] = [];
    s.pendingInitialChoices[pid] = null;
    s.pendingTicketChoiceByPlayer[pid] = null;
    s.completedTicketIdsByPlayer[pid] = [];
    s.trainsLeft[pid] = MAP.trainsPerPlayer;
    s.scores[pid] = 0;
  }
  s.pendingSecondTrainDrawPlayerId = null;
  s.faceUpTrainCards = ['red', 'red', 'blue', 'blue', 'green'];
  return s;
}

function view(s: TtrState, pid: string): TtrPlayerView {
  return ticketToRideGame.getPlayerView(s, pid);
}

function act(s: TtrState, pid: string, action: TtrAction): TtrState {
  return ticketToRideGame.onAction(s, pid, action) as TtrState;
}

describe('Ticket to Ride — map data', () => {
  it('routes and tickets only reference declared cities', () => {
    const cityIds = new Set(MAP.cities.map((c) => c.id));
    for (const r of MAP.routes) {
      assert.ok(cityIds.has(r.a), `unknown city ${r.a} in ${r.id}`);
      assert.ok(cityIds.has(r.b), `unknown city ${r.b} in ${r.id}`);
      assert.ok(MAP.routePoints[r.length] != null, `no score for length ${r.length}`);
    }
    for (const t of MAP.destinationTickets) {
      assert.ok(cityIds.has(t.a), `unknown city ${t.a} in ticket ${t.id}`);
      assert.ok(cityIds.has(t.b), `unknown city ${t.b} in ticket ${t.id}`);
    }
  });

  it('route ids are unique and grouped by city pair', () => {
    const ids = new Set(MAP.routes.map((r) => r.id));
    assert.equal(ids.size, MAP.routes.length);
    const { routeIdsByGroup } = ttrMapIndex(MAP);
    for (const r of MAP.routes) {
      assert.ok(routeIdsByGroup[r.groupId]?.includes(r.id));
      assert.ok((routeIdsByGroup[r.groupId]?.length ?? 0) <= 2, `${r.groupId} has 3+ tracks`);
    }
  });
});

describe('Ticket to Ride — claim options', () => {
  it('offers every locomotive substitution for a coloured route', () => {
    const s = playingState(4);
    s.hand.p1.yellow = 6;
    s.hand.p1.locomotive = 2;
    // sea-hel is a 6-length yellow route.
    const options = view(s, 'p1').claimOptions['sea-hel'] ?? [];
    assert.deepEqual(
      options.map((o) => `${o.color}:${o.colorCards}+${o.locomotives}`),
      ['yellow:6+0', 'yellow:5+1', 'yellow:4+2'],
    );
  });

  it('offers every colour for a gray route', () => {
    const s = playingState(4);
    s.hand.p1.red = 2;
    s.hand.p1.blue = 2;
    const options = view(s, 'p1').claimOptions['sfe-den'] ?? [];
    const colors = new Set(options.map((o) => o.color));
    assert.deepEqual([...colors].sort(), ['blue', 'red']);
  });

  it('drops routes the player has too few trains for', () => {
    const s = playingState(4);
    s.hand.p1.yellow = 6;
    s.trainsLeft.p1 = 5;
    assert.equal(view(s, 'p1').claimOptions['sea-hel'], undefined);
  });

  it('is empty while it is not your turn', () => {
    const s = playingState(4);
    s.hand.p2.yellow = 6;
    assert.deepEqual(view(s, 'p2').claimOptions, {});
  });

  it('closes the sibling track in a 3-player game only', () => {
    const three = playingState(3);
    three.hand.p1.red = 2;
    three.routeOwner['ny-bos-1'] = 'p2';
    assert.equal(view(three, 'p1').claimOptions['ny-bos-2'], undefined);

    const four = playingState(4);
    four.hand.p1.red = 2;
    four.routeOwner['ny-bos-1'] = 'p2';
    assert.ok((view(four, 'p1').claimOptions['ny-bos-2'] ?? []).length > 0);
  });

  it('never lets one player own both tracks of a pair', () => {
    const s = playingState(4);
    s.hand.p1.red = 2;
    s.routeOwner['ny-bos-1'] = 'p1';
    assert.equal(view(s, 'p1').claimOptions['ny-bos-2'], undefined);
  });
});

describe('Ticket to Ride — claiming', () => {
  it('spends the exact cards, scores the route and advances the turn', () => {
    let s = playingState(4);
    s.hand.p1.yellow = 5;
    s.hand.p1.locomotive = 1;
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: 'sea-hel',
      color: 'yellow',
      locomotivesUsed: 1,
    });

    assert.equal(s.routeOwner['sea-hel'], 'p1');
    assert.equal(s.hand.p1.yellow, 0);
    assert.equal(s.hand.p1.locomotive, 0);
    assert.equal(s.scores.p1, MAP.routePoints[6]);
    assert.equal(s.trainsLeft.p1, MAP.trainsPerPlayer - 6);
    assert.equal(s.trainDiscard.length, 6);
    assert.equal(s.playerOrder[s.currentTurnIndex], 'p2');
  });

  it('rejects a payment the server did not offer', () => {
    const s = playingState(4);
    s.hand.p1.yellow = 4;
    s.hand.p1.locomotive = 1;
    assert.throws(() =>
      act(s, 'p1', {
        type: 'claim_route',
        routeId: 'sea-hel',
        color: 'yellow',
        locomotivesUsed: 1,
      }),
    );
  });

  it('rejects claiming a route somebody already owns', () => {
    const s = playingState(4);
    s.hand.p1.yellow = 6;
    s.routeOwner['sea-hel'] = 'p3';
    assert.throws(() =>
      act(s, 'p1', {
        type: 'claim_route',
        routeId: 'sea-hel',
        color: 'yellow',
        locomotivesUsed: 0,
      }),
    );
  });
});

describe('Ticket to Ride — drawing train cards', () => {
  it('needs a second card before the turn passes', () => {
    let s = playingState(4);
    s.faceUpTrainCards = ['red', 'blue', 'green', 'white', 'black'];
    s = act(s, 'p1', { type: 'draw_train_cards', first: { source: 'face_up', index: 0 } });
    assert.equal(s.pendingSecondTrainDrawPlayerId, 'p1');
    assert.equal(s.playerOrder[s.currentTurnIndex], 'p1');
    assert.equal(view(s, 'p1').mustDrawSecondTrainCard, true);
    assert.deepEqual(view(s, 'p2').trainDrawNotice, {
      playerId: 'p1',
      playerName: 'Player 1',
      cards: [{ source: 'face_up', color: 'red' }],
    });

    s = act(s, 'p1', { type: 'draw_train_cards', first: { source: 'deck' } });
    assert.equal(s.pendingSecondTrainDrawPlayerId, null);
    assert.equal(s.playerOrder[s.currentTurnIndex], 'p2');
    assert.deepEqual(view(s, 'p2').trainDrawNotice, {
      playerId: 'p1',
      playerName: 'Player 1',
      cards: [{ source: 'deck' }],
    });
  });

  it('ends the turn immediately on a face-up locomotive', () => {
    let s = playingState(4);
    s.faceUpTrainCards = ['locomotive', 'blue', 'green', 'white', 'black'];
    s = act(s, 'p1', { type: 'draw_train_cards', first: { source: 'face_up', index: 0 } });
    assert.equal(s.hand.p1.locomotive, 1);
    assert.equal(s.pendingSecondTrainDrawPlayerId, null);
    assert.equal(s.playerOrder[s.currentTurnIndex], 'p2');
  });

  it('forbids a face-up locomotive as the second card', () => {
    let s = playingState(4);
    s.faceUpTrainCards = ['red', 'locomotive', 'green', 'white', 'black'];
    s = act(s, 'p1', { type: 'draw_train_cards', first: { source: 'face_up', index: 0 } });
    assert.throws(() =>
      act(s, 'p1', { type: 'draw_train_cards', first: { source: 'face_up', index: 0 } }),
    );
  });

  it('blocks claiming while a second draw is owed', () => {
    let s = playingState(4);
    s.faceUpTrainCards = ['red', 'blue', 'green', 'white', 'black'];
    s.hand.p1.yellow = 6;
    s = act(s, 'p1', { type: 'draw_train_cards', first: { source: 'deck' } });
    assert.throws(() =>
      act(s, 'p1', {
        type: 'claim_route',
        routeId: 'sea-hel',
        color: 'yellow',
        locomotivesUsed: 0,
      }),
    );
  });
});

describe('Ticket to Ride — endgame', () => {
  it('starts the final countdown and scores tickets and longest path', () => {
    let s = playingState(2);
    s.trainsLeft.p1 = 6;
    s.hand.p1.yellow = 6;
    s.tickets.p1 = [{ id: 'sea-hel-test', a: 'seattle', b: 'helena', points: 5 }];
    s.tickets.p2 = [{ id: 'impossible', a: 'miami', b: 'vancouver', points: 20 }];

    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: 'sea-hel',
      color: 'yellow',
      locomotivesUsed: 0,
    });
    assert.equal(s.trainsLeft.p1, 0);
    assert.equal(s.finalTurnsRemaining, 2);

    s.hand.p2.red = 2;
    s = act(s, 'p2', {
      type: 'claim_route',
      routeId: 'ny-bos-2',
      color: 'red',
      locomotivesUsed: 0,
    });
    assert.equal(s.phase, 'playing');
    assert.equal(s.finalTurnsRemaining, 1);

    // The player who triggered the countdown still gets one closing turn.
    s = act(s, 'p1', {
      type: 'draw_train_cards',
      first: { source: 'deck' },
      second: { source: 'deck' },
    });
    assert.equal(s.phase, 'game_over');

    const rows = Object.fromEntries((s.finalScoreSummary ?? []).map((r) => [r.playerId, r]));
    assert.equal(rows.p1?.completedTicketPoints, 5);
    assert.equal(rows.p1?.longestPathBonus, MAP.rules.longestPathBonus);
    assert.equal(rows.p2?.failedTicketPenalty, -20);
    assert.equal(rows.p2?.longestPathBonus, 0);
    assert.deepEqual(s.result?.winners, ['p1']);
  });
});

describe('Ticket to Ride — setup', () => {
  it('deals the map-defined opening hand and ticket choice', () => {
    const s = ticketToRideGame.setup(makePlayers(3)) as TtrState;
    assert.equal(s.phase, 'initial_tickets');
    assert.equal(s.faceUpTrainCards.length, MAP.rules.faceUpCount);
    for (const pid of s.playerOrder) {
      const total = TTR_TRAIN_COLORS.reduce((sum, c) => sum + s.hand[pid][c], 0);
      assert.equal(total, MAP.setup.trainCards);
      assert.equal(s.pendingInitialChoices[pid]?.length, MAP.setup.initialTickets);
    }
  });

  it('rejects keeping fewer starting tickets than the map allows', () => {
    const s = ticketToRideGame.setup(makePlayers(2)) as TtrState;
    assert.throws(() => act(s, 'p1', { type: 'keep_initial_tickets', keepIds: [] }));
  });
});
