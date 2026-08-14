import {
  MODERN_ART_ARTISTS,
  MODERN_ART_DEAL_BY_PLAYERS,
  MODERN_ART_MAX_PLAYERS,
  MODERN_ART_MIN_PLAYERS,
  MODERN_ART_ROUND_END_COUNT,
  MODERN_ART_ROUNDS,
  MODERN_ART_STARTING_MONEY,
  buildModernArtDeck,
  emptyModernArtPlayed,
  emptyModernArtValueBoard,
  modernArtArtistLabel,
  modernArtSaleValue,
  type ModernArtAction,
  type ModernArtArtistId,
  type ModernArtArtistRank,
  type ModernArtAuction,
  type ModernArtCard,
  type ModernArtLiveAuctionKind,
  type ModernArtState,
  type ModernArtValueAmount,
  type Player,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

function reject(message: string): never {
  throw new GameActionRejectedError(message);
}

export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function cloneState(state: ModernArtState): ModernArtState {
  return structuredClone(state);
}

function seat(state: ModernArtState, id: string) {
  const s = state.seats[id];
  if (!s) reject('ไม่พบผู้เล่น');
  return s;
}

export function nextPlayerId(state: ModernArtState, fromId: string): string {
  const order = state.playerOrder;
  const idx = order.indexOf(fromId);
  if (idx < 0) reject('ไม่พบผู้เล่น');
  return order[(idx + 1) % order.length]!;
}

function allHandsEmpty(state: ModernArtState): boolean {
  return state.playerOrder.every((id) => seat(state, id).hand.length === 0);
}

function dealRound(state: ModernArtState): void {
  const counts = MODERN_ART_DEAL_BY_PLAYERS[state.playerOrder.length];
  if (!counts) reject('จำนวนผู้เล่นไม่ถูกต้อง');
  const n = counts[state.round - 1] ?? 0;
  if (n <= 0) return;
  for (const id of state.playerOrder) {
    const s = seat(state, id);
    for (let i = 0; i < n; i += 1) {
      const card = state.drawPile.shift();
      if (!card) break;
      s.hand.push(card);
    }
  }
}

function advanceAuctioneer(state: ModernArtState, fromId: string): void {
  let id = nextPlayerId(state, fromId);
  const start = id;
  while (seat(state, id).hand.length === 0) {
    id = nextPlayerId(state, id);
    if (id === start) break;
  }
  state.auctioneerId = id;
}

function liveKind(card: ModernArtCard): ModernArtLiveAuctionKind {
  if (card.auction === 'double') reject('ประมูลคู่ต้องมีใบที่สอง');
  return card.auction;
}

function startAuction(
  state: ModernArtState,
  auctioneerId: string,
  paintings: ModernArtCard[],
  kind: ModernArtLiveAuctionKind,
): void {
  const auction: ModernArtAuction = {
    kind,
    auctioneerId,
    paintings,
    currentBid: 0,
    highestBidderId: null,
    passedSinceBid: [],
    nextBidderId: null,
    actedIds: [],
    sealedBids: {},
    fixedPrice: null,
    nextBuyerId: null,
  };
  state.auction = auction;
  state.doubleWait = null;
  state.auctioneerId = auctioneerId;

  if (kind === 'fixed') {
    state.phase = 'set_price';
    return;
  }
  state.phase = 'auction';
  if (kind === 'once_around') {
    auction.nextBidderId = nextPlayerId(state, auctioneerId);
  }
}

function givePaintings(state: ModernArtState, winnerId: string, paintings: ModernArtCard[]): void {
  seat(state, winnerId).gallery.push(...paintings);
}

function settleSale(
  state: ModernArtState,
  winnerId: string,
  amount: number,
  auctioneerId: string,
  paintings: ModernArtCard[],
): void {
  const winner = seat(state, winnerId);
  if (amount > 0) {
    if (winner.money < amount) reject('เงินไม่พอ');
    winner.money -= amount;
    if (winnerId !== auctioneerId) {
      seat(state, auctioneerId).money += amount;
    }
  }
  givePaintings(state, winnerId, paintings);
  const names = paintings.map((p) => modernArtArtistLabel(p.artist)).join(' + ');
  if (amount <= 0) {
    state.lastEvent = `${winner.name} ได้ ${names} ฟรี`;
  } else if (winnerId === auctioneerId) {
    state.lastEvent = `${winner.name} ซื้อ ${names} $${amount} (จ่ายธนาคาร)`;
  } else {
    state.lastEvent = `${winner.name} ซื้อ ${names} $${amount} จาก ${seat(state, auctioneerId).name}`;
  }
  finishAuction(state, auctioneerId);
}

function finishAuction(state: ModernArtState, auctioneerId: string): void {
  state.auction = null;
  state.doubleWait = null;
  state.phase = 'offer';
  advanceAuctioneer(state, auctioneerId);
  if (allHandsEmpty(state)) {
    state.lastOffererId = auctioneerId;
    beginScoring(state);
  }
}

function resolveAuction(state: ModernArtState): void {
  const a = state.auction;
  if (!a) reject('ไม่มีประมูล');
  const winnerId = a.highestBidderId ?? a.auctioneerId;
  const amount = a.highestBidderId ? a.currentBid : 0;
  settleSale(state, winnerId, amount, a.auctioneerId, a.paintings);
}

function resolveSealed(state: ModernArtState): void {
  const a = state.auction;
  if (!a) reject('ไม่มีประมูล');
  let best = 0;
  for (const id of state.playerOrder) {
    const bid = a.sealedBids[id] ?? 0;
    if (bid > best) best = bid;
  }
  if (best <= 0) {
    settleSale(state, a.auctioneerId, 0, a.auctioneerId, a.paintings);
    return;
  }
  let cursor = a.auctioneerId;
  for (let i = 0; i < state.playerOrder.length; i += 1) {
    if ((a.sealedBids[cursor] ?? 0) === best) {
      settleSale(state, cursor, best, a.auctioneerId, a.paintings);
      return;
    }
    cursor = nextPlayerId(state, cursor);
  }
  settleSale(state, a.auctioneerId, 0, a.auctioneerId, a.paintings);
}

function rankArtists(state: ModernArtState): ModernArtArtistRank[] {
  const counted = MODERN_ART_ARTISTS
    .map((artist, boardIndex) => ({
      artist,
      count: state.playedThisRound[artist],
      boardIndex,
    }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count || a.boardIndex - b.boardIndex);

  const placeValues: ModernArtValueAmount[] = [30, 20, 10];
  return MODERN_ART_ARTISTS.map((artist) => {
    const idx = counted.findIndex((c) => c.artist === artist);
    const count = state.playedThisRound[artist];
    const place = idx >= 0 && idx < 3 ? ((idx + 1) as 1 | 2 | 3) : null;
    const roundValue = place ? placeValues[place - 1]! : null;
    return {
      artist,
      count,
      place,
      roundValue,
      saleValue: 0,
    };
  });
}

export function beginScoring(state: ModernArtState): void {
  state.auction = null;
  state.doubleWait = null;
  const ranks = rankArtists(state);
  const roundIdx = state.round - 1;
  for (const row of ranks) {
    if (row.roundValue) {
      state.valueBoard[row.artist][roundIdx] = row.roundValue;
    }
    row.saleValue = modernArtSaleValue(state.valueBoard, row.artist, row.place != null);
  }
  const payouts = state.playerOrder.map((id) => {
    const s = seat(state, id);
    let amount = 0;
    for (const card of s.gallery) {
      const rank = ranks.find((r) => r.artist === card.artist);
      amount += rank?.saleValue ?? 0;
    }
    s.money += amount;
    const paintingCount = s.gallery.length;
    s.gallery = [];
    return { playerId: id, name: s.name, amount, paintingCount };
  });
  state.roundRanks = ranks;
  state.roundPayouts = payouts;
  state.phase = 'round_scoring';
  state.lastEvent = `จบรอบ ${state.round} — ขายภาพให้ธนาคาร`;
}

function maybeEndRoundFromPlay(
  state: ModernArtState,
  playerId: string,
  artist: ModernArtArtistId,
): boolean {
  if (state.playedThisRound[artist] >= MODERN_ART_ROUND_END_COUNT || allHandsEmpty(state)) {
    state.lastOffererId = playerId;
    beginScoring(state);
    return true;
  }
  return false;
}

function takeFromHand(state: ModernArtState, playerId: string, cardId: string): ModernArtCard {
  const s = seat(state, playerId);
  const idx = s.hand.findIndex((c) => c.id === cardId);
  if (idx < 0) reject('ไม่มีการ์ดนี้ในมือ');
  return s.hand.splice(idx, 1)[0]!;
}

export function createInitialState(
  players: Player[],
  options?: { deck?: ModernArtCard[] },
): ModernArtState {
  if (players.length < MODERN_ART_MIN_PLAYERS || players.length > MODERN_ART_MAX_PLAYERS) {
    reject(`Modern Art เล่นได้ ${MODERN_ART_MIN_PLAYERS}–${MODERN_ART_MAX_PLAYERS} คน`);
  }
  const deck = options?.deck ? options.deck.map((c) => ({ ...c })) : shuffleInPlace(buildModernArtDeck());
  const seats: ModernArtState['seats'] = {};
  const playerOrder = players.map((p) => p.id);
  for (const p of players) {
    seats[p.id] = {
      id: p.id,
      name: p.name,
      money: MODERN_ART_STARTING_MONEY,
      hand: [],
      gallery: [],
    };
  }
  const state: ModernArtState = {
    phase: 'offer',
    round: 1,
    playerOrder,
    seats,
    drawPile: deck,
    auctioneerId: playerOrder[0]!,
    lastOffererId: null,
    playedThisRound: emptyModernArtPlayed(),
    valueBoard: emptyModernArtValueBoard(),
    auction: null,
    doubleWait: null,
    roundRanks: null,
    roundPayouts: null,
    lastEvent: 'เริ่มรอบ 1 — เลือกภาพเพื่อประมูล',
    result: null,
  };
  dealRound(state);
  return state;
}

function applyOffer(state: ModernArtState, playerId: string, cardId: string): void {
  if (state.phase !== 'offer') reject('ตอนนี้เลือกภาพไม่ได้');
  if (state.auctioneerId !== playerId) reject('ยังไม่ถึงตาคุณถือค้อน');
  const card = takeFromHand(state, playerId, cardId);
  state.playedThisRound[card.artist] += 1;
  if (maybeEndRoundFromPlay(state, playerId, card.artist)) return;
  if (card.auction === 'double') {
    state.doubleWait = {
      originalAuctioneerId: playerId,
      firstCard: card,
      currentChooserId: playerId,
    };
    state.phase = 'double_wait';
    state.lastEvent = `${seat(state, playerId).name} เปิดประมูลคู่ — ${modernArtArtistLabel(card.artist)}`;
    return;
  }
  startAuction(state, playerId, [card], liveKind(card));
  state.lastEvent = `${seat(state, playerId).name} ประมูล ${modernArtArtistLabel(card.artist)}`;
}

function applyPlayDoubleSecond(state: ModernArtState, playerId: string, cardId: string): void {
  const wait = state.doubleWait;
  if (state.phase !== 'double_wait' || !wait) reject('ตอนนี้ลงใบที่สองไม่ได้');
  if (wait.currentChooserId !== playerId) reject('ยังไม่ถึงตาคุณลงใบที่สอง');
  const card = takeFromHand(state, playerId, cardId);
  if (card.artist !== wait.firstCard.artist) {
    seat(state, playerId).hand.push(card);
    reject('ต้องเป็นศิลปินคนเดียวกัน');
  }
  if (card.auction === 'double') {
    seat(state, playerId).hand.push(card);
    reject('ใบที่สองห้ามเป็นประมูลคู่');
  }
  state.playedThisRound[card.artist] += 1;
  const paintings = [wait.firstCard, card];
  if (maybeEndRoundFromPlay(state, playerId, card.artist)) return;
  startAuction(state, playerId, paintings, liveKind(card));
  state.lastEvent = `${seat(state, playerId).name} ลงใบที่สอง — ประมูลคู่ ${modernArtArtistLabel(card.artist)}`;
}

function applySkipDouble(state: ModernArtState, playerId: string): void {
  const wait = state.doubleWait;
  if (state.phase !== 'double_wait' || !wait) reject('ตอนนี้ข้ามใบที่สองไม่ได้');
  if (wait.currentChooserId !== playerId) reject('ยังไม่ถึงตาคุณ');
  const next = nextPlayerId(state, playerId);
  if (next === wait.originalAuctioneerId) {
    givePaintings(state, wait.originalAuctioneerId, [wait.firstCard]);
    state.lastEvent = `${seat(state, wait.originalAuctioneerId).name} ได้ภาพประมูลคู่ฟรี`;
    finishAuction(state, wait.originalAuctioneerId);
    return;
  }
  wait.currentChooserId = next;
  state.lastEvent = `${seat(state, playerId).name} ไม่ลงใบที่สอง`;
}

function applySetPrice(state: ModernArtState, playerId: string, amount: number): void {
  const a = state.auction;
  if (state.phase !== 'set_price' || !a || a.kind !== 'fixed') reject('ตอนนี้ตั้งราคาไม่ได้');
  if (a.auctioneerId !== playerId) reject('ผู้ประมูลเท่านั้นที่ตั้งราคาได้');
  if (!Number.isInteger(amount) || amount < 1) reject('ราคาต้องเป็นจำนวนเต็มอย่างน้อย $1');
  if (amount > seat(state, playerId).money) reject('ตั้งเกินเงินที่มีไม่ได้');
  a.fixedPrice = amount;
  a.nextBuyerId = nextPlayerId(state, playerId);
  state.phase = 'auction';
  state.lastEvent = `${seat(state, playerId).name} ตั้งราคา $${amount}`;
}

function applyBid(state: ModernArtState, playerId: string, amount: number): void {
  const a = state.auction;
  if (state.phase !== 'auction' || !a) reject('ตอนนี้สู้ราคาไม่ได้');
  if (a.kind !== 'open' && a.kind !== 'once_around') reject('ประมูลนี้สู้ราคาไม่ได้');
  if (a.kind === 'once_around' && a.nextBidderId !== playerId) reject('ยังไม่ถึงตาคุณสู้ราคา');
  if (!Number.isInteger(amount) || amount < 1) reject('ต้องประมูลเป็นจำนวนเต็มอย่างน้อย $1');
  if (amount <= a.currentBid) reject('ต้องสูงกว่ายอดปัจจุบัน');
  if (amount > seat(state, playerId).money) reject('เงินไม่พอ');

  a.currentBid = amount;
  a.highestBidderId = playerId;
  a.passedSinceBid = [];

  if (a.kind === 'once_around') {
    a.actedIds.push(playerId);
    if (playerId === a.auctioneerId) {
      resolveAuction(state);
      return;
    }
    a.nextBidderId = nextPlayerId(state, playerId);
  }
  state.lastEvent = `${seat(state, playerId).name} บิด $${amount}`;
}

function applyPass(state: ModernArtState, playerId: string): void {
  const a = state.auction;
  if (state.phase !== 'auction' || !a) reject('ตอนนี้ผ่านไม่ได้');

  if (a.kind === 'open') {
    if (!a.passedSinceBid.includes(playerId)) a.passedSinceBid.push(playerId);
    state.lastEvent = `${seat(state, playerId).name} ผ่าน`;
    return;
  }

  if (a.kind === 'once_around') {
    if (a.nextBidderId !== playerId) reject('ยังไม่ถึงตาคุณ');
    a.actedIds.push(playerId);
    state.lastEvent = `${seat(state, playerId).name} ผ่าน`;
    if (playerId === a.auctioneerId) {
      resolveAuction(state);
      return;
    }
    a.nextBidderId = nextPlayerId(state, playerId);
    return;
  }

  if (a.kind === 'fixed') {
    if (a.nextBuyerId !== playerId) reject('ยังไม่ถึงตาคุณ');
    if (playerId === a.auctioneerId) reject('ผู้ประมูลผ่านไม่ได้');
    const next = nextPlayerId(state, playerId);
    if (next === a.auctioneerId) {
      const price = a.fixedPrice ?? 0;
      settleSale(state, a.auctioneerId, price, a.auctioneerId, a.paintings);
      return;
    }
    a.nextBuyerId = next;
    state.lastEvent = `${seat(state, playerId).name} ไม่ซื้อ`;
    return;
  }

  reject('ประมูลนี้ผ่านไม่ได้');
}

function applyBuyFixed(state: ModernArtState, playerId: string): void {
  const a = state.auction;
  if (state.phase !== 'auction' || !a || a.kind !== 'fixed') reject('ตอนนี้ซื้อราคาคงที่ไม่ได้');
  if (a.nextBuyerId !== playerId) reject('ยังไม่ถึงตาคุณ');
  const price = a.fixedPrice;
  if (price == null || price < 1) reject('ยังไม่ได้ตั้งราคา');
  if (seat(state, playerId).money < price) reject('เงินไม่พอ');
  settleSale(state, playerId, price, a.auctioneerId, a.paintings);
}

function applySubmitSealed(state: ModernArtState, playerId: string, amount: number): void {
  const a = state.auction;
  if (state.phase !== 'auction' || !a || a.kind !== 'sealed') reject('ตอนนี้ประมูลลับไม่ได้');
  if (a.sealedBids[playerId] != null) reject('ส่งซองแล้ว');
  if (!Number.isInteger(amount) || amount < 0) reject('ยอดต้องเป็นจำนวนเต็ม');
  if (amount > seat(state, playerId).money) reject('เงินไม่พอ');
  a.sealedBids[playerId] = amount;
  state.lastEvent = `${seat(state, playerId).name} ส่งซองแล้ว`;
  const allIn = state.playerOrder.every((id) => a.sealedBids[id] != null);
  if (allIn) resolveSealed(state);
}

function canCloseOpen(state: ModernArtState, playerId: string): boolean {
  const a = state.auction;
  if (state.phase !== 'auction' || !a || a.kind !== 'open') return false;
  if (a.auctioneerId !== playerId) return false;
  const others = state.playerOrder.filter((id) =>
    a.currentBid > 0 && a.highestBidderId ? id !== a.highestBidderId : id !== a.auctioneerId,
  );
  return others.every((id) => a.passedSinceBid.includes(id));
}

function applyCloseOpen(state: ModernArtState, playerId: string): void {
  if (!canCloseOpen(state, playerId)) reject('ยังเคาะประมูลไม่ได้ — รอคนอื่นผ่าน');
  resolveAuction(state);
}

function endGame(state: ModernArtState): void {
  const scores = state.playerOrder.map((id) => ({ id, money: seat(state, id).money }));
  const best = Math.max(...scores.map((s) => s.money));
  const winners = scores.filter((s) => s.money === best).map((s) => s.id);
  state.phase = 'game_over';
  state.result = {
    winners,
    reason: winners.length > 1 ? 'เสมอกัน — เงินมากสุด' : 'เงินมากสุด',
  };
  state.lastEvent = 'จบเกม';
}

function applyAckRound(state: ModernArtState, _playerId: string): void {
  if (state.phase !== 'round_scoring') reject('ยังไม่จบรอบ');
  if (state.round >= MODERN_ART_ROUNDS) {
    endGame(state);
    return;
  }
  const from = state.lastOffererId ?? state.auctioneerId;
  state.round += 1;
  state.playedThisRound = emptyModernArtPlayed();
  state.roundRanks = null;
  state.roundPayouts = null;
  state.lastOffererId = null;
  dealRound(state);
  if (allHandsEmpty(state)) {
    endGame(state);
    return;
  }
  state.phase = 'offer';
  advanceAuctioneer(state, from);
  state.lastEvent = `เริ่มรอบ ${state.round}`;
}

export function applyAction(
  state: ModernArtState,
  playerId: string,
  action: ModernArtAction,
): ModernArtState {
  const next = cloneState(state);
  if (!next.seats[playerId]) reject('ไม่พบผู้เล่น');
  if (next.phase === 'game_over') reject('เกมจบแล้ว');
  switch (action.type) {
    case 'offer_painting':
      applyOffer(next, playerId, action.cardId);
      break;
    case 'play_double_second':
      applyPlayDoubleSecond(next, playerId, action.cardId);
      break;
    case 'skip_double_second':
      applySkipDouble(next, playerId);
      break;
    case 'set_fixed_price':
      applySetPrice(next, playerId, action.amount);
      break;
    case 'bid':
      applyBid(next, playerId, action.amount);
      break;
    case 'pass':
      applyPass(next, playerId);
      break;
    case 'buy_fixed':
      applyBuyFixed(next, playerId);
      break;
    case 'submit_sealed':
      applySubmitSealed(next, playerId, action.amount);
      break;
    case 'close_open_auction':
      applyCloseOpen(next, playerId);
      break;
    case 'ack_round':
      applyAckRound(next, playerId);
      break;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
  return next;
}

export { canCloseOpen };
