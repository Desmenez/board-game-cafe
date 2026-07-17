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
