import type { SkyTeamSlotId, SkyTeamSwitchState } from 'shared';

export type PercentPos = { left: number; top: number };

export type SkyTeamSwitchKey = keyof SkyTeamSwitchState;

/** Die placement hit targets — percentages of board box, centered. */
export const DEFAULT_SLOT_LAYOUT: Record<SkyTeamSlotId, PercentPos> = {
  axis_pilot: { left: 24, top: 19 },
  axis_copilot: { left: 76, top: 19 },
  engine_pilot: { left: 34.5, top: 54.5 },
  engine_copilot: { left: 65.5, top: 54.5 },
  radio_pilot: { left: 8.4, top: 17.2 },
  radio_copilot_1: { left: 91.9, top: 6.5 },
  radio_copilot_2: { left: 91.9, top: 17.2 },
  gear_12: { left: 8.5, top: 39.9 },
  gear_34: { left: 8.5, top: 55.8 },
  gear_56: { left: 8.5, top: 71.8 },
  flaps_12: { left: 92, top: 39.9 },
  flaps_23: { left: 92, top: 55.8 },
  flaps_34: { left: 92, top: 71.8 },
  flaps_45: { left: 92, top: 87.8 },
  brake_2: { left: 35, top: 75.6 },
  brake_4: { left: 50.3, top: 75.6 },
  brake_6: { left: 65.5, top: 75.6 },
  concentration_1: { left: 35, top: 93.3 },
  concentration_2: { left: 50.3, top: 93.3 },
  concentration_3: { left: 65.5, top: 93.3 },
};

/**
 * Curved aerodynamics track — mark sits between N and N+1 when state = N.
 * Keys = gauge value (blue starts ~4, orange ~8).
 */
export const DEFAULT_AERO_TRACK: Record<number, PercentPos> = {
  2: { left: 23, top: 34 },
  3: { left: 26, top: 39.5 },
  4: { left: 32, top: 44 },
  5: { left: 38.5, top: 47 },
  6: { left: 46, top: 48.5 },
  7: { left: 54.5, top: 48.5 },
  8: { left: 62.5, top: 47 },
  9: { left: 69, top: 44 },
  10: { left: 74, top: 39.5 },
  11: { left: 77.5, top: 34 },
  12: { left: 78.5, top: 28.5 },
};

/**
 * Brake arc — red mark.
 * 0 = left of 2 (setup), then after deploying brakes 2 / 4 / 6.
 */
export const DEFAULT_BRAKE_TRACK: Record<number, PercentPos> = {
  0: { left: 32, top: 63.5 },
  2: { left: 39, top: 67 },
  3: { left: 47, top: 68 },
  4: { left: 55, top: 68 },
  5: { left: 62.5, top: 66 },
  6: { left: 69, top: 63.5 },
};

export type AxisLayout = {
  left: number;
  top: number;
  width: number;
  /**
   * Extra degrees so the plane looks level on the printed dial when
   * game axisPosition === 0 (art / crop correction). Tuned in layout lab.
   */
  baseRotation: number;
  /**
   * Degrees per axis step. At |position| === AXIS_SPIN_THRESHOLD (3)
   * the plane should sit on the red ✕. Tuned in layout lab.
   */
  stepDegrees: number;
};

/** Top-left box as % of board — Approach / Altitude card wells.
 * Height is derived from width via SKY_TEAM_TRACK_CARD aspect (340×188).
 */
export type PercentBox = {
  left: number;
  top: number;
  width: number;
  /** Ignored when rendering bays — kept for lab JSON / legacy. */
  height?: number;
};

/** Printed track cards (Approach / Altitude) native pixel size. */
export const SKY_TEAM_TRACK_CARD = { width: 340, height: 188 } as const;

export const DEFAULT_AXIS_LAYOUT: AxisLayout = {
  left: 50.1,
  top: 28,
  width: 28,
  baseRotation: 0,
  // 18° landed on the 3rd white tick; ~24° reaches the red ✕ at ±3
  stepDegrees: 27,
};

/** Printed card wells at top of control panel (left = Approach, right = Altitude). */
export const DEFAULT_APPROACH_BAY: PercentBox = {
  left: 17.3,
  top: 1.5,
  width: 28,
};

export const DEFAULT_ALTITUDE_BAY: PercentBox = {
  left: 54.8,
  top: 1.5,
  width: 28,
};

/**
 * Token parking wells (not die slots).
 * Rough starting % — tune in /dev/sky-team-layout.
 */
export type SkyTeamSwitchPos = {
  /** Right side of the well — idle / not deployed. */
  off: PercentPos;
  /** Left side of the well — deployed / ON (rules: slide right → left). */
  on: PercentPos;
};

