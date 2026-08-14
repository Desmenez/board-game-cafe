import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Player, SpicyState } from 'shared';
import { buildSpicyDeck } from 'shared';
import { spicyGame } from '../src/games/spicy/engine.js';
import { applyAction, createInitialState, legalDeclarations } from '../src/games/spicy/rules.js';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    avatar: { style: 'adventurer', seed: `p${i + 1}` },
    connected: true,
  })) as Player[];
}

function setup(n = 3, useSpecial = false): SpicyState {
  return createInitialState(makePlayers(n), { useSpecialCards: useSpecial });
}

describe('Spicy — deck & setup', () => {
  it('builds 100 spicy cards', () => {
    assert.equal(buildSpicyDeck().length, 100);
  });

  it('rejects wrong player counts', () => {
    assert.throws(() => setup(1));
    assert.throws(() => setup(7));
  });

  it('deals 6 cards and inserts World’s End', () => {
    const s = setup(3);
    assert.equal(s.phase, 'turn');
    for (const id of s.playerOrder) {
      assert.equal(s.seats[id]!.hand.length, 6);
    }
    assert.equal(s.drawPile.length, 100 - 18);
    assert.ok(s.worldsEndAt != null);
    assert.ok(s.worldsEndAt! < s.drawPile.length);
    assert.equal(s.trophiesLeft, 3);
    assert.equal(s.specialCard, null);
  });

  it('picks a special when lobby option on', () => {
    const s = setup(3, true);
    assert.ok(s.specialCard);
  });
});

describe('Spicy — play & challenge', () => {
  it('first card must be 1–3', () => {
    const s = setup(3);
    const legal = legalDeclarations(s);
    assert.ok(legal.every((d) => d.number <= 3));
    assert.ok(legal.some((d) => d.spice === 'chili' && d.number === 1));
  });

  it('play then others pass → challenge wrong spice wins', () => {
    let s = setup(3);
    const first = s.activePlayerId;
    const card = s.seats[first]!.hand[0]!;
    s = applyAction(s, first, {
      type: 'play_card',
      cardId: card.id,
      number: 2,
      spice: 'chili',
    });
    assert.equal(s.spicyStack.length, 1);
    assert.equal(s.seats[first]!.hand.length, 5);

    const challenger = s.playerOrder.find((id) => id !== first)!;
    // Force known card face for deterministic challenge
    s.spicyStack[0]!.card = {
      id: 'forced',
      kind: 'numbered',
      spice: 'wasabi',
      number: 2,
    };
    s = applyAction(s, challenger, { type: 'challenge', trait: 'spice' });
    assert.equal(s.phase, 'challenge_reveal');
    assert.equal(s.challengeReveal!.challengerWon, true);

    s = applyAction(s, challenger, { type: 'ack_challenge' });
    assert.equal(s.phase, 'round_summary');
    assert.equal(s.roundSummary?.reason, 'challenge_right');
    assert.ok(s.seats[challenger]!.wonCount >= 1);
    assert.equal(s.spicyStack.length, 0);

    s = applyAction(s, challenger, { type: 'ack_round' });
    assert.equal(s.phase, 'turn');
    assert.equal(s.spicyStack.length, 0);
    assert.ok(s.seats[challenger]!.wonCount >= 1);
  });

  it('pass draws a card', () => {
    let s = setup(3);
    const actor = s.activePlayerId;
    const before = s.seats[actor]!.hand.length;
    const drawBefore = s.drawPile.length;
    s = applyAction(s, actor, { type: 'pass' });
    assert.equal(s.seats[actor]!.hand.length, before + 1);
    assert.equal(s.drawPile.length, drawBefore - 1);
  });

  it('wild number loses spice challenge', () => {
    let s = setup(3);
    const first = s.activePlayerId;
    const card = s.seats[first]!.hand[0]!;
    s = applyAction(s, first, {
      type: 'play_card',
      cardId: card.id,
      number: 1,
      spice: 'pepper',
    });
    s.spicyStack[0]!.card = { id: 'w', kind: 'wild_number' };
    const challenger = s.playerOrder.find((id) => id !== first)!;
    s = applyAction(s, challenger, { type: 'challenge', trait: 'spice' });
    assert.equal(s.challengeReveal!.challengerWon, true);
  });
});

