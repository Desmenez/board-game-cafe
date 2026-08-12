import {
  SKULL_COLORS,
  type SkullAction,
  type SkullDisc,
  type SkullPendingDiscard,
  type SkullSeat,
  type SkullStackDisc,
  type SkullState,
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

export function cloneState(state: SkullState): SkullState {
  return structuredClone(state);
}

export function activeSeats(state: SkullState): SkullSeat[] {
  return state.playerOrder
    .map((id) => state.seats[id]!)
    .filter((s) => !s.eliminated);
}

export function nextClockwiseId(state: SkullState, fromId: string): string {
  const active = activeSeats(state).map((s) => s.id);
  if (active.length === 0) return fromId;
  const idx = active.indexOf(fromId);
  if (idx < 0) return active[0]!;
  return active[(idx + 1) % active.length]!;
}

export function discsInPlay(state: SkullState): number {
  return activeSeats(state).reduce((n, s) => n + s.stack.length, 0);
}

export function makeStartingHand(color: (typeof SKULL_COLORS)[number], playerId: string): SkullDisc[] {
  return [
    { id: `${playerId}-flower-1`, color, face: 'flower' },
    { id: `${playerId}-flower-2`, color, face: 'flower' },
    { id: `${playerId}-flower-3`, color, face: 'flower' },
    { id: `${playerId}-skull`, color, face: 'skull' },
  ];
}

export function createInitialState(players: Player[]): SkullState {
  const n = players.length;
  if (n < 3 || n > 6) {
    throw new Error('Skull ต้องมีผู้เล่น 3–6 คน');
  }

  const order = shuffleInPlace(players.map((p) => p.id));
  const colors = shuffleInPlace([...SKULL_COLORS]).slice(0, n);
  const seats: Record<string, SkullSeat> = {};

  order.forEach((id, i) => {
    const p = players.find((x) => x.id === id)!;
    const color = colors[i]!;
    seats[id] = {
      id,
      name: p.name,
      color,
      hand: makeStartingHand(color, id),
      stack: [],
      wins: 0,
      eliminated: false,
      hasLastChance: false,
      usedLastChance: false,
      passed: false,
    };
  });

  const firstPlayerId = order[0]!;

  return {
    phase: 'opening_place',
    playerOrder: order,
    seats,
    firstPlayerId,
    activePlayerId: null,
    challengerId: null,
    currentBid: 0,
    flippedCount: 0,
    pendingDiscard: null,
    discardReveal: null,
    nextFirstPlayerId: null,
    lastChanceHolderId: null,
    pendingLastChanceId: null,
    round: 1,
    lastEvent: 'วางดิสก์แรกบนเสื่อ — ผู้เริ่มวางทีหลังสุด',
    result: null,
    roundOutcome: null,
    pendingAcks: [],
  };
}

function takeFromHand(seat: SkullSeat, discId: string): SkullDisc {
  const idx = seat.hand.findIndex((d) => d.id === discId);
  if (idx < 0) reject('ไม่มีดิสก์นี้ในมือ');
  const [disc] = seat.hand.splice(idx, 1);
  return disc!;
}

function placeOnStack(seat: SkullSeat, disc: SkullDisc): void {
  const stacked: SkullStackDisc = { ...disc, faceUp: false };
  seat.stack.push(stacked);
}

export function openingPlacedCount(state: SkullState): number {
  return activeSeats(state).filter((s) => s.stack.length > 0).length;
}

export function canPlaceOpening(state: SkullState, playerId: string): boolean {
  if (state.phase !== 'opening_place') return false;
  const seat = state.seats[playerId];
  if (!seat || seat.eliminated || seat.stack.length > 0) return false;
  if (playerId === state.firstPlayerId) {
    const others = activeSeats(state).filter((s) => s.id !== state.firstPlayerId);
    return others.every((s) => s.stack.length > 0);
  }
  return true;
}

export function applyPlaceOpening(state: SkullState, playerId: string, discId: string): SkullState {
  const next = cloneState(state);
  if (!canPlaceOpening(next, playerId)) reject('ยังไม่ถึงตาคุณวางดิสก์แรก');
  const seat = next.seats[playerId]!;
  const disc = takeFromHand(seat, discId);
  placeOnStack(seat, disc);
  next.lastEvent = `${seat.name} วางดิสก์แรกแล้ว`;

  if (openingPlacedCount(next) === activeSeats(next).length) {
    next.phase = 'decision';
    next.activePlayerId = next.firstPlayerId;
    next.lastEvent = `${next.seats[next.firstPlayerId]!.name} — วางดิสก์เพิ่มหรือเปิดบิด`;
  }
  return next;
}

export function applyPlaceDisc(state: SkullState, playerId: string, discId: string): SkullState {
  const next = cloneState(state);
  if (next.phase !== 'decision') reject('ตอนนี้วางดิสก์เพิ่มไม่ได้');
  if (next.activePlayerId !== playerId) reject('ยังไม่ถึงตาคุณ');
  const seat = next.seats[playerId]!;
  if (seat.eliminated) reject('คุณถูกคัดออกแล้ว');
  if (seat.hand.length === 0) reject('มือว่าง ต้องเปิดบิด');

  const disc = takeFromHand(seat, discId);
  placeOnStack(seat, disc);
  next.activePlayerId = nextClockwiseId(next, playerId);
  next.lastEvent = `${seat.name} วางดิสก์ — ตาของ ${next.seats[next.activePlayerId]!.name}`;
  return next;
}

function enterChallenge(state: SkullState): void {
  const challengerId = state.challengerId;
  if (!challengerId) return;
  const challenger = state.seats[challengerId]!;
  state.phase = 'challenge';
  state.activePlayerId = challengerId;
  state.flippedCount = 0;
  state.lastEvent = `${challenger.name} เป็น Challenger — พลิก ${state.currentBid} ดอก`;
}

function finishBiddingIfAlone(state: SkullState): void {
  const stillIn = activeSeats(state).filter((s) => !s.passed);
  if (stillIn.length === 1) {
    state.challengerId = stillIn[0]!.id;
    enterChallenge(state);
  }
}

/** Bidding the max discs in play ends the auction immediately. */
function finishBiddingIfMax(state: SkullState): boolean {
  if (state.currentBid >= 1 && state.currentBid >= discsInPlay(state)) {
    enterChallenge(state);
    return true;
  }
  return false;
}

export function applyOpenBid(state: SkullState, playerId: string, amount: number): SkullState {
  const next = cloneState(state);
  if (next.phase !== 'decision') reject('เปิดบิดได้เฉพาะช่วงตัดสินใจ');
  if (next.activePlayerId !== playerId) reject('ยังไม่ถึงตาคุณ');
  const seat = next.seats[playerId]!;
  if (seat.eliminated) reject('คุณถูกคัดออกแล้ว');

  const max = discsInPlay(next);
  if (!Number.isInteger(amount) || amount < 1 || amount > max) {
    reject(`บิดต้องอยู่ระหว่าง 1–${max}`);
  }

  for (const s of activeSeats(next)) s.passed = false;

  next.phase = 'bidding';
  next.currentBid = amount;
  next.challengerId = playerId;
  next.lastEvent = `${seat.name} เปิดบิด ${amount}`;

  if (!finishBiddingIfMax(next)) {
    next.activePlayerId = nextClockwiseId(next, playerId);
    finishBiddingIfAlone(next);
  }
  return next;
}

export function applyOutbid(state: SkullState, playerId: string, amount: number): SkullState {
  const next = cloneState(state);
  if (next.phase !== 'bidding') reject('ตอนนี้ประมูลไม่ได้');
  if (next.activePlayerId !== playerId) reject('ยังไม่ถึงตาคุณ');
  const seat = next.seats[playerId]!;
  if (seat.eliminated || seat.passed) reject('คุณผ่านไปแล้ว');

  const max = discsInPlay(next);
  if (!Number.isInteger(amount) || amount <= next.currentBid || amount > max) {
    reject(`ต้องบิดสูงกว่า ${next.currentBid} และไม่เกิน ${max}`);
  }

  next.currentBid = amount;
  next.challengerId = playerId;
  next.lastEvent = `${seat.name} ยกระดับเป็น ${amount}`;

  if (!finishBiddingIfMax(next)) {
    next.activePlayerId = nextClockwiseIdSkippingPassed(next, playerId);
    finishBiddingIfAlone(next);
  }
  return next;
}

function nextClockwiseIdSkippingPassed(state: SkullState, fromId: string): string {
  let id = nextClockwiseId(state, fromId);
  const guard = activeSeats(state).length + 1;
  for (let i = 0; i < guard; i += 1) {
    const seat = state.seats[id]!;
    if (!seat.passed && !seat.eliminated) return id;
    id = nextClockwiseId(state, id);
  }
  return fromId;
}

export function applyPass(state: SkullState, playerId: string): SkullState {
  const next = cloneState(state);
  if (next.phase !== 'bidding') reject('ตอนนี้ผ่านไม่ได้');
  if (next.activePlayerId !== playerId) reject('ยังไม่ถึงตาคุณ');
  const seat = next.seats[playerId]!;
  if (seat.eliminated || seat.passed) reject('คุณผ่านไปแล้ว');

  seat.passed = true;
  next.lastEvent = `${seat.name} ผ่าน`;

  const stillIn = activeSeats(next).filter((s) => !s.passed);
  if (stillIn.length === 1) {
    finishBiddingIfAlone(next);
  } else {
    next.activePlayerId = nextClockwiseIdSkippingPassed(next, playerId);
  }
  return next;
}

export function legalFlipOwnerIds(state: SkullState, challengerId: string): string[] {
  if (state.phase !== 'challenge') return [];
  const challenger = state.seats[challengerId];
  if (!challenger) return [];

  const ownFaceDown = challenger.stack.some((d) => !d.faceUp);
  if (ownFaceDown) return [challengerId];

  return activeSeats(state)
    .filter((s) => s.stack.some((d) => !d.faceUp))
    .map((s) => s.id);
}

function topFaceDownIndex(stack: SkullStackDisc[]): number {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (!stack[i]!.faceUp) return i;
  }
  return -1;
}

