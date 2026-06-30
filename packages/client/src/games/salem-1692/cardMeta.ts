import type { Salem1692PlayingCardKind, Salem1692TownHallId, Salem1692TryalKind } from 'shared';
import { salem1692CardLabel, salem1692TryalLabel, SALEM_1692_TOWN_HALL_LABELS } from 'shared';
import { imageMap } from '../../imageMap';

export const CARD_BACK_URL = imageMap.salem1692.cardBack;
export const COVER_URL = imageMap.salem1692.cover;

export function salem1692PlayingCardImage(kind: Salem1692PlayingCardKind): string {
  return imageMap.salem1692.playingCards[kind] ?? '';
}

export function salem1692TryalImage(kind: Salem1692TryalKind): string {
  return imageMap.salem1692.tryals[kind] ?? '';
}

export function salem1692TownHallImage(id: Salem1692TownHallId): string {
  return imageMap.salem1692.townHall[id] ?? '';
}

export function salem1692CardLabelTh(kind: Salem1692PlayingCardKind): string {
  return salem1692CardLabel(kind);
}

export function salem1692TryalLabelTh(kind: Salem1692TryalKind): string {
  return salem1692TryalLabel(kind);
}

export function salem1692TownHallLabel(id: Salem1692TownHallId): string {
  return SALEM_1692_TOWN_HALL_LABELS[id];
}
