// ============================================================
// Insider — สืบหาจอมบงการ (ดัดแปลงจากบอร์ดเกม Insider)
// ============================================================

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
  | { type: 'discussion_done' }
  | { type: 'final_vote'; targetId: string };

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
  /** มาสเตอร์เห็นตั้งแต่รอบอ่านคำ / Insider หลังรอบของตัวเอง */
  categoryLabel?: string;
  secretWord?: string;
  questionLog: InsiderQuestionEntry[];
  pendingQuestionId: string | null;
  questioningEndsAtMs: number | null;
  /** ผู้ที่ถามจนได้คำตอบ "ถูกต้อง" */
  solvedById: string | null;
  solverName?: string | null;
  discussionEndsAtMs: number | null;
  /** voterId -> โหวตใครเป็น Insider */
  finalVotes: Record<string, string>;
  /** จำนวนที่โหวตแล้ว / ทั้งหมด */
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
