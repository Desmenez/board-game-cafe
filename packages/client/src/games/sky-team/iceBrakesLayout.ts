import type { PercentPos } from './boardLayout';
import type { IceBrakeLevel } from 'shared';
import { ICE_BRAKE_LEVELS } from 'shared';

/**
 * Layout for the Ice Brakes overlay (percent of the ice-brakes board box,
 * except `overlay` which is percent of the main control panel).
 * Tune via /dev/sky-team-layout Ice Brakes lab.
 */
export type SkyTeamIceBrakesLayout = {
  /** Overlay box on the main board (% of main board). */
  overlay: { left: number; top: number; width: number };
  /** Die slots for levels 2–5 (pilot = blue / top row). */
  pilotSlots: Record<IceBrakeLevel, PercentPos>;
  /** Die slots for levels 2–5 (copilot = orange / bottom row). */
  copilotSlots: Record<IceBrakeLevel, PercentPos>;
  /**
   * Marker centers for positions 0..4
   * (0 = left of 2, 4 = past 5).
   */
  markerTrack: [PercentPos, PercentPos, PercentPos, PercentPos, PercentPos];
  /** Die hit-target width % of ice-brakes board. */
  dieSlotSize: number;
  /** Marker width % of ice-brakes board. */
  markerWidth: number;
};

/** Native ice-brakes board art size (for aspect ratio). */
export const ICE_BRAKES_BOARD_ART = { width: 804, height: 466 } as const;

/** Tuned in layout lab — paste over after Copy JSON. */
export const DEFAULT_ICE_BRAKES_LAYOUT: SkyTeamIceBrakesLayout = {
  overlay: {
    left: 50,
    top: 72.5,
    width: 66,
  },
  pilotSlots: {
    2: { left: 14.5, top: 20.5 },
    3: { left: 38, top: 20.5 },
    4: { left: 62, top: 20.5 },
    5: { left: 85.5, top: 20.5 },
  },
  copilotSlots: {
    2: { left: 14.5, top: 79 },
    3: { left: 38, top: 79 },
    4: { left: 62, top: 79 },
    5: { left: 86, top: 79 },
  },
  markerTrack: [
    { left: 8, top: 50 },
    { left: 22, top: 50 },
    { left: 46, top: 50 },
    { left: 70, top: 50 },
    { left: 93.5, top: 50 },
  ],
  dieSlotSize: 16,
  markerWidth: 10,
};

export const ICE_BRAKE_LEVEL_LIST = [...ICE_BRAKE_LEVELS];
