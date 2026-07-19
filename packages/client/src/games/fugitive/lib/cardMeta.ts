import { imageMap } from '../../../imageMap';

const { fugitive } = imageMap;

export function fugitiveCardImageUrl(value: number): string {
  return fugitive.cards[value] ?? '';
}

export const FUGITIVE_CARD_BACK = fugitive.cardBack;
export const FUGITIVE_COVER = fugitive.cover;