/** Drop stack-only `faceUp` so the disc can live in hand / discard pools. */
function toHandDisc(d: SkullStackDisc): SkullDisc {
  return {
    id: d.id,
    color: d.color,
    face: d.face,
    ...(d.isLastChance ? { isLastChance: true } : {}),
  };
}

/** Official: return all mats to hands before discard so face-up discs cannot leak. */
function recallAllStacksToHands(state: SkullState): void {
  for (const seat of activeSeats(state)) {
    for (const d of seat.stack) {
      seat.hand.push(toHandDisc(d));
    }
    seat.stack = [];
  }
}

function beginDiscard(
  state: SkullState,
  challengerId: string,
  skullOwnerId: string,
): void {
  recallAllStacksToHands(state);
  const challenger = state.seats[challengerId]!;
  const pool = challenger.hand.map((d) => ({ ...d }));
  const mode =
    skullOwnerId === challengerId ? 'choose_by_challenger' : 'random_by_owner';

  state.pendingDiscard = {
    challengerId,
    skullOwnerId,
    mode,
    pool,
  };

  if (mode === 'choose_by_challenger') {
    state.phase = 'choose_discard';
    state.activePlayerId = challengerId;
    state.lastEvent = `${challenger.name} พลิก skull ของตัวเอง — เลือกดิสก์ที่จะทิ้ง`;
  } else {
    state.phase = 'choose_discard';
    state.activePlayerId = skullOwnerId;
    const owner = state.seats[skullOwnerId]!;
    state.lastEvent = `${challenger.name} พลิก skull ของ ${owner.name} — ${owner.name} สุ่มทิ้งดิสก์ของ Challenger`;
  }
}

