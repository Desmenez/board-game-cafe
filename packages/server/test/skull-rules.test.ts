import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Player, SkullState } from 'shared';
import { skullGame } from '../src/games/skull/engine.js';
import {
  applyAction,
  discsInPlay,
  legalFlipOwnerIds,
} from '../src/games/skull/rules.js';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    avatar: { style: 'adventurer', seed: `p${i + 1}` },
    connected: true,
  })) as Player[];
}

function setup(n = 3): SkullState {
  return skullGame.setup(makePlayers(n)) as SkullState;
}

function placeOpeningAll(state: SkullState, face: 'flower' | 'skull' = 'flower'): SkullState {
  let s = state;
  const first = s.firstPlayerId;
  const others = s.playerOrder.filter((id) => id !== first && !s.seats[id]!.eliminated);
  for (const id of others) {
    const disc = s.seats[id]!.hand.find((d) => d.face === face) ?? s.seats[id]!.hand[0]!;
    s = applyAction(s, id, { type: 'place_opening', discId: disc.id });
  }
  const disc = s.seats[first]!.hand.find((d) => d.face === face) ?? s.seats[first]!.hand[0]!;
  s = applyAction(s, first, { type: 'place_opening', discId: disc.id });
  return s;
}

describe('Skull — setup & opening', () => {
  it('rejects wrong player counts', () => {
    assert.throws(() => setup(2));
    assert.throws(() => setup(7));
  });

  it('deals 3 flowers + 1 skull and starts opening_place', () => {
    const s = setup(3);
    assert.equal(s.phase, 'opening_place');
    for (const id of s.playerOrder) {
      const seat = s.seats[id]!;
      assert.equal(seat.hand.length, 4);
      assert.equal(seat.hand.filter((d) => d.face === 'flower').length, 3);
      assert.equal(seat.hand.filter((d) => d.face === 'skull').length, 1);
      assert.equal(seat.wins, 0);
    }
  });

  it('first player must wait until others place', () => {
    const s = setup(3);
    const first = s.firstPlayerId;
    const disc = s.seats[first]!.hand[0]!;
    assert.throws(() => applyAction(s, first, { type: 'place_opening', discId: disc.id }));
  });

  it('enters decision after everyone places opening disc', () => {
    const s = placeOpeningAll(setup(3));
    assert.equal(s.phase, 'decision');
    assert.equal(s.activePlayerId, s.firstPlayerId);
    assert.equal(discsInPlay(s), 3);
  });
});

