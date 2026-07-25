import type { SkyTeamKeroseneState, SkyTeamPlacedDie, SkyTeamState } from 'shared';
import { appendLog, lose } from '../helpers.js';
import type { SkyTeamModuleDefinition } from './types.js';

export const KEROSENE_START = 20;
export const KEROSENE_IDLE_LOSS = 6;

function spendKerosene(state: SkyTeamState, amount: number, reason: string): void {
  const k = state.moduleState.kerosene;
  if (!k) return;
  k.remaining -= amount;
  appendLog(state, `Kerosene: ${reason} (−${amount}) → ${k.remaining}`);
  // 0 is still on the track; the red ✕ (loss) is below 0.
  if (k.remaining < 0) {
    lose(state, 'kerosene_empty', 'Kerosene หมด — แพ้');
  }
}

export function applyKeroseneDiePlacement(state: SkyTeamState, placement: SkyTeamPlacedDie): void {
  if (placement.slotId !== 'kerosene') return;
  const k = state.moduleState.kerosene;
  if (!k) return;
  k.diePlacedThisRound = true;
  spendKerosene(state, placement.value, `วางลูกเต๋า ${placement.value}`);
}

export function applyKeroseneEndRound(state: SkyTeamState): void {
  const k = state.moduleState.kerosene;
  if (!k) return;
  if (!k.diePlacedThisRound) {
    spendKerosene(state, KEROSENE_IDLE_LOSS, 'ไม่ได้วาง Kerosene ในรอบนี้');
  }
  if (state.result) return;
  k.diePlacedThisRound = false;
}

export const keroseneModule: SkyTeamModuleDefinition<SkyTeamKeroseneState> = {
  id: 'kerosene',
  setup: () => ({
    remaining: KEROSENE_START,
    diePlacedThisRound: false,
  }),
  onDiePlaced: (state, placement) => {
    applyKeroseneDiePlacement(state, placement);
    return state;
  },
  onEndRound: (state) => {
    applyKeroseneEndRound(state);
    return state;
  },
};
