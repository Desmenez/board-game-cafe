import type { InsiderMasterAnswer, InsiderRole } from 'shared';
import type { DeckCompositionTone, SecretIdentityTone } from '../../../components/secret-identity';
import { imageMap } from '../../../imageMap';

export const ANSWER_LABEL: Record<InsiderMasterAnswer, string> = {
  yes: 'ใช่',
  no: 'ไม่ใช่',
  dont_know: 'ไม่รู้',
  correct: 'ถูกต้อง (คำตรง)',
};

export const ROLE_TH: Record<InsiderRole, string> = {
  master: 'Master (มาสเตอร์)',
  insider: 'Insider (จอมบงการ)',
  common: 'Commons (คนทั่วไป)',
};

/** Card back — Insider ยังไม่มี asset บน CDN; ใช้แผ่นดำสัดส่วนการ์ดจริง */
export const INSIDER_CARD_BACK_URL =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="317" height="746" viewBox="0 0 317 746"><rect width="317" height="746" rx="14" fill="#121212"/><rect x="14" y="14" width="289" height="718" rx="10" fill="none" stroke="#2a2a2a" stroke-width="3"/><circle cx="158.5" cy="373" r="36" fill="none" stroke="#333" stroke-width="2"/></svg>`,
  );

export const ROLE_REVEAL_META: Record<
  InsiderRole,
  {
    title: string;
    affiliation: string;
    tone: SecretIdentityTone;
    compositionTone: DeckCompositionTone;
    hint: string;
  }
> = {
  master: {
    title: 'Master',
    affiliation: 'มาสเตอร์',
    tone: 'default',
    compositionTone: 'default',
    hint: 'คุณรู้คำลับ — ตอบคำถามได้แค่ ใช่ / ไม่ใช่ / ไม่รู้ / ถูกต้อง (คำตรง)',
  },
  insider: {
    title: 'Insider',
    affiliation: 'จอมบงการ',
    tone: 'evil',
    compositionTone: 'evil',
    hint: 'คุณรู้คำลับเหมือน Master — ช่วยคนอื่นเดาคำโดยไม่ให้ถูกจับว่าเป็น Insider',
  },
  common: {
    title: 'Commons',
    affiliation: 'คนทั่วไป',
    tone: 'good',
    compositionTone: 'good',
    hint: 'คุณไม่รู้คำลับ — ถาม-ตอบเพื่อหาคำ แล้วโหวตจับ Insider',
  },
};

/** ลำดับเปิดเผยสำรับ — ไม่บอกว่าใครได้บทไหน */
export const COMPOSITION_ROLE_ORDER = [
  'master',
  'insider',
  'common',
] as const satisfies readonly InsiderRole[];

export function insiderRoleCardUrl(role: InsiderRole): string {
  const m = imageMap.insider;
  if (role === 'master') return m.master;
  if (role === 'insider') return m.insider;
  return m.common;
}

export function insiderRoleTone(role: InsiderRole): 'master' | 'insider' | 'common' {
  if (role === 'master') return 'master';
  if (role === 'insider') return 'insider';
  return 'common';
}
