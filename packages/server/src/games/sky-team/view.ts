import type { SkyTeamPlayerView, SkyTeamSlotId, SkyTeamState } from 'shared';
import {
  SKY_TEAM_SLOT_DEFS,
  getAltitudeStep,
  getApproachScenario,
  skyTeamHasModule,
} from 'shared';
import { atAirport, canPlaceInSlot, isFinalRound, roleOf } from './helpers.js';

const ALL_SLOTS = Object.keys(SKY_TEAM_SLOT_DEFS) as SkyTeamSlotId[];

function visibleSlots(state: SkyTeamState): SkyTeamSlotId[] {
  return ALL_SLOTS.filter((id) => {
    if (id !== 'kerosene') return true;
    return (
      skyTeamHasModule(state.enabledModules, 'kerosene') &&
      !skyTeamHasModule(state.enabledModules, 'kerosene-leak')
    );
  });
}

export function toPlayerView(state: SkyTeamState, playerId: string): SkyTeamPlayerView {
  const myRole = roleOf(state, playerId);
  const alt = getAltitudeStep(state.altitudeIndex);
  const scenario = getApproachScenario(state.scenarioId);

  const myDice = state.dice
    .filter((d) => d.inHand && ((myRole === 'pilot' && d.color === 'blue') || (myRole === 'copilot' && d.color === 'orange')))
    .map((d) => ({ ...d }));

  const slots = visibleSlots(state).map((id) => {
    const occupied = state.placedDice.find((p) => p.slotId === id) ?? null;
    // canPlace preview: any of my dice values that could fit — approximate with checking each my die
    let canPlace = false;
    if (
      state.phase === 'dice_placement' &&
      !state.rerollPending &&
      state.currentPlayerId === playerId &&
      !occupied
    ) {
      canPlace = myDice.some((d) => canPlaceInSlot(state, playerId, id, d.value));
    }
    return {
      id,
      occupied: occupied ? { ...occupied } : null,
      canPlace,
    };
  });

  return {
    phase: state.phase,
    round: state.round,
    myId: playerId,
    myRole,
    pilotId: state.pilotId,
    copilotId: state.copilotId,
    players: state.players.map((p) => ({ ...p })),
    scenarioId: state.scenarioId,
    scenarioName: scenario.name,
    approach: state.approach.map((s) => ({ ...s })),
    approachPosition: state.approachPosition,
    altitudeFeet: alt.feet,
    altitudeIndex: state.altitudeIndex,
    isAirplaneAltitude: alt.isAirplane,
    firstPlayerRole: alt.firstPlayer,
    axisPosition: state.axisPosition,
    blueAerodynamic: state.blueAerodynamic,
    orangeAerodynamic: state.orangeAerodynamic,
    brakeLevel: state.brakeLevel,
    switches: { ...state.switches },
    coffeeTokens: state.coffeeTokens,
    rerollTokens: state.rerollTokens,
    myDice,
    placedDice: state.placedDice.map((p) => ({ ...p })),
    currentPlayerId: state.currentPlayerId,
    isMyTurn: state.currentPlayerId === playerId && state.phase === 'dice_placement' && !state.rerollPending,
    strategyReady: { ...state.strategyReady },
    strategyEndsAtMs: state.phase === 'strategy' ? state.strategyEndsAtMs : null,
    rerollPending: state.rerollPending
      ? {
          ...state.rerollPending,
          pilotDieIds: state.rerollPending.pilotDieIds
            ? [...state.rerollPending.pilotDieIds]
            : null,
          copilotDieIds: state.rerollPending.copilotDieIds
            ? [...state.rerollPending.copilotDieIds]
            : null,
        }
      : null,
    lastSpeed: state.lastSpeed,
    isFinalRound: isFinalRound(state),
    atAirport: atAirport(state),
    slots,
    loseReason: state.loseReason,
    winReason: state.winReason,
    gameResult: state.result ?? undefined,
    eventLog: [...state.eventLog],
    silentPhase: state.phase === 'dice_placement',
    enabledModules: [...state.enabledModules],
    selectedSpecialAbilityIds: [...state.selectedSpecialAbilityIds],
    moduleState: structuredClone(state.moduleState),
    specialAbilityState: structuredClone(state.specialAbilityState),
  };
}
