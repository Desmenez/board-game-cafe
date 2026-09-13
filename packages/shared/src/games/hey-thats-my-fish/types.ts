import type { GameResult } from '../../platform/game.js';

export const HEY_THATS_MY_FISH_ID = 'hey-thats-my-fish';

/** Official ice-floe rows, north to south. Top row is 7. */
export const HEY_THATS_MY_FISH_ROW_WIDTHS = [7, 8, 7, 8, 7, 8, 7, 8] as const;

export const HEY_THATS_MY_FISH_TILE_COUNT = 60;

export const HEY_THATS_MY_FISH_DECK_COUNTS = {
  1: 30,
  2: 20,
  3: 10,
} as const;

/** 4-fish tiles exist in some printings; this edition’s shuffle deck never includes them. */
export const HEY_THATS_MY_FISH_SKIP_FISH_VALUES = [4] as const;

export const HEY_THATS_MY_FISH_PENGUINS_PER_PLAYER: Record<2 | 3 | 4, number> = {
  2: 4,
  3: 3,
  4: 2,
};

export const HEY_THATS_MY_FISH_COLORS = ['green', 'orange', 'purple', 'yellow'] as const;
export type HeyThatsMyFishColor = (typeof HEY_THATS_MY_FISH_COLORS)[number];

export type HeyThatsMyFishFishValue = 1 | 2 | 3;

/**
 * Ice-art variants only — grey = 1 fish, gold = 2, red = 3.
 * Numeric suffixes are artwork, never fish value.
 */
export const HEY_THATS_MY_FISH_ART_BY_FISH = {
  1: ['grey-1', 'grey-2', 'grey-3'],
  2: ['gold-1', 'gold-2', 'gold-3'],
  3: ['red-1', 'red-2', 'red-3'],
} as const satisfies Record<HeyThatsMyFishFishValue, readonly string[]>;

export type HeyThatsMyFishArtKey =
  (typeof HEY_THATS_MY_FISH_ART_BY_FISH)[HeyThatsMyFishFishValue][number];

export type HeyThatsMyFishPhase = 'placement' | 'move' | 'game_over';

export type HeyThatsMyFishAction =
  | { type: 'place-penguin'; hexId: number }
  | { type: 'move-penguin'; penguinId: string; hexId: number };

export interface HeyThatsMyFishHex {
  id: number;
  /** 0 = water (tile already collected). Water is never in the shuffle deck. */
  fish: 0 | HeyThatsMyFishFishValue;
  artKey: HeyThatsMyFishArtKey | null;
  penguinId: string | null;
}

export interface HeyThatsMyFishPenguin {
  id: string;
  playerId: string;
  color: HeyThatsMyFishColor;
  /** Null after the owner is eliminated (or before that penguin is placed). */
  hexId: number | null;
}

export interface HeyThatsMyFishPlayer {
  id: string;
  name: string;
  color: HeyThatsMyFishColor;
  fishScore: number;
  tileScore: number;
  penguinsToPlace: number;
  eliminated: boolean;
}

export interface HeyThatsMyFishState {
  phase: HeyThatsMyFishPhase;
  playerOrder: string[];
  activePlayerId: string;
  players: Record<string, HeyThatsMyFishPlayer>;
  hexes: HeyThatsMyFishHex[];
  penguins: Record<string, HeyThatsMyFishPenguin>;
  lastEvent: string;
  result: GameResult | null;
}

export interface HeyThatsMyFishPlayerView {
  phase: HeyThatsMyFishPhase;
  playerOrder: string[];
  activePlayerId: string;
  canAct: boolean;
  players: HeyThatsMyFishPlayer[];
  hexes: HeyThatsMyFishHex[];
  penguins: HeyThatsMyFishPenguin[];
  lastEvent: string;
  legalPlaceHexIds: number[];
  legalMoves: Record<string, number[]>;
  result: GameResult | null;
}

export function heyThatsMyFishPenguinsPerPlayer(playerCount: number): number {
  if (playerCount === 2 || playerCount === 3 || playerCount === 4) {
    return HEY_THATS_MY_FISH_PENGUINS_PER_PLAYER[playerCount];
  }
  return HEY_THATS_MY_FISH_PENGUINS_PER_PLAYER[2];
}

export function rankHeyThatsMyFishPlayers(
  players: readonly HeyThatsMyFishPlayer[],
): HeyThatsMyFishPlayer[] {
  return [...players].sort((a, b) => {
    if (b.fishScore !== a.fishScore) return b.fishScore - a.fishScore;
    return b.tileScore - a.tileScore;
  });
}

export function heyThatsMyFishWinners(players: readonly HeyThatsMyFishPlayer[]): {
  winners: string[];
  reason: string;
} {
  const ranked = rankHeyThatsMyFishPlayers(players);
  const lead = ranked[0];
  if (!lead) return { winners: [], reason: 'ไม่มีผู้เล่น' };
  const tied = ranked.filter(
    (player) => player.fishScore === lead.fishScore && player.tileScore === lead.tileScore,
  );
  const fish = lead.fishScore;
  const tiles = lead.tileScore;
  if (tied.length > 1) {
    return {
      winners: tied.map((player) => player.id),
      reason: `เสมอกันที่ ${fish} ปลา / ${tiles} แผ่น`,
    };
  }
  return {
    winners: [lead.id],
    reason: `${lead.name} ชนะด้วย ${fish} ปลา (${tiles} แผ่น)`,
  };
}
