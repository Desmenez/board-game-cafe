import type { CamelUpColor, CamelUpDesertEffect } from 'shared';
import { imageMap } from '../../../imageMap';

type LegBetArtValue = 2 | 3 | 5;

/** Map game tile value to nearest leg-bet card art (assets exist for 2, 3, 5 only). */
export function camelUpLegBetArtValue(value: number): LegBetArtValue {
  if (value >= 5) return 5;
  if (value >= 3) return 3;
  return 2;
}

export function camelUpLegBetTileUrl(color: CamelUpColor, value: number): string {
  const art = camelUpLegBetArtValue(value);
  return imageMap.camelUp.legBet[color][art];
}

export function camelUpRaceCardUrl(color: CamelUpColor): string {
  return imageMap.camelUp.legBet[color][5];
}

export function camelUpDesertTileUrl(effect: CamelUpDesertEffect): string {
  return effect === 'oasis' ? imageMap.camelUp.oasis : imageMap.camelUp.mirage;
}

export function camelUpCoinUrl(ep: number): string {
  const tier = Math.min(3, Math.max(1, ep)) as 1 | 2 | 3;
  return imageMap.camelUp.coins[tier];
}

export function camelUpFaceDownBetUrl(): string {
  return imageMap.camelUp.coins[1];
}

export function camelUpMapUrl(): string {
  return imageMap.camelUp.map;
}