export function applyFlip(state: SkullState, playerId: string, ownerId: string): SkullState {
  const next = cloneState(state);
  if (next.phase !== 'challenge') reject('ตอนนี้พลิกไม่ได้');
  if (next.challengerId !== playerId) reject('มีแค่ Challenger ที่พลิกได้');

  const legal = legalFlipOwnerIds(next, playerId);
  if (!legal.includes(ownerId)) reject('พลิกสแตกนี้ไม่ได้ตอนนี้');

  const owner = next.seats[ownerId]!;
  const idx = topFaceDownIndex(owner.stack);
  if (idx < 0) reject('ไม่มีดิสก์คว่ำในสแตกนี้');

  const disc = owner.stack[idx]!;
  disc.faceUp = true;

  if (disc.face === 'skull') {
    next.roundOutcome = {
      kind: 'failure',
      challengerId: playerId,
      skullOwnerId: ownerId,
      eliminated: false,
    };
    beginDiscard(next, playerId, ownerId);
    return next;
  }

  next.flippedCount += 1;
  next.lastEvent = `${next.seats[playerId]!.name} พลิกดอกไม้ (${next.flippedCount}/${next.currentBid})`;

  if (next.flippedCount >= next.currentBid) {
    return resolveChallengeSuccess(next, playerId);
  }
  return next;
}

