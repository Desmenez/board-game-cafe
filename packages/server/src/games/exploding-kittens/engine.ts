import type { GameDefinition, GameResult, Player } from 'shared';
import type {
  ExplodingKittensAction,
  ExplodingKittensCard,
  ExplodingKittensCardType,
  ExplodingKittensExpansionsEnabled,
  ExplodingKittensPlayerState,
  ExplodingKittensPlayerView,
  ExplodingKittensState,
  PendingAction,
} from 'shared';
import {
  clampEkDeckCopies,
  EK_BASE_COUNTS_BY_MODE,
  EK_BARKING_FIXED_COUNTS,
  EK_IMPLODING_FIXED_COUNTS,
  EK_STREAKING_FIXED_COUNTS,
  parseExplodingKittensLobbyOptions,
  validateSameCatCombo,
  validateFiveDistinctCatCombo,
} from 'shared';

function applyTowerOfPowerSetup(drawPile: ExplodingKittensCard[]): {
  pile: ExplodingKittensCard[];
  stash: ExplodingKittensCard[];
} {
  const ti = drawPile.findIndex((c) => c.type === 'tower_of_power');
  if (ti < 0) return { pile: drawPile, stash: [] };

  const tower = drawPile[ti];
  const nonBomb: ExplodingKittensCard[] = [];
  const bombs: ExplodingKittensCard[] = [];
  for (let i = 0; i < drawPile.length; i += 1) {
    if (i === ti) continue;
    const c = drawPile[i];
    if (c.type === 'exploding_kitten') bombs.push(c);
    else nonBomb.push(c);
  }

  const pool = shuffle(nonBomb);
  const take = Math.min(6, pool.length);
  const stash = pool.slice(0, take);
  const restNonBomb = pool.slice(take);

  const pile = shuffle([...restNonBomb, ...bombs, tower]);
  return { pile, stash };
}

let nextCardId = 1;
let nextActionId = 1;
let nextStealEventId = 1;
let nextThreeClaimEventId = 1;
let nextFiveCatsDiscardPickEventId = 1;

function newCard(type: ExplodingKittensCardType): ExplodingKittensCard {
  return { id: `ek-${nextCardId++}`, type };
}

