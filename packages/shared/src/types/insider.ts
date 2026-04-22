// ============================================================
// Insider — สืบหาจอมบงการ (ดัดแปลงจากบอร์ดเกม Insider)
// ============================================================

/** ตัวเลือกห้อง (lobby) — ส่งเข้า setup */
export interface InsiderLobbyOptions {
  /** ระยะเวลาขั้นถาม-ตอบ (นาที) — default 5 */
  questioningMinutes: number;
  /** ระยะเวลาอภิปรายหลังทายถูก (นาที) — default 2 */
  discussionMinutes: number;
}

export type InsiderRole = 'master' | 'insider' | 'common';

export type InsiderMasterAnswer = 'yes' | 'no' | 'dont_know' | 'correct';

export type InsiderPhase =
  | 'role_reveal'
  | 'master_reads'
  | 'insider_reads'
  | 'questioning'
  | 'discussion'
  | 'final_vote';

export type InsiderAction =
  | { type: 'acknowledge_role' }
  | { type: 'master_ack_word' }
  | { type: 'insider_ack_word' }
  | { type: 'ask_question'; text: string }
  | { type: 'master_answer'; questionId: string; answer: InsiderMasterAnswer }
  /** ระหว่าง discussion — เลือกว่าใครเป็น Insider (ทุกคนเห็นก่อนยืนยัน) */
  | { type: 'discussion_pick'; targetId: string }
  /** ล็อกโหวตของตัวเอง — นับเฉพาะผู้ที่ยืนยันเมื่อหมดเวลา */
  | { type: 'discussion_confirm_vote' };

export interface InsiderQuestionEntry {
  id: string;
  askerId: string;
  askerName: string;
  text: string;
  answer?: InsiderMasterAnswer;
}

/** มุมมองผู้เล่น — ข้อมูลลับถูกกรองใน getPlayerView */
export interface InsiderPlayerView {
  phase: InsiderPhase;
  masterId: string;
  players: { id: string; name: string }[];
  you: { id: string; name: string; yourRole: InsiderRole };
  /** Master เห็นหมวด/คำตั้งแต่ master_reads; Insider หลัง master_reads (ไม่เห็นระหว่าง master_reads) */
  categoryLabel?: string;
  secretWord?: string;
  questionLog: InsiderQuestionEntry[];
  questioningEndsAtMs: number | null;
  /** ผู้ที่ถามจนได้คำตอบ "ถูกต้อง" */
  solvedById: string | null;
  solverName?: string | null;
  discussionEndsAtMs: number | null;
  /** voterId -> โหวตใครเป็น Insider (ยืนยันแล้วเท่านั้น — ใช้ตอน discussion และสรุปผล) */
  finalVotes: Record<string, string>;
  /** ระหว่าง discussion — โหวตร่างก่อนกดยืนยัน (ทุกคนเห็น) voterId -> targetId */
  discussionDraftVotes?: Record<string, string>;
  /** จำนวนที่ยืนยันโหวตแล้ว / ทั้งหมด */
  voteProgress: { done: number; total: number };
  lastEvent: string;
  /** สรุปผลเมื่อจบเกม */
  gameResult?: { winners: string[]; reason: string };
  /** เมื่อเกมจบแล้ว — เปิดเผยบทบาททุกคน + คำลับ */
  gameOverReveal?: {
    secretWord: string;
    categoryLabel: string;
    roles: Record<string, InsiderRole>;
    insiderId: string;
  };
  /** ช่วงเปิดไพ่บทบาทก่อนเริ่มเกม */
  hasAcknowledgedRole?: boolean;
  roleAcknowledgeProgress?: { current: number; total: number };
}