function resolveChallengeSuccess(state: SkullState, challengerId: string): SkullState {
  const seat = state.seats[challengerId]!;
  if (seat.wins === 1) {
    state.phase = 'game_over';
    state.result = {
      winners: [challengerId],
      reason: `${seat.name} ชนะการท้าทายครบ 2 ครั้ง!`,
    };
    state.roundOutcome = { kind: 'success', challengerId, wonGame: true };
    state.lastEvent = state.result.reason;
    state.activePlayerId = null;
    return state;
  }

  seat.wins = 1;
  state.roundOutcome = { kind: 'success', challengerId, wonGame: false };
  enterRoundResult(state, `${seat.name} ชนะรอบนี้! เสื่อพลิกเป็นดอกไม้`);
  return state;
}

function enterRoundResult(state: SkullState, event: string): void {
  state.phase = 'round_result';
  state.activePlayerId = null;
  state.pendingDiscard = null;
  state.discardReveal = null;
  state.lastEvent = event;
  state.pendingAcks = activeSeats(state).map((s) => s.id);
}

/** Self-eliminated Challenger (own skull) picks who starts next — others go to round_result. */
function enterAfterChallengeFailure(state: SkullState, event: string): void {
  const outcome = state.roundOutcome;
  if (
    outcome?.kind === 'failure' &&
    outcome.eliminated &&
    outcome.skullOwnerId === outcome.challengerId &&
    !state.result
  ) {
    const seat = state.seats[outcome.challengerId]!;
    state.phase = 'choose_first_player';
    state.activePlayerId = outcome.challengerId;
    state.nextFirstPlayerId = null;
    state.pendingDiscard = null;
    state.discardReveal = null;
    state.lastEvent = `${seat.name} ถูกคัดออก — เลือกผู้เริ่มรอบถัดไป`;
    return;
  }
  enterRoundResult(state, event);
}

function eliminate(state: SkullState, playerId: string): void {
  const seat = state.seats[playerId]!;
  seat.eliminated = true;
  seat.hand = [];
  seat.stack = [];
  seat.hasLastChance = false;
}

