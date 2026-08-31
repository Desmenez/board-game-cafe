import type { SurviveTheIslandWaterSpace } from './types.js';

export type SurviveTheIslandGridCell = {
  id: string;
  /** Horizontal coordinate in half-column units. */
  q2: number;
  row: number;
};

const rows = [4, 5, 8, 7, 8, 5, 4] as const;
const skippedIslandCoordinate = '3:0';

export const SURVIVE_THE_ISLAND_ISLAND_CELLS: SurviveTheIslandGridCell[] = rows.flatMap(
  (count, row) =>
    Array.from({ length: count }, (_, column) => ({
      id: `island:${row}:${2 * column - (count - 1)}`,
      row,
      q2: 2 * column - (count - 1),
    })).filter((cell) => `${cell.row}:${cell.q2}` !== skippedIslandCoordinate),
);

const islandCoordinates = new Set(
  SURVIVE_THE_ISLAND_ISLAND_CELLS.map((cell) => `${cell.row}:${cell.q2}`),
);

/**
 * Every printed sea row, north to south: 7 / 10 / 11 above the island;
 * 10 / 11 / 10 / 11 / 10 / 11 / 10 alongside it; then 11 / 10 / 7 below.
 * Island cells (including the missing centre slot) are subtracted below.
 */
const seaRowWidths = [7, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 7] as const;
const firstSeaRow = -3;
const neighborOffsets = [
  { row: 0, q2: -2 },
  { row: 0, q2: 2 },
  { row: -1, q2: -1 },
  { row: -1, q2: 1 },
  { row: 1, q2: -1 },
  { row: 1, q2: 1 },
] as const;

/** All invisible, playable sea hexes printed on the board. */
export const SURVIVE_THE_ISLAND_WATER_CELLS: SurviveTheIslandGridCell[] = seaRowWidths.flatMap(
  (width, rowOffset) => {
    const row = firstSeaRow + rowOffset;
    return Array.from({ length: width }, (_, column) => {
      const q2 = 2 * column - (width - 1);
      return { id: `water:${row}:${q2}`, row, q2 };
    }).filter((cell) => !islandCoordinates.has(`${cell.row}:${cell.q2}`));
  },
);

const waterSpaceIds = new Set(SURVIVE_THE_ISLAND_WATER_CELLS.map((cell) => cell.id));

export function surviveTheIslandWaterSpaceForTile(tileId: number): SurviveTheIslandWaterSpace {
  return `water:tile:${tileId}`;
}

export function surviveTheIslandTileIdForWaterSpace(value: string): number | null {
  const match = /^water:tile:(\d+)$/.exec(value);
  const tileId = match?.[1] == null ? NaN : Number(match[1]);
  return Number.isInteger(tileId) && SURVIVE_THE_ISLAND_ISLAND_CELLS[tileId] ? tileId : null;
}

export function surviveTheIslandWaterCellForSpace(
  waterSpaceId: string,
): SurviveTheIslandGridCell | null {
  const staticWater = SURVIVE_THE_ISLAND_WATER_CELLS.find((cell) => cell.id === waterSpaceId);
  if (staticWater) return staticWater;
  const tileId = surviveTheIslandTileIdForWaterSpace(waterSpaceId);
  return tileId == null ? null : SURVIVE_THE_ISLAND_ISLAND_CELLS[tileId] ?? null;
}

/**
 * Rescue Island water spaces in the 13-row sea grid (one-based rows):
 * row 2 left/right, row 3 left, row 11 right, and row 12 left.
 */
export const SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES = [
  'water:-2:-9',
  'water:-2:9',
  'water:-1:-10',
  'water:7:10',
  'water:8:-9',
] as const satisfies readonly SurviveTheIslandWaterSpace[];

/** The centre serpent plus the four printed sea-serpent markers. */
export const SURVIVE_THE_ISLAND_SEA_SERPENT_STARTING_WATER_SPACES = [
  'water:3:0',
  'water:-2:-9',
  'water:-1:10',
  'water:7:-10',
  'water:8:9',
] as const satisfies readonly SurviveTheIslandWaterSpace[];

export function isSurviveTheIslandWaterSpace(value: string): value is SurviveTheIslandWaterSpace {
  return waterSpaceIds.has(value);
}

/** Water hexes directly bordering an island tile. */
export function surviveTheIslandWaterNeighboursForTile(
  tileId: number,
  availableWaterSpaces: readonly SurviveTheIslandWaterSpace[] = SURVIVE_THE_ISLAND_WATER_CELLS.map(
    (cell) => cell.id,
  ),
): SurviveTheIslandWaterSpace[] {
  const island = SURVIVE_THE_ISLAND_ISLAND_CELLS[tileId];
  if (!island) return [];
  const available = new Set(availableWaterSpaces);
  return availableWaterSpaces.filter((waterSpaceId) => {
    const water = surviveTheIslandWaterCellForSpace(waterSpaceId);
    return Boolean(
      water &&
        neighborOffsets.some(
          (offset) =>
            water.row === island.row + offset.row && water.q2 === island.q2 + offset.q2,
        ),
    );
  });
}

export function surviveTheIslandAdjacentWaterSpaces(
  waterSpaceId: SurviveTheIslandWaterSpace,
  availableWaterSpaces: readonly SurviveTheIslandWaterSpace[] = SURVIVE_THE_ISLAND_WATER_CELLS.map(
    (cell) => cell.id,
  ),
): SurviveTheIslandWaterSpace[] {
  const water = surviveTheIslandWaterCellForSpace(waterSpaceId);
  if (!water) return [];
  return availableWaterSpaces.filter((candidateId) => {
    const candidate = surviveTheIslandWaterCellForSpace(candidateId);
    return Boolean(
      candidate &&
        neighborOffsets.some(
          (offset) =>
            candidate.row === water.row + offset.row && candidate.q2 === water.q2 + offset.q2,
        ),
    );
  });
}

export function surviveTheIslandAdjacentIslandTiles(tileId: number): number[] {
  const island = SURVIVE_THE_ISLAND_ISLAND_CELLS[tileId];
  if (!island) return [];
  return SURVIVE_THE_ISLAND_ISLAND_CELLS.flatMap((candidate, candidateId) =>
    neighborOffsets.some(
      (offset) =>
        candidate.row === island.row + offset.row && candidate.q2 === island.q2 + offset.q2,
    )
      ? [candidateId]
      : [],
  );
}
