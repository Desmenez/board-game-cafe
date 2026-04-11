// ============================================================
// Exploding Kittens Types (Original-first, mode-ready)
// ============================================================

export type ExplodingKittensMode = 'original' | 'party_pack';

/** กล่องเสริม (lobby + state — การ์ด/กฎเพิ่มทีหลังใน engine) */
export type ExplodingKittensExpansionId = 'barking' | 'streaking' | 'imploding';

export interface ExplodingKittensExpansionsEnabled {
  barking: boolean;
  streaking: boolean;
  imploding: boolean;
}

export const EXPANSIONS_DEFAULT_FALSE: ExplodingKittensExpansionsEnabled = {
  barking: false,
  streaking: false,
  imploding: false,
};

export function parseExplodingKittensLobbyOptions(options: unknown): {
  mode: ExplodingKittensMode;
  expansions: ExplodingKittensExpansionsEnabled;
} {
  if (!options || typeof options !== 'object') {
    return { mode: 'original', expansions: { ...EXPANSIONS_DEFAULT_FALSE } };
  }
  const o = options as Record<string, unknown>;
  const mode = o.mode === 'party_pack' ? 'party_pack' : 'original';
  const next = { ...EXPANSIONS_DEFAULT_FALSE };
  const exp = o.expansions;
  if (exp && typeof exp === 'object' && !Array.isArray(exp)) {
    const e = exp as Record<string, unknown>;
    if (e.barking === true) next.barking = true;
    if (e.streaking === true) next.streaking = true;
    if (e.imploding === true) next.imploding = true;
  }
  return { mode, expansions: next };
}

export function countEnabledExpansions(exp: ExplodingKittensExpansionsEnabled): number {
  return (exp.barking ? 1 : 0) + (exp.streaking ? 1 : 0) + (exp.imploding ? 1 : 0);
}

export type ExplodingKittensPhase =
  | 'turn'
  | 'reaction'
  | 'explosion_reveal'
  | 'defuse_prompt'
  | 'favor_target'
  | 'targeted_attack_target'
  | 'favor_give'
  | 'five_cats_pick_discard'
  | 'alter_future_reorder'
  | 'defuse_reinsert'
  | 'bury_draw'
  | 'bury_reinsert'
  | 'ill_take_target'
  | 'potluck'
  | 'barking_kitten_show'
  | 'barking_exchange'
  | 'game_over';

export type ExplodingKittensCardType =
  | 'exploding_kitten'
  | 'defuse'
  | 'attack'
  | 'skip'
  | 'shuffle'
  | 'see_future'
  | 'favor'
  | 'targeted_attack'
  | 'draw_from_bottom'
  | 'alter_future'
  | 'nope'
  | 'feral_cat'
  | 'cat_taco'
  | 'cat_melon'
  | 'cat_beard'
  | 'cat_rainbow'
  | 'cat_potato'
  /** Barking Kittens expansion — 20 cards total in box */
  | 'barking_kitten'
  | 'bury'
  | 'ill_take_that'
  | 'personal_attack_3x'
  | 'potluck'
  | 'share_future_3x'
  | 'super_skip'
  | 'tower_of_power'
  | 'alter_future_now';

export interface ExplodingKittensCard {
  id: string;
  type: ExplodingKittensCardType;
}

/** รอเปิดเผยการ์ดหลังจั่ว — `ill_take_draw` = เป้าหมายจั่วแทนผู้วาง I'll Take That */
export type ExplodingKittensDrawRevealPending =
  | {
      kind: 'standard';
      playerId: string;
      cardType: ExplodingKittensCardType;
      /** false = แค่ดูการ์ดที่ได้รับ (เช่น ได้จาก I'll Take That) ไม่นับเป็น consume เทิร์นจากการกดรับทราบ */
      consumesTurnOnAck: boolean;
    }
  | {
      kind: 'ill_take_draw';
      drawerId: string;
      recipientId: string;
      card: ExplodingKittensCard;
    };

export function isCatCard(type: ExplodingKittensCardType): boolean {
  return type.startsWith('cat_') || type === 'feral_cat';
}

export function validateSameCatCombo(cards: { type: ExplodingKittensCardType }[]): boolean {
  if (cards.length < 2) return false;
  if (!cards.every((c) => isCatCard(c.type))) return false;
  const nonFeral = cards.filter((c) => c.type !== 'feral_cat').map((c) => c.type);
  if (nonFeral.length === 0) return true;
  return new Set(nonFeral).size === 1;
}

