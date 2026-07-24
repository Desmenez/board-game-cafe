import type {
  SkyTeamLobbyOptions,
  SkyTeamModuleId,
  SkyTeamModuleState,
  SkyTeamPlacedDie,
  SkyTeamState,
} from 'shared';
import { iceBrakesModule } from './ice-brakes.js';
import { internModule } from './intern.js';
import { keroseneModule } from './kerosene.js';
import { keroseneLeakModule } from './kerosene-leak.js';
import { realtimeModule } from './realtime.js';
import { trafficDieModule } from './traffic-die.js';
import { turnsModule } from './turns.js';
import type { AnySkyTeamModuleDefinition, ModuleContext, ModuleSetupContext } from './types.js';
import { windModule } from './wind.js';

export const skyTeamModuleRegistry: Record<SkyTeamModuleId, AnySkyTeamModuleDefinition> = {
  'traffic-die': trafficDieModule,
  turns: turnsModule,
  kerosene: keroseneModule,
  intern: internModule,
  wind: windModule,
  'real-time': realtimeModule,
  'kerosene-leak': keroseneLeakModule,
  'ice-brakes': iceBrakesModule,
};

const MODULE_STATE_KEY: Record<SkyTeamModuleId, keyof SkyTeamModuleState> = {
  'traffic-die': 'trafficDie',
  turns: 'turns',
  kerosene: 'kerosene',
  intern: 'intern',
  wind: 'wind',
  'real-time': 'realtime',
  'kerosene-leak': 'keroseneLeak',
  'ice-brakes': 'iceBrakes',
};

/** Build `moduleState` for enabled modules only. */
export function setupEnabledModules(
  state: SkyTeamState,
  lobby: SkyTeamLobbyOptions,
): SkyTeamModuleState {
  const moduleState: SkyTeamModuleState = {};
  const ctx: ModuleSetupContext = { state, lobby };

  for (const id of lobby.enabledModules) {
    const mod = skyTeamModuleRegistry[id];
    if (!mod?.setup) continue;
    const key = MODULE_STATE_KEY[id];
    (moduleState as Record<string, unknown>)[key] = mod.setup(ctx);
  }

  return moduleState;
}

export function getEnabledModules(state: SkyTeamState): AnySkyTeamModuleDefinition[] {
  return state.enabledModules
    .map((id) => skyTeamModuleRegistry[id])
    .filter((m): m is AnySkyTeamModuleDefinition => Boolean(m));
}

function ctx(state: SkyTeamState): ModuleContext {
  return { state };
}

export function runModulesRoundStart(state: SkyTeamState): void {
  for (const mod of getEnabledModules(state)) {
    mod.onRoundStart?.(state, ctx(state));
    if (state.result) return;
  }
}

export function runModulesOnDiePlaced(state: SkyTeamState, placement: SkyTeamPlacedDie): void {
  for (const mod of getEnabledModules(state)) {
    mod.onDiePlaced?.(state, placement, ctx(state));
    if (state.result) return;
  }
}

export function runModulesAfterApproachAdvance(
  state: SkyTeamState,
  traversedPositions: number[],
): void {
  for (const mod of getEnabledModules(state)) {
    mod.afterApproachAdvance?.(state, traversedPositions, ctx(state));
    if (state.result) return;
  }
}

export function runModulesEndRound(state: SkyTeamState): void {
  for (const mod of getEnabledModules(state)) {
    mod.onEndRound?.(state, ctx(state));
    if (state.result) return;
  }
}
