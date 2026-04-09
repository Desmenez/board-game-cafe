// ============================================================
// Exploding Kittens Types (Original-first, mode-ready)
// ============================================================

export type ExplodingKittensMode = 'original' | 'party_pack';

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
  | 'cat_potato';

export interface ExplodingKittensCard {
  id: string;
  type: ExplodingKittensCardType;
}

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
    | 'shuffle'
    | 'see_future'
    | 'favor'
    | 'targeted_attack'
    | 'draw_from_bottom'
    | 'alter_future'
    | 'five_cats'
    | 'pair_steal'
    | 'three_claim';
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
  /** จั่วการ์ดธรรมดาแล้ว รอ `acknowledge_draw_reveal` ก่อนจบเทิร์น */
  drawRevealPending?: { playerId: string; cardType: ExplodingKittensCardType };
}

export interface ExplodingKittensPlayerView {
  mode: ExplodingKittensMode;
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
  /** การ์ดที่เพิ่งจั่วได้ (ไม่ใช่ระเบิด) — กดรับทราบก่อนเล่นต่อ */
  drawReveal?: { type: ExplodingKittensCardType };
  seenTopCards?: ExplodingKittensCardType[];
  winnerId?: string;
  winnerName?: string;
  /** เหมือน state — ใช้เรียงผู้แพ้จากตายช้าสุด → ตายเร็วสุด (กลับด้านอาร์เรย์) */
  eliminationOrder?: string[];
  lastEvent?: string;
}

export type ExplodingKittensAction =
  | { type: 'draw_card' }
  | { type: 'acknowledge_draw_reveal' }
  | { type: 'play_card'; cardId: string; targetId?: string }
  | { type: 'play_pair'; cardIdA: string; cardIdB: string; targetId: string }
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
  | { type: 'alter_future_reorder'; order: [number, number, number] }
  | { type: 'defuse_reinsert'; index: number };