describe('Skull — bidding & challenge', () => {
  it('open bid then all others pass → challenge', () => {
    let s = placeOpeningAll(setup(3));
    const first = s.firstPlayerId;
    s = applyAction(s, first, { type: 'open_bid', amount: 1 });
    assert.equal(s.phase, 'bidding');
    assert.equal(s.currentBid, 1);

    // Two remaining players pass
    while (s.phase === 'bidding') {
      const actor = s.activePlayerId!;
      s = applyAction(s, actor, { type: 'pass' });
    }
    assert.equal(s.phase, 'challenge');
    assert.equal(s.challengerId, first);
  });

  it('rejects bid above discs in play', () => {
    const s = placeOpeningAll(setup(3));
    const first = s.firstPlayerId;
    assert.throws(() => applyAction(s, first, { type: 'open_bid', amount: 99 }));
  });

  it('challenger must flip own stack first', () => {
    let s = placeOpeningAll(setup(3));
    const first = s.firstPlayerId;
    s = applyAction(s, first, { type: 'open_bid', amount: 1 });
    while (s.phase === 'bidding') {
      s = applyAction(s, s.activePlayerId!, { type: 'pass' });
    }
    const legal = legalFlipOwnerIds(s, first);
    assert.deepEqual(legal, [first]);
    const other = s.playerOrder.find((id) => id !== first)!;
    assert.throws(() => applyAction(s, first, { type: 'flip', ownerId: other }));
  });

  it('successful challenge with 0 wins flips mat to 1', () => {
    let s = placeOpeningAll(setup(3), 'flower');
    const first = s.firstPlayerId;
    s = applyAction(s, first, { type: 'open_bid', amount: 1 });
    while (s.phase === 'bidding') {
      s = applyAction(s, s.activePlayerId!, { type: 'pass' });
    }
    s = applyAction(s, first, { type: 'flip', ownerId: first });
    assert.equal(s.phase, 'round_result');
    assert.equal(s.seats[first]!.wins, 1);
    assert.equal(s.roundOutcome?.kind, 'success');
  });

  it('second successful challenge wins the game', () => {
    let s = placeOpeningAll(setup(3), 'flower');
    const first = s.firstPlayerId;
    s.seats[first]!.wins = 1;

    s = applyAction(s, first, { type: 'open_bid', amount: 1 });
    while (s.phase === 'bidding') {
      s = applyAction(s, s.activePlayerId!, { type: 'pass' });
    }
    s = applyAction(s, first, { type: 'flip', ownerId: first });
    assert.equal(s.phase, 'game_over');
    assert.deepEqual(s.result?.winners, [first]);
  });

  it('flipping own skull goes to choose_discard by challenger', () => {
    let s = placeOpeningAll(setup(3), 'skull');
    const first = s.firstPlayerId;
    // Everyone placed skulls — challenger flips own skull
    s = applyAction(s, first, { type: 'open_bid', amount: 1 });
    while (s.phase === 'bidding') {
      s = applyAction(s, s.activePlayerId!, { type: 'pass' });
    }
    s = applyAction(s, first, { type: 'flip', ownerId: first });
    assert.equal(s.phase, 'choose_discard');
    assert.equal(s.pendingDiscard?.mode, 'choose_by_challenger');
    assert.equal(s.activePlayerId, first);
    // Official: mats recalled before discard — no face-up leak
    for (const id of s.playerOrder) {
      assert.equal(s.seats[id]!.stack.length, 0);
    }
    assert.equal(
      s.pendingDiscard!.pool.length,
      s.seats[first]!.hand.length,
    );

    const pool = s.pendingDiscard!.pool;
    const pick = pool[0]!;
    s = applyAction(s, first, { type: 'choose_discard', discId: pick.id });
    assert.equal(s.phase, 'round_result');
    const total =
      s.seats[first]!.hand.length + s.seats[first]!.stack.length;
    // started 4, placed 1 on stack counted in pool; after discard should have 3 total before return
    assert.equal(total, 3);
  });

  it('max bid equals discs in play → challenge immediately', () => {
    let s = placeOpeningAll(setup(3), 'flower');
    const first = s.firstPlayerId;
    const max = discsInPlay(s);
    s = applyAction(s, first, { type: 'open_bid', amount: max });
    assert.equal(s.phase, 'challenge');
    assert.equal(s.challengerId, first);
    assert.equal(s.currentBid, max);
  });

  it('outbid to max discs in play → challenge immediately', () => {
    let s = placeOpeningAll(setup(3), 'flower');
    const first = s.firstPlayerId;
    const max = discsInPlay(s);
    s = applyAction(s, first, { type: 'open_bid', amount: 1 });
    assert.equal(s.phase, 'bidding');
    const raiser = s.activePlayerId!;
    s = applyAction(s, raiser, { type: 'outbid', amount: max });
    assert.equal(s.phase, 'challenge');
    assert.equal(s.challengerId, raiser);
    assert.equal(s.currentBid, max);
  });

  it('self-eliminated challenger chooses next first player', () => {
    let s = placeOpeningAll(setup(3), 'skull');
    const first = s.firstPlayerId;
    // Leave only the mat skull so discarding eliminates the challenger
    s.seats[first]!.hand = [];
    s = applyAction(s, first, { type: 'open_bid', amount: 1 });
    while (s.phase === 'bidding') {
      s = applyAction(s, s.activePlayerId!, { type: 'pass' });
    }
    s = applyAction(s, first, { type: 'flip', ownerId: first });
    assert.equal(s.phase, 'choose_discard');
    assert.equal(s.pendingDiscard!.pool.length, 1);
    const only = s.pendingDiscard!.pool[0]!;
    s = applyAction(s, first, { type: 'choose_discard', discId: only.id });
    assert.equal(s.phase, 'choose_first_player');
    assert.ok(s.seats[first]!.eliminated);

    const chooserView = skullGame.getPlayerView(s, first) as ReturnType<
      typeof skullGame.getPlayerView
    >;
    assert.equal(chooserView.you.canAct, true);
    assert.equal(chooserView.you.legalFirstPlayerIds.length, 2);

    const pick = chooserView.you.legalFirstPlayerIds[0]!;
    s = applyAction(s, first, { type: 'choose_first_player', playerId: pick });
    assert.equal(s.phase, 'round_result');
    assert.equal(s.nextFirstPlayerId, pick);

    s = applyAction(s, pick, { type: 'ack_round' });
    assert.equal(s.phase, 'opening_place');
    assert.equal(s.firstPlayerId, pick);
    assert.equal(s.nextFirstPlayerId, null);
  });

  it('random discard of challenger discs goes through discard_reveal', () => {
    let s = setup(3);
    const first = s.firstPlayerId;
    const others = s.playerOrder.filter((id) => id !== first);
    for (const id of others) {
      const skull = s.seats[id]!.hand.find((d) => d.face === 'skull')!;
      s = applyAction(s, id, { type: 'place_opening', discId: skull.id });
    }
    const flower = s.seats[first]!.hand.find((d) => d.face === 'flower')!;
    s = applyAction(s, first, { type: 'place_opening', discId: flower.id });

    s = applyAction(s, first, { type: 'open_bid', amount: 2 });
    while (s.phase === 'bidding') {
      s = applyAction(s, s.activePlayerId!, { type: 'pass' });
    }
    s = applyAction(s, first, { type: 'flip', ownerId: first });
    assert.equal(s.phase, 'challenge');
    assert.equal(s.flippedCount, 1);

    const victim = others[0]!;
    s = applyAction(s, first, { type: 'flip', ownerId: victim });
    assert.equal(s.phase, 'choose_discard');
    assert.equal(s.pendingDiscard?.mode, 'random_by_owner');
    assert.equal(s.pendingDiscard?.skullOwnerId, victim);
    assert.equal(s.pendingDiscard?.challengerId, first);

    const challengerView = skullGame.getPlayerView(s, first) as ReturnType<
      typeof skullGame.getPlayerView
    >;
    assert.ok(challengerView.you.discardPool);
    assert.equal(
      challengerView.you.discardPool!.length,
      s.pendingDiscard!.pool.length,
    );
    assert.equal(challengerView.you.mustConfirmRandomDiscard, false);

    const ownerView = skullGame.getPlayerView(s, victim) as ReturnType<
      typeof skullGame.getPlayerView
    >;
    assert.equal(ownerView.you.mustConfirmRandomDiscard, true);
    assert.equal(ownerView.you.discardPool, null);

    const before = s.pendingDiscard!.pool.length;
    s = applyAction(s, victim, { type: 'confirm_random_discard' });
    assert.equal(s.phase, 'discard_reveal');
    assert.ok(s.discardReveal);
    assert.equal(s.discardReveal!.pool.length, before);
    assert.ok(s.discardReveal!.pool.some((d) => d.id === s.discardReveal!.discarded.id));

    const challengerReveal = skullGame.getPlayerView(s, first) as ReturnType<
      typeof skullGame.getPlayerView
    >;
    assert.equal(challengerReveal.discardReveal?.facesHidden, false);
    assert.ok(challengerReveal.discardReveal?.discarded?.face);

    const spectatorReveal = skullGame.getPlayerView(s, victim) as ReturnType<
      typeof skullGame.getPlayerView
    >;
    assert.equal(spectatorReveal.discardReveal?.facesHidden, true);
    assert.equal(spectatorReveal.discardReveal?.discarded, null);
    assert.equal(spectatorReveal.discardReveal?.pool, null);

    s = applyAction(s, first, { type: 'ack_round' });
    assert.equal(s.phase, 'round_result');
    assert.equal(s.discardReveal, null);
  });
});

