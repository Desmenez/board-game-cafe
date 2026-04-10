export type SheriffLegalGood = 'apple' | 'cheese' | 'bread' | 'chicken';
export type SheriffContraband =
  | 'pepper'
  | 'mead'
  | 'silk'
  | 'crossbow'
  | 'feast_plate'
  | 'dragon_pepper'
  | 'brimstone_oil'
  | 'olive_oil'
  | 'strawberry_mead'
  | 'golden_silk'
  | 'heavy_crossbow'
  | 'prince_johns_sword'
  | 'green_apples'
  | 'golden_apples'
  | 'bleu_cheese'
  | 'gouda_cheese'
  | 'rye_bread'
  | 'pumpernickel_bread'
  | 'royal_rooster';
export type SheriffGoodType = SheriffLegalGood | SheriffContraband;

/** ตัวเลือกห้อง — ส่งเข้า `setup` บนเซิร์ฟเวอร์ */
export interface SheriffLobbyOptions {
  /**
   * รวมการ์ดพิเศษ/ชุดเสริมในสำรับเมื่อมีผู้เล่น 5 คน (ชุด `EXTRA_CARDS_FOR_5P` ฝั่ง engine)
   * ถ้าปิด เกม 5 คนจะใช้สำรับแบบเดียวกับที่ไม่มีการ์ดเสริม
   */
  includeSpecialCards: boolean;
}

/**
 * การ์ดสายขยาย (ครอบครัวเดียวกับของถูกกฎหมาย) — ใส่ในสำรับเฉพาะเมื่อมีผู้เล่น 5 คน
 * (โต๊ะนี้รองรับ 3–5 คน; เกม 3–4 คนไม่มีชนิดเหล่านี้ในสำรับ)
 *
 * หมายเหตุ: การ์ดขนมปังพื้นฐาน (`bread`) ยังมีในทุกขนาดโต๊ะ แต่จำนวนใบในเกม 5 คนจะมากกว่า — ดู `buildDeck` ฝั่ง server
 */
export const SHERIFF_DECK_TYPES_FIVE_PLAYERS_ONLY = [
  'rye_bread',
  'royal_rooster',
  'pumpernickel_bread',
  'golden_apples',
  'bleu_cheese',
] as const satisfies readonly SheriffGoodType[];

export interface SheriffCard {
  id: string;
  type: SheriffGoodType;
}

export interface SheriffPlayerState {
  id: string;
  name: string;
  hand: SheriffCard[];
  stall: SheriffCard[];
  coins: number;
}

export type SheriffPhase =
  | 'merchant_market'
  /** ทุกคนจบเทิร์นจั่วแล้ว — จัดถุง/ร่างถุงคู่ขนาน */
  | 'parallel_bagging'
  /** ทุกคนส่งถุงแล้ว — Sheriff เลือก ตรวจ/ผ่าน รายคน; พ่อค้าปรับสินบนได้จนกว่าจะถูกตัดสิน */
  | 'sheriff_judging'
  | 'round_end'
  | 'game_over';

export interface SheriffState {
  phase: SheriffPhase;
  players: SheriffPlayerState[];
  drawPile: SheriffCard[];
  discardPiles: [SheriffCard[], SheriffCard[]];
  sheriffIndex: number;
  merchantOrder: number[];
  merchantTurnPointer: number;
  bagByPlayer: Record<string, SheriffCard[]>;
  declaredGoodByPlayer: Record<string, SheriffLegalGood | undefined>;
  marketDoneByPlayer: Record<string, boolean>;
  bribeByPlayer: Record<string, number>;
  bribeDoneByPlayer: Record<string, boolean>;
  lastInspection?: {
    id: string;
    merchantId: string;
    merchantName: string;
    sheriffId: string;
    sheriffName: string;
    inspected: boolean;
    confiscatedCount: number;
    passedCount: number;
    sheriffDelta: number;
    merchantDelta: number;
    passedCards: SheriffGoodType[];
    confiscatedCards: SheriffGoodType[];
    declaredGood: SheriffLegalGood;
    bribePaid: number;
  };
  publicLog: string[];
  lastRoundSummary?: string;
  roundsCompleted: number;
  sheriffTurnsTaken: Record<string, number>;
  winnerIds?: string[];
  /** ลำดับสำหรับ client แยก modal เปิดเผยการจั่วจากกองทิ้ง */
  marketRevealSeq?: number;
  /** หลังจั่วจากกองจั่วหรือกองทิ้ง (ล้างเมื่อเข้าขั้นตอนถุง) — จั่วจากกองจั่วส่งให้แค่คนจั่วใน getPlayerView */
  marketDrawReveal?: {
    revealId: number;
    merchantId: string;
    merchantName: string;
    fromPile: 'left' | 'right' | 'deck';
    cardTypes: SheriffGoodType[];
  };
  /** ร่างถุงระหว่าง parallel_bagging (การ์ดยังอยู่ในมือจนกดส่ง) */
  draftBagByPlayer: Record<
    string,
    { cardIds: string[]; declaredGood: SheriffLegalGood } | undefined
  >;
  /** Sheriff ยังไม่ตัดสินกับ merchant เหล่านี้ (ลำดับเดียวกับ merchantOrder) */
  merchantIdsPendingSheriff: string[];
  /** Merchant คิวตลาดกำลังเลือกทิ้งการ์ด (ยังไม่กดจั่ว) — ให้คนอื่นเห็นแบบเรียลไทม์ */
  marketStagingPublic?: {
    merchantId: string;
    merchantName: string;
    discardPileIndex: 0 | 1;
    cardTypes: SheriffGoodType[];
  };
}

