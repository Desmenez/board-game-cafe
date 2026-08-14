import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildModernArtDeck,
  type ModernArtArtistId,
  type ModernArtAuctionKind,
  type ModernArtCard,
  type Player,
} from 'shared';
import { applyAction, beginScoring, createInitialState } from '../src/games/modern-art/rules.js';
import { toPlayerView } from '../src/games/modern-art/view.js';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    avatar: { style: 'adventurer', seed: `p${i + 1}` },
    connected: true,
  })) as Player[];
}

function card(id: string, artist: ModernArtArtistId, auction: ModernArtAuctionKind): ModernArtCard {
  return { id, artist, auction, copy: 1 };
}

function pad(prefix: string, n: number, start = 0): ModernArtCard[] {
  return Array.from({ length: n }, (_, i) => card(`${prefix}-${start + i}`, 'silveira', 'open'));
}

function setup3(p1: ModernArtCard[], p2: ModernArtCard[], p3: ModernArtCard[]) {
  const deck = [...p1, ...p2, ...p3, ...pad('extra', 40)];
  return createInitialState(makePlayers(3), { deck });
}

function hand10(first: ModernArtCard[], prefix: string): ModernArtCard[] {
  return [...first, ...pad(prefix, 10 - first.length)];
}

function closeOpen(s: ReturnType<typeof createInitialState>) {
  const a = s.auction!;
  let next = s;
  for (const id of s.playerOrder) {
    if (a.kind === 'open' && id !== a.highestBidderId) {
      if (next.auction?.passedSinceBid.includes(id)) continue;
      next = applyAction(next, id, { type: 'pass' });
    }
  }
  return applyAction(next, next.auction!.auctioneerId, { type: 'close_open_auction' });
}

describe('Modern Art — deck & setup', () => {
  it('builds 68 paintings', () => {
    assert.equal(buildModernArtDeck().length, 68);
  });

  it('rejects wrong player counts', () => {
    assert.throws(() => createInitialState(makePlayers(2)));
    assert.throws(() => createInitialState(makePlayers(6)));
  });

  it('deals 10/9/8 in round 1 for 3/4/5 players and starts at $100', () => {
    const s3 = createInitialState(makePlayers(3));
    const s4 = createInitialState(makePlayers(4));
    const s5 = createInitialState(makePlayers(5));
    for (const id of s3.playerOrder) assert.equal(s3.seats[id]!.hand.length, 10);
    for (const id of s4.playerOrder) assert.equal(s4.seats[id]!.hand.length, 9);
    for (const id of s5.playerOrder) assert.equal(s5.seats[id]!.hand.length, 8);
    assert.equal(s3.drawPile.length, 68 - 30);
    assert.equal(s3.auctioneerId, 'p1');
    assert.equal(s3.phase, 'offer');
    assert.equal(s3.seats.p1!.money, 100);
  });
});

