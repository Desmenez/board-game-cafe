import type { GameResult } from '../../platform/game.js';

export const SURVIVE_THE_ISLAND_TERRAINS = ['beach', 'forest', 'mountain'] as const;
export type SurviveTheIslandTerrain = (typeof SURVIVE_THE_ISLAND_TERRAINS)[number];
export const SURVIVE_THE_ISLAND_COLORS = ['blue', 'red', 'purple', 'orange', 'yellow'] as const;
export type SurviveTheIslandColor = (typeof SURVIVE_THE_ISLAND_COLORS)[number];
export const SURVIVE_THE_ISLAND_TILE_COUNT = 40;

export type SurviveTheIslandEffect = 'shark' | 'kaiju' | 'raft' | 'whirlpool' | 'volcano';
export type SurviveTheIslandAbility = 'paddle' | 'dolphin' | 'dive' | 'creature-die' | 'repellent';
export type SurviveTheIslandCreatureKind = 'shark' | 'kaiju';
export type SurviveTheIslandBack =
  | { kind: 'effect'; effect: SurviveTheIslandEffect }
  | { kind: 'ability'; ability: SurviveTheIslandAbility };

export type SurviveTheIslandPhase =
  | 'setup_adventurers'
  | 'setup_rafts'
  | 'action'
  | 'rising_waters'
  | 'game_over';

/** ID of an invisible, playable water hex from `board.ts`. */
export type SurviveTheIslandWaterSpace = string;

export interface SurviveTheIslandTile {
  id: number;
  terrain: SurviveTheIslandTerrain;
  back: SurviveTheIslandBack;
  state: 'island' | 'volcano' | 'sunk';
  adventurerIds: string[];
}

export interface SurviveTheIslandAdventurer {
  id: string;
  playerId: string;
  color: SurviveTheIslandColor;
  treasure: number;
  tileId: number | null;
  waterSpaceId: SurviveTheIslandWaterSpace | null;
  swamThisTurn: boolean;
  rescued: boolean;
  eliminated: boolean;
}

export interface SurviveTheIslandPlayer {
  id: string;
  name: string;
  color: SurviveTheIslandColor;
  adventurerIds: string[];
  raftIds: string[];
  abilities: SurviveTheIslandAbility[];
  rescuedTreasure: number;
}

export interface SurviveTheIslandRaft {
  id: string;
  playerId: string;
  waterSpaceId: SurviveTheIslandWaterSpace | null;
}

export interface SurviveTheIslandCreature {
  id: string;
  kind: SurviveTheIslandCreatureKind;
  waterSpaceId: SurviveTheIslandWaterSpace;
}

export type SurviveTheIslandPublicPlayer = Omit<SurviveTheIslandPlayer, 'abilities'> & {
  abilityCount: number;
};

export type SurviveTheIslandAction =
  | { type: 'place-adventurer'; adventurerId: string; tileId: number }
  | { type: 'place-raft'; raftId: string; waterSpaceId: SurviveTheIslandWaterSpace }
  | {
      type: 'move-adventurer';
      adventurerId: string;
      tileId?: number;
      waterSpaceId?: SurviveTheIslandWaterSpace;
    }
  | { type: 'move-raft'; raftId: string; waterSpaceId: SurviveTheIslandWaterSpace }
  | { type: 'rescue-adventurer'; adventurerId: string }
  | { type: 'finish-action' }
  | { type: 'sink-tile'; tileId: number };

export interface SurviveTheIslandState {
  phase: SurviveTheIslandPhase;
  playerOrder: string[];
  activePlayerId: string;
  players: Record<string, SurviveTheIslandPlayer>;
  tiles: SurviveTheIslandTile[];
  adventurers: Record<string, SurviveTheIslandAdventurer>;
  rafts: Record<string, SurviveTheIslandRaft>;
  creatures: Record<string, SurviveTheIslandCreature>;
  setupRemaining: number;
  setupRaftsRemaining: number;
  movesRemaining: number;
  volcanoesRevealed: number;
  lastEvent: string;
  result: GameResult | null;
}

export interface SurviveTheIslandPlayerView {
  phase: SurviveTheIslandPhase;
  playerOrder: string[];
  activePlayerId: string;
  canAct: boolean;
  players: SurviveTheIslandPublicPlayer[];
  tiles: Array<Omit<SurviveTheIslandTile, 'back'> & { back: SurviveTheIslandBack | null }>;
  /** Treasure values remain server-only after setup. */
  adventurers: Array<Omit<SurviveTheIslandAdventurer, 'treasure'>>;
  rafts: SurviveTheIslandRaft[];
  creatures: SurviveTheIslandCreature[];
  myAbilities: SurviveTheIslandAbility[];
  movesRemaining: number;
  volcanoesRevealed: number;
  lastEvent: string;
  legalSinkTileIds: number[];
  result: GameResult | null;
}

export const SURVIVE_THE_ISLAND_ROWS = [4, 5, 8, 7, 8, 5, 4] as const;

export function surviveTheIslandAdjacentTiles(tileId: number): number[] {
  const rowByTile: Array<{ row: number; column: number }> = [];
  let next = 0;
  SURVIVE_THE_ISLAND_ROWS.forEach((count, row) => {
    for (let column = 0; column < count; column += 1) {
      if (row === 3 && column === 3) continue;
      rowByTile[next] = { row, column };
      next += 1;
    }
  });
  const origin = rowByTile[tileId];
  if (!origin) return [];
  return rowByTile.flatMap((candidate, id) => {
    if (!candidate || id === tileId) return [];
    const dr = Math.abs(candidate.row - origin.row);
    const dc = Math.abs(candidate.column - origin.column);
    return dr <= 1 && dc <= 1 && dr + dc > 0 ? [id] : [];
  });
}
