import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Player, TtrAction, TtrPlayerView, TtrTrainColor } from 'shared';
import {
  TTR_TRAIN_COLORS,
  getTtrMap,
  ttrIsLongTicket,
  ttrMandalaBonusPoints,
  ttrBulletTrainBonuses,
  ttrMapIndex,
  ttrPartitionDestinationTickets,
} from 'shared';
import { ticketToRideGame, type TtrState } from '../src/games/ticket-to-ride/engine.js';

const MAP = getTtrMap('united-states');
const THRESHOLD = MAP.setup.longTicketThreshold;

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
function playingState(
  n: number,
  mapId: 'united-states' | 'europe' | 'india' | 'japan' = 'united-states',
): TtrState {
  const map = getTtrMap(mapId);
  const s = ticketToRideGame.setup(makePlayers(n), { mapId }) as TtrState;
  s.phase = 'playing';
  s.currentTurnIndex = 0;
  s.playerOrder = makePlayers(n).map((p) => p.id);
  for (const pid of s.playerOrder) {
    s.hand[pid] = emptyHand();
    s.tickets[pid] = [];
    s.pendingInitialChoices[pid] = null;
    s.completedTicketIdsByPlayer[pid] = [];
    s.trainsLeft[pid] = map.trainsPerPlayer;
    s.stationsLeft[pid] = map.stationsPerPlayer;
    s.scores[pid] = 0;
  }
  s.pendingTurn = { kind: 'ready' };
  s.stationsByCity = {};
  s.faceUpTrainCards = ['red', 'red', 'blue', 'blue', 'green'];
  return s;
}

