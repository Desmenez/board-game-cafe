import type { LoveLetterCard, LoveLetterRole } from 'shared';
import { imageMap } from '../../../imageMap';

export const CARD_LABEL: Record<LoveLetterRole, string> = {
  guard: 'Guard (1)',
  priest: 'Priest (2)',
  baron: 'Baron (3)',
  handmaid: 'Handmaid (4)',
  prince: 'Prince (5)',
  king: 'King (6)',
  countess: 'Countess (7)',
  princess: 'Princess (8)',
};

export const CARD_IMAGE: Record<LoveLetterRole, string> = imageMap.loveLetter.cards;
export const CARD_BACK_URL = imageMap.loveLetter.backCard;

export function loveLetterCardImage(card: LoveLetterCard): string {
  return CARD_IMAGE[card.role] ?? '';
}

export function roleLabel(role: LoveLetterRole): string {
  return CARD_LABEL[role];
}

/** Short Thai copy for target / effect prompts */
export const ROLE_EFFECT_HINT: Partial<Record<LoveLetterRole, string>> = {
  guard: 'เลือกผู้เล่น แล้วทายเลขการ์ดในมือ (ห้ามทาย 1)',
  priest: 'เลือกผู้เล่นเพื่อแอบดูการ์ดในมือ',
  baron: 'เลือกผู้เล่นเพื่อเปรียบเลขในมือ — คนที่ต่ำกว่าออกจากรอบ',
  prince: 'บังคับให้เป้าหมายทิ้งมือแล้วจั่วใหม่ (เลือกตัวเองได้)',
  king: 'สลับมือกับการ์ดของเป้าหมาย',
};
