// ============================================================
// Splendor — shared types (player view + actions)
// ============================================================

export type SplendorGem = 'white' | 'blue' | 'green' | 'red' | 'black';

export interface SplendorGems {
  white: number;
  blue: number;
  green: number;
  red: number;
  black: number;
}

/** การ์ดพัฒนาการบนโต๊ะ / ในมือเรา — ข้อมูลเปิดทั้งหมด */
export interface SplendorCardView {
  id: string;
  level: 1 | 2 | 3;
  /** โบนัสถาวรเมื่อซื้อแล้ว */
  bonus: SplendorGem;
  prestige: number;
  cost: SplendorGems;
}

export interface SplendorNobleView {
  id: string;
  prestige: number;
  /** ใช้เฉพาะโบนัสจากการ์ดที่ซื้อแล้ว ไม่นับโทเคน */
  requires: SplendorGems;
}

export interface SplendorPlayerRowView {
  id: string;
  name: string;
  gems: SplendorGems;
  gold: number;
  bonuses: SplendorGems;
  prestige: number;
  /** การ์ดที่ซื้อแล้ว (ทุกคนเห็น) */
  purchasedCards: SplendorCardView[];
  /** ช่องจอง — คนอื่นเห็นแค่มี/ไม่มี ไม่เห็นชนิดการ์ด */
  reservedSlots: Array<SplendorCardView | { hidden: true } | null>;
}

export interface SplendorPlayerView {
  phase: 'playing' | 'return_tokens' | 'noble_pick' | 'game_over';
  currentPlayerId: string;
  myPlayerId: string;
  bankGems: SplendorGems;
  bankGold: number;
  /** การ์ดหงายหน้า ระดับ 1–3 ช่องละ 4 — null เมื่อกองหมดแล้ว */
  visible: [
    Array<SplendorCardView | null>,
    Array<SplendorCardView | null>,
    Array<SplendorCardView | null>,
  ];
  /** จำนวนการ์ดคว่ำในกองแต่ละระดับ */
  deckSizes: [number, number, number];
  nobles: SplendorNobleView[];
  players: SplendorPlayerRowView[];
  /** เมื่อเป็นตาคุณและมีโนเบิลให้เลือกมากกว่า 1 */
  noblePickOptions?: string[];
  lastEvent?: string;
  /** เกมจบแล้ว — คะแนนและผู้ชนะ */
  result?: { winners: string[]; reason: string; scores: Record<string, number> };
  /** โหมดจบเกม: รอบสุดท้ายหลังมีคนถึง 15 แต้ม */
  finalRoundNotice?: boolean;
}

export type SplendorAction =
  | { type: 'take_three'; colors: [SplendorGem, SplendorGem, SplendorGem] }
  | { type: 'take_two'; color: SplendorGem }
  | { type: 'reserve_table'; level: 1 | 2 | 3; slot: number }
  | { type: 'reserve_deck'; level: 1 | 2 | 3 }
  | { type: 'buy_table'; level: 1 | 2 | 3; slot: number }
  | { type: 'buy_reserved'; slot: number }
  | { type: 'choose_noble'; nobleId: string }
  /** คืนโทเคนเมื่อเกิน 10 เม็ดหลังจบแอ็กชนหลัก */
  | { type: 'return_tokens'; gems: SplendorGems; gold: number };
