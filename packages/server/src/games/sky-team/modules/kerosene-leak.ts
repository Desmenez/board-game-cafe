import type { SkyTeamKeroseneLeakState, SkyTeamPlacedDie, SkyTeamState } from 'shared';
import { appendLog, lose, slotOccupied } from '../helpers.js';
import type { SkyTeamModuleDefinition } from './types.js';
import { KEROSENE_START } from './kerosene.js';

function spendLeak(state: SkyTeamState, amount: number, reason: string): void {
  const leak = state.moduleState.keroseneLeak;
  if (!leak) return;
  leak.remaining -= amount;
  appendLog(state, `Kerosene Leak: ${reason} (−${amount}) → ${leak.remaining}`);
  if (leak.remaining < 0) {
    lose(state, 'kerosene_empty', 'Kerosene หมด (Leak) — แพ้');
  }
}

/**
 * When both Engine dice are placed, lose |diff| + 1 fuel.
 */
export function applyKeroseneLeakOnEngines(
  state: SkyTeamState,
  placement: SkyTeamPlacedDie,
): void {
  if (placement.slotId !== 'engine_pilot' && placement.slotId !== 'engine_copilot') {
    return;
  }
  const leak = state.moduleState.keroseneLeak;
  if (!leak) return;
  if (leak.spentThisRound) return;
  if (!slotOccupied(state, 'engine_pilot') || !slotOccupied(state, 'engine_copilot')) {
    return;
  }

  const pilot = state.placedDice.find((p) => p.slotId === 'engine_pilot');
  const copilot = state.placedDice.find((p) => p.slotId === 'engine_copilot');
  if (!pilot || !copilot) return;

  const amount = Math.abs(pilot.value - copilot.value) + 1;
  leak.spentThisRound = true;
  spendLeak(state, amount, `|${pilot.value}−${copilot.value}|+1`);
}

export function applyKeroseneLeakRoundReset(state: SkyTeamState): void {
  const leak = state.moduleState.keroseneLeak;
  if (!leak) return;
  leak.spentThisRound = false;
}

export const keroseneLeakModule: SkyTeamModuleDefinition<SkyTeamKeroseneLeakState> = {
  id: 'kerosene-leak',
  setup: () => ({
    remaining: KEROSENE_START,
    spentThisRound: false,
  }),
  onDiePlaced: (state, placement) => {
    applyKeroseneLeakOnEngines(state, placement);
    return state;
  },
  onEndRound: (state) => {
    applyKeroseneLeakRoundReset(state);
    return state;
  },
};