export function validateFiveDistinctCatCombo(cards: { type: ExplodingKittensCardType }[]): boolean {
  if (cards.length !== 5) return false;
  if (!cards.every((c) => isCatCard(c.type))) return false;
  const nonFeral = cards.filter((c) => c.type !== 'feral_cat').map((c) => c.type);
  return new Set(nonFeral).size === nonFeral.length;
}

export interface ExplodingKittensPlayerState {
  id: string;
  name: string;
  alive: boolean;
  hand: ExplodingKittensCard[];
  pendingTurns: number;
}

export interface PendingAction {
  id: string;
  actorId: string;
  type:
    | 'attack'
    | 'skip'
    | 'super_skip'
    | 'shuffle'
    | 'see_future'
    | 'favor'
    | 'targeted_attack'
    | 'draw_from_bottom'
    | 'alter_future'
    | 'personal_attack_3x'
    | 'five_cats'
    | 'pair_steal'
    | 'three_claim'
    | 'ill_take'
    | 'tower_of_power'
    | 'bury';
  targetId?: string;
  requestedType?: ExplodingKittensCardType;
  /** การ์ดที่เล่น (สำหรับแสดงใน reaction modal) */
  playedCardTypes?: ExplodingKittensCardType[];
  nopeCount: number;
  passedBy: string[];
  /** ผู้เล่น Nope ล่าสุด — ห้าม Nope ซ้ำติดกันเป็นคนเดียว */
  lastNopePlayerId?: string;
}

export interface ExplodingKittensState {
  mode: ExplodingKittensMode;
  expansions: ExplodingKittensExpansionsEnabled;
  phase: ExplodingKittensPhase;
  players: ExplodingKittensPlayerState[];
  drawPile: ExplodingKittensCard[];
  discardPile: ExplodingKittensCard[];
  currentPlayerIndex: number;
  pendingAction?: PendingAction;
  favorFromId?: string;
  favorTargetId?: string;
  targetedAttackFromId?: string;
  fiveCatsPickerId?: string;
  alterFutureById?: string;
  explosionPlayerId?: string;
  explosionHasDefuse?: boolean;
  defusingPlayerId?: string;
  defusingKitten?: ExplodingKittensCard;
  seenTopByPlayer: Record<string, ExplodingKittensCardType[]>;
  lastStealEvent?: {
    id: number;
    actorId: string;
    targetId: string;
    cardType: ExplodingKittensCardType;
  };
  lastThreeClaimEvent?: {
    id: number;
    actorId: string;
    targetId: string;
    requestedType: ExplodingKittensCardType;
    success: boolean;
    /** โจมตีเป้าหมายที่มี Tower: ต้องเรียกชนิดที่ตรงกับการ์ดใน stash — ไม่ตรง = เสียฟรี */
    stolenFromTower?: boolean;
    actualStolenType?: ExplodingKittensCardType;
  };
  /** หยิบจากกองทิ้งด้วยคอมโบ 5 แมว — เปิดเผยประเภทการ์ดให้ทุกคน (กองทิ้งเป็น public) */
  lastFiveCatsDiscardPickEvent?: {
    id: number;
    pickerId: string;
    cardType: ExplodingKittensCardType;
  };
  winnerId?: string;
  /** ลำดับที่ถูกคัดออกจากการระเบิด — คนแรกในอาร์เรย์ = ตกรอบก่อน (ตายเร็วสุด), คนสุดท้าย = ตกรอบหลังสุดก่อนผู้ชนะ */
  eliminationOrder: string[];
  lastEvent?: string;
  /** จั่วการ์ดแล้วรอ `acknowledge_draw_reveal` — รวม I'll Take That (คนจั่วเห็นก่อนค่อยส่งต่อ) */
  drawRevealPending?: ExplodingKittensDrawRevealPending;

