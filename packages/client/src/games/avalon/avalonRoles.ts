import type { AvalonRole } from 'shared';

/** Display name per role (art uses `getAvalonRolePortraitUrl` + optional portrait variant). */
export const ROLE_LABEL: Record<AvalonRole, string> = {
  merlin: 'Merlin',
  percival: 'Percival',
  loyal_servant: 'Loyal Servant',
  lancelot_loyal: 'Sir Lancelot',
  assassin: 'Assassin',
  morgana: 'Morgana',
  mordred: 'Mordred',
  oberon: 'Oberon',
  minion: 'Minion of Mordred',
  lancelot_evil: 'Evil Lancelot',
};

/** คำอธิบายบทบาทสั้นๆ (ไทย) — ใช้ใน composition detail dialog */
export const ROLE_DESCRIPTION_TH: Record<AvalonRole, string> = {
  merlin:
    'ฝ่ายดี — มองเห็นผู้เล่นฝ่ายชั่วทั้งหมด ยกเว้น Mordred — ถ้า Assassin แทงถูกคุณหลัง Quest สำเร็จ 3 ครั้ง ฝ่ายชั่วจะชนะ',
  percival: 'ฝ่ายดี — มองเห็น Merlin และ Morgana แต่ไม่รู้ว่าใครเป็นใคร',
  loyal_servant: 'ฝ่ายดี — ไม่มีข้อมูลลับพิเศษ ช่วยให้ Quest สำเร็จและปกป้อง Merlin',
  lancelot_loyal:
    'ฝ่ายดี (Sir Lancelot) — รู้ว่าใครเป็น Evil Lancelot คู่กัน กติกา Quest/โหวตเหมือน Loyal Servant',
  assassin:
    'ฝ่ายชั่ว — รู้พันธมิตรฝ่ายชั่ว (ยกเว้น Oberon) — ถ้าฝ่ายดี Quest สำเร็จ 3 ครั้ง คุณเลือกแทงผู้ที่คิดว่าเป็น Merlin',
  morgana:
    'ฝ่ายชั่ว — ปรากฏเป็น Merlin หรือ Morgana ในสายตา Percival — รู้พันธมิตรฝ่ายชั่ว (ยกเว้น Oberon)',
  mordred: 'ฝ่ายชั่ว — Merlin มองไม่เห็นคุณ — รู้พันธมิตรฝ่ายชั่ว (ยกเว้น Oberon)',
  oberon: 'ฝ่ายชั่ว — ไม่รู้และไม่ถูกเปิดเผยต่อพันธมิตรฝ่ายชั่วคนอื่น',
  minion: 'ฝ่ายชั่ว — รู้พันธมิตรฝ่ายชั่ว (ยกเว้น Oberon) ไม่มีพลังพิเศษอื่น',
  lancelot_evil:
    'ฝ่ายชั่ว (Evil Lancelot) — รู้ว่าใครเป็น Sir Lancelot คู่กัน และรู้พันธมิตรฝ่ายชั่ว (ยกเว้น Oberon)',
};

/** Server sends English keys; UI shows Thai labels. Tones drive row/label colors. */
export type KnownInfoTone = 'good' | 'evil' | 'evil_ally' | 'uncertain';

export function knownInfoPresentation(detail: string): { label: string; tone: KnownInfoTone } {
  switch (detail) {
    case 'Evil':
      return { label: 'เป็นฝ่ายชั่ว', tone: 'evil' };
    case 'Evil ally':
      return { label: 'เป็นฝ่ายชั่ว (พันธมิตร)', tone: 'evil_ally' };
    case 'Good':
      return { label: 'เป็นฝ่ายดี', tone: 'good' };
    case 'Merlin หรือ Morgana':
      return { label: 'Merlin หรือ Morgana', tone: 'uncertain' };
    case 'Lancelot ฝ่ายชั่ว':
      return { label: 'คือ Lancelot ฝ่ายชั่ว (รู้ตัวตนกัน)', tone: 'evil' };
    case 'Lancelot ฝ่ายดี':
      return { label: 'คือ Lancelot ฝ่ายดี (รู้ตัวตนกัน)', tone: 'good' };
    default:
      return { label: detail, tone: 'uncertain' };
  }
}