describe('Modern Art — fifth painting & scoring', () => {
  it('ends the round on an artist’s 5th painting without auctioning it', () => {
    const c5 = card('c5', 'carvalho', 'open');
    let s = setup3(hand10([c5], 'a'), hand10([], 'b'), hand10([], 'c'));
    s.playedThisRound.carvalho = 4;
    s = applyAction(s, 'p1', { type: 'offer_painting', cardId: 'c5' });
    assert.equal(s.phase, 'round_scoring');
    assert.equal(s.auction, null);
    assert.ok(!s.seats.p1!.gallery.some((c) => c.id === 'c5'));
    assert.ok(!s.seats.p1!.hand.some((c) => c.id === 'c5'));
    assert.equal(s.roundRanks?.find((r) => r.artist === 'carvalho')?.place, 1);
  });

  it('does not wait for a double second when the first card is the 5th', () => {
    const d1 = card('d1', 'carvalho', 'double');
    let s = setup3(hand10([d1], 'a'), hand10([], 'b'), hand10([], 'c'));
    s.playedThisRound.carvalho = 4;
    s = applyAction(s, 'p1', { type: 'offer_painting', cardId: 'd1' });
    assert.equal(s.phase, 'round_scoring');
    assert.equal(s.doubleWait, null);
  });

  it('unsells both paintings when the double second is the 5th', () => {
    const d1 = card('d1', 'carvalho', 'double');
    const o2 = card('o2', 'carvalho', 'open');
    let s = setup3(hand10([d1], 'a'), hand10([o2], 'b'), hand10([], 'c'));
    s.playedThisRound.carvalho = 3;
    s = applyAction(s, 'p1', { type: 'offer_painting', cardId: 'd1' });
    assert.equal(s.phase, 'double_wait');
    s = applyAction(s, 'p1', { type: 'skip_double_second' });
    s = applyAction(s, 'p2', { type: 'play_double_second', cardId: 'o2' });
    assert.equal(s.phase, 'round_scoring');
    assert.equal(s.seats.p1!.gallery.length, 0);
    assert.equal(s.seats.p2!.gallery.length, 0);
  });

  it('pays only top-3 this round and accumulates column tiles', () => {
    const s = setup3(hand10([], 'a'), hand10([], 'b'), hand10([], 'c'));
    s.playedThisRound = { carvalho: 5, thaler: 3, melim: 1, martins: 0, silveira: 0 };
    s.seats.p1!.gallery = [card('g1', 'carvalho', 'open'), card('g2', 'martins', 'open')];
    s.seats.p2!.gallery = [card('g3', 'thaler', 'open')];
    beginScoring(s);
    assert.equal(s.valueBoard.carvalho[0], 30);
    assert.equal(s.valueBoard.thaler[0], 20);
    assert.equal(s.valueBoard.melim[0], 10);
    assert.equal(s.seats.p1!.money, 130);
    assert.equal(s.seats.p2!.money, 120);
    assert.equal(s.seats.p1!.gallery.length, 0);

    s.round = 2;
    s.playedThisRound = { carvalho: 4, thaler: 4, martins: 2, melim: 0, silveira: 0 };
    s.seats.p1!.gallery = [card('g4', 'carvalho', 'open')];
    s.seats.p2!.gallery = [card('g5', 'thaler', 'open')];
    s.seats.p3!.gallery = [card('g6', 'melim', 'open')];
    beginScoring(s);
    assert.equal(s.valueBoard.carvalho[1], 30);
    assert.equal(s.valueBoard.thaler[1], 20);
    assert.equal(s.valueBoard.martins[1], 10);
    assert.equal(s.roundRanks?.find((r) => r.artist === 'carvalho')?.saleValue, 60);
    assert.equal(s.roundRanks?.find((r) => r.artist === 'melim')?.saleValue, 0);
    assert.equal(s.seats.p1!.money, 190);
    assert.equal(s.seats.p2!.money, 160);
    assert.equal(s.seats.p3!.money, 100);
  });

  it('breaks count ties toward Carvalho (left on the board)', () => {
    const s = setup3(hand10([], 'a'), hand10([], 'b'), hand10([], 'c'));
    s.playedThisRound = { carvalho: 3, thaler: 3, melim: 3, martins: 3, silveira: 3 };
    beginScoring(s);
    assert.equal(s.roundRanks?.find((r) => r.artist === 'carvalho')?.place, 1);
    assert.equal(s.roundRanks?.find((r) => r.artist === 'thaler')?.place, 2);
    assert.equal(s.roundRanks?.find((r) => r.artist === 'melim')?.place, 3);
    assert.equal(s.roundRanks?.find((r) => r.artist === 'martins')?.place, null);
  });
});

