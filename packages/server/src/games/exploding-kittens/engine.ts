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
import { parseExplodingKittensLobbyOptions } from 'shared';
import { validateSameCatCombo, validateFiveDistinctCatCombo } from 'shared';

const BASE_COUNTS_BY_MODE: Record<
  'original' | 'party_pack',
  Partial<Record<ExplodingKittensCardType, number>>
> = {
  original: {
    exploding_kitten: 4,
    defuse: 6,
    attack: 4,
    skip: 4,
    shuffle: 4,
    see_future: 5,
    favor: 4,
    nope: 5,
    cat_taco: 4,
    cat_melon: 4,
    cat_beard: 4,
    cat_rainbow: 4,
    cat_potato: 4,
  },
  // Party Pack (official-style set for this project)
  party_pack: {
    exploding_kitten: 9,
    defuse: 11,
    attack: 4,
    targeted_attack: 4,
    skip: 4,
    shuffle: 4,
    see_future: 5,
    alter_future: 4,
    draw_from_bottom: 4,
    favor: 4,
    nope: 6,
    feral_cat: 6,
    cat_taco: 4,
    cat_melon: 4,
    cat_beard: 4,
    cat_rainbow: 4,
    cat_potato: 4,
  },
};

/** Barking Kittens — จำนวนตามกล่อง (ไม่สเกลตามจำนวนผู้เล่น) */
const BARKING_FIXED_COUNTS: Partial<Record<ExplodingKittensCardType, number>> = {
  alter_future_now: 2,
  barking_kitten: 20,
  bury: 2,
  ill_take_that: 4,
  personal_attack_3x: 4,
  potluck: 2,
  share_future_3x: 2,
  super_skip: 1,
  tower_of_power: 1,
};

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
  let idx = from;
  for (let i = 0; i < n; i += 1) {
    idx = (idx + 1) % n;
    if (state.players[idx].alive) return idx;
  }
  return from;
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

function finalizeBarkingExchangeDiscard(s: ExplodingKittensState): void {
  const pb = s.pendingBarkingExchange;
  if (!pb) return;
  for (const c of pb.barkingCardsToDiscard) {
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
    if (!removed) {
      s.discardPile.push(c);
    }
  }
  s.pendingBarkingExchange = undefined;
  s.phase = 'turn';
  s.lastEvent = 'Barking Kittens — จบการแลกมือ (ทิ้ง Barking ทั้งสองใบ)';
}

function startBarkingExchange(
  s: ExplodingKittensState,
  actorId: string,
  targetId: string,
  barkingCardsToDiscard: ExplodingKittensCard[],
): void {
  const target = getPlayerById(s, targetId);
  const actor = getPlayerById(s, actorId);
  if (!target?.alive || !actor?.alive) {
    s.phase = 'turn';
    s.lastEvent = 'Barking — ไม่สามารถแลกมือได้';
    return;
  }
  const g = Math.ceil(target.hand.length / 2);
  s.pendingBarkingExchange = {
    actorId,
    targetId,
    giveCount: g,
    stage: g === 0 ? 'actor_return' : 'target_pick',
    barkingCardsToDiscard,
  };
  if (g === 0) {
    finalizeBarkingExchangeDiscard(s);
    return;
  }
  s.phase = 'barking_exchange';
  s.lastEvent = `${target.name} เลือกมอบ ${g} ใบให้ ${actor.name}`;
}

function applyBarkingTargetGive(
  s: ExplodingKittensState,
  playerId: string,
  cardIds: string[],
): boolean {
  const pb = s.pendingBarkingExchange;
  if (!pb || pb.stage !== 'target_pick' || playerId !== pb.targetId) return false;
  const g = pb.giveCount;
  if (cardIds.length !== g || new Set(cardIds).size !== cardIds.length) return false;
  const target = getPlayerById(s, pb.targetId);
  const actor = getPlayerById(s, pb.actorId);
  if (!target || !actor) return false;
  for (const id of cardIds) {
    const card = popCardById(target.hand, id);
    if (!card) return false;
    actor.hand.push(card);
  }
  pb.stage = 'actor_return';
  s.lastEvent = `${actor.name} เลือกคืน ${g} ใบให้ ${target.name}`;
  return true;
}

