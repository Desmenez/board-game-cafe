import type { LoveLetterCard, LoveLetterRole } from 'shared';
import { imageMap } from '../../imageMap';

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
export const AFFECTION_TOKEN_URL = imageMap.loveLetter.affectionToken;

export function loveLetterCardImage(card: LoveLetterCard): string {
  return CARD_IMAGE[card.role] ?? '';
}

export function roleLabel(role: LoveLetterRole): string {
  return CARD_LABEL[role];
}