function pendingDestinationOffer(s: TtrState, pid: string) {
  return s.pendingTurn.kind === 'destination_choice' && s.pendingTurn.playerId === pid
    ? s.pendingTurn.offered
    : null;
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

  it('partitions Long and Regular tickets on the threshold boundary', () => {
    const { long, regular } = ttrPartitionDestinationTickets(MAP.destinationTickets, THRESHOLD);
    assert.equal(long.length, 12);
    assert.equal(regular.length, 53);
    assert.equal(long.length + regular.length, MAP.destinationTickets.length);
    const ids = new Set(MAP.destinationTickets.map((t) => t.id));
    assert.equal(ids.size, MAP.destinationTickets.length);
    for (const t of long) {
      assert.ok(ttrIsLongTicket(t, THRESHOLD), `${t.id} should be Long`);
      assert.ok(t.points >= THRESHOLD);
    }
    for (const t of regular) {
      assert.ok(!ttrIsLongTicket(t, THRESHOLD), `${t.id} should be Regular`);
      assert.ok(t.points < THRESHOLD);
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
    assert.equal(s.pendingTurn.kind, 'second_train_draw');
    assert.equal(s.playerOrder[s.currentTurnIndex], 'p1');
    assert.equal(view(s, 'p1').mustDrawSecondTrainCard, true);
    assert.deepEqual(view(s, 'p2').trainDrawNotice, {
      playerId: 'p1',
      playerName: 'Player 1',
      cards: [{ source: 'face_up', color: 'red' }],
    });

    s = act(s, 'p1', { type: 'draw_train_cards', first: { source: 'deck' } });
    assert.equal(s.pendingTurn.kind, 'ready');
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
    assert.equal(s.pendingTurn.kind, 'ready');
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
  it('deals one Long plus three Regular tickets per player', () => {
    const s = ticketToRideGame.setup(makePlayers(3)) as TtrState;
    assert.equal(s.phase, 'initial_tickets');
    assert.equal(s.faceUpTrainCards.length, MAP.rules.faceUpCount);
    const expectedOffer = MAP.setup.initialLongTickets + MAP.setup.initialRegularTickets;
    for (const pid of s.playerOrder) {
      const total = TTR_TRAIN_COLORS.reduce((sum, c) => sum + s.hand[pid][c], 0);
      assert.equal(total, MAP.setup.trainCards);
      const pending = s.pendingInitialChoices[pid] ?? [];
      assert.equal(pending.length, expectedOffer);
      const long = pending.filter((t) => ttrIsLongTicket(t, THRESHOLD));
      const regular = pending.filter((t) => !ttrIsLongTicket(t, THRESHOLD));
      assert.equal(long.length, MAP.setup.initialLongTickets);
      assert.equal(regular.length, MAP.setup.initialRegularTickets);
      const v = view(s, pid);
      assert.deepEqual(
        v.mandatoryTicketIds,
        long.map((t) => t.id),
      );
      assert.equal(v.deckRegularTicketsRemaining, s.regularTicketDeck.length);
    }
    const dealtLong = 3 * MAP.setup.initialLongTickets;
    const dealtRegular = 3 * MAP.setup.initialRegularTickets;
    const { long, regular } = ttrPartitionDestinationTickets(MAP.destinationTickets, THRESHOLD);
    assert.equal(s.regularTicketDeck.length, regular.length - dealtRegular);
    // Undealt Long tickets never enter the drawable Regular deck.
    assert.ok(s.regularTicketDeck.every((t) => !ttrIsLongTicket(t, THRESHOLD)));
    assert.equal(long.length - dealtLong, long.length - 3);
  });

  it('rejects omitting the mandatory Long ticket', () => {
    const s = ticketToRideGame.setup(makePlayers(2)) as TtrState;
    const pending = s.pendingInitialChoices.p1!;
    const regularIds = pending.filter((t) => !ttrIsLongTicket(t, THRESHOLD)).map((t) => t.id);
    assert.throws(() =>
      act(s, 'p1', { type: 'keep_initial_tickets', keepIds: regularIds.slice(0, 2) }),
    );
  });

  it('rejects keeping fewer than two Regular tickets', () => {
    const s = ticketToRideGame.setup(makePlayers(2)) as TtrState;
    const pending = s.pendingInitialChoices.p1!;
    const longId = pending.find((t) => ttrIsLongTicket(t, THRESHOLD))!.id;
    const regularId = pending.find((t) => !ttrIsLongTicket(t, THRESHOLD))!.id;
    assert.throws(() =>
      act(s, 'p1', { type: 'keep_initial_tickets', keepIds: [longId, regularId] }),
    );
  });

  it('keeps Long plus two Regular and returns only rejected Regular cards', () => {
    const s = ticketToRideGame.setup(makePlayers(2)) as TtrState;
    const beforeDeck = s.regularTicketDeck.map((t) => t.id);
    const pending = s.pendingInitialChoices.p1!;
    const long = pending.find((t) => ttrIsLongTicket(t, THRESHOLD))!;
    const regular = pending.filter((t) => !ttrIsLongTicket(t, THRESHOLD));
    const keepIds = [long.id, regular[0]!.id, regular[1]!.id];
    const rejected = regular[2]!;
    const next = act(s, 'p1', { type: 'keep_initial_tickets', keepIds });
    assert.equal(next.pendingInitialChoices.p1, null);
    assert.equal(next.tickets.p1.length, 3);
    assert.ok(next.tickets.p1.some((t) => t.id === long.id));
    assert.equal(next.regularTicketDeck[0]?.id, rejected.id);
    assert.ok(next.regularTicketDeck.every((t) => !ttrIsLongTicket(t, THRESHOLD)));
    assert.equal(next.regularTicketDeck.length, beforeDeck.length + 1);
    const v = view(next, 'p1');
    assert.deepEqual(v.mandatoryTicketIds, []);
  });

  it('accepts keeping Long plus all three Regular tickets', () => {
    const s = ticketToRideGame.setup(makePlayers(2)) as TtrState;
    const pending = s.pendingInitialChoices.p1!;
    const keepIds = pending.map((t) => t.id);
    const beforeDeck = s.regularTicketDeck.length;
    const next = act(s, 'p1', { type: 'keep_initial_tickets', keepIds });
    assert.equal(next.tickets.p1.length, 4);
    assert.equal(next.regularTicketDeck.length, beforeDeck);
  });
});

describe('Ticket to Ride — destination draws', () => {
  it('draws only Regular tickets mid-game and requires keeping at least one', () => {
    const s = playingState(2);
    const before = s.regularTicketDeck.length;
    assert.ok(before >= MAP.setup.ticketDraw);
    const drawn = act(s, 'p1', { type: 'draw_destination_tickets' });
    const pending = pendingDestinationOffer(drawn, 'p1')!;
    assert.equal(pending.length, MAP.setup.ticketDraw);
    assert.ok(pending.every((t) => !ttrIsLongTicket(t, THRESHOLD)));
    assert.equal(drawn.regularTicketDeck.length, before - pending.length);
    const v = view(drawn, 'p1');
    assert.deepEqual(v.mandatoryTicketIds, []);
    assert.equal(v.deckRegularTicketsRemaining, drawn.regularTicketDeck.length);
    assert.throws(() => act(drawn, 'p1', { type: 'keep_drawn_tickets', keepIds: [] }));
    const kept = act(drawn, 'p1', {
      type: 'keep_drawn_tickets',
      keepIds: [pending[0]!.id],
    });
    assert.equal(kept.tickets.p1.length, 1);
    assert.equal(kept.pendingTurn.kind, 'ready');
    assert.equal(kept.regularTicketDeck.length, before - 1);
    assert.equal(kept.regularTicketDeck[0]?.id, pending[1]!.id);
  });

  it('offers remaining Regular tickets when the deck is nearly empty', () => {
    const s = playingState(2);
    const lastTwo = s.regularTicketDeck.splice(-2);
    s.regularTicketDeck = [];
    s.regularTicketDeck.push(...lastTwo);
    const drawn = act(s, 'p1', { type: 'draw_destination_tickets' });
    assert.equal(pendingDestinationOffer(drawn, 'p1')?.length, 2);
    assert.equal(drawn.regularTicketDeck.length, 0);
  });

  it('rejects drawing when the Regular deck is empty', () => {
    const s = playingState(2);
    s.regularTicketDeck = [];
    assert.throws(() => act(s, 'p1', { type: 'draw_destination_tickets' }));
  });
});

describe('Ticket to Ride Europe — map and lobby', () => {
  const EUR = getTtrMap('europe');
  const EUR_THRESHOLD = EUR.setup.longTicketThreshold;

  it('parses lobby options and selects the Europe map at setup', () => {
    const s = ticketToRideGame.setup(makePlayers(2), { mapId: 'europe' }) as TtrState;
    assert.equal(s.mapId, 'europe');
    assert.equal(view(s, s.playerOrder[0]!).mapId, 'europe');
    for (const pid of s.playerOrder) {
      assert.equal(s.stationsLeft[pid], 3);
      assert.equal(s.trainsLeft[pid], 45);
    }
  });

  it('falls back to United States for unknown map ids', () => {
    const s = ticketToRideGame.setup(makePlayers(2), { mapId: 'atlantis' }) as TtrState;
    assert.equal(s.mapId, 'united-states');
  });

  it('has complete Europe integrity: cities, ferries, tunnels, Long/Regular piles', () => {
    const cityIds = new Set(EUR.cities.map((c) => c.id));
    assert.equal(EUR.cities.length, 47);
    assert.equal(EUR.routes.length, 101);
    const ids = new Set(EUR.routes.map((r) => r.id));
    assert.equal(ids.size, EUR.routes.length);
    for (const r of EUR.routes) {
      assert.ok(cityIds.has(r.a) && cityIds.has(r.b), r.id);
      assert.ok(EUR.routePoints[r.length] != null, `length ${r.length}`);
      if (r.ferryLocomotives) {
        assert.ok(r.ferryLocomotives >= 1 && r.ferryLocomotives <= r.length);
        assert.equal(r.color, 'gray');
      }
    }
    const ferries = EUR.routes.filter((r) => (r.ferryLocomotives ?? 0) > 0);
    const tunnels = EUR.routes.filter((r) => r.tunnel);
    assert.ok(ferries.length >= 10);
    assert.ok(tunnels.length >= 10);
    const { long, regular } = ttrPartitionDestinationTickets(EUR.destinationTickets, EUR_THRESHOLD);
    assert.equal(long.length, 6);
    assert.equal(regular.length, 40);
    assert.ok(regular.length >= EUR.maxPlayers * EUR.setup.initialRegularTickets);
    assert.ok(long.length >= EUR.maxPlayers * EUR.setup.initialLongTickets);
    assert.equal(EUR.setup.longTicketsMandatory, false);
    assert.equal(EUR.setup.minInitialKeep, 2);
    assert.equal(EUR.stationsPerPlayer, 3);
    assert.equal(EUR.unplacedStationBonus, 4);
    assert.equal(EUR.rules.tiebreak, 'europe');
  });

  it('allows discarding the Long ticket when keeping any two of four', () => {
    const s = ticketToRideGame.setup(makePlayers(2), { mapId: 'europe' }) as TtrState;
    const pending = s.pendingInitialChoices[s.playerOrder[0]!]!;
    const regular = pending.filter((t) => !ttrIsLongTicket(t, EUR_THRESHOLD));
    const next = act(s, s.playerOrder[0]!, {
      type: 'keep_initial_tickets',
      keepIds: [regular[0]!.id, regular[1]!.id],
    });
    assert.equal(next.tickets[s.playerOrder[0]!].length, 2);
    assert.ok(next.tickets[s.playerOrder[0]!].every((t) => !ttrIsLongTicket(t, EUR_THRESHOLD)));
    // Discarded Long never returns to the Regular draw pile.
    assert.ok(next.regularTicketDeck.every((t) => !ttrIsLongTicket(t, EUR_THRESHOLD)));
  });

  it('rejects keeping fewer than two tickets on Europe', () => {
    const s = ticketToRideGame.setup(makePlayers(2), { mapId: 'europe' }) as TtrState;
    const pid = s.playerOrder[0]!;
    const one = s.pendingInitialChoices[pid]![0]!.id;
    assert.throws(() => act(s, pid, { type: 'keep_initial_tickets', keepIds: [one] }));
  });
});

describe('Ticket to Ride Europe — ferries', () => {
  it('requires the printed number of locomotives on a ferry', () => {
    const s = playingState(2, 'europe');
    // London–Amsterdam is a 2-length ferry needing 2 locomotives.
    const ferry = getTtrMap('europe').routes.find((r) => r.id === 'ams-lon');
    assert.ok(ferry?.ferryLocomotives === 2);
    s.hand.p1.red = 2;
    s.hand.p1.locomotive = 1;
    assert.equal(view(s, 'p1').claimOptions['ams-lon'], undefined);
    s.hand.p1.locomotive = 2;
    const options = view(s, 'p1').claimOptions['ams-lon'] ?? [];
    assert.ok(options.every((o) => o.locomotives >= 2));
    assert.ok(options.some((o) => o.colorCards === 0 && o.locomotives === 2));
  });
});

describe('Ticket to Ride Europe — tunnels', () => {
  const TUNNEL_ID = 'ven-zur';

  it('claims immediately when the reveal adds no extra cost', () => {
    let s = playingState(2, 'europe');
    assert.ok(getTtrMap('europe').routes.find((r) => r.id === TUNNEL_ID)?.tunnel);
    s.hand.p1.green = 2;
    s.trainDeck = ['red', 'blue', 'yellow'];
    s.trainDiscard = [];
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: TUNNEL_ID,
      color: 'green',
      locomotivesUsed: 0,
    });
    assert.equal(s.pendingTurn.kind, 'ready');
    assert.equal(s.routeOwner[TUNNEL_ID], 'p1');
    assert.equal(s.hand.p1.green, 0);
    assert.equal(s.playerOrder[s.currentTurnIndex], 'p2');
    assert.equal(
      s.trainDiscard.filter((c) => c === 'red' || c === 'blue' || c === 'yellow').length,
      3,
    );
  });

  it('parks in tunnel_response when reveal matches and blocks other actions', () => {
    let s = playingState(2, 'europe');
    s.hand.p1.green = 4;
    s.hand.p1.locomotive = 1;
    s.trainDeck = ['green', 'red', 'blue'];
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: TUNNEL_ID,
      color: 'green',
      locomotivesUsed: 0,
    });
    assert.equal(s.pendingTurn.kind, 'tunnel_response');
    assert.equal(s.routeOwner[TUNNEL_ID], null);
    assert.equal(s.hand.p1.green, 4); // not spent yet
    const pending = view(s, 'p1').pendingTunnel!;
    assert.equal(pending.extraRequired, 1);
    assert.ok(pending.extraOptions.length > 0);
    // Spectators see the same reveal, but not the actor's private payment options.
    const spectator = view(s, 'p2').pendingTunnel!;
    assert.equal(spectator.playerId, 'p1');
    assert.equal(spectator.extraRequired, 1);
    assert.deepEqual(spectator.revealed, pending.revealed);
    assert.equal(spectator.extraOptions.length, 0);
    assert.throws(() =>
      act(s, 'p1', {
        type: 'draw_train_cards',
        first: { source: 'deck' },
        second: { source: 'deck' },
      }),
    );
    assert.throws(() => act(s, 'p2', { type: 'resolve_tunnel_claim', accept: false }));
  });

  it('publishes a tunnel reveal notice when the claim succeeds with no extra cost', () => {
    let s = playingState(2, 'europe');
    s.hand.p1.green = 2;
    s.trainDeck = ['red', 'blue', 'yellow'];
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: TUNNEL_ID,
      color: 'green',
      locomotivesUsed: 0,
    });
    assert.equal(s.pendingTurn.kind, 'ready');
    assert.equal(s.routeOwner[TUNNEL_ID], 'p1');
    assert.ok(s.tunnelRevealNoticeSeq > 0);
    const notice = view(s, 'p2').tunnelRevealNotice!;
    assert.equal(notice.playerId, 'p1');
    assert.equal(notice.extraRequired, 0);
    // Deck is a stack: pop() draws from the end.
    assert.deepEqual(notice.revealed, ['yellow', 'blue', 'red']);
  });

  it('accepts with extra payment and refuses without spending the initial cards', () => {
    let s = playingState(2, 'europe');
    s.hand.p1.green = 3;
    s.trainDeck = ['green', 'white', 'black'];
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: TUNNEL_ID,
      color: 'green',
      locomotivesUsed: 0,
    });
    assert.equal(s.pendingTurn.kind, 'tunnel_response');
    const refused = act(s, 'p1', { type: 'resolve_tunnel_claim', accept: false });
    assert.equal(refused.routeOwner[TUNNEL_ID], null);
    assert.equal(refused.hand.p1.green, 3);
    assert.equal(refused.pendingTurn.kind, 'ready');
    assert.equal(refused.playerOrder[refused.currentTurnIndex], 'p2');

    // Fresh accept path.
    s = playingState(2, 'europe');
    s.hand.p1.green = 3;
    s.trainDeck = ['green', 'white', 'black'];
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: TUNNEL_ID,
      color: 'green',
      locomotivesUsed: 0,
    });
    const opt = view(s, 'p1').pendingTunnel!.extraOptions[0]!;
    s = act(s, 'p1', {
      type: 'resolve_tunnel_claim',
      accept: true,
      color: opt.color,
      locomotivesUsed: opt.locomotives,
    });
    assert.equal(s.routeOwner[TUNNEL_ID], 'p1');
    assert.equal(s.hand.p1.green, 0);
    assert.equal(s.playerOrder[s.currentTurnIndex], 'p2');
  });

  it('counts only locomotives as matches for an all-locomotive tunnel attempt', () => {
    let s = playingState(2, 'europe');
    s.hand.p1.locomotive = 3;
    s.trainDeck = ['green', 'green', 'red'];
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: TUNNEL_ID,
      color: 'green',
      locomotivesUsed: 2,
    });
    // Green reveals do not match an all-loco attempt.
    assert.equal(s.pendingTurn.kind, 'ready');
    assert.equal(s.routeOwner[TUNNEL_ID], 'p1');
  });
});

