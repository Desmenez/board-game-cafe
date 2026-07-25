/**
 * Relative sizes / offsets for the Sky Team module assembly
 * (kerosene left · main board · wind right · intern below · ice brakes overlay).
 * Tune via /dev/sky-team-layout Modules assembly lab.
 */
export type SkyTeamModulesAssemblyLayout = {
  /** Flex gap between kerosene / board stack / wind (rem). */
  rowGapRem: number;
  /** Main control panel max width (px). */
  boardMaxWidthPx: number;
  /** Kerosene (or leak) strip width (rem). */
  keroseneWidthRem: number;
  /** Vertical nudge of kerosene vs board top (px; + = down). */
  keroseneOffsetYPx: number;
  /** Wind ring width (rem) — sibling column to the RIGHT of the main board. */
  windWidthRem: number;
  /** Vertical nudge of wind vs board top (px; + = down). Top-aligned by default. */
  windOffsetYPx: number;
  /** Gap between main board and Intern strip (rem). */
  internGapRem: number;
  /** Intern width as % of the board stack column. */
  internWidthPercent: number;
};

/** Tuned in layout lab — paste over after Copy JSON. */
export const DEFAULT_MODULES_ASSEMBLY_LAYOUT: SkyTeamModulesAssemblyLayout = {
  rowGapRem: 0.5,
  boardMaxWidthPx: 820,
  keroseneWidthRem: 8.8,
  keroseneOffsetYPx: 0,
  windWidthRem: 18.6,
  windOffsetYPx: 0,
  internGapRem: 0.5,
  internWidthPercent: 100,
};
