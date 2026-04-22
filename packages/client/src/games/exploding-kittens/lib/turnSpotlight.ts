import type { ExplodingKittensPlayerView } from 'shared';

type TurnSpotlightPlayer = ExplodingKittensPlayerView['players'][number];

export function getTurnSpotlight(gs: ExplodingKittensPlayerView): {
  prev: TurnSpotlightPlayer | null;
  current: TurnSpotlightPlayer | null;
  next: TurnSpotlightPlayer | null;
} {
  const players = gs.players;
  const n = players.length;
  if (n === 0) return { prev: null, current: null, next: null };

  const curIdx = players.findIndex((p) => p.id === gs.currentPlayerId);
  if (curIdx < 0) return { prev: null, current: null, next: null };

  const findPrevAlive = (from: number): TurnSpotlightPlayer | null => {
    for (let k = 1; k < n; k += 1) {
      const j = (from - k + n) % n;
      if (j !== from && players[j].alive) return players[j];
    }
    return null;
  };
  const findNextAlive = (from: number): TurnSpotlightPlayer | null => {
    for (let k = 1; k < n; k += 1) {
      const j = (from + k) % n;
      if (j !== from && players[j].alive) return players[j];
    }
    return null;
  };

  return {
    prev: findPrevAlive(curIdx),
    current: players[curIdx],
    next: findNextAlive(curIdx),
  };
}