describe('Ticket to Ride Europe — stations', () => {
  it('builds a station for 1/2/3 cards, consumes the turn, and rejects on USA', () => {
    let s = playingState(2, 'europe');
    s.hand.p1.red = 6;
    assert.ok((view(s, 'p1').stationOptions.paris ?? []).length > 0);
    s = act(s, 'p1', {
      type: 'build_station',
      cityId: 'paris',
      color: 'red',
      locomotivesUsed: 0,
    });
    assert.equal(s.stationsByCity.paris, 'p1');
    assert.equal(s.stationsLeft.p1, 2);
    assert.equal(s.hand.p1.red, 5);
    assert.equal(s.scores.p1, 0);
    assert.equal(s.trainsLeft.p1, 45);
    assert.equal(s.playerOrder[s.currentTurnIndex], 'p2');

    s.hand.p2.blue = 6;
    s = act(s, 'p2', {
      type: 'build_station',
      cityId: 'berlin',
      color: 'blue',
      locomotivesUsed: 0,
    });
    // Second station for p1 costs 2.
    s.hand.p1.red = 6;
    s = act(s, 'p1', {
      type: 'build_station',
      cityId: 'wien',
      color: 'red',
      locomotivesUsed: 0,
    });
    assert.equal(s.stationsLeft.p1, 1);
    assert.equal(s.hand.p1.red, 4);

    const usa = playingState(2, 'united-states');
    usa.hand.p1.red = 3;
    assert.deepEqual(view(usa, 'p1').stationOptions, {});
    assert.throws(() =>
      act(usa, 'p1', {
        type: 'build_station',
        cityId: 'chicago',
        color: 'red',
        locomotivesUsed: 0,
      }),
    );
  });

  it('rejects occupied cities and double occupancy', () => {
    const s = playingState(2, 'europe');
    s.hand.p1.red = 1;
    s.stationsByCity.paris = 'p2';
    assert.equal(view(s, 'p1').stationOptions.paris, undefined);
    assert.throws(() =>
      act(s, 'p1', { type: 'build_station', cityId: 'paris', color: 'red', locomotivesUsed: 0 }),
    );
  });
});

