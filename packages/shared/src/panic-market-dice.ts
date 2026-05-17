import type { PowsColor } from './types/panic-on-wall-street.js';

/** Board segment index 0–10 (engine position) */
export const POWS_MARKET_POSITION_MIN = 0;
export const POWS_MARKET_POSITION_MAX = 10;

/** Six faces per color — delta applied to current position (then clamped) */
export const POWS_MARKET_DICE_FACES: Record<PowsColor, readonly number[]> = {
  blue: [-1, 0, 0, 1, 1, 2],
  green: [-2, -1, 0, 1, 2, 3],
  yellow: [-3, -2, 1, 2, 3, 4],
  red: [-7, -5, -3, 3, 5, 7],
};

/** Market roll animation order (low → high risk) */
export const POWS_MARKET_ROLL_COLOR_ORDER: readonly PowsColor[] = [
  'blue',
  'green',
  'yellow',
  'red',
];

export const POWS_MARKET_ROLL_ANIM_MS_PER_COLOR = 2000;

export function powsClampMarketPosition(position: number): number {
  return Math.max(POWS_MARKET_POSITION_MIN, Math.min(POWS_MARKET_POSITION_MAX, position));
}

/** Unique landing positions from current cell + one die face */
export function powsPossibleMarketPositions(
  currentPosition: number,
  faces: readonly number[] = POWS_MARKET_DICE_FACES.blue,
): number[] {
  const out = new Set<number>();
  for (const delta of faces) {
    out.add(powsClampMarketPosition(currentPosition + delta));
  }
  return [...out].sort((a, b) => a - b);
}

export function powsRollMarketDelta(color: PowsColor): number {
  const faces = POWS_MARKET_DICE_FACES[color];
  return faces[Math.floor(Math.random() * faces.length)]!;
}

export function powsFormatMarketDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}