function newPendingActionId(): string {
  return `pa-${nextActionId++}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function indexOfPlayer(state: ExplodingKittensState, playerId: string): number {
  return state.players.findIndex((p) => p.id === playerId);
}

function getPlayerById(
  state: ExplodingKittensState,
  playerId: string,
): ExplodingKittensPlayerState | undefined {
  const idx = indexOfPlayer(state, playerId);
  if (idx < 0) return undefined;
  return state.players[idx];
}

function hasCardType(hand: ExplodingKittensCard[], type: ExplodingKittensCardType): boolean {
  return hand.some((c) => c.type === type);
}

function nextAliveIndex(state: ExplodingKittensState, from: number): number {
  const n = state.players.length;
  const step = state.playDirection === -1 ? -1 : 1;
  let idx = from;
  for (let i = 0; i < n; i += 1) {
    idx = (idx + step + n) % n;
    if (state.players[idx].alive) return idx;
  }
  return from;
}

/** จั่ว Imploding Kitten — face-up = ตายทันที; face-down = ใส่กลับกองคว่ำหน้า (ห้าม Defuse) */
function beginImplodingDrawn(
  s: ExplodingKittensState,
  player: ExplodingKittensPlayerState,
  card: ExplodingKittensCard,
  drawLabel: string,
): void {
  if (card.faceUp) {
    s.phase = 'explosion_reveal';
    s.explosionCause = 'imploding';
    s.explosionPlayerId = player.id;
    s.explosionHasDefuse = false;
    s.defusingKitten = card;
    s.defusingPlayerId = player.id;
    s.lastEvent = `${player.name} ${drawLabel} Imploding Kitten (คว่ำหน้า) — ระเบิดทันที!`;
    return;
  }
  s.phase = 'imploding_reinsert';
  s.implodingReinsertCard = { ...card, faceUp: true };
  s.implodingReinsertPlayerId = player.id;
  s.lastEvent = `${player.name} ${drawLabel} Imploding Kitten — ใส่กลับกองแบบคว่ำหน้า`;
}

function clearPeekForPlayer(state: ExplodingKittensState, playerId: string): void {
  if (state.seenTopByPlayer[playerId]) delete state.seenTopByPlayer[playerId];
}

/**
 * Tower of Power (กฎกล่อง): การขโมยใด ๆ จากผู้สวมมงกุฎ — สุ่มจาก stash จนกว่าจะหมด แล้วค่อยจากมือ
 */
function stealOneFromTowerIfApplicable(
  state: ExplodingKittensState,
  actor: ExplodingKittensPlayerState,
  target: ExplodingKittensPlayerState,
): boolean {
  if (target.id !== state.towerWearerId || state.towerStash.length === 0) return false;
  const ri = Math.floor(Math.random() * state.towerStash.length);
  const [stolen] = state.towerStash.splice(ri, 1);
  if (!stolen) return false;
  actor.hand.push(stolen);
  state.lastStealEvent = {
    id: nextStealEventId++,
    actorId: actor.id,
    targetId: target.id,
    cardType: stolen.type,
  };
  state.lastEvent = `${actor.name} ขโมยจาก Tower of Power ของ ${target.name}`;
  return true;
}

/** ดึง Barking ที่ค้างในมือออก (ถ้ายังอยู่) แล้วทิ้งลงกองทิ้ง */
function discardBarkingCards(s: ExplodingKittensState, cards: ExplodingKittensCard[]): void {
  for (const c of cards) {
    let removed = false;
    for (const p of s.players) {
      const idx = p.hand.findIndex((x) => x.id === c.id);
      if (idx >= 0) {
        const [card] = p.hand.splice(idx, 1);
        s.discardPile.push(card);
        removed = true;
        break;
      }
    }
    if (!removed) s.discardPile.push(c);
  }
}

function clearBarkingDetonationFlags(s: ExplodingKittensState): void {
  s.pendingBarkingDetonation = undefined;
  s.explosionCause = undefined;
  s.explosionPlayerId = undefined;
  s.explosionHasDefuse = undefined;
  s.defusingPlayerId = undefined;
  s.defusingKitten = undefined;
}

/** หลัง Barking resolve — ยังเป็นเทิร์นผู้เล่นการ์ด */
function returnToBarkingActorTurn(s: ExplodingKittensState, actorId: string): void {
  const ai = indexOfPlayer(s, actorId);
  if (ai >= 0 && s.players[ai]?.alive) {
    s.currentPlayerIndex = ai;
  }
  s.phase = 'turn';
}

/**
 * Barking Kitten (กฎทางการ): เป้าหมายต้อง Defuse หรือระเบิด — ไม่ผ่าน Nope
 * การ์ด Barking ถูกดึงออกจากมือระหว่างรอ resolve แล้วทิ้งหลังจบ
 */
function startBarkingDetonation(
  s: ExplodingKittensState,
  actorId: string,
  targetId: string,
  barkingCardsToDiscard: ExplodingKittensCard[],
): void {
  const target = getPlayerById(s, targetId);
  const actor = getPlayerById(s, actorId);
  if (!target?.alive || !actor?.alive) {
    discardBarkingCards(s, barkingCardsToDiscard);
    s.phase = 'turn';
    s.lastEvent = 'Barking — ไม่สามารถบังคับเป้าได้';
    return;
  }

  for (const c of barkingCardsToDiscard) {
    for (const p of s.players) {
      const idx = p.hand.findIndex((x) => x.id === c.id);
      if (idx >= 0) p.hand.splice(idx, 1);
    }
  }

  s.pendingBarkingDetonation = {
    actorId,
    targetId,
    barkingCardsToDiscard,
  };
  s.explosionCause = 'barking';
  s.explosionPlayerId = targetId;
  s.explosionHasDefuse = hasCardType(target.hand, 'defuse');
  s.defusingKitten = undefined;
  s.defusingPlayerId = targetId;
  s.phase = 'explosion_reveal';
  s.lastEvent = `${actor.name} Barking Kitten — ${target.name} ต้อง Defuse หรือระเบิด`;
}

/** หลังทุกคนรับทราบการเล่น Barking Kitten — chicken / วางค้าง (กฎทางการ) */
function resolveBarkingPlayAfterShow(s: ExplodingKittensState): void {
  const pb = s.pendingBarkingPlay;
  if (!pb) return;
  const me = getPlayerById(s, pb.fromId);
  const played = pb.card;
  s.pendingBarkingPlay = undefined;

  if (!me?.alive) {
    s.discardPile.push(played);
    s.phase = 'turn';
    return;
  }

  let otherWith: ExplodingKittensPlayerState | undefined;
  for (const p of s.players) {
    if (p.id === me.id || !p.alive) continue;
    if (hasCardType(p.hand, 'barking_kitten')) {
      otherWith = p;
      break;
    }
  }
  if (otherWith) {
    const oi = otherWith.hand.findIndex((c) => c.type === 'barking_kitten');
    if (oi < 0) {
      s.barkingLoner = { playerId: me.id, card: played };
      s.phase = 'turn';
      s.lastEvent = `${me.name} วาง Barking Kitten — รอคู่`;
      return;
    }
    const theirBark = otherWith.hand[oi];
    startBarkingDetonation(s, me.id, otherWith.id, [played, theirBark]);
    return;
  }
  if (s.barkingLoner && s.barkingLoner.playerId !== me.id) {
    const bl = s.barkingLoner;
    const lonerCard = bl.card;
    const victim = getPlayerById(s, bl.playerId);
    s.barkingLoner = undefined;
    if (!victim?.alive) {
      s.discardPile.push(played, lonerCard);
      s.phase = 'turn';
      s.lastEvent = `${me.name} เล่น Barking — ผู้วางมือแรกไม่อยู่ในเกม`;
      return;
    }
    startBarkingDetonation(s, me.id, victim.id, [played, lonerCard]);
    return;
  }
  s.barkingLoner = { playerId: me.id, card: played };
  s.phase = 'turn';
  s.lastEvent = `${me.name} วาง Barking Kitten — รอคู่`;
}

function applyBuryTopDraw(state: ExplodingKittensState, playerId: string): void {
  const me = getPlayerById(state, playerId);
  if (!me?.alive) {
    state.phase = 'turn';
    state.buryPlayerId = undefined;
    return;
  }
  clearPeekForPlayer(state, playerId);
  const card = state.drawPile.shift();
  if (!card) {
    state.phase = 'turn';
    state.buryPlayerId = undefined;
    state.lastEvent = 'กองจั่วหมด';
    return;
  }
  if (card.type === 'imploding_kitten') {
    state.buryPlayerId = undefined;
    beginImplodingDrawn(state, me, card, 'จั่วระหว่าง Bury');
    return;
  }
  if (card.type === 'exploding_kitten') {
    if (canHoldExplodingKitten(me.hand)) {
      me.hand.push(card);
      state.drawRevealPending = {
        kind: 'standard',
        playerId: me.id,
        cardType: 'exploding_kitten',
        consumesTurnOnAck: true,
      };
      state.buryPlayerId = undefined;
      state.lastEvent = `${me.name} จั่วการ์ดระหว่าง Bury`;
      return;
    }
    const hasDefuse = hasCardType(me.hand, 'defuse');
    state.phase = 'explosion_reveal';
    state.explosionCause = 'draw';
    state.explosionPlayerId = me.id;
    state.explosionHasDefuse = hasDefuse;
    state.defusingKitten = card;
    state.defusingPlayerId = me.id;
    state.buryPlayerId = undefined;
    state.lastEvent = `${me.name} จั่ว Exploding Kitten ระหว่าง Bury!`;
    return;
  }
  state.buryCard = card;
  state.phase = 'bury_reinsert';
  state.buryPlayerId = me.id;
  state.lastEvent = `${me.name} เลือกตำแหน่งฝังการ์ด (Bury)`;
}

function consumeOneTurnOrAdvance(state: ExplodingKittensState): void {
  const current = state.players[state.currentPlayerIndex];
  current.pendingTurns = Math.max(0, current.pendingTurns - 1);
  if (current.pendingTurns > 0) return;
  const nextIdx = nextAliveIndex(state, state.currentPlayerIndex);
  state.currentPlayerIndex = nextIdx;
  if (state.players[nextIdx].pendingTurns <= 0) {
    state.players[nextIdx].pendingTurns = 1;
  }
}

/**
 * Official Attack chain (Attack / Targeted Attack / Personal Attack):
 * - Normal turn (≤1 pending): pass `attackValue` turns (2 or 3).
 * - Already under attack (>1 pending): pass remaining + attackValue → 2→4→6 (or +3 for Personal).
 */
function attackTurnsToPass(pendingTurns: number, attackValue: number): number {
  const pending = Math.max(0, pendingTurns);
  return pending <= 1 ? attackValue : pending + attackValue;
}

function assertCurrentPlayer(state: ExplodingKittensState, playerId: string): boolean {
  return state.players[state.currentPlayerIndex]?.id === playerId;
}

function findCardIndex(hand: ExplodingKittensCard[], cardId: string): number {
  return hand.findIndex((c) => c.id === cardId);
}

function clearMarkOnCard(s: ExplodingKittensState, cardId: string): void {
  for (const [pid, cid] of Object.entries(s.markedCardByPlayerId ?? {})) {
    if (cid === cardId) delete s.markedCardByPlayerId[pid];
  }
}

function hasStreakingKitten(hand: ExplodingKittensCard[]): boolean {
  return hand.some((c) => c.type === 'streaking_kitten');
}

function countHeldExploding(hand: ExplodingKittensCard[]): number {
  return hand.filter((c) => c.type === 'exploding_kitten').length;
}

function canHoldExplodingKitten(hand: ExplodingKittensCard[]): boolean {
  return hasStreakingKitten(hand) && countHeldExploding(hand) === 0;
}

function beginHeldEkExplosion(
  s: ExplodingKittensState,
  playerId: string,
  kittenCard: ExplodingKittensCard,
): void {
  const victim = getPlayerById(s, playerId);
  if (!victim?.alive) return;
  const ekIdx = victim.hand.findIndex((c) => c.id === kittenCard.id);
  if (ekIdx >= 0) victim.hand.splice(ekIdx, 1);
  s.phase = 'explosion_reveal';
  s.explosionCause = 'held_ek';
  s.explosionPlayerId = playerId;
  s.explosionHasDefuse = hasCardType(victim.hand, 'defuse');
  s.defusingKitten = kittenCard;
  s.defusingPlayerId = playerId;
  s.lastEvent = `${victim.name} Exploding Kitten ในมือระเบิด!`;
}

function receiveCardIntoHand(
  s: ExplodingKittensState,
  player: ExplodingKittensPlayerState,
  card: ExplodingKittensCard,
): void {
  if (card.type === 'exploding_kitten') {
    if (canHoldExplodingKitten(player.hand)) player.hand.push(card);
    else beginHeldEkExplosion(s, player.id, card);
    return;
  }
  player.hand.push(card);
}

function afterLosingStreakingKitten(
  s: ExplodingKittensState,
  player: ExplodingKittensPlayerState,
): void {
  if (hasStreakingKitten(player.hand)) return;
  const ekIdx = player.hand.findIndex((c) => c.type === 'exploding_kitten');
  if (ekIdx < 0) return;
  const [ek] = player.hand.splice(ekIdx, 1);
  beginHeldEkExplosion(s, player.id, ek);
}

function takeCardFromHand(
  s: ExplodingKittensState,
  player: ExplodingKittensPlayerState,
  cardId: string,
): ExplodingKittensCard | null {
  const idx = findCardIndex(player.hand, cardId);
  if (idx < 0) return null;
  const [card] = player.hand.splice(idx, 1);
  clearMarkOnCard(s, cardId);
  return card;
}

function popCardById(
  s: ExplodingKittensState,
  player: ExplodingKittensPlayerState,
  cardId: string,
): ExplodingKittensCard | null {
  const card = takeCardFromHand(s, player, cardId);
  if (!card) return null;
  if (card.type === 'streaking_kitten') afterLosingStreakingKitten(s, player);
  return card;
}

function handleDrawnCard(
  s: ExplodingKittensState,
  player: ExplodingKittensPlayerState,
  card: ExplodingKittensCard,
  drawLabel: string,
  consumesTurnOnAck = true,
): void {
  if (card.type === 'imploding_kitten') {
    beginImplodingDrawn(s, player, card, drawLabel);
    return;
  }
  if (card.type === 'exploding_kitten') {
    if (canHoldExplodingKitten(player.hand)) {
      player.hand.push(card);
      s.drawRevealPending = {
        kind: 'standard',
        playerId: player.id,
        cardType: 'exploding_kitten',
        consumesTurnOnAck,
      };
      s.lastEvent = `${player.name} ${drawLabel}`;
      return;
    }
    const hasDefuse = hasCardType(player.hand, 'defuse');
    s.phase = 'explosion_reveal';
    s.explosionCause = 'draw';
    s.explosionPlayerId = player.id;
    s.explosionHasDefuse = hasDefuse;
    s.defusingKitten = card;
    s.defusingPlayerId = player.id;
    s.lastEvent = `${player.name} ${drawLabel} Exploding Kitten!`;
    return;
  }
  player.hand.push(card);
  s.drawRevealPending = {
    kind: 'standard',
    playerId: player.id,
    cardType: card.type,
    consumesTurnOnAck,
  };
  s.lastEvent = `${player.name} ${drawLabel}`;
}

function buildStartingDrawPile(
  mode: 'original' | 'party_pack',
  deckCopies: number,
  expansions?: ExplodingKittensExpansionsEnabled,
): ExplodingKittensCard[] {
  const copies = clampEkDeckCopies(deckCopies);
  const cards: ExplodingKittensCard[] = [];
  const counts = EK_BASE_COUNTS_BY_MODE[mode];
  const scalable = Object.keys(counts) as ExplodingKittensCardType[];
  for (const t of scalable) {
    if (t === 'exploding_kitten' || t === 'defuse') continue;
    const count = (counts[t] ?? 0) * copies;
    for (let i = 0; i < count; i += 1) cards.push(newCard(t));
  }
  if (expansions?.barking) {
    for (const t of Object.keys(EK_BARKING_FIXED_COUNTS) as ExplodingKittensCardType[]) {
      const n = EK_BARKING_FIXED_COUNTS[t] ?? 0;
      for (let i = 0; i < n; i += 1) cards.push(newCard(t));
    }
  }
  if (expansions?.streaking) {
    for (const t of Object.keys(EK_STREAKING_FIXED_COUNTS) as ExplodingKittensCardType[]) {
      const n = EK_STREAKING_FIXED_COUNTS[t] ?? 0;
      for (let i = 0; i < n; i += 1) cards.push(newCard(t));
    }
  }
  if (expansions?.imploding) {
    for (const t of Object.keys(EK_IMPLODING_FIXED_COUNTS) as ExplodingKittensCardType[]) {
      const n = EK_IMPLODING_FIXED_COUNTS[t] ?? 0;
      for (let i = 0; i < n; i += 1) cards.push(newCard(t));
    }
  }
  return shuffle(cards);
}

function startPendingAction(
  state: ExplodingKittensState,
  actorId: string,
  type: PendingAction['type'],
  lastEvent: string,
  targetId?: string,
  requestedType?: ExplodingKittensCardType,
  playedCardTypes?: ExplodingKittensCardType[],
  futureCount?: number,
): void {
  state.phase = 'reaction';
  state.pendingAction = {
    id: newPendingActionId(),
    actorId,
    type,
    targetId,
    requestedType,
    playedCardTypes,
    futureCount,
    nopeCount: 0,
    // Player who initiated the action should not need to "pass" their own action.
    passedBy: [actorId],
  };
  state.lastEvent = lastEvent;
}

function resolvePendingAction(state: ExplodingKittensState): void {
  const pa = state.pendingAction;
  if (!pa) return;
  state.pendingAction = undefined;
  state.phase = 'turn';

  // odd nope count => canceled
  const canceled = pa.nopeCount % 2 === 1;
  if (canceled) {
    if (pa.type === 'ill_take') {
      const pit = state.pendingIllTake;
      if (pit && pit.fromId === pa.actorId) {
        const act = getPlayerById(state, pit.fromId);
        if (act?.alive) act.hand.push(pit.card);
        state.pendingIllTake = undefined;
      }
    }
    if (pa.type === 'favor') {
      state.favorFromId = undefined;
      state.favorTargetId = undefined;
    }
    if (pa.type === 'targeted_attack') {
      state.targetedAttackFromId = undefined;
    }
    state.lastEvent = 'การ์ดถูก Nope ยกเลิก';
    return;
  }

  const actor = getPlayerById(state, pa.actorId);
  if (!actor || !actor.alive) {
    state.lastEvent = 'แอ็กชันหมดผล (ผู้เล่นไม่อยู่ในเกม)';
    return;
  }
  const current = state.players[state.currentPlayerIndex];

  if (pa.type === 'tower_of_power') {
    state.towerWearerId = actor.id;
    state.lastEvent = `${actor.name} สวม Tower of Power`;
    return;
  }

  if (pa.type === 'bury') {
    applyBuryTopDraw(state, actor.id);
    return;
  }

  if (pa.type === 'ill_take') {
    const targetId = pa.targetId;
    const pit = state.pendingIllTake;
    if (!targetId || !pit || pit.fromId !== pa.actorId) {
      state.lastEvent = "I'll Take That — ข้อมูลไม่ครบ";
      return;
    }
    const tIdx = indexOfPlayer(state, targetId);
    if (tIdx < 0 || !state.players[tIdx].alive || targetId === pa.actorId) {
      state.lastEvent = 'เป้าหมายไม่ถูกต้อง';
      return;
    }
    if (state.illTakeActorByTarget[targetId]) {
      state.lastEvent = "เป้าหมายมี I'll Take That อยู่แล้ว";
      return;
    }
    state.illTakeActorByTarget[targetId] = pa.actorId;
    state.discardPile.push(pit.card);
    state.pendingIllTake = undefined;
    state.lastEvent = `I'll Take That → ${state.players[tIdx].name}`;
    return;
  }

  if (pa.type === 'shuffle') {
    state.drawPile = shuffle(state.drawPile);
    state.lastEvent = `${current.name} สับกองการ์ด`;
    return;
  }
  if (pa.type === 'see_future') {
    state.seenTopByPlayer[actor.id] = state.drawPile.slice(0, 3).map((c) => c.type);
    state.lastEvent = `${actor.name} ดูการ์ดบนกอง 3 ใบ`;
    return;
  }
  if (pa.type === 'see_future_5x') {
    state.seenTopByPlayer[actor.id] = state.drawPile.slice(0, 5).map((c) => c.type);
    state.lastEvent = `${actor.name} ดูการ์ดบนกอง 5 ใบ`;
    return;
  }
  if (pa.type === 'alter_future' || pa.type === 'alter_future_5x') {
    const n = pa.futureCount ?? (pa.type === 'alter_future_5x' ? 5 : 3);
    state.alterFutureCount = n;
    state.phase = 'alter_future_reorder';
    state.alterFutureById = actor.id;
    state.lastEvent = `${actor.name} กำลังจัด ${n} ใบบนสุด`;
    return;
  }
  if (pa.type === 'swap_top_bottom') {
    if (state.drawPile.length >= 2) {
      const last = state.drawPile.length - 1;
      const top = state.drawPile[0]!;
      state.drawPile[0] = state.drawPile[last]!;
      state.drawPile[last] = top;
    }
    state.lastEvent = `${actor.name} สลับการ์ดบน-ล่างของกองจั่ว`;
    return;
  }
  if (pa.type === 'garbage_collection') {
    const order = state.players.filter((p) => p.alive && p.hand.length > 0).map((p) => p.id);
    state.garbageOrder = order;
    state.garbageIndex = 0;
    state.garbageCollected = [];
    state.phase = 'garbage_collection';
    state.lastEvent = `${actor.name} เริ่ม Garbage Collection`;
    return;
  }
  if (pa.type === 'mark') {
    state.phase = 'mark_target';
    state.markFromId = actor.id;
    state.lastEvent = `${actor.name} ใช้ Mark — เลือกเป้าหมาย`;
    return;
  }
  if (pa.type === 'curse_of_the_cat_butt') {
    state.phase = 'curse_target';
    state.curseFromId = actor.id;
    state.lastEvent = `${actor.name} ใช้ Curse of the Cat Butt — เลือกเป้าหมาย`;
    return;
  }
  if (pa.type === 'catomic_bomb') {
    const eks: ExplodingKittensCard[] = [];
    const rest: ExplodingKittensCard[] = [];
    for (const c of state.drawPile) {
      if (c.type === 'exploding_kitten') eks.push(c);
      else rest.push(c);
    }
    state.drawPile = shuffle(rest);
    state.drawPile.unshift(...eks);
    consumeOneTurnOrAdvance(state);
    state.lastEvent = `${actor.name} ใช้ Catomic Bomb — ระเบิดอยู่บนสุด`;
    return;
  }
  if (pa.type === 'draw_from_bottom') {
    const card = state.drawPile.pop();
    if (!card) return;
    if (card.type === 'imploding_kitten') {
      beginImplodingDrawn(state, actor, card, 'จั่วจากใต้กอง');
      return;
    }
    if (card.type !== 'exploding_kitten') {
      actor.hand.push(card);
      state.drawRevealPending = {
        kind: 'standard',
        playerId: actor.id,
        cardType: card.type,
        consumesTurnOnAck: true,
      };
      state.lastEvent = `${actor.name} จั่วจากใต้กอง`;
      return;
    }
    if (canHoldExplodingKitten(actor.hand)) {
      actor.hand.push(card);
      state.drawRevealPending = {
        kind: 'standard',
        playerId: actor.id,
        cardType: 'exploding_kitten',
        consumesTurnOnAck: true,
      };
      state.lastEvent = `${actor.name} จั่วจากใต้กอง`;
      return;
    }
    const hasDefuse = hasCardType(actor.hand, 'defuse');
    state.phase = 'explosion_reveal';
    state.explosionCause = 'draw';
    state.explosionPlayerId = actor.id;
    state.explosionHasDefuse = hasDefuse;
    state.defusingKitten = card;
    state.defusingPlayerId = actor.id;
    state.lastEvent = `${actor.name} จั่ว Exploding Kitten จากใต้กอง!`;
    return;
  }
  if (pa.type === 'targeted_attack') {
    const targetId = pa.targetId;
    if (!targetId) {
      state.phase = 'targeted_attack_target';
      state.targetedAttackFromId = actor.id;
      state.lastEvent = `${actor.name} ใช้ Targeted Attack — เลือกเป้าหมาย`;
      return;
    }
    const targetIdx = indexOfPlayer(state, targetId);
    if (targetIdx < 0 || !state.players[targetIdx].alive) {
      state.lastEvent = 'เป้าหมายไม่อยู่ในเกม';
      return;
    }
    const turnsToPass = attackTurnsToPass(actor.pendingTurns, 2);
    actor.pendingTurns = 0;
    state.currentPlayerIndex = targetIdx;
    state.players[targetIdx].pendingTurns = turnsToPass;
    clearPeekForPlayer(state, actor.id);
    state.targetedAttackFromId = undefined;
    state.lastEvent = `${actor.name} ใช้ Targeted Attack ใส่ ${state.players[targetIdx].name} — ${turnsToPass} เทิร์น`;
    return;
  }
  if (pa.type === 'favor') {
    const targetId = pa.targetId ?? state.favorTargetId;
    if (!targetId) {
      state.phase = 'favor_target';
      state.favorFromId = actor.id;
      state.favorTargetId = undefined;
      state.lastEvent = `${actor.name} ใช้ Favor — เลือกเป้าหมาย`;
      return;
    }
    const targetName = getPlayerById(state, targetId)?.name ?? '?';
    state.phase = 'favor_give';
    state.favorFromId = actor.id;
    state.favorTargetId = targetId;
    state.lastEvent = `${actor.name} ใช้ Favor กับ ${targetName}`;
    return;
  }
  if (pa.type === 'five_cats') {
    state.phase = 'five_cats_pick_discard';
    state.fiveCatsPickerId = actor.id;
    state.lastEvent = `${actor.name} ใช้คอมโบ 5 แมวต่างกัน — เลือกการ์ดจากกองทิ้ง`;
    return;
  }
  if (pa.type === 'pair_steal') {
    const targetId = pa.targetId;
    if (!targetId) {
      state.lastEvent = 'คอมโบคู่แมวไม่มีเป้าหมาย';
      return;
    }
    const targetIdx = indexOfPlayer(state, targetId);
    if (targetIdx < 0) {
      state.lastEvent = 'เป้าหมายไม่อยู่ในเกม';
      return;
    }
    const target = state.players[targetIdx];
    if (!target.alive) {
      state.lastEvent = `${target.name} ไม่มีการ์ดให้ขโมย`;
      return;
    }
    if (stealOneFromTowerIfApplicable(state, actor, target)) return;
    if (target.hand.length === 0) {
      state.lastEvent = `${target.name} ไม่มีการ์ดให้ขโมย`;
      return;
    }
    const rand = Math.floor(Math.random() * target.hand.length);
    const [stolen] = target.hand.splice(rand, 1);
    if (stolen) {
      clearMarkOnCard(state, stolen.id);
      if (stolen.type === 'streaking_kitten') afterLosingStreakingKitten(state, target);
      receiveCardIntoHand(state, actor, stolen);
      state.lastStealEvent = {
        id: nextStealEventId++,
        actorId: actor.id,
        targetId: target.id,
        cardType: stolen.type,
      };
      state.lastEvent = `${actor.name} ใช้คู่แมวและขโมยการ์ดจาก ${target.name}`;
    }
    return;
  }
  if (pa.type === 'three_claim') {
    const targetId = pa.targetId;
    const requestedType = pa.requestedType;
    if (!targetId || !requestedType) {
      state.lastEvent = 'คอมโบ 3 ใบไม่มีข้อมูลเป้าหมาย/การ์ดที่ขอ';
      return;
    }
    const targetIdx = indexOfPlayer(state, targetId);
    if (targetIdx < 0) {
      state.lastEvent = 'เป้าหมายไม่อยู่ในเกม';
      return;
    }
    const target = state.players[targetIdx];
    /** Tower: ขณะมี stash ต้องเรียกชนิดที่มีอยู่ในมงกุฎ — ไม่ตรง = เสียฟรี (ไม่ดูมือ) */
    if (target.id === state.towerWearerId && state.towerStash.length > 0) {
      const stashIdx = state.towerStash.findIndex((c) => c.type === requestedType);
      if (stashIdx >= 0) {
        const [stolen] = state.towerStash.splice(stashIdx, 1);
        if (stolen) {
          receiveCardIntoHand(state, actor, stolen);
          state.lastStealEvent = {
            id: nextStealEventId++,
            actorId: actor.id,
            targetId: target.id,
            cardType: stolen.type,
          };
        }
        state.lastThreeClaimEvent = {
          id: nextThreeClaimEventId++,
          actorId: actor.id,
          targetId: target.id,
          requestedType,
          success: true,
          stolenFromTower: true,
          actualStolenType: stolen?.type ?? requestedType,
        };
        state.lastEvent = `${actor.name} ใช้ 3 ใบ — เรียกถูกการ์ดใน Tower ของ ${target.name}`;
        return;
      }
      state.lastThreeClaimEvent = {
        id: nextThreeClaimEventId++,
        actorId: actor.id,
        targetId: target.id,
        requestedType,
        success: false,
        stolenFromTower: true,
      };
      state.lastEvent = `${actor.name} ใช้ 3 ใบ — ไม่มี ${requestedType} ใน Tower ของ ${target.name} (เสียฟรี)`;
      return;
    }
    const wantedIdx = target.hand.findIndex((c) => c.type === requestedType);
    if (wantedIdx >= 0) {
      const [stolen] = target.hand.splice(wantedIdx, 1);
      if (stolen) {
        clearMarkOnCard(state, stolen.id);
        if (stolen.type === 'streaking_kitten') afterLosingStreakingKitten(state, target);
        receiveCardIntoHand(state, actor, stolen);
        state.lastStealEvent = {
          id: nextStealEventId++,
          actorId: actor.id,
          targetId: target.id,
          cardType: stolen.type,
        };
      }
      state.lastThreeClaimEvent = {
        id: nextThreeClaimEventId++,
        actorId: actor.id,
        targetId: target.id,
        requestedType,
        success: true,
      };
      state.lastEvent = `${actor.name} ใช้ 3 ใบเรียก ${target.name} และได้การ์ดตามที่ขอ`;
    } else {
      state.lastThreeClaimEvent = {
        id: nextThreeClaimEventId++,
        actorId: actor.id,
        targetId: target.id,
        requestedType,
        success: false,
      };
      state.lastEvent = `${actor.name} ใช้ 3 ใบเรียกการ์ดจาก ${target.name} แต่เป้าหมายไม่มีการ์ดที่ขอ`;
    }
    return;
  }
  if (pa.type === 'super_skip') {
    clearPeekForPlayer(state, current.id);
    current.pendingTurns = 0;
    const nextIdx = nextAliveIndex(state, state.currentPlayerIndex);
    state.currentPlayerIndex = nextIdx;
    state.players[nextIdx].pendingTurns = 1;
    state.lastEvent = `${current.name} Super Skip — จบเทิร์นทั้งหมด`;
    return;
  }
  if (pa.type === 'personal_attack_3x') {
    clearPeekForPlayer(state, actor.id);
    const turns = attackTurnsToPass(actor.pendingTurns, 3);
    actor.pendingTurns = turns;
    state.lastEvent = `${actor.name} Personal Attack 3x — เทิร์นต่อเนื่อง ${turns} รอบ`;
    return;
  }
  if (pa.type === 'skip') {
    clearPeekForPlayer(state, current.id);
    consumeOneTurnOrAdvance(state);
    state.lastEvent = `${current.name} ข้ามเทิร์น`;
    return;
  }
  if (pa.type === 'reverse') {
    clearPeekForPlayer(state, current.id);
    state.playDirection = state.playDirection === -1 ? 1 : -1;
    consumeOneTurnOrAdvance(state);
    state.lastEvent = `${current.name} Reverse — กลับทิศทางเล่น`;
    return;
  }
  if (pa.type === 'attack') {
    const turnsToPass = attackTurnsToPass(current.pendingTurns, 2);
    current.pendingTurns = 0;
    const nextIdx = nextAliveIndex(state, state.currentPlayerIndex);
    state.currentPlayerIndex = nextIdx;
    state.players[nextIdx].pendingTurns = turnsToPass;
    clearPeekForPlayer(state, current.id);
    state.lastEvent = `${current.name} ใช้ Attack — คนถัดไปต้องเล่น ${turnsToPass} เทิร์น`;
  }
}

