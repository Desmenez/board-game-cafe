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

describe('Spicy — trophy window', () => {
  it('all decline awards trophy and redraws 6', () => {
    let s = setup(3);
    const first = s.activePlayerId;
    // Empty hand except one card to play
    const keep = s.seats[first]!.hand[0]!;
    s.seats[first]!.hand = [keep];
    s = applyAction(s, first, {
      type: 'play_card',
      cardId: keep.id,
      number: 1,
      spice: 'chili',
    });
    assert.equal(s.phase, 'trophy_window');
    assert.equal(s.seats[first]!.hand.length, 0);

    for (const id of s.playerOrder) {
      s = applyAction(s, id, { type: 'decline_challenge' });
    }
    assert.equal(s.seats[first]!.trophies, 1);
    assert.equal(s.seats[first]!.hand.length, 6);
    assert.equal(s.trophiesLeft, 2);
    assert.equal(s.phase, 'turn');
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
});
