/**
 * Layout for the Wind ring panel (sibling column to the RIGHT of the main board,
 * top-aligned like Kerosene on the left). Percentages here are of the wind ring box.
 * Strip size / offset: /dev/sky-team-layout Modules assembly lab.
 */
export type SkyTeamWindLayout = {
  /** Airplane token width % of the wind ring box. */
  planeSize: number;
  /** Degrees per wind position step (clockwise positive = Co-Pilot). */
  stepDegrees: number;
  /** Extra rotation so nose points at center-0 when position is 0. */
  baseRotation: number;
};

/** Native winds board art size. */
export const WIND_BOARD_ART = { width: 556, height: 552 } as const;

/** Degrees per ring space (20 spaces around the dial). */
export const WIND_STEP_DEGREES_DEFAULT = 360 / 20;

/** Tuned in layout lab — paste over after Copy JSON. */
export const DEFAULT_WIND_LAYOUT: SkyTeamWindLayout = {
  planeSize: 58,
  stepDegrees: WIND_STEP_DEGREES_DEFAULT,
  baseRotation: -180,
};