function hasLivingWinner(state: ExplodingKittensState): string | null {
  let aliveId: string | null = null;
  let aliveCount = 0;
  for (const p of state.players) {
    if (!p.alive) continue;
    aliveCount += 1;
    if (aliveCount > 1) return null;
    aliveId = p.id;
  }
  if (aliveCount === 1) return aliveId;
  return null;
}

/**
 * Resolve explosion reveal phase after the 5s cinematic.
 * - If player has Defuse: move to explicit "use defuse" prompt.
 * - If no Defuse: player dies immediately.
 */
export function resolveExplosionReveal(state: ExplodingKittensState): ExplodingKittensState {
  if (state.phase !== 'explosion_reveal' || !state.explosionPlayerId) return state;
  const isBarking = state.explosionCause === 'barking';
  const isHeldEk = state.explosionCause === 'held_ek';
  const isImploding = state.explosionCause === 'imploding';
  if (!isBarking && !isHeldEk && !isImploding && !state.defusingKitten) return state;

  const explosionPlayerId = state.explosionPlayerId;
  const kitten = state.defusingKitten;

  const s: ExplodingKittensState = {
    ...state,
    eliminationOrder: [...(state.eliminationOrder ?? [])],
    players: state.players.map((p) => ({ ...p, hand: [...p.hand] })),
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
    seenTopByPlayer: { ...state.seenTopByPlayer },
    markedCardByPlayerId: { ...(state.markedCardByPlayerId ?? {}) },
    garbageOrder: state.garbageOrder ? [...state.garbageOrder] : undefined,
    garbageCollected: state.garbageCollected ? [...state.garbageCollected] : undefined,
    pendingBarkingDetonation: state.pendingBarkingDetonation
      ? {
          actorId: state.pendingBarkingDetonation.actorId,
          targetId: state.pendingBarkingDetonation.targetId,
          barkingCardsToDiscard: state.pendingBarkingDetonation.barkingCardsToDiscard.map((c) => ({
            ...c,
          })),
        }
      : undefined,
  };

  const victimIdx = indexOfPlayer(s, explosionPlayerId);
  if (victimIdx < 0) return s;
  const victim = s.players[victimIdx];

  if (isBarking) {
    const pb = s.pendingBarkingDetonation;
    const actorId = pb?.actorId;
    if (s.explosionHasDefuse) {
      s.phase = 'defuse_prompt';
      s.defusingPlayerId = victim.id;
      s.defusingKitten = undefined;
      s.lastEvent = `${victim.name} ต้องกดใช้ Defuse (Barking Kitten)`;
      return s;
    }

    victim.alive = false;
    victim.pendingTurns = 0;
    s.eliminationOrder.push(victim.id);
    if (pb) discardBarkingCards(s, pb.barkingCardsToDiscard);
    clearBarkingDetonationFlags(s);
    s.lastEvent = `${victim.name} ระเบิดจาก Barking Kitten และออกจากเกม`;

    const winner = hasLivingWinner(s);
    if (winner) {
      s.phase = 'game_over';
      s.winnerId = winner;
      return s;
    }

    if (actorId) returnToBarkingActorTurn(s, actorId);
    else {
      s.phase = 'turn';
      if (s.currentPlayerIndex === victimIdx) {
        const nextIdx = nextAliveIndex(s, victimIdx);
        s.currentPlayerIndex = nextIdx;
        if (s.players[nextIdx].pendingTurns <= 0) s.players[nextIdx].pendingTurns = 1;
      }
    }
    return s;
  }

  if (s.explosionHasDefuse && !isImploding) {
    s.phase = 'defuse_prompt';
    s.defusingPlayerId = victim.id;
    s.lastEvent = `${victim.name} ต้องกดใช้ Defuse`;
    return s;
  }

  victim.alive = false;
  victim.pendingTurns = 0;
  s.eliminationOrder.push(victim.id);
  if (isHeldEk) {
    const ekIdx = victim.hand.findIndex((c) => c.type === 'exploding_kitten');
    if (ekIdx >= 0) {
      const [ek] = victim.hand.splice(ekIdx, 1);
      s.discardPile.push(ek);
    } else if (kitten) s.discardPile.push(kitten);
  } else if (kitten) s.discardPile.push(kitten);
  s.defusingKitten = undefined;
  s.defusingPlayerId = undefined;
  s.explosionPlayerId = undefined;
  s.explosionHasDefuse = undefined;
  s.explosionCause = undefined;
  s.lastEvent = isImploding
    ? `${victim.name} Imploding Kitten ระเบิดและออกจากเกม`
    : `${victim.name} ระเบิดและออกจากเกม`;

  const winner = hasLivingWinner(s);
  if (winner) {
    s.phase = 'game_over';
    s.winnerId = winner;
    return s;
  }

  s.phase = 'turn';
  if (s.currentPlayerIndex === victimIdx) {
    const nextIdx = nextAliveIndex(s, victimIdx);
    s.currentPlayerIndex = nextIdx;
    if (s.players[nextIdx].pendingTurns <= 0) s.players[nextIdx].pendingTurns = 1;
  }
  return s;
}