function removeDiscFromChallenger(state: SkullState, challengerId: string, discId: string): SkullDisc {
  const seat = state.seats[challengerId]!;
  const handIdx = seat.hand.findIndex((d) => d.id === discId);
  if (handIdx >= 0) {
    const [d] = seat.hand.splice(handIdx, 1);
    return d!;
  }
  const stackIdx = seat.stack.findIndex((d) => d.id === discId);
  if (stackIdx >= 0) {
    const [d] = seat.stack.splice(stackIdx, 1);
    return toHandDisc(d!);
  }
  reject('ไม่พบดิสก์ที่จะทิ้ง');
}

function afterDiscard(state: SkullState, challengerId: string): void {
  const seat = state.seats[challengerId]!;

  // Last Chance failure: lose LC + last own disc together → eliminated
  if (state.lastChanceHolderId === challengerId) {
    eliminate(state, challengerId);
    state.lastChanceHolderId = null;
  } else {
    const remaining = seat.hand.length + seat.stack.length;
    if (remaining === 0) {
      eliminate(state, challengerId);
    } else if (remaining === 1 && !seat.usedLastChance) {
      state.pendingLastChanceId = challengerId;
    }
  }

  const survivors = activeSeats(state);
  if (survivors.length <= 1) {
    const winner = survivors[0];
    state.result = {
      winners: winner ? [winner.id] : [],
      reason: winner
        ? `${winner.name} เป็นผู้เล่นคนสุดท้ายที่เหลืออยู่!`
        : 'ไม่มีผู้ชนะ',
    };
    state.roundOutcome = {
      kind: 'failure',
      challengerId,
      skullOwnerId:
        state.roundOutcome?.kind === 'failure'
          ? state.roundOutcome.skullOwnerId
          : challengerId,
      eliminated: state.seats[challengerId]?.eliminated ?? false,
    };
    state.lastEvent = state.result.reason;
    state.activePlayerId = null;
    state.pendingDiscard = null;
    return;
  }

  const eliminated = state.seats[challengerId]?.eliminated ?? false;
  if (state.roundOutcome?.kind === 'failure') {
    state.roundOutcome = { ...state.roundOutcome, eliminated };
  }

  state.lastEvent = eliminated
    ? `${seat.name} ถูกคัดออก!`
    : `${seat.name} เสียดิสก์ 1 ใบ`;
}

/** Finish discard path: either show random reveal, or jump to round / game over. */
function finishDiscard(
  state: SkullState,
  challengerId: string,
  opts?: { reveal?: { discarded: SkullDisc; pool: SkullDisc[]; skullOwnerId: string } },
): void {
  afterDiscard(state, challengerId);
  state.pendingDiscard = null;

  if (opts?.reveal) {
    state.discardReveal = {
      challengerId,
      skullOwnerId: opts.reveal.skullOwnerId,
      discarded: opts.reveal.discarded,
      pool: opts.reveal.pool,
    };
    state.phase = 'discard_reveal';
    state.activePlayerId = null;
    if (!state.result) {
      state.lastEvent = `${state.seats[challengerId]!.name} ถูกสุ่มทิ้งดิสก์ 1 ใบ`;
    }
    return;
  }

  if (state.result) {
    state.phase = 'game_over';
    return;
  }

  enterAfterChallengeFailure(state, state.lastEvent);
}

export function applyChooseDiscard(state: SkullState, playerId: string, discId: string): SkullState {
  const next = cloneState(state);
  const pending = next.pendingDiscard;
  if (!pending || next.phase !== 'choose_discard') reject('ตอนนี้เลือกทิ้งไม่ได้');
  if (pending.mode !== 'choose_by_challenger') reject('รอบนี้ต้องให้เจ้าของ skull สุ่มทิ้ง');
  if (playerId !== pending.challengerId) reject('มีแค่ Challenger ที่เลือกทิ้งได้');
  if (!pending.pool.some((d) => d.id === discId)) reject('เลือกดิสก์นี้ไม่ได้');

  removeDiscFromChallenger(next, pending.challengerId, discId);
  finishDiscard(next, pending.challengerId);
  return next;
}

