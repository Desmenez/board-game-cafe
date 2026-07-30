/**
 * Percent overlays for destination ticket fronts (route text + points on printed
 * template art). Calibrate at `/dev/ticket-to-ride-destination-card`, then paste
 * Copy JSON here.
 */

export type TtrDestinationCardLayout = {
  /** Printed card aspect (width / height). US template is 621 × 379. */
  aspectRatio: number;
  /**
   * Route text in the printed top box.
   * `left`/`top` = box center as % of card; `width` = text max-width % of card;
   * `fontSize` = font size in cqw (1 = 1% of card width).
   */
  route: { left: number; top: number; width: number; fontSize: number };
  /**
   * Points numeral at the bottom-right of the art.
   * `left`/`top` = numeral center as % of card; `fontSize` in cqw.
   */
  points: { left: number; top: number; fontSize: number };
};

/**
 * Measured against the 621x379 US template: the banner interior spans y 27-76
 * (center 13.6%) and the clock dial centers near 86.8% / 77%. The longest label
 * ("Salt Lake City - New Orleans") stays under 70% of card width at this size.
 */
export const UNITED_STATES_DESTINATION_CARD_LAYOUT: TtrDestinationCardLayout = {
  aspectRatio: 621 / 379,
  /** Center of the white top banner. */
  route: { left: 50.2, top: 13.6, width: 88, fontSize: 5 },
  /** Center of the bottom-right clock face. */
  points: { left: 86.8, top: 78, fontSize: 14 },
};
