import type {
  GameDefinition,
  GameResult,
  Player,
  SkyTeamAction,
  SkyTeamPlayerView,
  SkyTeamState,
} from 'shared';
import {
  GAME_THUMBNAIL_BY_ID,
  getApproachScenario,
  getSkyTeamLobbyValidationErrors,
  parseSkyTeamLobbyOptions,
} from 'shared';
import {
  beginStrategy,
  buildApproach,
  createDice,
  emptySwitches,
} from './helpers.js';
import { setupEnabledModules } from './modules/registry.js';
import {
  applySkyTeamTimerExpiry,
  handleConfirmReroll,
  handleFinishStrategy,
  handlePlaceDie,
  handleUseReroll,
} from './placement.js';
import { setupSpecialAbilityState } from './special-abilities/registry.js';
import { toPlayerView } from './view.js';

export { applySkyTeamTimerExpiry };

function setupSkyTeam(players: Player[], options?: unknown): SkyTeamState {
  if (players.length !== 2) {
    throw new Error('Sky Team ต้องมีผู้เล่น 2 คน');
  }

  const lobby = parseSkyTeamLobbyOptions(options);
  const lobbyErrors = getSkyTeamLobbyValidationErrors(lobby);
  if (lobbyErrors.length > 0) {
    throw new Error(lobbyErrors[0]!);
  }

  const scenario = getApproachScenario(lobby.scenarioId);
  const [p0, p1] = players;
  if (!p0 || !p1) throw new Error('Sky Team ต้องมีผู้เล่น 2 คน');

  const pilotId = p0.id;
  const copilotId = p1.id;

  const state: SkyTeamState = {
    phase: 'strategy',
    round: 1,
    players: [
      { id: pilotId, name: p0.name, role: 'pilot' },
      { id: copilotId, name: p1.name, role: 'copilot' },
    ],
    pilotId,
    copilotId,
    scenarioId: scenario.id,
    approach: buildApproach(scenario),
    approachPosition: 0,
    altitudeIndex: 0,
    axisPosition: 0,
    blueAerodynamic: 4,
    orangeAerodynamic: 8,
    brakeLevel: 0,
    switches: emptySwitches(),
    coffeeTokens: 0,
    rerollTokens: 0,
    dice: createDice(pilotId, copilotId),
    placedDice: [],
    currentPlayerId: null,
    strategyReady: { [pilotId]: false, [copilotId]: false },
    strategyEndsAtMs: null,
    strategyDurationMs: lobby.strategySeconds * 1000,
    rerollPending: null,
    lastSpeed: null,
    loseReason: null,
    winReason: null,
    result: null,
    eventLog: [],
    enabledModules: [...lobby.enabledModules],
    selectedSpecialAbilityIds: [...lobby.selectedSpecialAbilityIds],
    moduleState: {},
    specialAbilityState: setupSpecialAbilityState(lobby.selectedSpecialAbilityIds),
  };

  state.moduleState = setupEnabledModules(state, lobby);
  beginStrategy(state);
  return state;
}

export const skyTeamGame: GameDefinition<SkyTeamState, SkyTeamAction> = {
  id: 'sky-team',
  name: 'Sky Team',
  description:
    'Co-op 2 คน — Pilot กับ Co-Pilot ต้องประสานงานเงียบๆ เพื่อลงจอดเครื่องบินให้ปลอดภัย',
  minPlayers: 2,
  maxPlayers: 2,
  thumbnail:
    GAME_THUMBNAIL_BY_ID['sky-team'] ??
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1784823300/cover_zjvkqa.webp',

  setup: setupSkyTeam,

  onAction(state: SkyTeamState, playerId: string, action: SkyTeamAction): SkyTeamState {
    if (state.phase === 'game_over') {
      throw new Error('เกมจบแล้ว');
    }

    switch (action.type) {
      case 'finish-strategy':
        return handleFinishStrategy(state, playerId);
      case 'place-die':
        return handlePlaceDie(state, playerId, action);
      case 'use-reroll':
        return handleUseReroll(state, playerId);
      case 'confirm-reroll':
        return handleConfirmReroll(state, playerId, action.dieIds);
      default: {
        const _exhaustive: never = action;
        void _exhaustive;
        throw new Error('action ไม่รู้จัก');
      }
    }
  },

  getPlayerView(state: SkyTeamState, playerId: string): SkyTeamPlayerView {
    return toPlayerView(state, playerId);
  },

  isGameOver(state: SkyTeamState): GameResult | null {
    return state.result;
  },
};
