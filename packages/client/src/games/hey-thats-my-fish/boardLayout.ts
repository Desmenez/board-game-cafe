import { HEY_THATS_MY_FISH_ROW_WIDTHS, type HeyThatsMyFishCell } from 'shared';

export type PercentPos = { left: number; top: number };

/**
 * Percent-based anchors for the ice-floe hex grid over the sea art.
 * Tune at /dev/hey-thats-my-fish-layout.
 */
export interface HeyThatsMyFishBoardLayout {
  gridOrigin: PercentPos;
  /** Distance between adjacent tile centres within one row (% of board width). */
  columnPitch: number;
  /** Distance between adjacent tile rows (% of board width). */
  rowPitch: number;
  tileWidth: number;
  penguinSize: number;
}

/** Ice-tile art is 1000×1156 (pointy-top hex). Height follows width via CSS aspect-ratio. */
export const HTMF_TILE_ASPECT = '1000 / 1156';
/** Penguin tokens are 300×400. */
export const HTMF_PENGUIN_ASPECT = '300 / 400';

export const DEFAULT_HEY_THATS_MY_FISH_LAYOUT: HeyThatsMyFishBoardLayout = {
  gridOrigin: { left: 50, top: 50 },
  columnPitch: 8.2,
  rowPitch: 12.1,
  tileWidth: 8.6,
  penguinSize: 5.2,
};

export function heyThatsMyFishCellCenter(
  layout: HeyThatsMyFishBoardLayout,
  cell: HeyThatsMyFishCell,
): PercentPos {
  return {
    left: layout.gridOrigin.left + (cell.column - (cell.rowLength - 1) / 2) * layout.columnPitch,
    top:
      layout.gridOrigin.top +
      (cell.row - (HEY_THATS_MY_FISH_ROW_WIDTHS.length - 1) / 2) * layout.rowPitch,
  };
}