export function applyConfirmRandomDiscard(state: SkullState, playerId: string): SkullState {
  const next = cloneState(state);
  const pending = next.pendingDiscard;
  if (!pending || next.phase !== 'choose_discard') reject('ตอนนี้สุ่มทิ้งไม่ได้');
  if (pending.mode !== 'random_by_owner') reject('รอบนี้ Challenger ต้องเลือกทิ้งเอง');
  if (playerId !== pending.skullOwnerId) reject('มีแค่เจ้าของ skull ที่สุ่มทิ้งได้');

  const pool = pending.pool.map((d) => ({ ...d }));
  if (pool.length === 0) reject('ไม่มีดิสก์ให้ทิ้ง');
  const shuffled = [...pool];
  shuffleInPlace(shuffled);
  const picked = shuffled[0]!;
  removeDiscFromChallenger(next, pending.challengerId, picked.id);
  finishDiscard(next, pending.challengerId, {
    reveal: {
      discarded: { ...picked },
      pool,
      skullOwnerId: pending.skullOwnerId,
    },
  });
  return next;
}

function returnStacksToHands(state: SkullState): void {
  for (const seat of activeSeats(state)) {
    for (const d of seat.stack) {
      if (d.isLastChance) continue; // LC returned to supply at end of round
      seat.hand.push(toHandDisc(d));
    }
    seat.stack = [];
    seat.passed = false;
  }
}

function stripLastChance(state: SkullState): void {
  const holderId = state.lastChanceHolderId;
  if (!holderId) return;
  const seat = state.seats[holderId];
  if (!seat) return;
  seat.hand = seat.hand.filter((d) => !d.isLastChance);
  seat.stack = seat.stack.filter((d) => !d.isLastChance);
  seat.hasLastChance = false;
  state.lastChanceHolderId = null;
}

function grantPendingLastChance(state: SkullState): void {
  const id = state.pendingLastChanceId;
  state.pendingLastChanceId = null;
  if (!id) return;
  const seat = state.seats[id];
  if (!seat || seat.eliminated || seat.usedLastChance) return;

  const disc: SkullDisc = {
    id: `${id}-last-chance`,
    color: seat.color,
    face: 'flower',
    isLastChance: true,
  };
  seat.hand.push(disc);
  seat.hasLastChance = true;
  seat.usedLastChance = true;
  state.lastChanceHolderId = id;
}

function pickNextFirstPlayer(state: SkullState): string {
  if (state.nextFirstPlayerId) {
    const chosen = state.seats[state.nextFirstPlayerId];
    if (chosen && !chosen.eliminated) return chosen.id;
  }

  const outcome = state.roundOutcome;
  if (!outcome) return state.firstPlayerId;

  if (outcome.kind === 'success') {
    return outcome.challengerId;
  }

  const challenger = state.seats[outcome.challengerId]!;
  if (!challenger.eliminated) {
    return outcome.challengerId;
  }

  // Challenger eliminated by someone else's skull → that owner starts
  if (outcome.skullOwnerId !== outcome.challengerId) {
    const owner = state.seats[outcome.skullOwnerId];
    if (owner && !owner.eliminated) return owner.id;
  }

  // Fallback if choose_first_player was skipped
  return nextClockwiseId(state, outcome.challengerId);
}