function applyBarkingActorReturn(
  s: ExplodingKittensState,
  playerId: string,
  cardIds: string[],
): boolean {
  const pb = s.pendingBarkingExchange;
  if (!pb || pb.stage !== 'actor_return' || playerId !== pb.actorId) return false;
  const g = pb.giveCount;
  if (cardIds.length !== g || new Set(cardIds).size !== cardIds.length) return false;
  const target = getPlayerById(s, pb.targetId);
  const actor = getPlayerById(s, pb.actorId);
  if (!target || !actor) return false;
  for (const id of cardIds) {
    const card = popCardById(actor.hand, id);
    if (!card) return false;
    target.hand.push(card);
  }
  finalizeBarkingExchangeDiscard(s);
  return true;
}

/** จั่วการ์ดบนสุดหลัง Bury — เข้า bury_reinsert หรือ explosion (ใช้หลัง reaction จบเพื่อไม่ต้องกดจั่วซ้ำ) */
/** หลังทุกคนรับทราบการเล่น Barking Kitten — กฎใหม่: แลกมือ (ไม่ระเบิด) / วางค้าง */
function resolveBarkingPlayAfterShow(s: ExplodingKittensState): void {
  const pb = s.pendingBarkingPlay;
  if (!pb) return;
  const me = getPlayerById(s, pb.fromId);
  const played = pb.card;
  s.pendingBarkingPlay = undefined;

  if (!me?.alive) {
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
    startBarkingExchange(s, me.id, otherWith.id, [played, theirBark]);
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
    startBarkingExchange(s, me.id, victim.id, [played, lonerCard]);
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
  if (card.type === 'exploding_kitten') {
    const hasDefuse = hasCardType(me.hand, 'defuse');
    state.phase = 'explosion_reveal';
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

function assertCurrentPlayer(state: ExplodingKittensState, playerId: string): boolean {
  return state.players[state.currentPlayerIndex]?.id === playerId;
}

function findCardIndex(hand: ExplodingKittensCard[], cardId: string): number {
  return hand.findIndex((c) => c.id === cardId);
}

function popCardById(hand: ExplodingKittensCard[], cardId: string): ExplodingKittensCard | null {
  const idx = findCardIndex(hand, cardId);
  if (idx < 0) return null;
  const [card] = hand.splice(idx, 1);
  return card;
}

function buildStartingDrawPile(
  playerCount: number,
  mode: 'original' | 'party_pack',
  expansions?: ExplodingKittensExpansionsEnabled,
): ExplodingKittensCard[] {
  const copies = Math.max(1, Math.ceil(playerCount / 5));
  const cards: ExplodingKittensCard[] = [];
  const counts = BASE_COUNTS_BY_MODE[mode];
  const scalable = Object.keys(counts) as ExplodingKittensCardType[];
  for (const t of scalable) {
    if (t === 'exploding_kitten' || t === 'defuse') continue;
    const count = (counts[t] ?? 0) * copies;
    for (let i = 0; i < count; i += 1) cards.push(newCard(t));
  }
  if (expansions?.barking) {
    for (const t of Object.keys(BARKING_FIXED_COUNTS) as ExplodingKittensCardType[]) {
      const n = BARKING_FIXED_COUNTS[t] ?? 0;
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
): void {
  state.phase = 'reaction';
  state.pendingAction = {
    id: newPendingActionId(),
    actorId,
    type,
    targetId,
    requestedType,
    playedCardTypes,
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
  if (pa.type === 'alter_future') {
    state.phase = 'alter_future_reorder';
    state.alterFutureById = actor.id;
    state.lastEvent = `${actor.name} กำลังจัด 3 ใบบนสุด`;
    return;
  }
  if (pa.type === 'draw_from_bottom') {
    const card = state.drawPile.pop();
    if (!card) return;
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
    const hasDefuse = hasCardType(actor.hand, 'defuse');
    state.phase = 'explosion_reveal';
    state.explosionPlayerId = actor.id;
    state.explosionHasDefuse = hasDefuse;
    state.defusingKitten = card;
    state.defusingPlayerId = actor.id;
    state.lastEvent = `${actor.name} จั่ว Exploding Kitten จากใต้กอง!`;
    return;
  }
  if (pa.type === 'targeted_attack') {
    const targetId = pa.targetId ?? state.targetedAttackFromId;
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
    actor.pendingTurns = 0;
    state.currentPlayerIndex = targetIdx;
    state.players[targetIdx].pendingTurns += 2;
    clearPeekForPlayer(state, actor.id);
    state.targetedAttackFromId = undefined;
    state.lastEvent = `${actor.name} ใช้ Targeted Attack ใส่ ${state.players[targetIdx].name}`;
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
      actor.hand.push(stolen);
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
          actor.hand.push(stolen);
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
        actor.hand.push(stolen);
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
    actor.pendingTurns = 3;
    state.lastEvent = `${actor.name} Personal Attack 3x — เทิร์นต่อเนื่อง 3 รอบ`;
    return;
  }
  if (pa.type === 'skip') {
    clearPeekForPlayer(state, current.id);
    consumeOneTurnOrAdvance(state);
    state.lastEvent = `${current.name} ข้ามเทิร์น`;
    return;
  }
  if (pa.type === 'attack') {
    const turnsToPass = Math.max(1, current.pendingTurns) + 1;
    current.pendingTurns = 0;
    const nextIdx = nextAliveIndex(state, state.currentPlayerIndex);
    state.currentPlayerIndex = nextIdx;
    state.players[nextIdx].pendingTurns += turnsToPass;
    clearPeekForPlayer(state, current.id);
    state.lastEvent = `${current.name} ใช้ Attack — คนถัดไปต้องเล่น ${state.players[nextIdx].pendingTurns} เทิร์น`;
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
  if (state.phase !== 'explosion_reveal' || !state.explosionPlayerId || !state.defusingKitten)
    return state;
  const explosionPlayerId = state.explosionPlayerId;
  const kitten = state.defusingKitten;

  const s: ExplodingKittensState = {
    ...state,
    eliminationOrder: [...(state.eliminationOrder ?? [])],
    players: state.players.map((p) => ({ ...p, hand: [...p.hand] })),
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
    seenTopByPlayer: { ...state.seenTopByPlayer },
  };

  const victimIdx = indexOfPlayer(s, explosionPlayerId);
  if (victimIdx < 0) return s;
  const victim = s.players[victimIdx];

  if (s.explosionHasDefuse) {
    s.phase = 'defuse_prompt';
    s.defusingPlayerId = victim.id;
    s.lastEvent = `${victim.name} ต้องกดใช้ Defuse`;
    return s;
  }

  victim.alive = false;
  victim.pendingTurns = 0;
  s.eliminationOrder.push(victim.id);
  s.discardPile.push(kitten);
  s.defusingKitten = undefined;
  s.defusingPlayerId = undefined;
  s.explosionPlayerId = undefined;
  s.explosionHasDefuse = undefined;
  s.lastEvent = `${victim.name} ระเบิดและออกจากเกม`;

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
    const { mode, expansions } = parseExplodingKittensLobbyOptions(options);
    const drawPile = buildStartingDrawPile(playerCount, mode, expansions);

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
    const copies = Math.max(1, Math.ceil(playerCount / 5));
    const baseCounts = BASE_COUNTS_BY_MODE[mode];
    const extraDefuse = Math.max(0, (baseCounts.defuse ?? 0) * copies - playerCount);
    const kittens = Math.max(
      1,
      Math.min(playerCount - 1, (baseCounts.exploding_kitten ?? playerCount - 1) * copies),
    );
    for (let i = 0; i < extraDefuse; i += 1) drawPile.push(newCard('defuse'));
    for (let i = 0; i < kittens; i += 1) drawPile.push(newCard('exploding_kitten'));

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
      seenTopByPlayer: {},
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
      pendingBarkingExchange: state.pendingBarkingExchange
        ? {
            actorId: state.pendingBarkingExchange.actorId,
            targetId: state.pendingBarkingExchange.targetId,
            giveCount: state.pendingBarkingExchange.giveCount,
            stage: state.pendingBarkingExchange.stage,
            barkingCardsToDiscard: state.pendingBarkingExchange.barkingCardsToDiscard.map((c) => ({
              ...c,
            })),
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
          if (card.type !== 'exploding_kitten') {
            recipient.hand.push(card);
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
          delete s.drawRevealPending;
          consumeOneTurnOrAdvance(s);
          const hasDefuse = hasCardType(recipient.hand, 'defuse');
          s.phase = 'explosion_reveal';
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
      const played = popCardById(me.hand, action.cardId);
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

    if (action.type === 'barking_exchange_target_give') {
      if (s.phase !== 'barking_exchange' || !s.pendingBarkingExchange) return s;
      if (!applyBarkingTargetGive(s, playerId, action.cardIds)) return s;
      return s;
    }
    if (action.type === 'barking_exchange_actor_return') {
      if (s.phase !== 'barking_exchange' || !s.pendingBarkingExchange) return s;
      if (!applyBarkingActorReturn(s, playerId, action.cardIds)) return s;
      return s;
    }

    /** Alter the Future NOW — เล่นแทรกเมื่อไม่ใช่เทิร์นตัวเอง (กลางเกมเทิร์นปกติเท่านั้น) */
    if (action.type === 'play_card') {
      const peekIdx = findCardIndex(me.hand, action.cardId);
      const peekType = peekIdx >= 0 ? me.hand[peekIdx].type : undefined;
      if (peekType === 'alter_future_now' && !assertCurrentPlayer(s, playerId)) {
        if (s.phase !== 'turn' || s.drawPile.length < 3) return s;
        const played = popCardById(me.hand, action.cardId);
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

    if (
      !potluckOk &&
      !illTakeOk &&
      !buryReinsertOk &&
      !buryDrawOk &&
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
      if (card.type !== 'exploding_kitten') {
        me.hand.push(card);
        s.drawRevealPending = {
          kind: 'standard',
          playerId: me.id,
          cardType: card.type,
          consumesTurnOnAck: true,
        };
        s.lastEvent = `${me.name} จั่วการ์ด`;
        return s;
      }
      const hasDefuse = hasCardType(me.hand, 'defuse');
      s.phase = 'explosion_reveal';
      s.explosionPlayerId = me.id;
      s.explosionHasDefuse = hasDefuse;
      s.defusingKitten = card;
      s.defusingPlayerId = me.id;
      s.lastEvent = `${me.name} จั่ว Exploding Kitten!`;
      return s;
    }

    if (action.type === 'use_defuse') {
      if (s.phase !== 'defuse_prompt' || s.defusingPlayerId !== playerId || !s.defusingKitten)
        return s;
      const defuseIdx = me.hand.findIndex((c) => c.type === 'defuse');
      if (defuseIdx < 0) return s;
      const [defuseCard] = me.hand.splice(defuseIdx, 1);
      s.discardPile.push(defuseCard);
      s.phase = 'defuse_reinsert';
      s.explosionPlayerId = undefined;
      s.explosionHasDefuse = undefined;
      s.lastEvent = `${me.name} ใช้ Defuse สำเร็จ เลือกตำแหน่งวางระเบิด`;
      return s;
    }

    if (action.type === 'defuse_reinsert') {
      if (s.phase !== 'defuse_reinsert' || s.defusingPlayerId !== playerId || !s.defusingKitten)
        return s;
      const pos = Math.max(0, Math.min(action.index, s.drawPile.length));
      s.drawPile.splice(pos, 0, s.defusingKitten);
      s.defusingKitten = undefined;
      s.defusingPlayerId = undefined;
      s.explosionPlayerId = undefined;
      s.explosionHasDefuse = undefined;
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
      const card = popCardById(me.hand, action.cardId);
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
      const played = popCardById(me.hand, action.cardId);
      if (!played) return s;

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
      if (played.type === 'attack') {
        startPendingAction(s, playerId, 'attack', `${me.name} เล่น Attack`, undefined, undefined, [
          'attack',
        ]);
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
        for (let k = 0; k < n; k += 1) {
          const p = s.players[(idx + k) % n];
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
      const ca = popCardById(me.hand, action.cardIdA);
      const cb = popCardById(me.hand, action.cardIdB);
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
      const ca = popCardById(me.hand, action.cardIdA);
      const cb = popCardById(me.hand, action.cardIdB);
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
      startBarkingExchange(s, me.id, target.id, [ca, cb]);
      return s;
    }

    if (action.type === 'play_barking_table_pair') {
      if (s.phase !== 'turn') return s;
      if (s.barkingLoner?.playerId !== playerId) return s;
      const handBark = popCardById(me.hand, action.cardId);
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
      startBarkingExchange(s, me.id, target.id, [lonerCard, handBark]);
      return s;
    }

    if (action.type === 'play_three_claim') {
      if (s.phase !== 'turn') return s;
      const ca = popCardById(me.hand, action.cardIdA);
      const cb = popCardById(me.hand, action.cardIdB);
      const cc = popCardById(me.hand, action.cardIdC);
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
        popCardById(me.hand, a),
        popCardById(me.hand, b),
        popCardById(me.hand, c),
        popCardById(me.hand, d),
        popCardById(me.hand, e),
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
      const given = popCardById(me.hand, action.cardId);
      if (!given) return s;
      from.hand.push(given);
      s.lastStealEvent = {
        id: nextStealEventId++,
        actorId: from.id,
        targetId: me.id,
        cardType: given.type,
      };
      s.phase = 'turn';
      s.favorFromId = undefined;
      s.favorTargetId = undefined;
      s.lastEvent = `${me.name} มอบการ์ดให้ ${from.name}`;
      return s;
    }

    if (action.type === 'alter_future_reorder') {
      if (s.phase !== 'alter_future_reorder' || s.alterFutureById !== playerId) return s;
      if (s.drawPile.length < 3) return s;
      const order = action.order;
      const uniq = new Set(order);
      if (uniq.size !== 3 || !order.every((n) => n >= 0 && n <= 2)) return s;
      const top3 = s.drawPile.slice(0, 3);
      s.drawPile.splice(0, 3, top3[order[0]], top3[order[1]], top3[order[2]]);
      s.phase = 'turn';
      s.alterFutureById = undefined;
      const peek3 = s.drawPile.slice(0, 3).map((c) => c.type);
      s.seenTopByPlayer[playerId] = peek3;
      if (s.shareFutureAlter) {
        const aidx = indexOfPlayer(s, playerId);
        if (aidx >= 0) {
          const nid = nextAliveIndex(s, aidx);
          const np = s.players[nid];
          if (np) s.shareFuturePeekPending = { forPlayerId: np.id, top3: [...peek3] };
        }
        s.shareFutureAlter = undefined;
      }
      s.lastEvent = `${me.name} จัดลำดับ 3 ใบบนสุดเรียบร้อย`;
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
              hasDefuse: Boolean(state.explosionHasDefuse),
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
          ? { playerId, top3: state.drawPile.slice(0, 3).map((c) => c.type) }
          : undefined,
      defusePrompt:
        (state.phase === 'bury_reinsert' && state.buryPlayerId === playerId) ||
        ((state.phase === 'defuse_prompt' || state.phase === 'defuse_reinsert') &&
          state.defusingPlayerId === playerId)
          ? { playerId, drawPileCount: state.drawPile.length }
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
      barkingExchangePrompt:
        state.phase === 'barking_exchange' && state.pendingBarkingExchange
          ? {
              stage: state.pendingBarkingExchange.stage,
              actorId: state.pendingBarkingExchange.actorId,
              targetId: state.pendingBarkingExchange.targetId,
              actorName: nameOf(state.pendingBarkingExchange.actorId),
              targetName: nameOf(state.pendingBarkingExchange.targetId),
              giveCount: state.pendingBarkingExchange.giveCount,
            }
          : undefined,
      shareFuturePeek:
        state.shareFuturePeekPending?.forPlayerId === playerId
          ? { top3: [...state.shareFuturePeekPending.top3] }
          : undefined,
    };
  },

  isGameOver(state: ExplodingKittensState): GameResult | null {
    if (state.phase !== 'game_over' || !state.winnerId) return null;
    return { winners: [state.winnerId], reason: `${state.winnerId} ชนะเกม` };
  },
};