  /** Tower of Power — การ์ดซ่อนในมงกุฎดิจิทัล (สุ่มเมื่อถูกขโมยจากผู้สวมมงกุฎ) */
  towerStash: ExplodingKittensCard[];
  /** ผู้สวม Tower of Power (ถ้ามี) */
  towerWearerId?: string;
  /** I'll Take That — เป้าหมาย → ผู้เล่นที่วางการ์ดใส่หน้า */
  illTakeActorByTarget: Record<string, string>;
  /** Barking Kitten ใบแรกที่วางค้าง (รอคู่) — การ์ดไม่อยู่ในมือ/กองทิ้ง */
  barkingLoner?: { playerId: string; card: ExplodingKittensCard };
  /** Potluck — ลำดับผู้วางการ์ดบนกองจั่ว */
  potluckOrder?: string[];
  potluckIndex?: number;
  /** Bury — หลังจั่วแล้วต้องเลือกช่องใส่กลับ */
  buryCard?: ExplodingKittensCard;
  buryPlayerId?: string;
  /** I'll Take That — รอเลือกเป้าหมาย */
  pendingIllTake?: { card: ExplodingKittensCard; fromId: string };
  /** Share the Future — หลังจัดแล้วให้ผู้เล่นถัดไปเห็น 3 ใบ */
  shareFutureAlter?: boolean;
  /** Share the Future — รอให้ผู้เล่นถัดไปกดรับทราบ (แยกจาก seenTopByPlayer / See the Future) */
  shareFuturePeekPending?: { forPlayerId: string; top3: ExplodingKittensCardType[] };
  /** Barking Kitten — รอทุกคนรับทราบก่อนคำนวณเอฟเฟ็กต์ (ไม่ผ่าน Nope) */
  pendingBarkingPlay?: {
    fromId: string;
    card: ExplodingKittensCard;
    acknowledgedBy: string[];
  };
  /** Barking — แลกมือ (กฎใหม่): เป้าหมายมอบ ceil(n/2) ใบ → ผู้เล่นคืนจำนวนเท่ากัน → ทิ้ง Barking */
  pendingBarkingExchange?: {
    actorId: string;
    targetId: string;
    giveCount: number;
    stage: 'target_pick' | 'actor_return';
    barkingCardsToDiscard: ExplodingKittensCard[];
  };
}

export interface ExplodingKittensPlayerView {
  mode: ExplodingKittensMode;
  expansions: ExplodingKittensExpansionsEnabled;
  phase: ExplodingKittensPhase;
  me: { id: string; name: string; alive: boolean; pendingTurns: number };
  players: { id: string; name: string; alive: boolean; handCount: number; pendingTurns: number }[];
  myHand: ExplodingKittensCard[];
  drawPileCount: number;
  discardTop?: ExplodingKittensCardType;
  discardCount: number;
  /** Newest -> oldest discarded card types */
  discardHistory: ExplodingKittensCardType[];
  /** Newest -> oldest discarded cards (with IDs for pick-from-discard combo) */
  discardCards: ExplodingKittensCard[];
  currentPlayerId: string;
  currentPlayerName: string;
  pendingTurnsForCurrent: number;
  pendingAction?: {
    actorId: string;
    actorName: string;
    type: PendingAction['type'];
    targetId?: string;
    requestedType?: ExplodingKittensCardType;
    playedCardTypes?: ExplodingKittensCardType[];
    nopeCount: number;
    passedBy: string[];
    lastNopePlayerId?: string;
    lastNopePlayerName?: string;
  };
  explosionReveal?: {
    playerId: string;
    playerName: string;
    hasDefuse: boolean;
  };
  stealNotice?: {
    id: number;
    actorId: string;
    actorName: string;
    targetId: string;
    targetName: string;
    cardType?: ExplodingKittensCardType;
  };
  threeClaimNotice?: {
    id: number;
    actorId: string;
    actorName: string;
    targetId: string;
    targetName: string;
    requestedType: ExplodingKittensCardType;
    success: boolean;
    stolenFromTower?: boolean;
    actualStolenType?: ExplodingKittensCardType;
  };
  fiveCatsDiscardPickNotice?: {
    id: number;
    pickerId: string;
    pickerName: string;
    cardType: ExplodingKittensCardType;
  };
  favorPrompt?: { fromId: string; targetId?: string };
  targetedAttackPrompt?: { fromId: string };
  fiveCatsPrompt?: { pickerId: string };
  alterFuturePrompt?: { playerId: string; top3: ExplodingKittensCardType[] };
  defusePrompt?: { playerId: string; drawPileCount: number };
  /** Bury — ประเภทการ์ดที่จั่วได้แล้วรอเลือกตำแหน่งฝังกลับกอง */
  buryReinsertCardType?: ExplodingKittensCardType;
  /** การ์ดที่เพิ่งจั่วได้ (ไม่ใช่ระเบิด) — กดรับทราบก่อนเล่นต่อ */
  drawReveal?: { type: ExplodingKittensCardType };
  seenTopCards?: ExplodingKittensCardType[];
  winnerId?: string;
  winnerName?: string;
  /** เหมือน state — ใช้เรียงผู้แพ้จากตายช้าสุด → ตายเร็วสุด (กลับด้านอาร์เรย์) */
  eliminationOrder?: string[];
  lastEvent?: string;

