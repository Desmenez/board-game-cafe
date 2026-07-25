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
import { beginStrategy, buildApproach, createDice, emptySwitches } from './helpers.js';
import { setupEnabledModules } from './modules/registry.js';
import {
  applySkyTeamTimerExpiry,
  handleAdaptationFlipAction,
  handleAnticipationRerollAction,
  handleCancelReroll,
  handleConfirmReroll,
  handleFinishStrategy,
  handlePlaceAbilityDie,
  handlePlaceDie,
  handlePlaceInternToken,
  handleUseReroll,
} from './placement.js';
import { setupSpecialAbilityState } from './special-abilities/registry.js';
import { toPlayerView } from './view.js';

export { applySkyTeamTimerExpiry };

function resolveSkyTeamSeats(
  players: Player[],
  lobby: ReturnType<typeof parseSkyTeamLobbyOptions>,
): { pilot: Player; copilot: Player } {
  const [p0, p1] = players;
  if (!p0 || !p1) throw new Error('Sky Team ต้องมีผู้เล่น 2 คน');

  if (lobby.pilotMode === 'manual') {
    if (!lobby.pilotPlayerId) {
      throw new Error('ต้องเลือกผู้เล่นที่เป็น Pilot');
    }
    const pilot = players.find((p) => p.id === lobby.pilotPlayerId);
    if (!pilot) {
      throw new Error('ผู้เล่นที่เลือกเป็น Pilot ไม่อยู่ในห้อง');
    }
    const copilot = players.find((p) => p.id !== pilot.id);
    if (!copilot) throw new Error('Sky Team ต้องมีผู้เล่น 2 คน');
    return { pilot, copilot };
  }

  // random
  if (Math.random() < 0.5) return { pilot: p0, copilot: p1 };
  return { pilot: p1, copilot: p0 };
}

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

  const { pilot, copilot } = resolveSkyTeamSeats(players, lobby);
  const pilotId = pilot.id;
  const copilotId = copilot.id;

  const state: SkyTeamState = {
    phase: 'strategy',
    round: 1,
    players: [
      { id: pilotId, name: pilot.name, role: 'pilot' },
      { id: copilotId, name: copilot.name, role: 'copilot' },
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
  description: 'Co-op 2 คน — Pilot กับ Co-Pilot ต้องประสานงานเงียบๆ เพื่อลงจอดเครื่องบินให้ปลอดภัย',
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
      case 'place-intern-token':
        return handlePlaceInternToken(state, playerId, action.slotId);
      case 'place-ability-die':
        return handlePlaceAbilityDie(state, playerId, action);
      case 'anticipation-reroll':
        return handleAnticipationRerollAction(state, playerId, action.dieId);
      case 'adaptation-flip':
        return handleAdaptationFlipAction(state, playerId, action.dieId);
      case 'use-reroll':
        return handleUseReroll(state, playerId);
      case 'confirm-reroll':
        return handleConfirmReroll(state, playerId, action.dieIds);
      case 'cancel-reroll':
        return handleCancelReroll(state, playerId);
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
