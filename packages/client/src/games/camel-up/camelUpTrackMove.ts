import {
  CAMEL_UP_COLORS,
  CAMEL_UP_TRACK_LENGTH,
  type CamelUpColor,
  type CamelUpDesertTileOnTrack,
  type CamelUpPlayerView,
} from 'shared';

export type CamelTrackView = CamelUpPlayerView['track'];

export function normalizeTrack(track: CamelTrackView): Record<number, CamelUpColor[]> {
  const out: Record<number, CamelUpColor[]> = {};
  for (let space = 1; space <= CAMEL_UP_TRACK_LENGTH; space += 1) {
    const colors = track[space]?.colors;
    if (colors?.length) out[space] = [...colors];
  }
  return out;
}

export function tracksEqual(a: CamelTrackView, b: CamelTrackView): boolean {
  return JSON.stringify(normalizeTrack(a)) === JSON.stringify(normalizeTrack(b));
}

/** All five camels stacked on space 1 (any stack order). */
export function isInitialLegTrack(track: CamelTrackView): boolean {
  const colors = track[1]?.colors ?? [];
  if (colors.length !== CAMEL_UP_COLORS.length) return false;
  const onStart = new Set(colors);
  return CAMEL_UP_COLORS.every((color) => onStart.has(color));
}

export function extractMovingStack(
  track: CamelTrackView,
  color: CamelUpColor,
): { fromSpace: number; staying: CamelUpColor[]; moving: CamelUpColor[] } | null {
  for (let space = 1; space <= CAMEL_UP_TRACK_LENGTH; space += 1) {
    const stack = track[space]?.colors ?? [];
    const colorIndex = stack.indexOf(color);
    if (colorIndex === -1) continue;
    return {
      fromSpace: space,
      staying: stack.slice(0, colorIndex),
      moving: stack.slice(colorIndex),
    };
  }
  return null;
}

export function trackWithoutMovingStack(
  track: CamelTrackView,
  fromSpace: number,
  staying: CamelUpColor[],
): CamelTrackView {
  const next: CamelTrackView = {};
  for (let space = 1; space <= CAMEL_UP_TRACK_LENGTH; space += 1) {
    const colors = track[space]?.colors;
    if (!colors?.length) continue;
    if (space === fromSpace) {
      if (staying.length > 0) next[space] = { colors: [...staying] };
      continue;
    }
    next[space] = { colors: [...colors] };
  }
  return next;
}

/** Spaces visited by the moving stack, including start and desert bonus step. */
export function buildCamelMovePath(
  fromSpace: number,
  dieValue: number,
  desertTiles: CamelUpDesertTileOnTrack[],
): number[] {
  const path: number[] = [fromSpace];
  let current = fromSpace;

  const pushSpace = (space: number) => {
    if (path[path.length - 1] !== space) path.push(space);
  };

  for (let step = 0; step < dieValue; step += 1) {
    current = Math.min(current + 1, CAMEL_UP_TRACK_LENGTH);
    pushSpace(current);
  }

  const desert = desertTiles.find((tile) => tile.space === current);
  if (desert) {
    const extra = desert.effect === 'oasis' ? 1 : -1;
    const next = Math.max(1, Math.min(current + extra, CAMEL_UP_TRACK_LENGTH));
    pushSpace(next);
  }

  return path;
}
