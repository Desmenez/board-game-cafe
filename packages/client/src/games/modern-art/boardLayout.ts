/** Percent overlays on `board_xivvrx` (2599×2183). Centers of the printed wells. */

export type PercentPos = { left: number; top: number };

export type ModernArtValueBoardLayout = {
  /** Artist columns left → right: Carvalho, Thaler, Melim, Martins, Silveira. */
  colLefts: readonly [number, number, number, number, number];
  /** Round rows top → bottom: 1–4. */
  rowTops: readonly [number, number, number, number];
  /** Tile well diameter as % of board width. */
  slotSize: number;
  /** Current-round highlight band (centered on the row). */
  rowBand: { left: number; width: number; height: number };
};

/**
 * Measured from the white circle outlines on the Cloudinary board art:
 * column left/right ring edges ≈ 5.1/15.1, 25.0/35.0, 44.8/54.9, 64.7/74.9, 84.8/94.6;
 * row top/bottom ring edges ≈ 22.0/33.9, 41.8/53.8, 61.7/73.8, 81.5/93.4.
 */
export const DEFAULT_VALUE_BOARD_LAYOUT: ModernArtValueBoardLayout = {
  colLefts: [10.09, 29.97, 49.85, 69.8, 89.68],
  rowTops: [27.98, 47.8, 67.71, 87.43],
  slotSize: 9.7,
  rowBand: { left: 5, width: 90, height: 13.4 },
};

export function posStyle(pos: PercentPos): { left: string; top: string } {
  return { left: `${pos.left}%`, top: `${pos.top}%` };
}
