export type PercentPos = { left: number; top: number };
export type PercentBox = PercentPos & { width: number; height: number };

/**
 * Percent-based anchors for the Wavelength device (dial, card slot, score track).
 * Tune at /dev/wavelength-layout.
 */
export interface WavelengthBoardLayout {
  dialOrigin: PercentPos;
  /** Radius of the continuum wheel (% of board width). */
  dialRadius: number;
  /** Needle length (% of board width). */
  needleSize: number;
  cardSlot: PercentBox;
  scoreTrack: PercentBox;
}

export const DEFAULT_WAVELENGTH_LAYOUT: WavelengthBoardLayout = {
  dialOrigin: { left: 50, top: 51 },
  dialRadius: 30,
  needleSize: 23.5,
  cardSlot: { left: 50, top: 9, width: 50, height: 13 },
  scoreTrack: { left: 50, top: 93.5, width: 78, height: 15 },
};
