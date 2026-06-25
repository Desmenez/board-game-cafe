import { CAMEL_UP_TRACK_LENGTH, type CamelUpColor } from 'shared';
import type { CamelTrackView } from './camelUpTrackMove';

export type CamelStanding = {
  color: CamelUpColor;
  space: number;
  rank: number;
  isLeader: boolean;
};

function findCamelSpace(track: CamelTrackView, color: CamelUpColor): number {
  for (let space = 1; space <= CAMEL_UP_TRACK_LENGTH; space += 1) {
    if (track[space]?.colors.includes(color)) return space;
  }
  return 1;
}

/** Rank 1 = leg leader (furthest ahead on track). */
export function buildCamelStandings(track: CamelTrackView): CamelStanding[] {
  const ranked: CamelUpColor[] = [];

  for (let space = CAMEL_UP_TRACK_LENGTH; space >= 1; space -= 1) {
    const stack = track[space]?.colors ?? [];
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      ranked.push(stack[i]!);
    }
  }

  return ranked.map((color, index) => ({
    color,
    space: findCamelSpace(track, color),
    rank: index + 1,
    isLeader: index === 0,
  }));
}