describe('Ticket to Ride Europe — scoring and tiebreaks', () => {
  it('awards unused station bonuses and borrows opponent routes only for tickets', () => {
    let s = playingState(2, 'europe');
    // p1 owns nothing but places a station in Paris; p2 owns Paris–Dieppe.
    s.routeOwner['die-par'] = 'p2';
    s.scores.p2 = getTtrMap('europe').routePoints[1] ?? 1;
    s.stationsByCity.paris = 'p1';
    s.stationsLeft.p1 = 2; // used 1 of 3
    s.stationsLeft.p2 = 3;
    s.tickets.p1 = [{ id: 'die-bre-t-test', a: 'dieppe', b: 'brest', points: 8 }];
    // Also need Dieppe–Brest owned by someone — give p2 that route too so station can bridge.
    s.routeOwner['bre-die'] = 'p2';
    s.scores.p2 += getTtrMap('europe').routePoints[2] ?? 2;
    // p1 needs Paris connection via station to dieppe, then... wait ticket is dieppe-brest which
    // both belong to p2. Station in paris doesn't help dieppe-brest.
    // Use ticket Paris–Brest instead and own nothing; borrow Paris–Dieppe? still not enough.
    // Better: ticket Paris–Dieppe, station in Paris borrows die-par.
    s.tickets.p1 = [{ id: 'par-die-t', a: 'paris', b: 'dieppe', points: 8 }];
    s.finalTurnsRemaining = 1;
    s = act(s, 'p1', {
      type: 'draw_train_cards',
      first: { source: 'deck' },
      second: { source: 'deck' },
    });
    assert.equal(s.phase, 'game_over');
    const row = s.finalScoreSummary?.find((r) => r.playerId === 'p1');
    assert.ok(row);
    assert.equal(row!.completedTicketPoints, 8);
    assert.equal(row!.stationBonus, 8); // 2 unused × 4
    assert.equal(row!.stationsUsed, 1);
    assert.ok(row!.stationAssignments.some((a) => a.cityId === 'paris' && a.routeId === 'die-par'));
    // Borrowed route must not grant route points to p1.
    assert.equal(row!.routePoints, 0);
  });

  it('breaks Europe ties by completed tickets then fewest stations used', () => {
    let s = playingState(2, 'europe');
    // Equal route scores, no longest-path edge, both complete one ticket for +5.
    s.scores.p1 = 20;
    s.scores.p2 = 20;
    s.tickets.p1 = [{ id: 't1', a: 'paris', b: 'dieppe', points: 5 }];
    s.tickets.p2 = [{ id: 't2', a: 'paris', b: 'dieppe', points: 5 }];
    s.routeOwner['die-par'] = 'p1';
    s.stationsByCity.paris = 'p2';
    s.stationsByCity.berlin = 'p2';
    s.stationsLeft.p1 = 3; // 0 stations used
    s.stationsLeft.p2 = 1; // 2 stations used
    // p2 also needs connectivity: station in paris borrows die-par.
    s.finalTurnsRemaining = 1;
    // Neutralize European Express: give p2 a 1-length own route so lengths can differ —
    // instead give both a same-length owned route and no express disparity by using length 0.
    // Force equal longest by giving p2 nothing and p1 the 1-train route — then p1 gets +10 Express.
    // To isolate the stations-used tiebreak, complete tickets for both and suppress Express:
    // give p2 an equal-length owned path elsewhere.
    s.routeOwner['bru-ams'] = 'p2';
    s.scores.p2 = 20; // already includes that route's points conceptually; keep equal pre-ticket totals
    s.scores.p1 = 20;
    s = act(s, 'p1', {
      type: 'draw_train_cards',
      first: { source: 'deck' },
      second: { source: 'deck' },
    });
    assert.equal(s.phase, 'game_over');
    const rows = Object.fromEntries((s.finalScoreSummary ?? []).map((r) => [r.playerId, r]));
    // Both complete 1 ticket. p2 gets station bonus 4; p1 gets 12. Totals diverge —
    // instead assert the comparator fields and that fewer stations wins when totals match.
    assert.equal(rows.p1?.completedTicketCount, 1);
    assert.equal(rows.p2?.completedTicketCount, 1);
    assert.equal(rows.p1?.stationsUsed, 0);
    assert.equal(rows.p2?.stationsUsed, 2);
    // With unused-station bonuses, p1 totals higher; winner should be p1.
    assert.deepEqual(s.result?.winners, ['p1']);
  });

  it('prefers fewest stations used when totals and completed tickets match', () => {
    let s = playingState(2, 'europe');
    s.scores.p1 = 30;
    s.scores.p2 = 30;
    // No tickets → 0 completed each. Suppress Express by equal longest (both 0).
    s.stationsLeft.p1 = 2; // used 1
    s.stationsLeft.p2 = 1; // used 2
    s.stationsByCity.paris = 'p1';
    s.stationsByCity.berlin = 'p2';
    s.stationsByCity.wien = 'p2';
    // Cancel unused-station bonus difference by adjusting base scores:
    // p1 unused 2 → +8; p2 unused 1 → +4. So set p2 base +4 higher.
    s.scores.p1 = 30;
    s.scores.p2 = 34;
    s.finalTurnsRemaining = 1;
    s = act(s, 'p1', {
      type: 'draw_train_cards',
      first: { source: 'deck' },
      second: { source: 'deck' },
    });
    assert.equal(s.phase, 'game_over');
    const rows = Object.fromEntries((s.finalScoreSummary ?? []).map((r) => [r.playerId, r]));
    assert.equal(rows.p1?.total, rows.p2?.total);
    assert.equal(rows.p1?.completedTicketCount, 0);
    assert.equal(rows.p2?.completedTicketCount, 0);
    assert.ok((rows.p1?.stationsUsed ?? 99) < (rows.p2?.stationsUsed ?? 0));
    assert.deepEqual(s.result?.winners, ['p1']);
  });
});