export function startNextRound(state: SkullState): SkullState {
  const next = cloneState(state);
  stripLastChance(next);
  returnStacksToHands(next);

  const first = pickNextFirstPlayer(next);
  // If first was eliminated, advance
  next.firstPlayerId = next.seats[first]?.eliminated
    ? nextClockwiseId(next, first)
    : first;

  grantPendingLastChance(next);

  next.round += 1;
  next.phase = 'opening_place';
  next.activePlayerId = null;
  next.challengerId = null;
  next.currentBid = 0;
  next.flippedCount = 0;
  next.pendingDiscard = null;
  next.discardReveal = null;
  next.nextFirstPlayerId = null;
  next.roundOutcome = null;
  next.pendingAcks = [];
  next.lastEvent =
    next.lastChanceHolderId != null
      ? `รอบ ${next.round} — ${next.seats[next.lastChanceHolderId]!.name} ได้ Last Chance`
      : `รอบ ${next.round} — วางดิสก์แรก`;
  return next;
}

export function applyChooseFirstPlayer(
  state: SkullState,
  playerId: string,
  targetId: string,
): SkullState {
  const next = cloneState(state);
  if (next.phase !== 'choose_first_player') reject('ตอนนี้เลือกผู้เริ่มไม่ได้');
  const outcome = next.roundOutcome;
  if (!outcome || outcome.kind !== 'failure') reject('ไม่มีผลรอบให้เลือก');
  if (playerId !== outcome.challengerId) reject('มีแค่ Challenger ที่เลือกได้');
  if (outcome.skullOwnerId !== outcome.challengerId) {
    reject('รอบนี้ไม่ต้องเลือกผู้เริ่ม');
  }

  const target = next.seats[targetId];
  if (!target || target.eliminated) reject('เลือกผู้เล่นนี้ไม่ได้');

  next.nextFirstPlayerId = targetId;
  enterRoundResult(
    next,
    `${next.seats[playerId]!.name} เลือก ${target.name} เป็นผู้เริ่มรอบถัดไป`,
  );
  return next;
}

export function applyAckRound(state: SkullState, playerId: string): SkullState {
  const next = cloneState(state);
  const seat = next.seats[playerId];
  if (!seat || seat.eliminated) reject('คุณถูกคัดออกแล้ว');

  if (next.phase === 'discard_reveal') {
    const reveal = next.discardReveal;
    next.discardReveal = null;
    if (next.result) {
      next.phase = 'game_over';
      next.activePlayerId = null;
      next.lastEvent = next.result.reason;
      return next;
    }
    const challengerId = reveal?.challengerId;
    const challenger = challengerId ? next.seats[challengerId] : null;
    const eliminated = challenger?.eliminated ?? false;
    enterAfterChallengeFailure(
      next,
      eliminated && challenger
        ? `${challenger.name} ถูกคัดออก!`
        : challenger
          ? `${challenger.name} เสียดิสก์ 1 ใบ`
          : next.lastEvent,
    );
    return next;
  }

  if (next.phase !== 'round_result') reject('ยังไม่จบรอบ');
  // One player is enough to advance — no all-ack gate.
  return startNextRound(next);
}

export function applyAction(state: SkullState, playerId: string, action: SkullAction): SkullState {
  switch (action.type) {
    case 'place_opening':
      return applyPlaceOpening(state, playerId, action.discId);
    case 'place_disc':
      return applyPlaceDisc(state, playerId, action.discId);
    case 'open_bid':
      return applyOpenBid(state, playerId, action.amount);
    case 'outbid':
      return applyOutbid(state, playerId, action.amount);
    case 'pass':
      return applyPass(state, playerId);
    case 'flip':
      return applyFlip(state, playerId, action.ownerId);
    case 'choose_discard':
      return applyChooseDiscard(state, playerId, action.discId);
    case 'confirm_random_discard':
      return applyConfirmRandomDiscard(state, playerId);
    case 'choose_first_player':
      return applyChooseFirstPlayer(state, playerId, action.playerId);
    case 'ack_round':
      return applyAckRound(state, playerId);
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function mustBid(state: SkullState, playerId: string): boolean {
  if (state.phase !== 'decision' || state.activePlayerId !== playerId) return false;
  const seat = state.seats[playerId];
  return !!seat && seat.hand.length === 0;
}

export type { SkullPendingDiscard };