function playLastCard(state: SpicyState, playerId: string): SpicyState {
  const keep = state.seats[playerId]!.hand[0]!;
  state.seats[playerId]!.hand = [keep];
  return applyAction(state, playerId, {
    type: 'play_card',
    cardId: keep.id,
    number: 1,
    spice: 'chili',
  });
}

describe('Spicy — trophy window', () => {
  it('all other players decline → round_summary with trophy, ack redraws 6', () => {
    let s = setup(3);
    const emptier = s.activePlayerId;
    s = playLastCard(s, emptier);
    assert.equal(s.phase, 'trophy_window');
    assert.equal(s.seats[emptier]!.hand.length, 0);

    const others = s.playerOrder.filter((id) => id !== emptier);
    for (const id of others) {
      s = applyAction(s, id, { type: 'decline_challenge' });
    }
    assert.equal(s.phase, 'round_summary');
    assert.equal(s.roundSummary?.reason, 'trophy_uncontested');
    assert.equal(s.seats[emptier]!.trophies, 1);
    assert.equal(s.seats[emptier]!.hand.length, 0);
    assert.equal(s.trophiesLeft, 2);
    const emptierRow = s.roundSummary!.rows.find((r) => r.playerId === emptier);
    assert.equal(emptierRow?.trophies, 1);
    assert.equal(emptierRow?.points, 10);

    s = applyAction(s, others[0]!, { type: 'ack_round' });
    assert.equal(s.seats[emptier]!.hand.length, 6);
    assert.equal(s.phase, 'turn');
    assert.equal(s.declineChallengeIds.length, 0);
    assert.equal(s.roundSummary, null);
  });

  it('3 players: two opponents decline, emptier never declines → trophy', () => {
    let s = setup(3);
    const emptier = s.activePlayerId;
    s = playLastCard(s, emptier);

    const others = s.playerOrder.filter((id) => id !== emptier);
    assert.equal(others.length, 2);
    s = applyAction(s, others[0]!, { type: 'decline_challenge' });
    assert.equal(s.phase, 'trophy_window');
    assert.equal(s.seats[emptier]!.trophies, 0);

    s = applyAction(s, others[1]!, { type: 'decline_challenge' });
    assert.equal(s.phase, 'round_summary');
    assert.equal(s.seats[emptier]!.trophies, 1);
    assert.equal(s.seats[emptier]!.hand.length, 0);

    s = applyAction(s, emptier, { type: 'ack_round' });
    assert.equal(s.phase, 'turn');
    assert.equal(s.seats[emptier]!.hand.length, 6);
  });

  it('rejects decline from the emptier', () => {
    let s = setup(3);
    const emptier = s.activePlayerId;
    s = playLastCard(s, emptier);
    assert.throws(() => applyAction(s, emptier, { type: 'decline_challenge' }));
    assert.equal(s.phase, 'trophy_window');
    assert.equal(s.seats[emptier]!.trophies, 0);
  });

  it('rejects challenge after decline in trophy window', () => {
    let s = setup(3);
    const emptier = s.activePlayerId;
    s = playLastCard(s, emptier);
    const other = s.playerOrder.find((id) => id !== emptier)!;
    s = applyAction(s, other, { type: 'decline_challenge' });
    assert.throws(() => applyAction(s, other, { type: 'challenge', trait: 'number' }));
    assert.throws(() => applyAction(s, other, { type: 'challenge', trait: 'spice' }));
    assert.throws(() => applyAction(s, other, { type: 'challenge_copy' }));
    assert.equal(s.phase, 'trophy_window');
  });

  it('wrong challenge → reveal then round_summary then ack continues', () => {
    let s = setup(3);
    const emptier = s.activePlayerId;
    s = playLastCard(s, emptier);
    s.spicyStack[0]!.card = {
      id: 'honest',
      kind: 'numbered',
      spice: 'chili',
      number: 1,
    };
    const challenger = s.playerOrder.find((id) => id !== emptier)!;
    const challengerHandBefore = s.seats[challenger]!.hand.length;

    s = applyAction(s, challenger, { type: 'challenge', trait: 'spice' });
    assert.equal(s.phase, 'challenge_reveal');
    assert.equal(s.challengeReveal!.challengerWon, false);

    s = applyAction(s, challenger, { type: 'ack_challenge' });
    assert.equal(s.phase, 'round_summary');
    assert.equal(s.roundSummary?.reason, 'challenge_wrong');
    assert.ok((s.seats[emptier]!.wonCount ?? 0) >= 1);
    assert.equal(s.seats[emptier]!.trophies, 1);
    assert.equal(s.seats[emptier]!.hand.length, 0);
    const emptierRow = s.roundSummary!.rows.find((r) => r.playerId === emptier);
    assert.ok((emptierRow?.wonCards ?? 0) >= 1);
    assert.equal(emptierRow?.trophies, 1);
    assert.ok((emptierRow?.points ?? 0) >= 11);

    s = applyAction(s, emptier, { type: 'ack_round' });
    assert.equal(s.phase, 'turn');
    assert.equal(s.seats[emptier]!.hand.length, 6);
    assert.equal(s.seats[challenger]!.hand.length, challengerHandBefore + 2);
    assert.equal(s.roundSummary, null);
  });
});