function findPlayerName(state: ExplodingKittensState, id: string): string {
  return getPlayerById(state, id)?.name ?? '?';
}

function playerNameByIdMap(state: ExplodingKittensState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of state.players) out[p.id] = p.name;
  return out;
}

function buildStealNotice(
  state: ExplodingKittensState,
  viewerId: string,
  nameById?: Record<string, string>,
) {
  const ev = state.lastStealEvent;
  if (!ev) return undefined;
  const shouldRevealCard = viewerId === ev.actorId || viewerId === ev.targetId;
  const nameOf = (id: string) => nameById?.[id] ?? findPlayerName(state, id);
  return {
    id: ev.id,
    actorId: ev.actorId,
    actorName: nameOf(ev.actorId),
    targetId: ev.targetId,
    targetName: nameOf(ev.targetId),
    cardType: shouldRevealCard ? ev.cardType : undefined,
  };
}

function buildThreeClaimNotice(state: ExplodingKittensState, nameById?: Record<string, string>) {
  const ev = state.lastThreeClaimEvent;
  if (!ev) return undefined;
  const nameOf = (id: string) => nameById?.[id] ?? findPlayerName(state, id);
  return {
    id: ev.id,
    actorId: ev.actorId,
    actorName: nameOf(ev.actorId),
    targetId: ev.targetId,
    targetName: nameOf(ev.targetId),
    requestedType: ev.requestedType,
    success: ev.success,
    stolenFromTower: ev.stolenFromTower,
    actualStolenType: ev.actualStolenType,
  };
}

function buildFiveCatsNotice(state: ExplodingKittensState, nameById?: Record<string, string>) {
  const ev = state.lastFiveCatsDiscardPickEvent;
  if (!ev) return undefined;
  const nameOf = (id: string) => nameById?.[id] ?? findPlayerName(state, id);
  return {
    id: ev.id,
    pickerId: ev.pickerId,
    pickerName: nameOf(ev.pickerId),
    cardType: ev.cardType,
  };
}

