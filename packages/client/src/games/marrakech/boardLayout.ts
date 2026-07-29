import {
  MARRAKECH_BOARD_SIZE,
  colOf,
  rowOf,
  type MarrakechCell,
  type MarrakechRugCells,
} from 'shared';

export type PercentPos = { left: number; top: number };

export type MarrakechBoardLayout = {
  /** Center of cell (0,0) as % of board box. */
  gridOrigin: PercentPos;
  /** Distance between adjacent cell centers, as % of board width. */
  cellPitch: number;
  /** Visual size of one cell as % of board width. */
  cellSize: number;
  /** Assam token size as % of board width. */
  assamSize: number;
};

/**
 * Calibrated in /dev/marrakech-layout against board_tfalqb art.
 * Board is 1000×1000 with a decorative mosaic border around a 7×7 grid.
 */
export const DEFAULT_MARRAKECH_LAYOUT: MarrakechBoardLayout = {
  gridOrigin: { left: 19.4, top: 19.6 },
  cellPitch: 10.2,
  cellSize: 9.6,
  assamSize: 8,
};

export function cellCenter(layout: MarrakechBoardLayout, cell: MarrakechCell): PercentPos {
  const r = rowOf(cell);
  const c = colOf(cell);
  return {
    left: layout.gridOrigin.left + c * layout.cellPitch,
    top: layout.gridOrigin.top + r * layout.cellPitch,
  };
}

export function posStyle(pos: PercentPos): { left: string; top: string } {
  return { left: `${pos.left}%`, top: `${pos.top}%` };
}

/** Bounding box for a 2-cell rug (horizontal or vertical). */
export function rugBox(
  layout: MarrakechBoardLayout,
  cells: MarrakechRugCells,
): { left: number; top: number; width: number; height: number; horizontal: boolean } {
  const a = cellCenter(layout, cells[0]);
  const b = cellCenter(layout, cells[1]);
  const horizontal = Math.abs(a.top - b.top) < 0.01;
  const half = layout.cellSize / 2;
  if (horizontal) {
    const left = Math.min(a.left, b.left) - half;
    const top = a.top - half;
    return {
      left,
      top,
      width: layout.cellPitch + layout.cellSize,
      height: layout.cellSize,
      horizontal: true,
    };
  }
  const left = a.left - half;
  const top = Math.min(a.top, b.top) - half;
  return {
    left,
    top,
    width: layout.cellSize,
    height: layout.cellPitch + layout.cellSize,
    horizontal: false,
  };
}

export function allCells(): MarrakechCell[] {
  return Array.from({ length: MARRAKECH_BOARD_SIZE * MARRAKECH_BOARD_SIZE }, (_, i) => i);
}
