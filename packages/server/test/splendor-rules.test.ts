import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Player, SplendorCardView, SplendorGem, SplendorGems } from 'shared';
import { buildNoblesDeck } from 'shared';
import { splendorGame, type SplendorState } from '../src/games/splendor/engine.js';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    avatar: { style: 'adventurer', seed: `p${i + 1}` },
    connected: true,
  })) as Player[];
}

function emptyGems(): SplendorGems {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0 };
}

function bonusCard(bonus: SplendorGem, id: string): SplendorCardView {
  return {
    id,
    artKey: 'test',
    level: 1,
    bonus,
    prestige: 0,
    cost: { ...emptyGems() },
  };
}

function playingState(n = 2): SplendorState {
  const s = splendorGame.setup(makePlayers(n)) as SplendorState;
  s.phase = 'playing';
  s.currentPlayerIndex = 0;
  s.endMode = false;
  s.finalRoundNotice = false;
  s.noblePick = undefined;
  return s;
}

function act(s: SplendorState, pid: string, action: Parameters<typeof splendorGame.onAction>[2]): SplendorState {
  return splendorGame.onAction(s, pid, action) as SplendorState;
}

function nobleById(id: string) {
  const n = buildNoblesDeck().find((x) => x.id === id);
  if (!n) throw new Error(`missing noble ${id}`);
  return n;
}

describe('Splendor — action notices', () => {
  it('publishes gem take and noble visit notices on successful actions', () => {
    const s = playingState(2);
    s.nobles = [nobleById('noble-1'), nobleById('noble-2')];
    s.players[0].purchasedCards = [
      ...Array.from({ length: 4 }, (_, i) => bonusCard('white', `w${i}`)),
      ...Array.from({ length: 4 }, (_, i) => bonusCard('blue', `b${i}`)),
    ];

    const next = act(s, 'p1', { type: 'take_gems', colors: ['green'] });

    assert.equal(next.gemTakeNoticeSeq, 1);
    assert.deepEqual(next.gemTakeNotice, {
      playerId: 'p1',
      playerName: 'Player 1',
      colors: ['green'],
    });
    assert.equal(next.nobleVisitNoticeSeq, 1);
    assert.equal(next.nobleVisitNotice?.noble.id, 'noble-1');
    assert.equal(next.nobleVisitNotice?.playerId, 'p1');
  });
});