export const explodingKittensGame: GameDefinition<ExplodingKittensState, ExplodingKittensAction> = {
  id: 'exploding-kittens',
  name: 'Exploding Kittens',
  description:
    'เกมสายปั่นสไตล์ Russian Roulette: เล่นการ์ดเพื่อเอาตัวรอดจาก Exploding Kitten และอยู่เป็นคนสุดท้ายให้ได้',
  minPlayers: 2,
  maxPlayers: 50,
  thumbnail: '/games/exploding-kittens/thumbnail.png',

  setup(players: Player[], options?: unknown): ExplodingKittensState {
    const playerCount = players.length;
    const { mode, expansions, deckCopies } = parseExplodingKittensLobbyOptions(options);
    const copies = clampEkDeckCopies(deckCopies);
    const drawPile = buildStartingDrawPile(mode, copies, expansions);

    const gamePlayers: ExplodingKittensPlayerState[] = players.map((p) => ({
      id: p.id,
      name: p.name,
      alive: true,
      hand: [newCard('defuse')],
      pendingTurns: 0,
    }));
    /** สุ่มลำดับรอบโต๊ะ + คนเริ่มก่อน (index 0 หลังสับ) */
    const seatedPlayers = shuffle(gamePlayers);
    seatedPlayers[0].pendingTurns = 1;

    // Deal 4 random cards to each player (plus 1 defuse => 5 total)
    for (let round = 0; round < 4; round += 1) {
      for (const pl of seatedPlayers) {
        const c = drawPile.shift();
        if (c) pl.hand.push(c);
      }
    }

    // Add extra defuse + exploding kittens into draw pile.
    const baseCounts = EK_BASE_COUNTS_BY_MODE[mode];
    const extraDefuse = Math.max(0, (baseCounts.defuse ?? 0) * copies - playerCount);
    const kittens =
      Math.max(
        1,
        Math.min(playerCount - 1, (baseCounts.exploding_kitten ?? playerCount - 1) * copies),
      ) + (expansions.streaking ? 1 : 0);
    for (let i = 0; i < extraDefuse; i += 1) drawPile.push(newCard('defuse'));
    for (let i = 0; i < kittens; i += 1) drawPile.push(newCard('exploding_kitten'));
    if (expansions.imploding) drawPile.push(newCard('imploding_kitten'));

    let shuffled = shuffle(drawPile);
    let towerStash: ExplodingKittensCard[] = [];
    if (expansions.barking) {
      const tw = applyTowerOfPowerSetup(shuffled);
      shuffled = tw.pile;
      towerStash = tw.stash;
    }
    const starter = seatedPlayers[0];
    return {
      mode,
      expansions,
      phase: 'turn',
      players: seatedPlayers,
      drawPile: shuffled,
      discardPile: [],
      currentPlayerIndex: 0,
      playDirection: 1,
      seenTopByPlayer: {},
      markedCardByPlayerId: {},
      eliminationOrder: [],
      towerStash,
      illTakeActorByTarget: {},
      lastEvent: `สุ่มลำดับโต๊ะแล้ว — ${starter.name} เริ่มก่อน (${playerCount} คน)`,
    };
  },

  onAction(
    state: ExplodingKittensState,
    playerId: string,
    action: ExplodingKittensAction,
  ): ExplodingKittensState {
    const meIdxInState = indexOfPlayer(state, playerId);
    if (meIdxInState < 0) return state;
    const meInState = state.players[meIdxInState];
    if (!meInState.alive) return state;
    if (state.phase === 'game_over') return state;

    const s: ExplodingKittensState = {
      ...state,
      eliminationOrder: [...(state.eliminationOrder ?? [])],
      players: state.players.map((p) => ({ ...p, hand: [...p.hand] })),
      drawPile: [...state.drawPile],
      discardPile: [...state.discardPile],
      seenTopByPlayer: { ...state.seenTopByPlayer },
      markedCardByPlayerId: { ...(state.markedCardByPlayerId ?? {}) },
      garbageOrder: state.garbageOrder ? [...state.garbageOrder] : undefined,
      garbageCollected: state.garbageCollected ? [...state.garbageCollected] : undefined,
      alterFutureCount: state.alterFutureCount,
      blindPlayerId: state.blindPlayerId,
      curseFromId: state.curseFromId,
      markFromId: state.markFromId,
      playDirection: state.playDirection ?? 1,
      implodingReinsertCard: state.implodingReinsertCard
        ? { ...state.implodingReinsertCard }
        : undefined,
      implodingReinsertPlayerId: state.implodingReinsertPlayerId,
      towerStash: [...(state.towerStash ?? [])],
      illTakeActorByTarget: { ...(state.illTakeActorByTarget ?? {}) },
      barkingLoner: state.barkingLoner
        ? { playerId: state.barkingLoner.playerId, card: { ...state.barkingLoner.card } }
        : undefined,
      potluckOrder: state.potluckOrder ? [...state.potluckOrder] : undefined,
      buryCard: state.buryCard ? { ...state.buryCard } : undefined,
      pendingIllTake: state.pendingIllTake
        ? { fromId: state.pendingIllTake.fromId, card: { ...state.pendingIllTake.card } }
        : undefined,
      pendingAction: state.pendingAction
        ? { ...state.pendingAction, passedBy: [...state.pendingAction.passedBy] }
        : undefined,
      drawRevealPending: state.drawRevealPending
        ? state.drawRevealPending.kind === 'ill_take_draw'
          ? {
              ...state.drawRevealPending,
              card: { ...state.drawRevealPending.card },
            }
          : { ...state.drawRevealPending }
        : undefined,
      shareFuturePeekPending: state.shareFuturePeekPending
        ? {
            forPlayerId: state.shareFuturePeekPending.forPlayerId,
            top3: [...state.shareFuturePeekPending.top3],
          }
        : undefined,
      pendingBarkingPlay: state.pendingBarkingPlay
        ? {
            fromId: state.pendingBarkingPlay.fromId,
            card: { ...state.pendingBarkingPlay.card },
            acknowledgedBy: [...state.pendingBarkingPlay.acknowledgedBy],
          }
        : undefined,
      pendingBarkingDetonation: state.pendingBarkingDetonation
        ? {
            actorId: state.pendingBarkingDetonation.actorId,
            targetId: state.pendingBarkingDetonation.targetId,
            barkingCardsToDiscard: state.pendingBarkingDetonation.barkingCardsToDiscard.map(
              (c) => ({
                ...c,
              }),
            ),
          }
        : undefined,
    };

    const me = s.players[meIdxInState];

    if (action.type === 'acknowledge_share_future_peek') {
      if (!s.shareFuturePeekPending || s.shareFuturePeekPending.forPlayerId !== playerId) return s;
      s.shareFuturePeekPending = undefined;
      s.lastEvent = 'รับทราบการดู Share the Future';
      return s;
    }

    if (s.drawRevealPending) {
      const drp = s.drawRevealPending;
      if (action.type === 'acknowledge_draw_reveal') {
        if (drp.kind === 'ill_take_draw') {
          if (playerId !== drp.drawerId) return state;
          const drawer = getPlayerById(s, drp.drawerId);
          const recipient = getPlayerById(s, drp.recipientId);
          const card = drp.card;
          if (!recipient?.alive) {
            delete s.drawRevealPending;
            return s;
          }
          if (card.type === 'imploding_kitten') {
            delete s.drawRevealPending;
            consumeOneTurnOrAdvance(s);
            beginImplodingDrawn(s, recipient, card, "ได้รับจาก I'll Take That");
            return s;
          }
          if (card.type !== 'exploding_kitten') {
            receiveCardIntoHand(s, recipient, card);
            delete s.drawRevealPending;
            consumeOneTurnOrAdvance(s);
            s.lastStealEvent = {
              id: nextStealEventId++,
              actorId: recipient.id,
              targetId: drp.drawerId,
              cardType: card.type,
            };
            s.drawRevealPending = {
              kind: 'standard',
              playerId: recipient.id,
              cardType: card.type,
              consumesTurnOnAck: false,
            };
            const drawerName = drawer?.name ?? '?';
            s.lastEvent = `${drawerName} ยื่นการ์ดให้ ${recipient.name} (I'll Take That)`;
            return s;
          }
          if (canHoldExplodingKitten(recipient.hand)) {
            recipient.hand.push(card);
            delete s.drawRevealPending;
            consumeOneTurnOrAdvance(s);
            s.drawRevealPending = {
              kind: 'standard',
              playerId: recipient.id,
              cardType: 'exploding_kitten',
              consumesTurnOnAck: false,
            };
            const drawerName = drawer?.name ?? '?';
            s.lastEvent = `${drawerName} ยื่นการ์ดให้ ${recipient.name} (I'll Take That)`;
            return s;
          }
          delete s.drawRevealPending;
          consumeOneTurnOrAdvance(s);
          const hasDefuse = hasCardType(recipient.hand, 'defuse');
          s.phase = 'explosion_reveal';
          s.explosionCause = 'draw';
          s.explosionPlayerId = recipient.id;
          s.explosionHasDefuse = hasDefuse;
          s.defusingKitten = card;
          s.defusingPlayerId = recipient.id;
          const drawerName = drawer?.name ?? '?';
          s.lastEvent = `${drawerName} จั่ว Exploding Kitten ให้ ${recipient.name}!`;
          return s;
        }
        if (drp.kind === 'standard') {
          if (playerId !== drp.playerId) return state;
          const consume = drp.consumesTurnOnAck;
          delete s.drawRevealPending;
          if (consume) consumeOneTurnOrAdvance(s);
          if (s.blindPlayerId === playerId) s.blindPlayerId = undefined;
          return s;
        }
      }
      const blockedId = drp.kind === 'ill_take_draw' ? drp.drawerId : drp.playerId;
      if (playerId === blockedId) return state;
    }

    if (action.type === 'react_nope') {
      if (s.phase !== 'reaction' || !s.pendingAction) return s;
      const pa = s.pendingAction;
      // ห้าม Nope แอ็กชันตัวเอง (ชั้นแรก)
      if (playerId === pa.actorId && pa.nopeCount === 0) return s;
      // ห้าม Nope ต่อจาก Nope ของตัวเองทันที (ให้คนอื่นในวงตอบก่อน)
      if (pa.lastNopePlayerId === playerId) return s;
      const played = popCardById(s, me, action.cardId);
      if (!played || played.type !== 'nope') return s;
      s.discardPile.push(played);
      pa.nopeCount += 1;
      pa.lastNopePlayerId = playerId;
      pa.passedBy = [playerId];
      s.lastEvent = `${me.name} เล่น Nope`;
      return s;
    }

    if (action.type === 'react_pass') {
      if (s.phase !== 'reaction' || !s.pendingAction) return s;
      if (!s.pendingAction.passedBy.includes(playerId)) {
        s.pendingAction.passedBy.push(playerId);
      }
      const passedSet = new Set(s.pendingAction.passedBy);
      const allPassed = s.players.every((p) => !p.alive || passedSet.has(p.id));
      if (allPassed) resolvePendingAction(s);
      return s;
    }

    if (action.type === 'acknowledge_barking_kitten_show') {
      if (s.phase !== 'barking_kitten_show' || !s.pendingBarkingPlay) return s;
      if (!s.pendingBarkingPlay.acknowledgedBy.includes(playerId)) {
        s.pendingBarkingPlay.acknowledgedBy.push(playerId);
      }
      const ackSet = new Set(s.pendingBarkingPlay.acknowledgedBy);
      const allAcked = s.players.every((p) => !p.alive || ackSet.has(p.id));
      if (allAcked) {
        resolveBarkingPlayAfterShow(s);
      }
      return s;
    }

    /** Alter the Future NOW — เล่นแทรกเมื่อไม่ใช่เทิร์นตัวเอง (กลางเกมเทิร์นปกติเท่านั้น) */
    if (action.type === 'play_card') {
      const peekIdx = findCardIndex(me.hand, action.cardId);
      const peekType = peekIdx >= 0 ? me.hand[peekIdx].type : undefined;
      if (peekType === 'alter_future_now' && !assertCurrentPlayer(s, playerId)) {
        if (s.phase !== 'turn') return s;
        const played = popCardById(s, me, action.cardId);
        if (!played || played.type !== 'alter_future_now') return s;
        s.discardPile.push(played);
        clearPeekForPlayer(s, playerId);
        startPendingAction(
          s,
          playerId,
          'alter_future',
          `${me.name} เล่น Alter the Future NOW (นอกเทิร์น)`,
          undefined,
          undefined,
          ['alter_future_now'],
        );
        return s;
      }
    }

    // Other actions must be by current player, except target-side prompts.
    const potluckOk =
      s.phase === 'potluck' &&
      action.type === 'potluck_contribute' &&
      s.potluckOrder != null &&
      s.potluckIndex != null &&
      s.potluckOrder[s.potluckIndex] === playerId;
    const illTakeOk =
      s.phase === 'ill_take_target' &&
      s.pendingIllTake?.fromId === playerId &&
      (action.type === 'ill_take_choose_target' || action.type === 'ill_take_cancel');
    const buryReinsertOk =
      s.phase === 'bury_reinsert' && action.type === 'bury_reinsert' && s.buryPlayerId === playerId;
    const buryDrawOk =
      action.type === 'draw_card' && s.phase === 'bury_draw' && s.buryPlayerId === playerId;
    /** Defuse / ใส่ระเบิดกลับ — เหยื่อ Barking อาจไม่ใช่คนเทิร์นปัจจุบัน */
    const defuseOk =
      s.defusingPlayerId === playerId &&
      ((action.type === 'use_defuse' && s.phase === 'defuse_prompt') ||
        (action.type === 'defuse_reinsert' && s.phase === 'defuse_reinsert'));

    const garbageOk =
      s.phase === 'garbage_collection' &&
      action.type === 'garbage_contribute' &&
      s.garbageOrder != null &&
      s.garbageIndex != null &&
      s.garbageOrder[s.garbageIndex] === playerId;
    const curseOk =
      s.phase === 'curse_target' &&
      action.type === 'curse_choose_target' &&
      s.curseFromId === playerId;
    const markOk =
      s.phase === 'mark_target' &&
      action.type === 'mark_choose_target' &&
      s.markFromId === playerId;
    const implodingReinsertOk =
      s.phase === 'imploding_reinsert' &&
      action.type === 'imploding_reinsert' &&
      s.implodingReinsertPlayerId === playerId;

    if (
      !potluckOk &&
      !garbageOk &&
      !curseOk &&
      !markOk &&
      !implodingReinsertOk &&
      !illTakeOk &&
      !buryReinsertOk &&
      !buryDrawOk &&
      !defuseOk &&
      action.type !== 'favor_choose_give' &&
      action.type !== 'favor_give_from_tower' &&
      action.type !== 'five_cats_pick_discard' &&
      action.type !== 'alter_future_reorder' &&
      !assertCurrentPlayer(s, playerId)
    ) {
      return s;
    }

    if (action.type === 'draw_card') {
      if (s.phase === 'bury_draw' && s.buryPlayerId === playerId) {
        applyBuryTopDraw(s, playerId);
        return s;
      }
      if (s.phase !== 'turn') return s;
      clearPeekForPlayer(s, playerId);
      const illActor = s.illTakeActorByTarget[me.id];
      if (illActor) {
        delete s.illTakeActorByTarget[me.id];
        const card = s.drawPile.shift();
        if (!card) return s;
        const recipient = getPlayerById(s, illActor);
        if (!recipient?.alive) return s;
        s.drawRevealPending = {
          kind: 'ill_take_draw',
          drawerId: me.id,
          recipientId: illActor,
          card,
        };
        s.lastEvent = `${me.name} จั่วเพื่อ I'll Take That (ส่งต่อให้ ${recipient.name})`;
        return s;
      }
      const card = s.drawPile.shift();
      if (!card) return s;
      handleDrawnCard(s, me, card, 'จั่วการ์ด');
      return s;
    }

    if (action.type === 'use_defuse') {
      if (s.phase !== 'defuse_prompt' || s.defusingPlayerId !== playerId) return s;
      if (s.explosionCause === 'imploding') return s;
      const defuseIdx = me.hand.findIndex((c) => c.type === 'defuse');
      if (defuseIdx < 0) return s;

      if (s.explosionCause === 'barking') {
        const [defuseCard] = me.hand.splice(defuseIdx, 1);
        s.discardPile.push(defuseCard);
        const pb = s.pendingBarkingDetonation;
        const actorId = pb?.actorId;
        if (pb) discardBarkingCards(s, pb.barkingCardsToDiscard);
        clearBarkingDetonationFlags(s);
        if (actorId) returnToBarkingActorTurn(s, actorId);
        else s.phase = 'turn';
        s.lastEvent = `${me.name} ใช้ Defuse รอดจาก Barking Kitten`;
        return s;
      }

      if (!s.defusingKitten) return s;
      const [defuseCard] = me.hand.splice(defuseIdx, 1);
      s.discardPile.push(defuseCard);
      s.phase = 'defuse_reinsert';
      s.explosionPlayerId = undefined;
      s.explosionHasDefuse = undefined;
      s.explosionCause = undefined;
      s.lastEvent = `${me.name} ใช้ Defuse สำเร็จ เลือกตำแหน่งวางระเบิด`;
      return s;
    }

    if (action.type === 'defuse_reinsert') {
      if (s.phase !== 'defuse_reinsert' || s.defusingPlayerId !== playerId || !s.defusingKitten)
        return s;
      const pos = Math.max(0, Math.min(action.index, s.drawPile.length));
      if (s.defusingKitten) {
        const ekIdx = me.hand.findIndex((c) => c.id === s.defusingKitten!.id);
        if (ekIdx >= 0) me.hand.splice(ekIdx, 1);
      }
      s.drawPile.splice(pos, 0, s.defusingKitten);
      s.defusingKitten = undefined;
      s.defusingPlayerId = undefined;
      s.explosionPlayerId = undefined;
      s.explosionHasDefuse = undefined;
      s.explosionCause = undefined;
      s.phase = 'turn';
      consumeOneTurnOrAdvance(s);
      s.lastEvent = `${me.name} ใช้ Defuse และใส่ระเบิดกลับกอง`;
      return s;
    }

    if (action.type === 'bury_reinsert') {
      if (s.phase !== 'bury_reinsert' || s.buryPlayerId !== playerId || !s.buryCard) return s;
      const pos = Math.max(0, Math.min(action.index, s.drawPile.length));
      s.drawPile.splice(pos, 0, s.buryCard);
      s.buryCard = undefined;
      s.buryPlayerId = undefined;
      s.phase = 'turn';
      consumeOneTurnOrAdvance(s);
      s.lastEvent = `${me.name} ฝังการ์ด (Bury)`;
      return s;
    }

    if (action.type === 'imploding_reinsert') {
      if (
        s.phase !== 'imploding_reinsert' ||
        s.implodingReinsertPlayerId !== playerId ||
        !s.implodingReinsertCard
      )
        return s;
      const pos = Math.max(0, Math.min(action.index, s.drawPile.length));
      const card = { ...s.implodingReinsertCard, faceUp: true };
      s.drawPile.splice(pos, 0, card);
      s.implodingReinsertCard = undefined;
      s.implodingReinsertPlayerId = undefined;
      s.phase = 'turn';
      consumeOneTurnOrAdvance(s);
      s.lastEvent = `${me.name} ใส่ Imploding Kitten กลับกองแบบคว่ำหน้า`;
      return s;
    }

    if (action.type === 'ill_take_choose_target') {
      if (
        s.phase !== 'ill_take_target' ||
        !s.pendingIllTake ||
        s.pendingIllTake.fromId !== playerId
      )
        return s;
      const targetIdx = indexOfPlayer(s, action.targetId);
      if (targetIdx < 0) return s;
      const target = s.players[targetIdx];
      if (!target.alive || target.id === playerId) return s;
      if (s.illTakeActorByTarget[target.id]) return s;
      const actor = getPlayerById(s, s.pendingIllTake!.fromId);
      if (!actor) return s;
      startPendingAction(
        s,
        s.pendingIllTake.fromId,
        'ill_take',
        `${actor.name} — I'll Take That → ${target.name}`,
        target.id,
        undefined,
        ['ill_take_that'],
      );
      return s;
    }

    if (action.type === 'ill_take_cancel') {
      if (
        s.phase !== 'ill_take_target' ||
        !s.pendingIllTake ||
        s.pendingIllTake.fromId !== playerId
      )
        return s;
      const actor = getPlayerById(s, playerId);
      if (!actor?.alive) return s;
      actor.hand.push(s.pendingIllTake.card);
      s.pendingIllTake = undefined;
      s.phase = 'turn';
      s.lastEvent = `${actor.name} ยกเลิก I'll Take That`;
      return s;
    }

    if (action.type === 'potluck_contribute') {
      if (s.phase !== 'potluck' || s.potluckOrder == null || s.potluckIndex == null) return s;
      if (s.potluckOrder[s.potluckIndex] !== playerId) return s;
      const card = popCardById(s, me, action.cardId);
      if (!card) return s;
      s.drawPile.unshift(card);
      s.potluckIndex += 1;
      s.lastEvent = `Potluck — ${me.name} วางการ์ดบนกอง`;
      if (s.potluckIndex >= s.potluckOrder.length) {
        s.phase = 'turn';
        s.potluckOrder = undefined;
        s.potluckIndex = undefined;
        consumeOneTurnOrAdvance(s);
        s.lastEvent = 'Potluck จบแล้ว';
      }
      return s;
    }

    if (action.type === 'play_card') {
      if (s.phase !== 'turn') return s;
      let cardId = action.cardId;
      if (s.blindPlayerId === playerId && me.hand.length > 0) {
        const ri = Math.floor(Math.random() * me.hand.length);
        cardId = me.hand[ri]!.id;
      }
      const played = takeCardFromHand(s, me, cardId);
      if (!played) return s;

      if (played.type === 'exploding_kitten') {
        beginHeldEkExplosion(s, playerId, played);
        return s;
      }
      if (played.type === 'streaking_kitten') {
        me.hand.push(played);
        return s;
      }

      if (played.type === 'barking_kitten') {
        /** มี Barking หน้าโต๊ะอยู่แล้ว — ต้องใช้ play_barking_table_pair (คู่หน้าโต๊ะ+มือ) ไม่เล่นใบเดียว */
        if (s.barkingLoner?.playerId === playerId) {
          me.hand.push(played);
          return s;
        }
        clearPeekForPlayer(s, playerId);
        s.pendingBarkingPlay = {
          fromId: playerId,
          card: played,
          acknowledgedBy: [],
        };
        s.phase = 'barking_kitten_show';
        s.lastEvent = `${me.name} เล่น Barking Kitten`;
        return s;
      }

      s.discardPile.push(played);
      clearPeekForPlayer(s, playerId);

      if (played.type === 'shuffle') {
        startPendingAction(
          s,
          playerId,
          'shuffle',
          `${me.name} เล่น Shuffle`,
          undefined,
          undefined,
          ['shuffle'],
        );
        return s;
      }
      if (played.type === 'see_future') {
        startPendingAction(
          s,
          playerId,
          'see_future',
          `${me.name} เล่น See the Future`,
          undefined,
          undefined,
          ['see_future'],
        );
        return s;
      }
      if (played.type === 'alter_future') {
        startPendingAction(
          s,
          playerId,
          'alter_future',
          `${me.name} เล่น Alter the Future`,
          undefined,
          undefined,
          ['alter_future'],
        );
        return s;
      }
      if (played.type === 'draw_from_bottom') {
        startPendingAction(
          s,
          playerId,
          'draw_from_bottom',
          `${me.name} เล่น Draw from the Bottom`,
          undefined,
          undefined,
          ['draw_from_bottom'],
        );
        return s;
      }
      if (played.type === 'skip') {
        startPendingAction(s, playerId, 'skip', `${me.name} เล่น Skip`, undefined, undefined, [
          'skip',
        ]);
        return s;
      }
      if (played.type === 'reverse') {
        startPendingAction(
          s,
          playerId,
          'reverse',
          `${me.name} เล่น Reverse`,
          undefined,
          undefined,
          ['reverse'],
        );
        return s;
      }
      if (played.type === 'attack') {
        const nextIdx = nextAliveIndex(s, s.currentPlayerIndex);
        const nextPlayer = s.players[nextIdx]!;
        startPendingAction(
          s,
          playerId,
          'attack',
          `${me.name} เล่น Attack → ${nextPlayer.name}`,
          nextPlayer.id,
          undefined,
          ['attack'],
        );
        return s;
      }
      if (played.type === 'targeted_attack') {
        s.phase = 'targeted_attack_target';
        s.targetedAttackFromId = playerId;
        s.lastEvent = `${me.name} เล่น Targeted Attack — เลือกเป้าหมาย`;
        return s;
      }
      if (played.type === 'favor') {
        s.phase = 'favor_target';
        s.favorFromId = playerId;
        s.favorTargetId = undefined;
        s.lastEvent = `${me.name} เล่น Favor — เลือกเป้าหมาย`;
        return s;
      }
      if (played.type === 'alter_future_now') {
        startPendingAction(
          s,
          playerId,
          'alter_future',
          `${me.name} เล่น Alter the Future NOW`,
          undefined,
          undefined,
          ['alter_future_now'],
        );
        return s;
      }
      if (played.type === 'share_future_3x') {
        s.shareFutureAlter = true;
        startPendingAction(
          s,
          playerId,
          'alter_future',
          `${me.name} เล่น Share the Future`,
          undefined,
          undefined,
          ['share_future_3x'],
        );
        return s;
      }
      if (played.type === 'super_skip') {
        startPendingAction(
          s,
          playerId,
          'super_skip',
          `${me.name} เล่น Super Skip`,
          undefined,
          undefined,
          ['super_skip'],
        );
        return s;
      }
      if (played.type === 'personal_attack_3x') {
        startPendingAction(
          s,
          playerId,
          'personal_attack_3x',
          `${me.name} เล่น Personal Attack 3x`,
          undefined,
          undefined,
          ['personal_attack_3x'],
        );
        return s;
      }
      if (played.type === 'bury') {
        if (s.illTakeActorByTarget[me.id]) {
          me.hand.push(played);
          s.discardPile.pop();
          return s;
        }
        startPendingAction(s, playerId, 'bury', `${me.name} เล่น Bury`, undefined, undefined, [
          'bury',
        ]);
        return s;
      }
      if (played.type === 'potluck') {
        const order: string[] = [];
        const n = s.players.length;
        const idx = s.currentPlayerIndex;
        const dir = s.playDirection === -1 ? -1 : 1;
        for (let k = 0; k < n; k += 1) {
          const p = s.players[(idx + k * dir + n * 20) % n];
          if (p.alive) order.push(p.id);
        }
        s.potluckOrder = order;
        s.potluckIndex = 0;
        s.phase = 'potluck';
        s.lastEvent = `${me.name} เริ่ม Potluck`;
        return s;
      }
      if (played.type === 'tower_of_power') {
        startPendingAction(
          s,
          playerId,
          'tower_of_power',
          `${me.name} เล่น Tower of Power`,
          undefined,
          undefined,
          ['tower_of_power'],
        );
        return s;
      }
      if (played.type === 'see_future_5x') {
        startPendingAction(
          s,
          playerId,
          'see_future_5x',
          `${me.name} เล่น See the Future 5x`,
          undefined,
          undefined,
          ['see_future_5x'],
        );
        return s;
      }
      if (played.type === 'alter_future_5x') {
        startPendingAction(
          s,
          playerId,
          'alter_future_5x',
          `${me.name} เล่น Alter the Future 5x`,
          undefined,
          undefined,
          ['alter_future_5x'],
          5,
        );
        return s;
      }
      if (played.type === 'swap_top_bottom') {
        startPendingAction(
          s,
          playerId,
          'swap_top_bottom',
          `${me.name} เล่น Swap Top and Bottom`,
          undefined,
          undefined,
          ['swap_top_bottom'],
        );
        return s;
      }
      if (played.type === 'garbage_collection') {
        startPendingAction(
          s,
          playerId,
          'garbage_collection',
          `${me.name} เล่น Garbage Collection`,
          undefined,
          undefined,
          ['garbage_collection'],
        );
        return s;
      }
      if (played.type === 'mark') {
        startPendingAction(s, playerId, 'mark', `${me.name} เล่น Mark`, undefined, undefined, [
          'mark',
        ]);
        return s;
      }
      if (played.type === 'curse_of_the_cat_butt') {
        startPendingAction(
          s,
          playerId,
          'curse_of_the_cat_butt',
          `${me.name} เล่น Curse of the Cat Butt`,
          undefined,
          undefined,
          ['curse_of_the_cat_butt'],
        );
        return s;
      }
      if (played.type === 'catomic_bomb') {
        startPendingAction(
          s,
          playerId,
          'catomic_bomb',
          `${me.name} เล่น Catomic Bomb`,
          undefined,
          undefined,
          ['catomic_bomb'],
        );
        return s;
      }
      if (played.type === 'ill_take_that') {
        s.discardPile.pop();
        s.pendingIllTake = { card: played, fromId: me.id };
        s.phase = 'ill_take_target';
        s.lastEvent = `${me.name} เลือกเป้าหมาย I'll Take That`;
        return s;
      }
      // nope cannot be played from main-turn by this action path
      if (played.type === 'nope') {
        // invalid in main play; return card to hand for safety
        me.hand.push(played);
        s.discardPile.pop();
        return s;
      }
      // Cat cards cannot be single-played
      me.hand.push(played);
      s.discardPile.pop();
      return s;
    }

    if (action.type === 'play_pair') {
      if (s.phase !== 'turn') return s;
      const ca = popCardById(s, me, action.cardIdA);
      const cb = popCardById(s, me, action.cardIdB);
      if (!ca || !cb || !validateSameCatCombo([ca, cb])) {
        if (ca) me.hand.push(ca);
        if (cb) me.hand.push(cb);
        return s;
      }
      const targetIdx = indexOfPlayer(s, action.targetId);
      if (targetIdx < 0 || !s.players[targetIdx].alive || s.players[targetIdx].hand.length === 0) {
        me.hand.push(ca, cb);
        return s;
      }
      s.discardPile.push(ca, cb);
      startPendingAction(
        s,
        playerId,
        'pair_steal',
        `${me.name} ใช้คู่แมว เลือกขโมยจาก ${s.players[targetIdx].name}`,
        s.players[targetIdx].id,
        undefined,
        [ca.type, cb.type],
      );
      return s;
    }

    if (action.type === 'play_barking_pair') {
      if (s.phase !== 'turn') return s;
      const ca = popCardById(s, me, action.cardIdA);
      const cb = popCardById(s, me, action.cardIdB);
      if (!ca || !cb || ca.type !== 'barking_kitten' || cb.type !== 'barking_kitten') {
        if (ca) me.hand.push(ca);
        if (cb) me.hand.push(cb);
        return s;
      }
      const targetIdx = indexOfPlayer(s, action.targetId);
      if (targetIdx < 0) {
        me.hand.push(ca, cb);
        return s;
      }
      const target = s.players[targetIdx];
      if (!target.alive || target.id === playerId) {
        me.hand.push(ca, cb);
        return s;
      }
      startBarkingDetonation(s, me.id, target.id, [ca, cb]);
      return s;
    }

    if (action.type === 'play_barking_table_pair') {
      if (s.phase !== 'turn') return s;
      if (s.barkingLoner?.playerId !== playerId) return s;
      const handBark = popCardById(s, me, action.cardId);
      if (!handBark || handBark.type !== 'barking_kitten') {
        if (handBark) me.hand.push(handBark);
        return s;
      }
      const lonerCard = s.barkingLoner.card;
      s.barkingLoner = undefined;
      const targetIdx = indexOfPlayer(s, action.targetId);
      if (targetIdx < 0) {
        me.hand.push(handBark);
        s.barkingLoner = { playerId, card: lonerCard };
        return s;
      }
      const target = s.players[targetIdx];
      if (!target.alive || target.id === playerId) {
        me.hand.push(handBark);
        s.barkingLoner = { playerId, card: lonerCard };
        return s;
      }
      startBarkingDetonation(s, me.id, target.id, [lonerCard, handBark]);
      return s;
    }

    if (action.type === 'play_three_claim') {
      if (s.phase !== 'turn') return s;
      const ca = popCardById(s, me, action.cardIdA);
      const cb = popCardById(s, me, action.cardIdB);
      const cc = popCardById(s, me, action.cardIdC);
      if (!ca || !cb || !cc || !validateSameCatCombo([ca, cb, cc])) {
        if (ca) me.hand.push(ca);
        if (cb) me.hand.push(cb);
        if (cc) me.hand.push(cc);
        return s;
      }
      const targetIdx = indexOfPlayer(s, action.targetId);
      if (targetIdx < 0 || !s.players[targetIdx].alive) {
        me.hand.push(ca, cb, cc);
        return s;
      }
      s.discardPile.push(ca, cb, cc);
      startPendingAction(
        s,
        playerId,
        'three_claim',
        `${me.name} ใช้ 3 ใบเรียกการ์ดจาก ${s.players[targetIdx].name}`,
        s.players[targetIdx].id,
        action.requestedType,
        [ca.type, cb.type, cc.type],
      );
      return s;
    }

    if (action.type === 'play_five_cats') {
      if (s.phase !== 'turn') return s;
      const [a, b, c, d, e] = action.cardIds;
      const picked = [
        popCardById(s, me, a),
        popCardById(s, me, b),
        popCardById(s, me, c),
        popCardById(s, me, d),
        popCardById(s, me, e),
      ];
      let hasMissing = false;
      for (const x of picked) {
        if (x == null) {
          hasMissing = true;
          break;
        }
      }
      if (hasMissing) {
        for (const card of picked) if (card) me.hand.push(card);
        return s;
      }
      const cards = picked as ExplodingKittensCard[];
      if (!validateFiveDistinctCatCombo(cards)) {
        me.hand.push(...cards);
        return s;
      }
      s.discardPile.push(...cards);
      startPendingAction(
        s,
        playerId,
        'five_cats',
        `${me.name} เล่นคอมโบ 5 แมวต่างกัน`,
        undefined,
        undefined,
        cards.map((c) => c.type),
      );
      return s;
    }

    if (action.type === 'favor_choose_target') {
      if (s.phase !== 'favor_target' || s.favorFromId !== playerId) return s;
      const targetIdx = indexOfPlayer(s, action.targetId);
      if (targetIdx < 0) return s;
      const target = s.players[targetIdx];
      if (!target.alive || target.id === playerId || target.hand.length === 0) return s;
      const actor = getPlayerById(s, s.favorFromId);
      if (!actor) return s;
      startPendingAction(
        s,
        s.favorFromId,
        'favor',
        `${actor.name} เล่น Favor ใส่ ${target.name}`,
        target.id,
        undefined,
        ['favor'],
      );
      return s;
    }

    if (action.type === 'targeted_attack_choose_target') {
      if (s.phase !== 'targeted_attack_target' || s.targetedAttackFromId !== playerId) return s;
      const targetIdx = indexOfPlayer(s, action.targetId);
      if (targetIdx < 0) return s;
      const target = s.players[targetIdx];
      if (!target.alive || target.id === playerId) return s;
      const actor = getPlayerById(s, s.targetedAttackFromId);
      if (!actor) return s;
      startPendingAction(
        s,
        s.targetedAttackFromId,
        'targeted_attack',
        `${actor.name} เล่น Targeted Attack ใส่ ${target.name}`,
        target.id,
        undefined,
        ['targeted_attack'],
      );
      return s;
    }

    if (action.type === 'favor_give_from_tower') {
      if (
        s.phase !== 'favor_give' ||
        !s.favorFromId ||
        !s.favorTargetId ||
        s.favorTargetId !== playerId
      )
        return s;
      const fromIdx = indexOfPlayer(s, s.favorFromId);
      if (fromIdx < 0) return s;
      const from = s.players[fromIdx];
      if (me.id !== s.towerWearerId || s.towerStash.length === 0) return s;
      if (!stealOneFromTowerIfApplicable(s, from, me)) return s;
      s.phase = 'turn';
      s.favorFromId = undefined;
      s.favorTargetId = undefined;
      s.lastEvent = `${from.name} ได้การ์ดจาก Tower of Power (Favor) แทนการเลือกจากมือของ ${me.name}`;
      return s;
    }

    if (action.type === 'favor_choose_give') {
      if (
        s.phase !== 'favor_give' ||
        !s.favorFromId ||
        !s.favorTargetId ||
        s.favorTargetId !== playerId
      )
        return s;
      const fromIdx = indexOfPlayer(s, s.favorFromId);
      if (fromIdx < 0) return s;
      const from = s.players[fromIdx];
      if (me.id === s.towerWearerId && s.towerStash.length > 0) return s;
      const given = popCardById(s, me, action.cardId);
      if (!given) return s;
      receiveCardIntoHand(s, from, given);
      s.lastStealEvent = {
        id: nextStealEventId++,
        actorId: from.id,
        targetId: me.id,
        cardType: given.type,
      };
      s.favorFromId = undefined;
      s.favorTargetId = undefined;
      const triggeredHeldExplosion =
        s.explosionCause === 'held_ek' && s.explosionPlayerId === from.id;
      if (!triggeredHeldExplosion) s.phase = 'turn';
      s.lastEvent = `${me.name} มอบการ์ดให้ ${from.name}`;
      return s;
    }

    if (action.type === 'alter_future_reorder') {
      if (s.phase !== 'alter_future_reorder' || s.alterFutureById !== playerId) return s;
      const reorderN = s.alterFutureCount ?? 3;
      const n = Math.min(reorderN, s.drawPile.length);
      const order = action.order;
      if (n === 0) {
        // Nothing to reorder — clear the prompt and continue.
      } else {
        const uniq = new Set(order);
        if (
          order.length !== n ||
          uniq.size !== n ||
          !order.every((i) => Number.isInteger(i) && i >= 0 && i < n)
        ) {
          return s;
        }
        const top = s.drawPile.slice(0, n);
        s.drawPile.splice(0, n, ...order.map((i) => top[i]!));
      }
      s.phase = 'turn';
      s.alterFutureById = undefined;
      if (s.shareFutureAlter) {
        const aidx = indexOfPlayer(s, playerId);
        if (aidx >= 0) {
          const nid = nextAliveIndex(s, aidx);
          const np = s.players[nid];
          const sharePeek = s.drawPile.slice(0, Math.min(3, s.drawPile.length)).map((c) => c.type);
          if (np) s.shareFuturePeekPending = { forPlayerId: np.id, top3: [...sharePeek] };
        }
        s.shareFutureAlter = undefined;
      }
      s.alterFutureCount = undefined;
      s.lastEvent =
        n === 0
          ? `${me.name} จัดลำดับบนกองเรียบร้อย (กองว่าง)`
          : `${me.name} จัดลำดับ ${n} ใบบนสุดเรียบร้อย`;
      return s;
    }

    if (action.type === 'garbage_contribute') {
      if (s.phase !== 'garbage_collection' || s.garbageOrder == null || s.garbageIndex == null)
        return s;
      if (s.garbageOrder[s.garbageIndex] !== playerId) return s;
      const card = popCardById(s, me, action.cardId);
      if (!card) return s;
      if (!s.garbageCollected) s.garbageCollected = [];
      s.garbageCollected.push(card);
      s.garbageIndex += 1;
      s.lastEvent = `Garbage Collection — ${me.name} ส่งการ์ด`;
      if (s.garbageIndex >= s.garbageOrder.length) {
        s.drawPile.push(...s.garbageCollected);
        s.drawPile = shuffle(s.drawPile);
        s.garbageOrder = undefined;
        s.garbageIndex = undefined;
        s.garbageCollected = undefined;
        s.phase = 'turn';
        s.lastEvent = 'Garbage Collection จบแล้ว';
      }
      return s;
    }

    if (action.type === 'mark_choose_target') {
      if (s.phase !== 'mark_target' || s.markFromId !== playerId) return s;
      const targetIdx = indexOfPlayer(s, action.targetId);
      if (targetIdx < 0) return s;
      const target = s.players[targetIdx];
      if (!target.alive || target.id === playerId || target.hand.length === 0) return s;
      const ri = Math.floor(Math.random() * target.hand.length);
      const marked = target.hand[ri]!;
      s.markedCardByPlayerId[target.id] = marked.id;
      s.phase = 'turn';
      s.markFromId = undefined;
      s.lastEvent = `${me.name} Mark → ${target.name}`;
      return s;
    }

    if (action.type === 'curse_choose_target') {
      if (s.phase !== 'curse_target' || s.curseFromId !== playerId) return s;
      const targetIdx = indexOfPlayer(s, action.targetId);
      if (targetIdx < 0) return s;
      const target = s.players[targetIdx];
      if (!target.alive || target.id === playerId || target.hand.length === 0) return s;
      s.blindPlayerId = target.id;
      target.hand = shuffle(target.hand);
      s.phase = 'turn';
      s.curseFromId = undefined;
      s.lastEvent = `${me.name} Curse of the Cat Butt → ${target.name}`;
      return s;
    }

    if (action.type === 'five_cats_pick_discard') {
      if (s.phase !== 'five_cats_pick_discard' || s.fiveCatsPickerId !== playerId) return s;
      const discardIdx = s.discardPile.findIndex((card) => card.id === action.discardCardId);
      if (discardIdx < 0) return s;
      const [picked] = s.discardPile.splice(discardIdx, 1);
      me.hand.push(picked);
      s.phase = 'turn';
      s.fiveCatsPickerId = undefined;
      s.lastFiveCatsDiscardPickEvent = {
        id: nextFiveCatsDiscardPickEventId++,
        pickerId: me.id,
        cardType: picked.type,
      };
      s.lastEvent = `${me.name} หยิบการ์ดจากกองทิ้งด้วยคอมโบ 5 แมวต่างกัน`;
      return s;
    }

    return s;
  },

  getPlayerView(state: ExplodingKittensState, playerId: string): ExplodingKittensPlayerView {
    const me = getPlayerById(state, playerId);
    if (!me) throw new Error(`Player ${playerId} not found`);
    const current = state.players[state.currentPlayerIndex];
    const nameById = playerNameByIdMap(state);
    const nameOf = (id: string) => nameById[id] ?? '?';
    const winnerName = state.winnerId ? nameOf(state.winnerId) : undefined;
    const discardCards = [...state.discardPile].reverse();
    const discardHistory = discardCards.map((c) => c.type);

    return {
      mode: state.mode,
      expansions: state.expansions,
      phase: state.phase,
      me: { id: me.id, name: me.name, alive: me.alive, pendingTurns: me.pendingTurns },
      players: state.players.map((p) => ({
        id: p.id,
        name: p.name,
        alive: p.alive,
        handCount: p.hand.length,
        pendingTurns: p.pendingTurns,
      })),
      myHand: [...me.hand],
      drawPileCount: state.drawPile.length,
      discardTop: state.discardPile[state.discardPile.length - 1]?.type,
      discardCount: state.discardPile.length,
      discardHistory,
      discardCards,
      currentPlayerId: current.id,
      currentPlayerName: current.name,
      pendingTurnsForCurrent: current.pendingTurns,
      playDirection: state.playDirection ?? 1,
      drawPileTopFaceUp:
        state.drawPile[0]?.faceUp && state.drawPile[0]?.type === 'imploding_kitten'
          ? 'imploding_kitten'
          : undefined,
      pendingAction: state.pendingAction
        ? {
            actorId: state.pendingAction.actorId,
            actorName: nameOf(state.pendingAction.actorId),
            type: state.pendingAction.type,
            targetId: state.pendingAction.targetId,
            requestedType: state.pendingAction.requestedType,
            playedCardTypes: state.pendingAction.playedCardTypes
              ? [...state.pendingAction.playedCardTypes]
              : undefined,
            nopeCount: state.pendingAction.nopeCount,
            passedBy: [...state.pendingAction.passedBy],
            lastNopePlayerId: state.pendingAction.lastNopePlayerId,
            lastNopePlayerName: state.pendingAction.lastNopePlayerId
              ? nameOf(state.pendingAction.lastNopePlayerId)
              : undefined,
          }
        : undefined,
      explosionReveal:
        state.phase === 'explosion_reveal' && state.explosionPlayerId
          ? {
              playerId: state.explosionPlayerId,
              playerName: nameOf(state.explosionPlayerId),
              hasDefuse: Boolean(state.explosionHasDefuse) && state.explosionCause !== 'imploding',
              cause:
                state.explosionCause === 'barking'
                  ? 'barking'
                  : state.explosionCause === 'held_ek'
                    ? 'held_ek'
                    : state.explosionCause === 'imploding'
                      ? 'imploding'
                      : 'draw',
            }
          : undefined,
      stealNotice: buildStealNotice(state, playerId, nameById),
      threeClaimNotice: buildThreeClaimNotice(state, nameById),
      fiveCatsDiscardPickNotice: buildFiveCatsNotice(state, nameById),
      favorPrompt:
        state.phase === 'favor_target' || state.phase === 'favor_give'
          ? { fromId: state.favorFromId ?? '', targetId: state.favorTargetId }
          : undefined,
      targetedAttackPrompt:
        state.phase === 'targeted_attack_target' && state.targetedAttackFromId
          ? { fromId: state.targetedAttackFromId }
          : undefined,
      fiveCatsPrompt:
        state.phase === 'five_cats_pick_discard' && state.fiveCatsPickerId
          ? { pickerId: state.fiveCatsPickerId }
          : undefined,
      alterFuturePrompt:
        state.phase === 'alter_future_reorder' && state.alterFutureById === playerId
          ? {
              playerId,
              topCards: state.drawPile.slice(0, state.alterFutureCount ?? 3).map((c) => c.type),
              isShareFuture: Boolean(state.shareFutureAlter),
            }
          : undefined,
      defusePrompt:
        (state.phase === 'bury_reinsert' && state.buryPlayerId === playerId) ||
        ((state.phase === 'defuse_prompt' || state.phase === 'defuse_reinsert') &&
          state.defusingPlayerId === playerId)
          ? {
              playerId,
              drawPileCount: state.drawPile.length,
              isBarkingDetonation:
                state.phase === 'defuse_prompt' && state.explosionCause === 'barking',
            }
          : undefined,
      buryReinsertCardType:
        state.phase === 'bury_reinsert' && state.buryPlayerId === playerId && state.buryCard
          ? state.buryCard.type
          : undefined,
      seenTopCards: state.seenTopByPlayer[playerId],
      winnerId: state.winnerId,
      winnerName,
      eliminationOrder:
        state.phase === 'game_over' && state.eliminationOrder.length > 0
          ? [...state.eliminationOrder]
          : undefined,
      lastEvent: state.lastEvent,
      drawReveal: (() => {
        const drp = state.drawRevealPending;
        if (!drp) return undefined;
        if (drp.kind === 'ill_take_draw') {
          return drp.drawerId === playerId ? { type: drp.card.type } : undefined;
        }
        return drp.playerId === playerId ? { type: drp.cardType } : undefined;
      })(),
      towerStashCount: state.towerStash?.length ?? 0,
      towerWearerId: state.towerWearerId,
      illTakeActorOnMe: state.illTakeActorByTarget[playerId],
      barkingLonerPlayerId: state.barkingLoner?.playerId,
      potluckCurrentPlayerId:
        state.phase === 'potluck' && state.potluckOrder && state.potluckIndex != null
          ? state.potluckOrder[state.potluckIndex]
          : undefined,
      illTakePrompt: state.phase === 'ill_take_target' && state.pendingIllTake?.fromId === playerId,
      buryDrawPlayerId: state.phase === 'bury_draw' ? state.buryPlayerId : undefined,
      illTakeBlockedTargets: Object.keys(state.illTakeActorByTarget ?? {}),
      barkingKittenShow:
        state.phase === 'barking_kitten_show' && state.pendingBarkingPlay
          ? {
              actorId: state.pendingBarkingPlay.fromId,
              actorName: nameOf(state.pendingBarkingPlay.fromId),
              acknowledgedBy: [...state.pendingBarkingPlay.acknowledgedBy],
            }
          : undefined,
      shareFuturePeek:
        state.shareFuturePeekPending?.forPlayerId === playerId
          ? { top3: [...state.shareFuturePeekPending.top3] }
          : undefined,
      cursePrompt: state.phase === 'curse_target' && state.curseFromId === playerId,
      markPrompt: state.phase === 'mark_target' && state.markFromId === playerId,
      blindPlayerId: state.blindPlayerId,
      myMarkedCardId: state.markedCardByPlayerId?.[playerId],
      markedCardsPublic: (() => {
        const out: { playerId: string; cardType: ExplodingKittensCardType }[] = [];
        for (const [pid, cardId] of Object.entries(state.markedCardByPlayerId ?? {})) {
          const pl = getPlayerById(state, pid);
          const card = pl?.hand.find((c) => c.id === cardId);
          if (card) out.push({ playerId: pid, cardType: card.type });
        }
        return out.length > 0 ? out : undefined;
      })(),
      garbagePrompt:
        state.phase === 'garbage_collection' &&
        state.garbageOrder != null &&
        state.garbageIndex != null &&
        state.garbageOrder[state.garbageIndex] === playerId,
      implodingReinsertPrompt:
        state.phase === 'imploding_reinsert' && state.implodingReinsertPlayerId === playerId,
    };
  },

  isGameOver(state: ExplodingKittensState): GameResult | null {
    if (state.phase !== 'game_over' || !state.winnerId) return null;
    return { winners: [state.winnerId], reason: `${state.winnerId} ชนะเกม` };
  },
};
