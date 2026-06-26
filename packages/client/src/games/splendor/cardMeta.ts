import type { SplendorGem } from 'shared';
import { imageMap } from '../../imageMap';

const { splendor } = imageMap;

export type SplendorChipKind = SplendorGem | 'gold';

export function splendorDevCardImageUrl(artKey: string): string {
  return splendor.devCards[artKey] ?? '';
}

export function splendorNobleImageUrl(artKey: string): string {
  return splendor.nobles[artKey] ?? '';
}

export function splendorChipImageUrl(kind: SplendorChipKind): string {
  return splendor.chips[kind] ?? '';
}

export function splendorDeckBackUrl(level: 1 | 2 | 3): string {
  return splendor.deckBacks[level] ?? '';
}

export const SPLENDOR_NOBLE_BACK = splendor.nobleBack;
export const SPLENDOR_COVER = splendor.cover;
