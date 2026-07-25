import type { PercentPos } from './boardLayout';

/**
 * Layout for the Kerosene track strip (percent of the kerosene board box).
 * Tune by hand or via /dev/sky-team-layout Kerosene lab.
 */
export type SkyTeamKeroseneLayout = {
  /** Die well center on the printed square at the top. */
  dieSlot: PercentPos;
  /** Die hit-target width % of kerosene board. */
  dieSlotSize: number;
  /** Horizontal center of the fuel marker. */
  markerLeft: number;
  /** Marker width % of kerosene board. */
  markerWidth: number;
  /**
   * Vertical center `top%` for fuel levels 20 (top of scale) … 0 (above red X).
   * Remaining < 0 uses `failMarkerTop` (red ✕), not this map.
   */
  markerTopByLevel: Record<number, number>;
  /** Red ✕ / empty tank visual when remaining < 0. */
  failMarkerTop: number;
  /** Leak-module X token over the blocked die slot. */
  leakMarker: PercentPos;
  leakMarkerWidth: number;
};

/** Native kerosene board art size (for aspect ratio). */
export const KEROSENE_BOARD_ART = { width: 236, height: 1274 } as const;

/** Tuned in layout lab — paste over after Copy JSON. */
export const DEFAULT_KEROSENE_LAYOUT: SkyTeamKeroseneLayout = {
  dieSlot: {
    left: 51,
    top: 8.7,
  },
  dieSlotSize: 42,
  markerLeft: 60,
  markerWidth: 28,
  markerTopByLevel: {
    0: 88.5,
    1: 85,
    2: 81.5,
    3: 78.1,
    4: 74.7,
    5: 71.3,
    6: 67.8,
    7: 64.5,
    8: 61,
    9: 57.5,
    10: 54,
    11: 50.5,
    12: 47.5,
    13: 44,
    14: 40.5,
    15: 37,
    16: 33.5,
    17: 30,
    18: 26.5,
    19: 23.5,
    20: 20,
  },
  /** Below 0 → red ✕ space (loss). */
  failMarkerTop: 91.5,
  leakMarker: { left: 50, top: 8.7 },
  leakMarkerWidth: 24.5,
};

export function markerTopForRemaining(
  layout: SkyTeamKeroseneLayout,
  remaining: number,
): number {
  if (remaining < 0) return layout.failMarkerTop;
  const clamped = Math.max(0, Math.min(20, Math.round(remaining)));
  return layout.markerTopByLevel[clamped] ?? layout.markerTopByLevel[0]!;
}