describe('Spicy — getPlayerView', () => {
  it('hides other hands', () => {
    const s = setup(3);
    const first = s.playerOrder[0]!;
    const view = spicyGame.getPlayerView(s, first) as ReturnType<typeof spicyGame.getPlayerView>;
    assert.equal(view.you.hand.length, 6);
    assert.ok(view.seats.every((seat) => typeof seat.handCount === 'number'));
  });

  it('emptier cannot decline during trophy window', () => {
    let s = setup(3);
    const emptier = s.activePlayerId;
    s = playLastCard(s, emptier);
    const emptierView = spicyGame.getPlayerView(s, emptier) as ReturnType<
      typeof spicyGame.getPlayerView
    >;
    assert.equal(emptierView.you.canDecline, false);
    assert.equal(emptierView.you.canChallenge, false);
    assert.equal(emptierView.you.canAct, false);

    const other = s.playerOrder.find((id) => id !== emptier)!;
    const otherView = spicyGame.getPlayerView(s, other) as ReturnType<typeof spicyGame.getPlayerView>;
    assert.equal(otherView.you.canDecline, true);
    assert.equal(otherView.you.canChallenge, true);
  });

  it('hides challenge after decline in trophy window', () => {
    let s = setup(3);
    const emptier = s.activePlayerId;
    s = playLastCard(s, emptier);
    const others = s.playerOrder.filter((id) => id !== emptier);
    s = applyAction(s, others[0]!, { type: 'decline_challenge' });

    const declinedView = spicyGame.getPlayerView(s, others[0]!) as ReturnType<
      typeof spicyGame.getPlayerView
    >;
    assert.equal(declinedView.you.canDecline, false);
    assert.equal(declinedView.you.canChallenge, false);
    assert.equal(declinedView.you.canChallengeCopy, false);

    const stillOpen = spicyGame.getPlayerView(s, others[1]!) as ReturnType<
      typeof spicyGame.getPlayerView
    >;
    assert.equal(stillOpen.you.canDecline, true);
    assert.equal(stillOpen.you.canChallenge, true);
  });

  it('any seated player can ack round_summary', () => {
    let s = setup(3);
    const emptier = s.activePlayerId;
    s = playLastCard(s, emptier);
    for (const id of s.playerOrder.filter((id) => id !== emptier)) {
      s = applyAction(s, id, { type: 'decline_challenge' });
    }
    assert.equal(s.phase, 'round_summary');

    for (const id of s.playerOrder) {
      const view = spicyGame.getPlayerView(s, id) as ReturnType<typeof spicyGame.getPlayerView>;
      assert.equal(view.you.canAckRound, true);
      assert.equal(view.you.canAckChallenge, false);
      assert.equal(view.roundSummary?.reason, 'trophy_uncontested');
    }
  });
});