  /** Barking — จำนวนการ์ดใน Tower stash (ซ่อนประเภท) */
  towerStashCount?: number;
  towerWearerId?: string;
  /** มีคนวาง I'll Take That ใส่เรา — ค่าเป็น actorId */
  illTakeActorOnMe?: string;
  /** ผู้เล่นที่มี Barking ค้างบนโต๊ะ (รอคู่) */
  barkingLonerPlayerId?: string;
  /** Potluck — ใครต้องวางการ์ดตอนนี้ */
  potluckCurrentPlayerId?: string;
  /** Share the Future — ผู้เล่นถัดไปเห็น 3 ใบบนสุดหลังจัด */
  shareFuturePeek?: { top3: ExplodingKittensCardType[] };
  /** I'll Take That — ต้องเลือกเป้าหมาย */
  illTakePrompt?: boolean;
  /** Bury — ผู้ที่ต้องจั่วเพื่อฝัง */
  buryDrawPlayerId?: string;
  /** I'll Take That วางใส่ผู้เล่นเหล่านี้แล้ว — ห้ามซ้ำ */
  illTakeBlockedTargets?: string[];
  /** โชว์การ์ด Barking Kitten ให้ทุกคน — รอรับทราบ (ไม่มี Nope) */
  barkingKittenShow?: {
    actorId: string;
    actorName: string;
    acknowledgedBy: string[];
  };
  /** Barking — แลกมือหลังชนกัน */
  barkingExchangePrompt?: {
    stage: 'target_pick' | 'actor_return';
    actorId: string;
    targetId: string;
    actorName: string;
    targetName: string;
    giveCount: number;
  };
}

export type ExplodingKittensAction =
  | { type: 'draw_card' }
  | { type: 'acknowledge_draw_reveal' }
  | { type: 'play_card'; cardId: string; targetId?: string }
  | { type: 'play_pair'; cardIdA: string; cardIdB: string; targetId: string }
  /** Barking Kitten คู่จากมือเดียว — เลือกเป้าหมายแลกมือ (กฎใหม่) */
  | { type: 'play_barking_pair'; cardIdA: string; cardIdB: string; targetId: string }
  /** Barking หน้าโต๊ะของตัวเอง + อีกใบในมือ — เลือกเป้าหมายแลกมือ */
  | { type: 'play_barking_table_pair'; cardId: string; targetId: string }
  | {
      type: 'play_three_claim';
      cardIdA: string;
      cardIdB: string;
      cardIdC: string;
      targetId: string;
      requestedType: ExplodingKittensCardType;
    }
  | { type: 'play_five_cats'; cardIds: [string, string, string, string, string] }
  | { type: 'five_cats_pick_discard'; discardCardId: string }
  | { type: 'use_defuse' }
  | { type: 'react_nope'; cardId: string }
  | { type: 'react_pass' }
  | { type: 'favor_choose_target'; targetId: string }
  | { type: 'targeted_attack_choose_target'; targetId: string }
  | { type: 'favor_choose_give'; cardId: string }
  /** Favor — เป้าหมายสวม Tower และยังมี stash: มอบสุ่มจาก Tower แทนการเลือกจากมือ */
  | { type: 'favor_give_from_tower' }
  | { type: 'alter_future_reorder'; order: [number, number, number] }
  | { type: 'acknowledge_share_future_peek' }
  | { type: 'defuse_reinsert'; index: number }
  | { type: 'bury_reinsert'; index: number }
  | { type: 'potluck_contribute'; cardId: string }
  | { type: 'ill_take_choose_target'; targetId: string }
  | { type: 'ill_take_cancel' }
  | { type: 'acknowledge_barking_kitten_show' }
  | { type: 'barking_exchange_target_give'; cardIds: string[] }
  | { type: 'barking_exchange_actor_return'; cardIds: string[] };
