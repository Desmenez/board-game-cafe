import type { SkyTeamState, SkyTeamTurnsState } from 'shared';
import { appendLog, lose, scenarioFromState } from '../helpers.js';
import type { SkyTeamModuleDefinition } from './types.js';

/**
 * Validate axis against Turn constraints for spaces entered during advance.
 * Advance 0 → empty list (no check). Advance 1/2 → destination / path spaces.
 */
export function validateTurnConstraints(state: SkyTeamState, traversedPositions: number[]): void {
  if (!state.moduleState.turns) return;
  if (traversedPositions.length === 0) return;

  const scenario = scenarioFromState(state);
  for (const index of traversedPositions) {
    const spaceDef = scenario.spaces.find((s) => s.index === index);
    const allowed = spaceDef?.allowedAxisPositions;
    if (!allowed || allowed.length === 0) continue;
    if (!allowed.includes(state.axisPosition)) {
      lose(state, 'turn_constraint', 'Invalid aircraft axis while passing a turn constraint.');
      appendLog(
        state,
        `Turns: Axis ${state.axisPosition} ไม่ผ่านเงื่อนไขช่อง ${index} (อนุญาต: ${allowed.join(', ')})`,
      );
      return;
    }
  }
}

export const turnsModule: SkyTeamModuleDefinition<SkyTeamTurnsState> = {
  id: 'turns',
  setup: () => ({ enabled: true }),
  afterApproachAdvance: (state, traversedPositions) => {
    validateTurnConstraints(state, traversedPositions);
    return state;
  },
};