describe('Skull — round ack', () => {
  it('one ack starts next opening round', () => {
    let s = placeOpeningAll(setup(3), 'flower');
    const first = s.firstPlayerId;
    s = applyAction(s, first, { type: 'open_bid', amount: 1 });
    while (s.phase === 'bidding') {
      s = applyAction(s, s.activePlayerId!, { type: 'pass' });
    }
    s = applyAction(s, first, { type: 'flip', ownerId: first });
    assert.equal(s.phase, 'round_result');

    s = applyAction(s, first, { type: 'ack_round' });
    assert.equal(s.phase, 'opening_place');
    assert.equal(s.round, 2);
    assert.equal(s.firstPlayerId, first);
    for (const id of s.playerOrder) {
      assert.equal(s.seats[id]!.stack.length, 0);
      assert.equal(s.seats[id]!.hand.length, 4);
    }
  });
});

describe('Skull — getPlayerView privacy', () => {
  it('hides face-down stack faces from everyone', () => {
    const s = placeOpeningAll(setup(3), 'skull');
    const view = skullGame.getPlayerView(s, s.playerOrder[0]!) as ReturnType<
      typeof skullGame.getPlayerView
    >;
    for (const seat of view.seats) {
      for (const d of seat.stack) {
        assert.equal(d.faceUp, false);
        assert.equal(d.face, null);
      }
    }
    assert.equal(view.you.hand.length, 3);
  });
});
