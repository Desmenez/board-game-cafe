/**
 * Center point of each track cell on `map_lqtjbm` (3964×1990), as % of the image.
 * Track spaces 1–16 clockwise around the loop; space 1 = start/finish line.
 */
export const CAMEL_UP_MAP_SPACE_POSITIONS: Record<number, { x: number; y: number }> = {
  1: { x: 53.5, y: 54.6 },
  2: { x: 53.5, y: 76.2 },
  3: { x: 53.5, y: 94.8 },
  4: { x: 41.8, y: 94.8 },
  5: { x: 30.4, y: 94.8 },
  6: { x: 18.4, y: 94.8 },
  7: { x: 6.4, y: 94.8 },
  8: { x: 6.4, y: 76.2 },
  9: { x: 6.4, y: 54.6 },
  10: { x: 6.4, y: 34.0 },
  11: { x: 6.4, y: 13.2 },
  12: { x: 18.4, y: 13.2 },
  13: { x: 30.4, y: 13.2 },
  14: { x: 41.8, y: 13.2 },
  15: { x: 53.5, y: 13.2 },
  16: { x: 53.5, y: 34.0 },
};

export const CAMEL_UP_MAP_TRACK_SPACES = Object.keys(CAMEL_UP_MAP_SPACE_POSITIONS)
  .map(Number)
  .sort((a, b) => a - b);

export function trackSpaceStyle(space: number): { left: string; top: string } {
  const pos = CAMEL_UP_MAP_SPACE_POSITIONS[space] ?? { x: 50, y: 50 };
  return { left: `${pos.x}%`, top: `${pos.y}%` };
}