export interface SheriffPlayerView {
  phase: SheriffPhase;
  me: { id: string; name: string; coins: number };
  players: {
    id: string;
    name: string;
    coins: number;
    handCount: number;
    stallCount: number;
    /** แผงสินค้าแยกตามชนิดการ์ด (สำหรับแสดงภาพ + xN) */
    stallGroups: { type: SheriffGoodType; count: number }[];
  }[];
  myHand: SheriffCard[];
  myStall: SheriffCard[];
  sheriffId: string;
  sheriffName: string;
  activeMerchantId?: string;
  activeMerchantName?: string;
  myBagCount: number;
  /** การ์ดในถุงที่ส่งแล้ว (เจ้าของถุงเท่านั้น) — ว่างก่อนส่งหรือหลังถูกดำเนินการแล้ว */
  myBag: SheriffCard[];
  myDeclaredGood?: SheriffLegalGood;
  /** @deprecated ใช้ canDraftBag / canSubmitBagNow */
  canBagNow: boolean;
  canMarketNow: boolean;
  /** จัดถุง (ร่าง) ได้เมื่อจบตลาดครบทุกคนแล้ว */
  canDraftBag: boolean;
  /** ยืนยันส่งถุง (มีร่างครบ) — ไม่ต้องรอคิว */
  canSubmitBagNow: boolean;
  /** ขั้น parallel_bagging: พ่อค้าส่งถุงแล้วกี่คน / ต้องส่งทั้งหมด (ไม่รวม Sheriff) */
  parallelBagSubmittedCount?: number;
  parallelBagMerchantTotal?: number;
  myBagDraft?: { cardIds: string[]; declaredGood: SheriffLegalGood };
  /** ขั้น sheriff_judging: สินบนของแต่ละพ่อค้า (เรียลไทม์) */
  merchantBribeOffers?: { playerId: string; name: string; amount: number }[];
  /** Sheriff เห็นรายการคนที่ยังรอการตัดสิน */
  sheriffMerchantPanels?: {
    playerId: string;
    name: string;
    declaredGood: SheriffLegalGood;
    bribe: number;
    pending: boolean;
  }[];
  /** พ่อค้าปรับสินบนได้ (ยังไม่ถูก Sheriff ตัดสิน) */
  canSetBribeFreely: boolean;
  /** @deprecated ใช้ canSetBribeFreely */
  canBribeNow: boolean;
  /** @deprecated ใช้ sheriffMerchantPanels */
  canInspectNow: boolean;
  myCurrentBribe: number;
  legalGoodsForDeclaration: SheriffLegalGood[];
  discardTopLeft?: SheriffGoodType;
  discardTopRight?: SheriffGoodType;
  discardLeftPreview: SheriffGoodType[];
  discardRightPreview: SheriffGoodType[];
  discardLeftCount: number;
  discardRightCount: number;
  drawPileCount: number;
  publicLog: string[];
  lastRoundSummary?: string;
  lastInspection?: SheriffState['lastInspection'];
  winners?: { id: string; name: string; score: number }[];
  scoreBreakdown?: {
    id: string;
    name: string;
    coins: number;
    goodsValue: number;
    bonus: number;
    total: number;
  }[];
  marketDrawReveal?: SheriffState['marketDrawReveal'];
  /** ผู้เล่นคนอื่นเห็นการ์ดที่ Merchant คิวตลาดกำลังจะทิ้ง (เรียลไทม์) */
  marketStagingPublic?: SheriffState['marketStagingPublic'];
}

export type SheriffAction =
  | {
      type: 'merchant_market';
      discardCardIds: string[];
      discardPileIndex: 0 | 1;
      /** จั่วครบจำนวนใบที่ทิ้งจากแหล่งเดียว (กองจั่ว หรือกองทิ้งฝั่งที่ไม่ได้ทิ้งลงไป) */
      drawSource: 'deck' | 'left' | 'right';
    }
  /** ข้ามตลาดรอบนี้ — ไม่ทิ้งการ์ด ไม่จั่ว */
  | { type: 'merchant_market_pass' }
  /** แสดงการ์ดที่กำลังเลือกทิ้งให้ผู้เล่นอื่น (ยังไม่ยืนยันจั่ว) */
  | { type: 'market_stage_preview'; discardPileIndex: 0 | 1 | null; cardIds: string[] }
  /** ร่างถุง (การ์ดยังอยู่ในมือ) — หลังจบตลาดของตัวเองแล้ว (คู่ขนานกับตลาดของคนอื่นได้) */
  | { type: 'bag_draft'; cardIds: string[]; declaredGood: SheriffLegalGood }
  /** ยืนยันส่งถุง — เมื่อทุกคนส่งครบจะเข้าขั้น sheriff_judging */
  | { type: 'submit_bag' }
  | { type: 'set_bribe'; amount: number }
  /** Sheriff เลือกตรวจหรือผ่านกับพ่อค้าคนนั้น — ผ่าน = เก็บสินบน, ตรวจ = ไม่เก็บสินบน */
  | { type: 'sheriff_decide'; targetMerchantId: string; inspect: boolean };
