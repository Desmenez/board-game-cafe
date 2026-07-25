import type {
  IceBrakeLevel,
  SkyTeamIceBrakesState,
  SkyTeamPlacedDie,
  SkyTeamSlotId,
  SkyTeamState,
} from 'shared';
import {
  ICE_BRAKE_LEVELS,
  ICE_BRAKE_MARKER_MAX,
  iceBrakeCopilotSlot,
  iceBrakePilotSlot,
  iceBrakesBrakeLevel,
  parseIceBrakeSlot,
  skyTeamHasModule,
} from 'shared';
import { appendLog, slotOccupied } from '../helpers.js';
import type { SkyTeamModuleDefinition } from './types.js';

export function isIceBrakeSlot(slotId: SkyTeamSlotId): boolean {
  return parseIceBrakeSlot(slotId) != null;
}

export function isNormalBrakeSlot(slotId: SkyTeamSlotId): boolean {
  return slotId === 'brake_2' || slotId === 'brake_4' || slotId === 'brake_6';
}

/** Next level that still needs a matching pair (or null if fully deployed). */
export function nextIceBrakeLevel(markerPosition: number): IceBrakeLevel | null {
  if (markerPosition < 0 || markerPosition >= ICE_BRAKE_MARKER_MAX) return null;
  return ICE_BRAKE_LEVELS[markerPosition] ?? null;
}

/**
 * Only the next unfinished column may receive dice (order 2→3→4→5).
 * Completing a pair advances immediately so the next column unlocks same round.
 */
export function canPlaceIceBrakeSlot(
  state: SkyTeamState,
  slotId: SkyTeamSlotId,
): boolean {
  if (!skyTeamHasModule(state.enabledModules, 'ice-brakes')) return false;
  const ice = state.moduleState.iceBrakes;
  if (!ice) return false;
  const parsed = parseIceBrakeSlot(slotId);
  if (!parsed) return false;
  const next = nextIceBrakeLevel(ice.markerPosition);
  return next === parsed.level;
}

/** Advance marker while the next column has both dice placed. */
export function tryAdvanceIceBrakes(state: SkyTeamState): void {
  const ice = state.moduleState.iceBrakes;
  if (!ice) return;

  while (ice.markerPosition < ICE_BRAKE_MARKER_MAX) {
    const level = nextIceBrakeLevel(ice.markerPosition);
    if (level == null) break;
    const pilotSlot = iceBrakePilotSlot(level);
    const copilotSlot = iceBrakeCopilotSlot(level);
    if (!slotOccupied(state, pilotSlot) || !slotOccupied(state, copilotSlot)) {
      break;
    }
    ice.markerPosition += 1;
    state.brakeLevel = iceBrakesBrakeLevel(ice.markerPosition);
    appendLog(
      state,
      `Ice Brakes: จับคู่ ${level} — marker → ${ice.markerPosition} (brake ${state.brakeLevel})`,
    );
  }
}

export function applyIceBrakesDiePlacement(
  state: SkyTeamState,
  placement: SkyTeamPlacedDie,
): void {
  if (!isIceBrakeSlot(placement.slotId)) return;
  if (!state.moduleState.iceBrakes) return;
  tryAdvanceIceBrakes(state);
}

export function applyIceBrakesFinalLanding(state: SkyTeamState): string | null {
  const ice = state.moduleState.iceBrakes;
  if (!ice) return null;
  if (ice.markerPosition < ICE_BRAKE_MARKER_MAX) {
    return `Ice Brakes ยังไม่ครบ (marker ${ice.markerPosition}/${ICE_BRAKE_MARKER_MAX}) — แพ้`;
  }
  return null;
}

export const iceBrakesModule: SkyTeamModuleDefinition<SkyTeamIceBrakesState> = {
  id: 'ice-brakes',
  setup: () => ({
    markerPosition: 0,
  }),
  onDiePlaced: (state, placement) => {
    applyIceBrakesDiePlacement(state, placement);
    return state;
  },
  validateFinalLanding: (state) => applyIceBrakesFinalLanding(state),
};