describe('Splendor — nobles', () => {
  it('auto-claims one eligible noble at end of current player turn', () => {
    const s = playingState(2);
    s.nobles = [nobleById('noble-1'), nobleById('noble-2')];
    s.players[0].purchasedCards = [
      ...Array.from({ length: 4 }, (_, i) => bonusCard('white', `w${i}`)),
      ...Array.from({ length: 4 }, (_, i) => bonusCard('blue', `b${i}`)),
    ];

    const next = act(s, 'p1', { type: 'take_gems', colors: ['green'] });

    assert.equal(next.players[0].nobles.length, 1);
    assert.equal(next.players[0].nobles[0].id, 'noble-1');
    assert.equal(next.nobles.some((n) => n.id === 'noble-1'), false);
    assert.equal(next.currentPlayerIndex, 1);
  });

  it('when two players qualify for the same noble, only the player whose turn ends first receives it', () => {
    const s = playingState(2);
    s.nobles = [nobleById('noble-1')];
    const nobleCards = [
      ...Array.from({ length: 4 }, (_, i) => bonusCard('white', `p1w${i}`)),
      ...Array.from({ length: 4 }, (_, i) => bonusCard('blue', `p1b${i}`)),
    ];
    s.players[0].purchasedCards = nobleCards.map((c, i) => ({ ...c, id: `p1-${i}` }));
    s.players[1].purchasedCards = nobleCards.map((c, i) => ({ ...c, id: `p2-${i}` }));

    const afterA = act(s, 'p1', { type: 'take_gems', colors: ['green'] });
    assert.equal(afterA.players[0].nobles.length, 1);
    assert.equal(afterA.players[1].nobles.length, 0);
    assert.equal(afterA.nobles.length, 0);

    const afterB = act(afterA, 'p2', { type: 'take_gems', colors: ['red'] });
    assert.equal(afterB.players[1].nobles.length, 0, 'B still meets bonuses but noble tile is gone');
  });

  it('each player receives a different noble when they qualify on their own turn end', () => {
    const s = playingState(2);
    s.nobles = [nobleById('noble-1'), nobleById('noble-2')];
    s.players[0].purchasedCards = [
      ...Array.from({ length: 4 }, (_, i) => bonusCard('white', `p1w${i}`)),
      ...Array.from({ length: 4 }, (_, i) => bonusCard('blue', `p1b${i}`)),
    ];
    s.players[1].purchasedCards = [
      ...Array.from({ length: 4 }, (_, i) => bonusCard('blue', `p2b${i}`)),
      ...Array.from({ length: 4 }, (_, i) => bonusCard('green', `p2g${i}`)),
    ];

    const afterA = act(s, 'p1', { type: 'take_gems', colors: ['red'] });
    assert.equal(afterA.players[0].nobles[0]?.id, 'noble-1');
    assert.equal(afterA.players[1].nobles.length, 0);
    assert.equal(afterA.nobles.some((n) => n.id === 'noble-2'), true);

    const afterB = act(afterA, 'p2', { type: 'take_gems', colors: ['red'] });
    assert.equal(afterB.players[1].nobles[0]?.id, 'noble-2');
  });

  it('checks nobles after return_tokens, not before', () => {
    const s = playingState(2);
    s.nobles = [nobleById('noble-1')];
    s.players[0].purchasedCards = [
      ...Array.from({ length: 4 }, (_, i) => bonusCard('white', `w${i}`)),
      ...Array.from({ length: 4 }, (_, i) => bonusCard('blue', `b${i}`)),
    ];
    s.players[0].gems = { white: 3, blue: 3, green: 3, red: 3, black: 3 };

    const afterTake = act(s, 'p1', { type: 'take_gems', colors: ['white', 'blue', 'green'] });
    assert.equal(afterTake.phase, 'return_tokens');
    assert.equal(afterTake.players[0].nobles.length, 0);

    const afterReturn = act(afterTake, 'p1', {
      type: 'return_tokens',
      gems: { white: 3, blue: 3, green: 2, red: 0, black: 0 },
      gold: 0,
    });
    assert.equal(afterReturn.players[0].nobles.length, 1);
    assert.equal(afterReturn.players[0].nobles[0].id, 'noble-1');
  });

  it('enters noble_pick when current player qualifies for multiple nobles', () => {
    const s = playingState(2);
    s.nobles = [nobleById('noble-1'), nobleById('noble-5')];
    s.players[0].purchasedCards = [
      ...Array.from({ length: 4 }, (_, i) => bonusCard('white', `w${i}`)),
      ...Array.from({ length: 4 }, (_, i) => bonusCard('blue', `b${i}`)),
      ...Array.from({ length: 4 }, (_, i) => bonusCard('black', `k${i}`)),
    ];

    const next = act(s, 'p1', { type: 'take_gems', colors: ['green'] });
    assert.equal(next.phase, 'noble_pick');
    assert.deepEqual(next.noblePick?.options.sort(), ['noble-1', 'noble-5']);

    const resolved = act(next, 'p1', { type: 'choose_noble', nobleId: 'noble-5' });
    assert.equal(resolved.players[0].nobles[0]?.id, 'noble-5');
    assert.equal(resolved.currentPlayerIndex, 1);
  });

  it('counts only purchased cards toward noble requirements, not reserved cards', () => {
    const s = playingState(2);
    s.nobles = [nobleById('noble-1')];
    const reserved = bonusCard('white', 'reserved-white');
    s.players[0].purchasedCards = Array.from({ length: 3 }, (_, i) => bonusCard('white', `w${i}`));
    s.players[0].reserved[0] = { card: reserved, fromDeck: true };
    s.players[0].purchasedCards.push(...Array.from({ length: 4 }, (_, i) => bonusCard('blue', `b${i}`)));

    const next = act(s, 'p1', { type: 'take_gems', colors: ['green'] });
    assert.equal(next.players[0].nobles.length, 0, '3 purchased white + reserved white is not enough for noble-1');
  });
});
