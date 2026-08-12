import type { SkullColor, SkullDisc, SkullDiscFace } from 'shared';
import { imageMap } from '../../imageMap';

export function skullMatUrl(color: SkullColor, wins: 0 | 1): string {
  // wins 0 → blank (back), wins 1 → flower (front)
  return wins === 0 ? imageMap.skull.mats[color].back : imageMap.skull.mats[color].front;
}

export function skullCoasterUrl(
  color: SkullColor,
  opts: { faceUp: boolean; face: SkullDiscFace | null; isLastChance?: boolean },
): string {
  if (!opts.faceUp) return imageMap.skull.coasters[color].back;
  if (opts.face === 'skull') return imageMap.skull.coasters[color].skull;
  return imageMap.skull.coasters[color].flower;
}

export function skullHandDiscUrl(disc: SkullDisc): string {
  if (disc.face === 'skull') return imageMap.skull.coasters[disc.color].skull;
  return imageMap.skull.coasters[disc.color].flower;
}

export function skullDiscLabelTh(disc: Pick<SkullDisc, 'face' | 'isLastChance'>): string {
  if (disc.isLastChance) return 'Last Chance (ดอกไม้)';
  return disc.face === 'skull' ? 'กะโหลก' : 'ดอกไม้';
}