describe('Modern Art — auctions', () => {
  it('open: winner pays the auctioneer', () => {
    const o1 = card('o1', 'carvalho', 'open');
    let s = setup3(hand10([o1], 'a'), hand10([], 'b'), hand10([], 'c'));
    s = applyAction(s, 'p1', { type: 'offer_painting', cardId: 'o1' });
    assert.equal(s.auction?.kind, 'open');
    s = applyAction(s, 'p2', { type: 'bid', amount: 15 });
    s = closeOpen(s);
    assert.equal(s.phase, 'offer');
    assert.equal(s.seats.p2!.money, 85);
    assert.equal(s.seats.p1!.money, 115);
    assert.equal(s.seats.p2!.gallery[0]?.id, 'o1');
    assert.equal(s.auctioneerId, 'p2');
  });

  it('open: auctioneer win pays the bank', () => {
    const o1 = card('o1', 'thaler', 'open');
    let s = setup3(hand10([o1], 'a'), hand10([], 'b'), hand10([], 'c'));
    s = applyAction(s, 'p1', { type: 'offer_painting', cardId: 'o1' });
    s = applyAction(s, 'p1', { type: 'bid', amount: 20 });
    s = closeOpen(s);
    assert.equal(s.seats.p1!.money, 80);
    assert.equal(s.seats.p2!.money, 100);
    assert.equal(s.seats.p3!.money, 100);
    assert.equal(s.seats.p1!.gallery[0]?.id, 'o1');
  });

  it('once-around: each player acts once, last is the auctioneer', () => {
    const o1 = card('oa1', 'melim', 'once_around');
    let s = setup3(hand10([o1], 'a'), hand10([], 'b'), hand10([], 'c'));
    s = applyAction(s, 'p1', { type: 'offer_painting', cardId: 'oa1' });
    assert.equal(s.auction?.nextBidderId, 'p2');
    s = applyAction(s, 'p2', { type: 'bid', amount: 10 });
    assert.equal(s.auction?.nextBidderId, 'p3');
    s = applyAction(s, 'p3', { type: 'pass' });
    s = applyAction(s, 'p1', { type: 'pass' });
    assert.equal(s.phase, 'offer');
    assert.equal(s.seats.p2!.gallery[0]?.id, 'oa1');
    assert.equal(s.seats.p2!.money, 90);
    assert.equal(s.seats.p1!.money, 110);
  });

  it('sealed: hides others’ amounts until resolved; auctioneer wins ties', () => {
    const o1 = card('s1', 'martins', 'sealed');
    let s = setup3(hand10([o1], 'a'), hand10([], 'b'), hand10([], 'c'));
    s = applyAction(s, 'p1', { type: 'offer_painting', cardId: 's1' });
    s = applyAction(s, 'p2', { type: 'submit_sealed', amount: 12 });
    const v1 = toPlayerView(s, 'p1');
    const v2 = toPlayerView(s, 'p2');
    assert.equal(v1.auction?.sealedBids.p2, undefined);
    assert.equal(v2.auction?.sealedBids.p2, 12);
    assert.equal(v1.seats.find((seat) => seat.id === 'p2')?.submittedSealed, true);
    assert.equal(v1.seats[0]?.money, null);
    assert.equal(v1.you.money, 100);
    assert.equal(v2.you.money, 100);

    s = applyAction(s, 'p3', { type: 'submit_sealed', amount: 12 });
    s = applyAction(s, 'p1', { type: 'submit_sealed', amount: 12 });
    assert.equal(s.seats.p1!.gallery[0]?.id, 's1');
    assert.equal(s.seats.p1!.money, 88);
    assert.equal(s.seats.p2!.money, 100);
  });

  it('fixed: left player may buy; all pass forces auctioneer to pay the bank', () => {
    const f1 = card('f1', 'carvalho', 'fixed');
    let s = setup3(hand10([f1], 'a'), hand10([], 'b'), hand10([], 'c'));
    s = applyAction(s, 'p1', { type: 'offer_painting', cardId: 'f1' });
    assert.equal(s.phase, 'set_price');
    s = applyAction(s, 'p1', { type: 'set_fixed_price', amount: 25 });
    s = applyAction(s, 'p2', { type: 'buy_fixed' });
    assert.equal(s.seats.p2!.money, 75);
    assert.equal(s.seats.p1!.money, 125);
    assert.equal(s.seats.p2!.gallery[0]?.id, 'f1');

    const f2 = card('f2', 'thaler', 'fixed');
    s.auctioneerId = 'p1';
    s.phase = 'offer';
    s.seats.p1!.hand.push(f2);
    s = applyAction(s, 'p1', { type: 'offer_painting', cardId: 'f2' });
    s = applyAction(s, 'p1', { type: 'set_fixed_price', amount: 10 });
    s = applyAction(s, 'p2', { type: 'pass' });
    s = applyAction(s, 'p3', { type: 'pass' });
    assert.equal(s.seats.p1!.gallery.some((c) => c.id === 'f2'), true);
    assert.equal(s.seats.p1!.money, 115);
  });

  it('rejects a fixed price above the auctioneer’s money', () => {
    const f1 = card('f1', 'carvalho', 'fixed');
    let s = setup3(hand10([f1], 'a'), hand10([], 'b'), hand10([], 'c'));
    s = applyAction(s, 'p1', { type: 'offer_painting', cardId: 'f1' });
    assert.throws(() => applyAction(s, 'p1', { type: 'set_fixed_price', amount: 101 }));
  });

  it('double: second card makes a new auctioneer who takes the sale', () => {
    const d1 = card('d1', 'melim', 'double');
    const o2 = card('o2', 'melim', 'open');
    let s = setup3(hand10([d1], 'a'), hand10([o2], 'b'), hand10([], 'c'));
    s = applyAction(s, 'p1', { type: 'offer_painting', cardId: 'd1' });
    s = applyAction(s, 'p1', { type: 'skip_double_second' });
    s = applyAction(s, 'p2', { type: 'play_double_second', cardId: 'o2' });
    assert.equal(s.auctioneerId, 'p2');
    assert.equal(s.auction?.paintings.length, 2);
    assert.equal(s.auction?.kind, 'open');
    s = applyAction(s, 'p3', { type: 'bid', amount: 18 });
    s = closeOpen(s);
    assert.equal(s.seats.p3!.gallery.length, 2);
    assert.equal(s.seats.p3!.money, 82);
    assert.equal(s.seats.p2!.money, 118);
    assert.equal(s.seats.p1!.money, 100);
  });

  it('double: if nobody plays a second, the original auctioneer takes the first free', () => {
    const d1 = card('d1', 'thaler', 'double');
    let s = setup3(hand10([d1], 'a'), hand10([], 'b'), hand10([], 'c'));
    s = applyAction(s, 'p1', { type: 'offer_painting', cardId: 'd1' });
    s = applyAction(s, 'p1', { type: 'skip_double_second' });
    s = applyAction(s, 'p2', { type: 'skip_double_second' });
    s = applyAction(s, 'p3', { type: 'skip_double_second' });
    assert.equal(s.seats.p1!.gallery[0]?.id, 'd1');
    assert.equal(s.seats.p1!.money, 100);
    assert.equal(s.phase, 'offer');
    assert.equal(s.auctioneerId, 'p2');
  });
});

describe('Modern Art — player view', () => {
  it('hides other players’ money', () => {
    const s = setup3(hand10([], 'a'), hand10([], 'b'), hand10([], 'c'));
    s.seats.p2!.money = 55;
    const v = toPlayerView(s, 'p1');
    assert.equal(v.you.money, 100);
    assert.equal(v.seats.find((seat) => seat.id === 'p2')?.handCount, 10);
    assert.equal(v.seats.find((seat) => seat.id === 'p2')?.money, null);
  });
});
