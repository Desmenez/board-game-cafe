import type { Player, SkyTeamModuleId, SkyTeamSpecialAbilityId, SkyTeamState } from 'shared';
import { skyTeamGame } from '../src/games/sky-team/engine.js';
import { setupEnabledModules } from '../src/games/sky-team/modules/registry.js';
import { setupSpecialAbilityState } from '../src/games/sky-team/special-abilities/registry.js';

const DEFAULT_PLAYERS: Player[] = [
  { id: 'pilot', name: 'Pilot' },
  { id: 'copilot', name: 'Co-Pilot' },
];

/**
 * Setup a Sky Team match, then install modules/abilities for unit tests.
 * (Lobby scenarios normally own these — tests override after setup.)
 */
export function setupSkyTeamForTest(opts?: {
  modules?: readonly string[];
  abilities?: readonly string[];
  players?: Player[];
}): SkyTeamState {
  const players = opts?.players ?? DEFAULT_PLAYERS;
  const state = skyTeamGame.setup(players, {
    scenarioId: 'yul',
    // Keep role assignment deterministic for unit tests.
    pilotMode: 'manual',
    pilotPlayerId: players[0]!.id,
  }) as SkyTeamState;

  const enabledModules = [...(opts?.modules ?? [])] as SkyTeamModuleId[];
  const selectedSpecialAbilityIds = [...(opts?.abilities ?? [])] as SkyTeamSpecialAbilityId[];

  state.enabledModules = enabledModules;
  state.selectedSpecialAbilityIds = selectedSpecialAbilityIds;
  state.specialAbilityState = setupSpecialAbilityState(selectedSpecialAbilityIds);
  state.moduleState = setupEnabledModules(state, {
    scenarioId: 'yul',
    enabledModules,
    selectedSpecialAbilityIds,
    specialAbilityPicksByPlayerId: {},
    abilityPickOpen: false,
    pilotMode: 'manual',
    pilotPlayerId: players[0]!.id,
  });
  return state;
}
