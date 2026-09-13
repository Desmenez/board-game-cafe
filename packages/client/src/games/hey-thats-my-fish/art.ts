import type { HeyThatsMyFishArtKey, HeyThatsMyFishColor } from 'shared';
import { imageMap } from '../../imageMap';

const htmf = imageMap.heyThatsMyFish;

export function htmfTileSrc(artKey: HeyThatsMyFishArtKey | null, fish: number): string {
  if (fish === 0 || !artKey) return htmf.empty;
  return htmf.tiles[artKey] ?? htmf.empty;
}

export function htmfPenguinSrc(color: HeyThatsMyFishColor): string {
  return htmf.penguins[color];
}

export const HTMF_COLOR_LABEL: Record<HeyThatsMyFishColor, string> = {
  green: 'เขียว',
  orange: 'ส้ม',
  purple: 'ม่วง',
  yellow: 'เหลือง',
};

export const HTMF_PHASE_LABEL = {
  placement: 'วางเพนกวิน',
  move: 'เดินเพนกวิน',
  game_over: 'เกมจบ',
} as const;
