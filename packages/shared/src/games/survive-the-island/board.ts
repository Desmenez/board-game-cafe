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
const neighborOffsets = [
  { row: 0, q2: -2 },
  { row: 0, q2: 2 },
  { row: -1, q2: -1 },
  { row: -1, q2: 1 },
  { row: 1, q2: -1 },
  { row: 1, q2: 1 },
] as const;

/**
 * Invisible playable sea hexes. They are generated from the island grid, so
 * every water position is an actual neighbour of at least one island tile.
 */
export const SURVIVE_THE_ISLAND_WATER_CELLS: SurviveTheIslandGridCell[] = (() => {
  const cells = new Map<string, SurviveTheIslandGridCell>();
  for (const island of SURVIVE_THE_ISLAND_ISLAND_CELLS) {
    for (const offset of neighborOffsets) {
      const row = island.row + offset.row;
      const q2 = island.q2 + offset.q2;
      const coordinate = `${row}:${q2}`;
      if (row < -1 || row > 7 || q2 < -12 || q2 > 12 || islandCoordinates.has(coordinate)) continue;
      cells.set(`water:${coordinate}`, { id: `water:${coordinate}`, row, q2 });
    }
  }
  return [...cells.values()];
})();

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

/** The four outside water hexes connected to the printed Rescue Islands. */
export const SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES = [
  'water:1:-8',
  'water:1:8',
  'water:5:-8',
  'water:5:8',
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