export type SkyTeamTokenAnchors = {
  /** Coffee ±1 wells — index 0..2 filled when coffeeTokens > index. */
  coffee: [PercentPos, PercentPos, PercentPos];
  /** Reroll token well — shown when rerollTokens > 0. */
  reroll: PercentPos;
  /** Gear / flaps / brake slider markers. */
  switches: Record<SkyTeamSwitchKey, SkyTeamSwitchPos>;
};

export const DEFAULT_TOKEN_ANCHORS: SkyTeamTokenAnchors = {
  // Cup ±1 wells (bottom-left triangle)
  coffee: [
    { left: 12, top: 87.7 },
    { left: 12, top: 94.5 },
    { left: 22.3, top: 94.5 },
  ],
  // Reroll U-well (top-left)
  reroll: { left: 9, top: 7.5 },
  // Slider wells — OFF right → ON left (tuned in /dev/sky-team-layout)
  switches: {
    gear12: {
      off: { left: 11.2, top: 47.4 },
      on: { left: 5.5, top: 47.4 },
    },
    gear34: {
      off: { left: 11.2, top: 63.3 },
      on: { left: 5.5, top: 63.3 },
    },
    gear56: {
      off: { left: 11.2, top: 79.3 },
      on: { left: 5.5, top: 79.3 },
    },
    flaps12: {
      off: { left: 94.8, top: 47.4 },
      on: { left: 88.7, top: 47.4 },
    },
    flaps23: {
      off: { left: 94.8, top: 63.3 },
      on: { left: 88.7, top: 63.3 },
    },
    flaps34: {
      off: { left: 94.8, top: 79.3 },
      on: { left: 88.7, top: 79.3 },
    },
    flaps45: {
      off: { left: 94.8, top: 95.3 },
      on: { left: 88.7, top: 95.3 },
    },
    brake2: {
      off: { left: 38.3, top: 83.2 },
      on: { left: 32.2, top: 83.2 },
    },
    brake4: {
      off: { left: 53.5, top: 83.2 },
      on: { left: 47.5, top: 83.2 },
    },
    brake6: {
      off: { left: 68.3, top: 83.2 },
      on: { left: 62.7, top: 83.2 },
    },
  },
};

export const ALL_SWITCH_KEYS = Object.keys(
  DEFAULT_TOKEN_ANCHORS.switches,
) as SkyTeamSwitchKey[];

export type SkyTeamBoardLayout = {
  slots: Record<SkyTeamSlotId, PercentPos>;
  aeroTrack: Record<number, PercentPos>;
  brakeTrack: Record<number, PercentPos>;
  axis: AxisLayout;
  tokens: SkyTeamTokenAnchors;
  approachBay: PercentBox;
  altitudeBay: PercentBox;
  slotSize: number;
  markSize: number;
  /** Coffee token width % of board. */
  tokenSize: number;
  /** Reroll token width % of board (larger well). */
  rerollTokenSize: number;
  /** Plane-switch marker width % of board. */
  switchSize: number;
};

export const DEFAULT_BOARD_LAYOUT: SkyTeamBoardLayout = {
  slots: DEFAULT_SLOT_LAYOUT,
  aeroTrack: DEFAULT_AERO_TRACK,
  brakeTrack: DEFAULT_BRAKE_TRACK,
  axis: DEFAULT_AXIS_LAYOUT,
  tokens: DEFAULT_TOKEN_ANCHORS,
  approachBay: DEFAULT_APPROACH_BAY,
  altitudeBay: DEFAULT_ALTITUDE_BAY,
  slotSize: 9.5,
  markSize: 3.2,
  tokenSize: 5.5,
  rerollTokenSize: 8.5,
  switchSize: 6.5,
};

export function posStyle(pos: PercentPos): { left: string; top: string } {
  return { left: `${pos.left}%`, top: `${pos.top}%` };
}

/** Clamp aero value onto nearest defined track key. */
export function aeroTrackPos(
  track: Record<number, PercentPos>,
  value: number,
): PercentPos {
  const keys = Object.keys(track)
    .map(Number)
    .sort((a, b) => a - b);
  if (keys.length === 0) return { left: 50, top: 50 };
  let best = keys[0]!;
  for (const k of keys) {
    if (Math.abs(k - value) < Math.abs(best - value)) best = k;
  }
  return track[best] ?? { left: 50, top: 50 };
}

export function brakeTrackPos(
  track: Record<number, PercentPos>,
  level: number,
): PercentPos {
  if (track[level]) return track[level]!;
  return aeroTrackPos(track, level);
}

export const ALL_SLOT_IDS = Object.keys(DEFAULT_SLOT_LAYOUT) as SkyTeamSlotId[];
