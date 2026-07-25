import type { PercentPos } from './boardLayout';

/**
 * Layout for the Intern board strip (percent of the intern board box).
 * Tune via /dev/sky-team-layout Intern lab.
 */
export type SkyTeamInternLayout = {
  pilotDieSlot: PercentPos;
  copilotDieSlot: PercentPos;
  /** Die hit-target width % of intern board. */
  dieSlotSize: number;
  /** Centers for the 6 token wells, left → right. */
  tokenSlots: PercentPos[];
  /** Token width % of intern board. */
  tokenWidth: number;
};

/** Native intern board art size (for aspect ratio). */
export const INTERN_BOARD_ART = { width: 1282, height: 190 } as const;

/** Tuned in layout lab — paste over after Copy JSON. */
export const DEFAULT_INTERN_LAYOUT: SkyTeamInternLayout = {
  pilotDieSlot: {
    left: 7.5,
    top: 50,
  },
  copilotDieSlot: {
    left: 92.5,
    top: 50,
  },
  dieSlotSize: 8.5,
  tokenSlots: [
    { left: 19.5, top: 50 },
    { left: 32, top: 50 },
    { left: 44, top: 50 },
    { left: 56, top: 50 },
    { left: 68, top: 50 },
    { left: 80.5, top: 50 },
  ],
  tokenWidth: 5.5,
};