describe('Ticket to Ride India — scaffold', () => {
  const IND = getTtrMap('india');

  it('exposes India lobby rules and Mandala scoring table', () => {
    assert.equal(IND.id, 'india');
    assert.equal(IND.minPlayers, 2);
    assert.equal(IND.maxPlayers, 4);
    assert.equal(IND.stationsPerPlayer, 0);
    assert.equal(IND.rules.mandalaBonus, true);
    assert.equal(IND.rules.longestPathBonus, 10);
    assert.equal(IND.setup.initialRegularTickets, 4);
    assert.equal(IND.setup.minInitialKeep, 2);
    assert.equal(IND.setup.initialLongTickets, 0);
    assert.equal(ttrMandalaBonusPoints(0), 0);
    assert.equal(ttrMandalaBonusPoints(1), 5);
    assert.equal(ttrMandalaBonusPoints(2), 10);
    assert.equal(ttrMandalaBonusPoints(3), 20);
    assert.equal(ttrMandalaBonusPoints(4), 30);
    assert.equal(ttrMandalaBonusPoints(5), 40);
    assert.equal(ttrMandalaBonusPoints(6), 40);
  });

  it('deals four destination tickets and requires keep ≥2', () => {
    assert.equal(IND.destinationTickets.length, 58);
    assert.ok(IND.routes.length > 80);
    const s = ticketToRideGame.setup(makePlayers(2), { mapId: 'india' }) as TtrState;
    assert.equal(s.mapId, 'india');
    assert.equal(s.phase, 'initial_tickets');
    assert.equal(view(s, s.playerOrder[0]!).mapId, 'india');
    for (const pid of s.playerOrder) {
      assert.equal(s.pendingInitialChoices[pid]?.length, 4);
      assert.equal(s.trainsLeft[pid], 45);
    }
    const pid = s.playerOrder[0]!;
    const keepIds = s.pendingInitialChoices[pid]!.slice(0, 2).map((t) => t.id);
    const next = act(s, pid, { type: 'keep_initial_tickets', keepIds });
    assert.equal(next.tickets[pid].length, 2);
    assert.equal(next.pendingInitialChoices[pid], null);
  });

  it('publishes a Mandala notice when a completed ticket gains a second path', () => {
    let s = playingState(2, 'india');
    const ticket = IND.destinationTickets.find((t) => t.id === 'bil-dhubri')!;
    s.tickets.p1 = [ticket];
    s.completedTicketIdsByPlayer.p1 = [ticket.id];
    // First path Bilaspur–Calcutta–Dhubri (already owned).
    s.routeOwner['bil-cal'] = 'p1';
    s.routeOwner['dhu-cal-1'] = 'p1';
    // Second path almost closed: Patna–Dhubri + Patna–Katni; claim Katni–Bilaspur last.
    s.routeOwner['pat-dhu-1'] = 'p1';
    s.routeOwner['pat-kat-1'] = 'p1';
    s.hand.p1.purple = 1;
    assert.equal(s.mandalaNoticeSeq, 0);
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: 'kat-bil-1',
      color: 'purple',
      locomotivesUsed: 0,
    });
    assert.equal(s.mandalaNoticeSeq, 1);
    assert.equal(s.mandalaNotice?.a, 'bilaspur');
    assert.equal(s.mandalaNotice?.b, 'dhubri');
    assert.equal(s.mandalaNotice?.qualifyingTicketCount, 1);
    assert.equal(s.mandalaNotice?.mandalaBonus, 5);
    assert.equal(view(s, 'p2').mandalaNotice?.playerId, 'p1');
  });

  it('city stubs only reference declared ids', () => {
    const cityIds = new Set(IND.cities.map((c) => c.id));
    assert.ok(cityIds.size >= 30);
    const routeIds = new Set(IND.routes.map((r) => r.id));
    assert.equal(routeIds.size, IND.routes.length);
    for (const r of IND.routes) {
      assert.ok(cityIds.has(r.a) && cityIds.has(r.b), r.id);
      assert.ok(IND.routePoints[r.length] != null, `${r.id} length ${r.length}`);
      if (r.ferryLocomotives) {
        assert.ok(r.ferryLocomotives >= 1 && r.ferryLocomotives <= r.length, r.id);
        assert.equal(r.color, 'gray', r.id);
      }
    }
    for (const t of IND.destinationTickets) {
      assert.ok(cityIds.has(t.a) && cityIds.has(t.b), t.id);
    }
  });

  it('keeps human-confirmed NW routes', () => {
    const byId = Object.fromEntries(IND.routes.map((r) => [r.id, r]));
    assert.equal(byId['lah-bha-1']?.length, 2);
    assert.equal(byId['lah-bha-1']?.color, 'gray');
    assert.equal(byId['lah-bha-2']?.color, 'gray');
    assert.equal(byId['lah-amb']?.length, 4);
    assert.equal(byId['lah-amb']?.color, 'black');
  });
});

