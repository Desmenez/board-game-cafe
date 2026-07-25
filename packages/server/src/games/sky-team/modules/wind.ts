import type { SkyTeamState, SkyTeamWindState } from 'shared';
import {
  WIND_MAX_POSITION,
  WIND_MIN_POSITION,
  WIND_RING_SIZE,
  WIND_RING_VALUES,
  skyTeamWindModifier,
  skyTeamWindWrapPosition,
} from 'shared';
import { appendLog } from '../helpers.js';
import type { SkyTeamModuleDefinition } from './types.js';

export {
  WIND_MAX_POSITION,
  WIND_MIN_POSITION,
  WIND_RING_SIZE,
  WIND_RING_VALUES,
  skyTeamWindModifier as windModifierForPosition,
  skyTeamWindWrapPosition as clampWindPosition,
};

export const WIND_CENTER_POSITION = 0;

/**
 * After Axis resolves: rotate by |axisPosition| toward Pilot (−) or Co-Pilot (+).
 * Runs every Axis resolution even if the Axis did not move this round.
 * The ring is a full circle — position wraps 0…19.
 */
export function applyWindAfterAxis(state: SkyTeamState): void {
  const wind = state.moduleState.wind;
  if (!wind) return;

  const steps = Math.abs(state.axisPosition);
  if (steps === 0) {
    wind.position = skyTeamWindWrapPosition(wind.position);
    wind.modifier = skyTeamWindModifier(wind.position);
    appendLog(state, `Wind: Axis ตรงกลาง — ไม่หมุน (modifier ${formatMod(wind.modifier)})`);
    return;
  }

  // Positive axis = toward Pilot → turn left / CCW (−);
  // Negative axis = toward Co-Pilot → turn right / CW (+).
  const delta = state.axisPosition > 0 ? -steps : steps;
  wind.position = skyTeamWindWrapPosition(wind.position + delta);
  wind.modifier = skyTeamWindModifier(wind.position);

  appendLog(
    state,
    `Wind: หมุน ${steps} ช่องไปทาง${state.axisPosition > 0 ? 'Pilot (ซ้าย)' : 'Co-Pilot (ขวา)'} → ${formatMod(wind.modifier)}`,
  );
}

function formatMod(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function applyWindEngineModifier(state: SkyTeamState, engineTotal: number): number {
  const wind = state.moduleState.wind;
  if (!wind) return engineTotal;
  const next = engineTotal + wind.modifier;
  appendLog(
    state,
    `Wind: Engine ${engineTotal} ${formatMod(wind.modifier)} = ${next}`,
  );
  return next;
}

export const windModule: SkyTeamModuleDefinition<SkyTeamWindState> = {
  id: 'wind',
  setup: () => ({
    position: WIND_CENTER_POSITION,
    modifier: skyTeamWindModifier(WIND_CENTER_POSITION),
  }),
  afterAxisResolved: (state) => {
    applyWindAfterAxis(state);
    return state;
  },
  modifyEngineTotal: (state, engineTotal) => applyWindEngineModifier(state, engineTotal),
};
