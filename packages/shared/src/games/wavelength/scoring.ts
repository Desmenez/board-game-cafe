/** Continuum position: 0 = left concept, 1 = right concept. */

export const WAVELENGTH_POINTS_TO_WIN = 10;

/**
 * Five 2 / 3 / 4 / 3 / 2 wedges, each the same width on the continuum.
 * Outer 2-pt edges stay at 30% of the wheel. Exact edges award the higher value.
 */
export const WAVELENGTH_BAND_WIDTH = 0.06;

export const WAVELENGTH_DEFAULT_BANDS = {
  halfWidth4: WAVELENGTH_BAND_WIDTH / 2,
  halfWidth3: (WAVELENGTH_BAND_WIDTH / 2) * 3,
  halfWidth2: (WAVELENGTH_BAND_WIDTH / 2) * 5,
} as const;

export type WavelengthDialScore = 0 | 2 | 3 | 4;
export type WavelengthLeftRight = 'left' | 'right';

export interface WavelengthTarget {
  center: number;
  halfWidth4: number;
  halfWidth3: number;
  halfWidth2: number;
}

export function clampWavelengthPosition(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

export function isFourPointFullyVisible(target: WavelengthTarget): boolean {
  return target.center - target.halfWidth4 >= 0 && target.center + target.halfWidth4 <= 1;
}

export function createWavelengthTarget(
  center: number,
  bands: Pick<
    WavelengthTarget,
    'halfWidth4' | 'halfWidth3' | 'halfWidth2'
  > = WAVELENGTH_DEFAULT_BANDS,
): WavelengthTarget {
  return {
    center: clampWavelengthPosition(center),
    halfWidth4: bands.halfWidth4,
    halfWidth3: bands.halfWidth3,
    halfWidth2: bands.halfWidth2,
  };
}

/** Re-spin until the 4-point wedge sits fully on the continuum. */
export function spinWavelengthTarget(
  rng: () => number = Math.random,
  bands: Pick<
    WavelengthTarget,
    'halfWidth4' | 'halfWidth3' | 'halfWidth2'
  > = WAVELENGTH_DEFAULT_BANDS,
): WavelengthTarget {
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const target = createWavelengthTarget(rng(), bands);
    if (isFourPointFullyVisible(target)) return target;
  }
  const min = bands.halfWidth4;
  const max = 1 - bands.halfWidth4;
  return createWavelengthTarget(min + rng() * (max - min), bands);
}

export function scoreDial(dial: number, target: WavelengthTarget): WavelengthDialScore {
  const distance = Math.abs(clampWavelengthPosition(dial) - target.center);
  const edge = 1e-10;
  if (distance <= target.halfWidth4 + edge) return 4;
  if (distance <= target.halfWidth3 + edge) return 3;
  if (distance <= target.halfWidth2 + edge) return 2;
  return 0;
}

/**
 * Where the 4-point center sits relative to the finalized dial.
 * Exact match → `null` (perfect 4 — opposing team cannot score).
 */
export function leftRightOfCenter(dial: number, center: number): WavelengthLeftRight | null {
  const d = clampWavelengthPosition(dial);
  const c = clampWavelengthPosition(center);
  if (d === c) return null;
  return c < d ? 'left' : 'right';
}

export function opposingRoundPoints(
  dialScore: WavelengthDialScore,
  guess: WavelengthLeftRight,
  centerSide: WavelengthLeftRight | null,
): 0 | 1 {
  if (dialScore === 4 || centerSide == null) return 0;
  return guess === centerSide ? 1 : 0;
}

/** Needle CSS rotate: 0deg is up, −90 left, +90 right. */
export function wavelengthNeedleDegrees(dial: number): number {
  return (clampWavelengthPosition(dial) - 0.5) * 180;
}
