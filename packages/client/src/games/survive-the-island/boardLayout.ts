export type PercentPos = { left: number; top: number };

/**
 * Percent-based anchors for the fixed sea board art. Tune these at
 * /dev/survive-the-island-layout after the final board crop is uploaded.
 */
export interface SurviveTheIslandBoardLayout {
  gridOrigin: PercentPos;
  /** Distance between adjacent tile centres within one row (% of board width). */
  columnPitch: number;
  /** Distance between adjacent tile rows (% of board width). */
  rowPitch: number;
  tileWidth: number;
  adventurerSize: number;
  raftSize: number;
  creatureSize: number;
}

/**
 * Departure Island rows, north to south. The middle row has seven board slots,
 * with the centre reserved for the starting Sea Serpent, leaving six land tiles.
 */
export const SURVIVE_THE_ISLAND_TILE_ROWS: ReadonlyArray<{
  slots: number;
  emptyColumns: readonly number[];
}> = [
  { slots: 4, emptyColumns: [] },
  { slots: 5, emptyColumns: [] },
  { slots: 8, emptyColumns: [] },
  { slots: 7, emptyColumns: [3] },
  { slots: 8, emptyColumns: [] },
  { slots: 5, emptyColumns: [] },
  { slots: 4, emptyColumns: [] },
];

export type SurviveTheIslandCell = {
  id: number;
  row: number;
  column: number;
  rowLength: number;
};

export const SURVIVE_THE_ISLAND_CELLS: SurviveTheIslandCell[] =
  SURVIVE_THE_ISLAND_TILE_ROWS.flatMap((rowDef, row) =>
    Array.from({ length: rowDef.slots }, (_, column) => column)
      .filter((column) => !rowDef.emptyColumns.includes(column))
      .map((column) => ({
        id:
          SURVIVE_THE_ISLAND_TILE_ROWS.slice(0, row).reduce(
            (total, priorRow) => total + priorRow.slots - priorRow.emptyColumns.length,
            0,
          ) +
          column -
          rowDef.emptyColumns.filter((emptyColumn) => emptyColumn < column).length,
        row,
        column,
        rowLength: rowDef.slots,
      })),
  );

export const DEFAULT_SURVIVE_THE_ISLAND_LAYOUT: SurviveTheIslandBoardLayout = {
  gridOrigin: { left: 49.9, top: 50 },
  columnPitch: 8.2,
  rowPitch: 7.1,
  tileWidth: 8.1,
  adventurerSize: 4.8,
  raftSize: 7.2,
  creatureSize: 8.6,
};

export function surviveTheIslandCellCenter(
  layout: SurviveTheIslandBoardLayout,
  cell: SurviveTheIslandCell,
): PercentPos {
  return {
    left: layout.gridOrigin.left + (cell.column - (cell.rowLength - 1) / 2) * layout.columnPitch,
    top:
      layout.gridOrigin.top +
      (cell.row - (SURVIVE_THE_ISLAND_TILE_ROWS.length - 1) / 2) * layout.rowPitch,
  };
}
