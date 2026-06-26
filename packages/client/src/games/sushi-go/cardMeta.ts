import type { SushiGoCardKind } from 'shared';
import { sushiGoCardLabel } from 'shared';
import { imageMap } from '../../imageMap';

export const CARD_BACK_URL = imageMap.sushiGo.cardBack;
export const COVER_URL = imageMap.sushiGo.cover;
export const CARD_IMAGE: Record<SushiGoCardKind, string> = imageMap.sushiGo.cards;

export function sushiGoCardImage(kind: SushiGoCardKind): string {
  return CARD_IMAGE[kind] ?? '';
}

export function sushiGoCardLabelTh(kind: SushiGoCardKind): string {
  return sushiGoCardLabel(kind);
}