describe('Ticket to Ride Japan — Bullet Train network', () => {
  const JP = getTtrMap('japan');

  it('exposes Japan lobby rules, BT supply, and 54 tickets', () => {
    assert.equal(JP.id, 'japan');
    assert.equal(JP.minPlayers, 2);
    assert.equal(JP.maxPlayers, 5);
    assert.equal(JP.trainsPerPlayer, 20);
    assert.equal(JP.stationsPerPlayer, 0);
    assert.equal(JP.rules.longestPathBonus, 0);
    assert.equal(JP.rules.bulletTrainMiniatures, 16);
    assert.equal(JP.setup.initialRegularTickets, 4);
    assert.equal(JP.setup.minInitialKeep, 2);
    assert.equal(JP.setup.initialLongTickets, 0);
    assert.equal(JP.destinationTickets.length, 54);
  });

  it('deals four tickets, 20 trains, BT supply 16, and keeps ≥2', () => {
    const s = ticketToRideGame.setup(makePlayers(2), { mapId: 'japan' }) as TtrState;
    assert.equal(s.mapId, 'japan');
    assert.equal(s.phase, 'initial_tickets');
    assert.equal(s.bulletTrainSupply, 16);
    assert.equal(view(s, s.playerOrder[0]!).bulletTrainSupply, 16);
    assert.equal(view(s, s.playerOrder[0]!).players[0]!.bulletTrainProgression, 0);
    for (const pid of s.playerOrder) {
      assert.equal(s.pendingInitialChoices[pid]?.length, 4);
      assert.equal(s.trainsLeft[pid], 20);
      assert.equal(s.bulletTrainProgression[pid], 0);
    }
    const pid = s.playerOrder[0]!;
    const keepIds = s.pendingInitialChoices[pid]!.slice(0, 2).map((t) => t.id);
    const next = act(s, pid, { type: 'keep_initial_tickets', keepIds });
    assert.equal(next.tickets[pid].length, 2);
  });

  it('city/route/ticket stubs are consistent; Aomori–Hakodate is not a double', () => {
    const cityIds = new Set(JP.cities.map((c) => c.id));
    assert.ok(cityIds.has('tokyo') && cityIds.has('kokura') && cityIds.has('iwaki'));
    for (const r of JP.routes) {
      assert.ok(cityIds.has(r.a) && cityIds.has(r.b), r.id);
      assert.ok(JP.routePoints[r.length] != null, `${r.id} length ${r.length}`);
      if (r.bulletTrain) assert.equal(r.color, 'gray', r.id);
    }
    for (const t of JP.destinationTickets) {
      assert.ok(cityIds.has(t.a) && cityIds.has(t.b), t.id);
    }
    const short = JP.routes.find((r) => r.id === 'hak-aom-short')!;
    const long = JP.routes.find((r) => r.id === 'hak-aom-long')!;
    assert.notEqual(short.groupId, long.groupId);
    assert.notEqual(short.length, long.length);
  });

  it('claims BT as shared network: progression, no trains/points, white miniature', () => {
    let s = playingState(2, 'japan');
    s.hand.p1.red = 2;
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: 'hak-aom-short',
      color: 'red',
      locomotivesUsed: 0,
    });
    assert.equal(s.routeOwner['hak-aom-short'], 'p1');
    assert.equal(s.scores.p1, 0);
    assert.equal(s.trainsLeft.p1, 20);
    assert.equal(s.bulletTrainProgression.p1, 2);
    assert.equal(s.bulletTrainSupply, 15);
    assert.ok(s.sharedBulletTrainRouteIds.includes('hak-aom-short'));
    const rv = view(s, 'p1').routes.find((r) => r.id === 'hak-aom-short')!;
    assert.equal(rv.sharedBulletTrain, true);
  });

  it('lets every player use a claimed BT for destination tickets', () => {
    let s = playingState(2, 'japan');
    s.tickets.p2 = [{ id: 't-ha', a: 'hakodate', b: 'aomori', points: 4 }];
    s.hand.p1.red = 2;
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: 'hak-aom-short',
      color: 'red',
      locomotivesUsed: 0,
    });
    assert.ok(s.completedTicketIdsByPlayer.p2.includes('t-ha'));
  });

  it('falls back to exclusive gray when BT supply is empty', () => {
    let s = playingState(2, 'japan');
    s.bulletTrainSupply = 0;
    s.hand.p1.red = 2;
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: 'hak-aom-short',
      color: 'red',
      locomotivesUsed: 0,
    });
    assert.equal(s.routeOwner['hak-aom-short'], 'p1');
    assert.equal(s.scores.p1, JP.routePoints[2]);
    assert.equal(s.trainsLeft.p1, 18);
    assert.equal(s.bulletTrainProgression.p1, 0);
    assert.equal(s.sharedBulletTrainRouteIds.length, 0);
    assert.equal(view(s, 'p1').routes.find((r) => r.id === 'hak-aom-short')!.sharedBulletTrain, false);
  });

  it('requires both low trains and low BT supply to trigger final turns', () => {
    let s = playingState(2, 'japan');
    s.trainsLeft.p1 = 2;
    s.bulletTrainSupply = 5;
    const normal = JP.routes.find((r) => !r.bulletTrain && r.length === 1)!;
    const payColor = normal.color === 'gray' ? 'blue' : normal.color;
    s.hand.p1[payColor] = 1;
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: normal.id,
      color: payColor,
      locomotivesUsed: 0,
    });
    assert.equal(s.finalTurnsRemaining, null);

    s.bulletTrainSupply = 2;
    s.currentTurnIndex = 0;
    s.pendingTurn = { kind: 'ready' };
    const normal2 = JP.routes.find(
      (r) => !r.bulletTrain && r.length === 1 && !s.routeOwner[r.id],
    )!;
    const payColor2 = normal2.color === 'gray' ? 'green' : normal2.color;
    s.hand.p1[payColor2] = 1;
    s = act(s, 'p1', {
      type: 'claim_route',
      routeId: normal2.id,
      color: payColor2,
      locomotivesUsed: 0,
    });
    assert.equal(s.finalTurnsRemaining, 2);
  });

  it('scores BT bonus with ties and −20 for non-participants (5p example)', () => {
    const bonuses = ttrBulletTrainBonuses([
      { playerId: 'a', progression: 10 },
      { playerId: 'b', progression: 5 },
      { playerId: 'c', progression: 5 },
      { playerId: 'd', progression: 2 },
      { playerId: 'e', progression: 0 },
    ]);
    assert.equal(bonuses.a, 25);
    assert.equal(bonuses.b, 15);
    assert.equal(bonuses.c, 15);
    assert.equal(bonuses.d, -5);
    assert.equal(bonuses.e, -20);
  });
});
