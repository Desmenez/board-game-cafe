// ============================================================
// Exploding Kittens Types (Original-first, mode-ready)
// ============================================================

export type ExplodingKittensMode = 'original' | 'party_pack' | 'zombie_kittens';

/** สำรับคู่ผสมเมื่อเล่น Zombie Apocalypse — none = ZK เดี่ยว */
export type ExplodingKittensMixBase = 'none' | 'original' | 'party_pack';

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

/** ทบสำรับฐาน — หัวห้องเลือกเอง (ไม่สเกลอัตโนมัติตามจำนวนคน) */
export const EK_DECK_COPIES_MIN = 1;
export const EK_DECK_COPIES_MAX = 6;

export function clampEkDeckCopies(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return EK_DECK_COPIES_MIN;
  return Math.max(EK_DECK_COPIES_MIN, Math.min(EK_DECK_COPIES_MAX, Math.round(n)));
}

/** ค่าแนะนำ (ไม่บังคับ) — เดิมเคยใช้สเกลอัตโนมัติทุก 5 คน */
export function suggestedEkDeckCopies(playerCount: number): number {
  const n = Math.max(2, Math.floor(playerCount) || 2);
  return clampEkDeckCopies(Math.ceil(n / 5));
}

export function isZombieMode(mode: ExplodingKittensMode): boolean {
  return mode === 'zombie_kittens';
}

/** ZK / Apocalypse — คอมโบคู่/สามใบใช้ได้กับทุกชื่อการ์ดเดียวกัน (ไม่ใช่แค่แมว) */
export function allowsAnyTitleCombos(mode: ExplodingKittensMode): boolean {
  return mode === 'zombie_kittens';
}

export function parseExplodingKittensLobbyOptions(options: unknown): {
  mode: ExplodingKittensMode;
  mixBase: ExplodingKittensMixBase;
  expansions: ExplodingKittensExpansionsEnabled;
  deckCopies: number;
} {
  if (!options || typeof options !== 'object') {
    return {
      mode: 'original',
      mixBase: 'none',
      expansions: { ...EXPANSIONS_DEFAULT_FALSE },
      deckCopies: EK_DECK_COPIES_MIN,
    };
  }
  const o = options as Record<string, unknown>;
  let mode: ExplodingKittensMode = 'original';
  if (o.mode === 'party_pack') mode = 'party_pack';
  else if (o.mode === 'zombie_kittens') mode = 'zombie_kittens';

  let mixBase: ExplodingKittensMixBase = 'none';
  if (mode === 'zombie_kittens') {
    if (o.mixBase === 'original' || o.mixBase === 'party_pack' || o.mixBase === 'none') {
      mixBase = o.mixBase;
    }
  }

  const next = { ...EXPANSIONS_DEFAULT_FALSE };
  const exp = o.expansions;
  if (exp && typeof exp === 'object' && !Array.isArray(exp)) {
    const e = exp as Record<string, unknown>;
    if (e.barking === true) next.barking = true;
    if (e.streaking === true) next.streaking = true;
    if (e.imploding === true) next.imploding = true;
  }
  return {
    mode,
    mixBase,
    expansions: next,
    deckCopies: clampEkDeckCopies(o.deckCopies),
  };
}

export function countEnabledExpansions(exp: ExplodingKittensExpansionsEnabled): number {
  return (exp.barking ? 1 : 0) + (exp.streaking ? 1 : 0) + (exp.imploding ? 1 : 0);
}

export type ExplodingKittensPhase =
  | 'turn'
  | 'reaction'
  | 'explosion_reveal'
  | 'defuse_prompt'
  | 'zombie_prompt'
  | 'zombie_revive_pick'
  | 'zombie_reinsert'
  | 'dig_deeper_decide'
  | 'feed_the_dead_pick'
  | 'feed_the_dead_give'
  | 'grave_robber_give'
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
  | 'curse_target'
  | 'mark_target'
  | 'garbage_collection'
  | 'imploding_reinsert'
  | 'game_over';

export type ExplodingKittensCardType =
  | 'exploding_kitten'
  | 'defuse'
  | 'zombie_kitten'
  | 'attack'
  | 'attack_of_the_dead'
  | 'skip'
  | 'shuffle'
  | 'shuffle_now'
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
  | 'feed_the_dead'
  | 'grave_robber'
  | 'clairvoyance'
  | 'clone'
  | 'dig_deeper'
  /** Barking Kittens expansion — 20 cards total in box */
  | 'barking_kitten'
  | 'bury'
  | 'ill_take_that'
  | 'personal_attack_3x'
  | 'potluck'
  | 'share_future_3x'
  | 'super_skip'
  | 'tower_of_power'
  | 'alter_future_now'
  /** Streaking Kittens expansion — 15 cards total in box */
  | 'streaking_kitten'
  | 'see_future_5x'
  | 'alter_future_5x'
  | 'swap_top_bottom'
  | 'garbage_collection'
  | 'catomic_bomb'
  | 'curse_of_the_cat_butt'
  | 'mark'
  /** Imploding Kittens expansion — 20 cards total in box */
  | 'imploding_kitten'
  | 'reverse';

export interface ExplodingKittensCard {
  id: string;
  type: ExplodingKittensCardType;
  /** Imploding Kitten ที่ถูกใส่กลับกองแบบคว่ำหน้า — ทุกคนเห็น */
  faceUp?: boolean;
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

/** การ์ด NOW — เล่นได้แม้ไม่ใช่เทิร์น (และคนตายเล่นได้) */
export function isNowCardType(t: ExplodingKittensCardType): boolean {
  return (
    t === 'shuffle_now' ||
    t === 'clairvoyance' ||
    t === 'feed_the_dead' ||
    t === 'alter_future_now'
  );
}

/** ผู้เล่นที่ตายแล้วยังเล่นได้: Nope หรือการ์ด NOW */
export function deadPlayerMayPlay(type: ExplodingKittensCardType): boolean {
  return type === 'nope' || isNowCardType(type);
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

/** คอมโบชื่อเดียวกัน (ZK) — คู่; ห้ามระเบิด / Imploding */
export function validateSameTitlePair(cards: { type: ExplodingKittensCardType }[]): boolean {
  if (cards.length !== 2) return false;
  const [a, b] = cards;
  if (a.type !== b.type) return false;
  if (a.type === 'exploding_kitten' || a.type === 'imploding_kitten') return false;
  return true;
}

/** คอมโบชื่อเดียวกัน (ZK) — สามใบ; ห้ามระเบิด / Imploding */
export function validateSameTitleTriple(cards: { type: ExplodingKittensCardType }[]): boolean {
  if (cards.length !== 3) return false;
  const t = cards[0]?.type;
  if (!t || t === 'exploding_kitten' || t === 'imploding_kitten') return false;
  return cards.every((c) => c.type === t);
}

export interface ExplodingKittensPlayerState {
  id: string;
  name: string;
  alive: boolean;
  hand: ExplodingKittensCard[];
  pendingTurns: number;
  /** EK ที่วางหน้าผู้เล่นตอนตาย (ZK) — ทุกคนเห็น */
  faceUpEk?: ExplodingKittensCard;
}

export interface PendingAction {
  id: string;
  actorId: string;
  type:
    | 'attack'
    | 'attack_of_the_dead'
    | 'skip'
    | 'super_skip'
    | 'shuffle'
    | 'shuffle_now'
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
    | 'bury'
    | 'swap_top_bottom'
    | 'see_future_5x'
    | 'alter_future_5x'
    | 'garbage_collection'
    | 'catomic_bomb'
    | 'curse_of_the_cat_butt'
    | 'mark'
    | 'reverse'
    | 'feed_the_dead'
    | 'grave_robber'
    | 'clairvoyance'
    | 'clone'
    | 'dig_deeper';
  targetId?: string;
  /** Alter / See Future — จำนวนใบบนกอง (3 หรือ 5) */
  futureCount?: number;
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
  mixBase: ExplodingKittensMixBase;
  expansions: ExplodingKittensExpansionsEnabled;
  phase: ExplodingKittensPhase;
  players: ExplodingKittensPlayerState[];
  drawPile: ExplodingKittensCard[];
  discardPile: ExplodingKittensCard[];
  currentPlayerIndex: number;
  /** ทิศทางเล่นรอบโต๊ะ — Reverse สลับระหว่าง 1 และ -1 */
  playDirection: 1 | -1;
  pendingAction?: PendingAction;
  favorFromId?: string;
  favorTargetId?: string;
  targetedAttackFromId?: string;
  fiveCatsPickerId?: string;
  alterFutureById?: string;
  /** จำนวนใบบนสุดที่จัดลำดับ (3 หรือ 5) */
  alterFutureCount?: number;
  curseFromId?: string;
  markFromId?: string;
  explosionPlayerId?: string;
  explosionHasDefuse?: boolean;
  explosionHasZombieKitten?: boolean;
  /** มี Defuse หรือ Zombie Kitten ที่ใช้เซฟได้ */
  explosionHasSave?: boolean;
  /** สาเหตุระเบิด — `barking` = ไม่มี kitten ต้องใส่กลับกอง; `imploding` = ห้าม Defuse */
  explosionCause?: 'draw' | 'barking' | 'held_ek' | 'imploding';
  defusingPlayerId?: string;
  defusingKitten?: ExplodingKittensCard;
  /** ZK — คิว EK ที่ต้องใส่กลับกอง (1–2 ใบ) */
  zombieReinsertRemaining?: ExplodingKittensCard[];
  /** ZK — ผู้ถูกชุบตอนเล่น Zombie Kitten */
  zombieReviveTargetId?: string;
  /** Dig Deeper — ใบที่ peek อยู่ (actor เท่านั้นที่เห็นใน view) */
  digDeeperPeek?: { playerId: string; card: ExplodingKittensCard };
  feedTheDeadRecipientId?: string;
  feedTheDeadOrder?: string[];
  feedTheDeadIndex?: number;
  graveRobberOrder?: string[];
  graveRobberIndex?: number;
  /** Clairvoyance — ตำแหน่งที่ใส่ EK (เปิดให้ผู้ดูหลัง insert) */
  clairvoyanceInserts?: { index: number; cardType: ExplodingKittensCardType }[];
  clairvoyanceWatcherIds?: string[];
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
  /** Barking — เป้าหมายต้อง Defuse หรือระเบิด (กฎทางการ) */
  pendingBarkingDetonation?: {
    actorId: string;
    targetId: string;
    barkingCardsToDiscard: ExplodingKittensCard[];
  };
  /** Curse of the Cat Butt — ผู้เล่นที่มือบอดจนกว่าจะจั่วสำเร็จโดยไม่ระเบิด */
  blindPlayerId?: string;
  /** Mark — ผู้เล่น → cardId ที่ต้องโชว์หน้าออก */
  markedCardByPlayerId: Record<string, string>;
  /** Garbage Collection — ลำดับผู้เลือกการ์ดใส่กอง */
  garbageOrder?: string[];
  garbageIndex?: number;
  garbageCollected?: ExplodingKittensCard[];
  /** Imploding Kitten — รอใส่กลับกองแบบ face-up */
  implodingReinsertCard?: ExplodingKittensCard;
  implodingReinsertPlayerId?: string;
}

export interface ExplodingKittensPlayerView {
  mode: ExplodingKittensMode;
  mixBase: ExplodingKittensMixBase;
  expansions: ExplodingKittensExpansionsEnabled;
  phase: ExplodingKittensPhase;
  me: {
    id: string;
    name: string;
    alive: boolean;
    pendingTurns: number;
    faceUpEk?: ExplodingKittensCard;
  };
  players: {
    id: string;
    name: string;
    alive: boolean;
    handCount: number;
    pendingTurns: number;
    /** EK หน้าผู้เล่นตอนตาย (public) */
    faceUpEk?: ExplodingKittensCard;
  }[];
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
  /** ทิศทางเล่น — สำหรับ UI (เช่น Reverse) */
  playDirection: 1 | -1;
  /** ใบบนสุดของกองจั่วถ้าเป็น Imploding Kitten คว่ำหน้า */
  drawPileTopFaceUp?: ExplodingKittensCardType;
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
    hasZombieKitten?: boolean;
    /** มี Defuse หรือ Zombie Kitten */
    hasSave?: boolean;
    /** Barking Kitten chicken / held EK / Imploding / จั่ว Exploding Kitten */
    cause?: 'draw' | 'barking' | 'held_ek' | 'imploding';
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
  alterFuturePrompt?: {
    playerId: string;
    topCards: ExplodingKittensCardType[];
    /** True when reorder came from Share the Future (not plain Alter). */
    isShareFuture?: boolean;
  };
  defusePrompt?: {
    playerId: string;
    drawPileCount: number;
    /** Barking — ใช้ Defuse แล้วไม่ต้องใส่ kitten กลับกอง */
    isBarkingDetonation?: boolean;
  };
  /** ZK — ใช้ Zombie Kitten หรือยอมตาย */
  zombiePrompt?: {
    playerId: string;
    hasZombieKitten: boolean;
    drawPileCount: number;
  };
  /** ZK — เลือกผู้เล่นที่ตายให้ชุบ */
  zombieRevivePrompt?: { playerId: string };
  /** ZK — ใส่ EK กลับกอง (ทีละใบถ้ามี 2) */
  zombieReinsertPrompt?: {
    playerId: string;
    remaining: number;
    drawPileCount: number;
  };
  /** Dig Deeper — เห็นเฉพาะ actor */
  digDeeperPeek?: { card: ExplodingKittensCard };
  /** Feed the Dead — เลือกเป้าหมายที่ตาย */
  feedTheDeadChoosePrompt?: boolean;
  /** Feed the Dead — คนเป็นต้องมอบการ์ด */
  feedTheDeadGivePrompt?: { recipientId: string };
  /** Grave Robber — คนตายต้องมอบการ์ดใส่กอง */
  graveRobberGivePrompt?: boolean;
  /** Clairvoyance — ตำแหน่ง insert ที่เปิดให้ผู้ดู */
  clairvoyanceReveal?: {
    inserts: { index: number; cardType: ExplodingKittensCardType }[];
  };
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
  /** Curse — ต้องเลือกเป้าหมาย */
  cursePrompt?: boolean;
  /** Mark — ต้องเลือกเป้าหมาย */
  markPrompt?: boolean;
  /** ผู้เล่นที่มือบอด */
  blindPlayerId?: string;
  /** เราถูก Mark — ประเภทการ์ดที่โชว์ (ตัวเองเห็นเต็ม) */
  myMarkedCardId?: string;
  /** Mark ที่คนอื่นเห็น — playerId → ประเภทการ์ด */
  markedCardsPublic?: { playerId: string; cardType: ExplodingKittensCardType }[];
  /** Garbage Collection — ถึงตาเราเลือกการ์ด */
  garbagePrompt?: boolean;
  /** Imploding Kitten — ต้องเลือกตำแหน่งใส่กลับกอง (face-up) */
  implodingReinsertPrompt?: boolean;
}

export type ExplodingKittensAction =
  | { type: 'draw_card' }
  | { type: 'acknowledge_draw_reveal' }
  | { type: 'play_card'; cardId: string; targetId?: string }
  | { type: 'play_pair'; cardIdA: string; cardIdB: string; targetId: string }
  /** Barking Kitten คู่จากมือเดียว — เลือกเป้าหมายให้ Defuse หรือระเบิด */
  | { type: 'play_barking_pair'; cardIdA: string; cardIdB: string; targetId: string }
  /** Barking หน้าโต๊ะของตัวเอง + อีกใบในมือ — เลือกเป้าหมายให้ Defuse หรือระเบิด */
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
  | { type: 'use_zombie_kitten' }
  | { type: 'decline_zombie_kitten' }
  | { type: 'zombie_choose_revive'; targetId: string }
  | { type: 'zombie_reinsert'; index: number }
  | { type: 'dig_deeper_keep' }
  | { type: 'dig_deeper_swap' }
  | { type: 'feed_the_dead_choose'; targetId: string }
  | { type: 'feed_the_dead_give'; cardId: string }
  | { type: 'grave_robber_give'; cardId: string }
  | { type: 'acknowledge_clairvoyance' }
  | { type: 'react_nope'; cardId: string }
  | { type: 'react_pass' }
  | { type: 'favor_choose_target'; targetId: string }
  | { type: 'targeted_attack_choose_target'; targetId: string }
  | { type: 'favor_choose_give'; cardId: string }
  /** Favor — เป้าหมายสวม Tower และยังมี stash: มอบสุ่มจาก Tower แทนการเลือกจากมือ */
  | { type: 'favor_give_from_tower' }
  | { type: 'alter_future_reorder'; order: number[] }
  | { type: 'acknowledge_share_future_peek' }
  | { type: 'defuse_reinsert'; index: number }
  | { type: 'bury_reinsert'; index: number }
  | { type: 'potluck_contribute'; cardId: string }
  | { type: 'ill_take_choose_target'; targetId: string }
  | { type: 'ill_take_cancel' }
  | { type: 'acknowledge_barking_kitten_show' }
  | { type: 'curse_choose_target'; targetId: string }
  | { type: 'mark_choose_target'; targetId: string }
  | { type: 'garbage_contribute'; cardId: string }
  | { type: 'imploding_reinsert'; index: number };
