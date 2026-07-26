import type { SkyTeamPlayerView, SkyTeamSlotId, SkyTeamState } from 'shared';
import {
  SKY_TEAM_SLOT_DEFS,
  getAltitudeStep,
  getSkyTeamScenario,
  skyTeamHasModule,
  skyTeamSwitchAlreadyOn,
} from 'shared';
import { atAirport, canPlaceInSlot, isFinalRound, roleOf } from './helpers.js';
import { canPlaceSyncAbilityDie, getSyncPendingValue } from './special-abilities/abilities.js';

const ALL_SLOTS = Object.keys(SKY_TEAM_SLOT_DEFS) as SkyTeamSlotId[];

function visibleSlots(state: SkyTeamState): SkyTeamSlotId[] {
  const iceBrakesOn = skyTeamHasModule(state.enabledModules, 'ice-brakes');
  const wtOn = state.selectedSpecialAbilityIds.includes('working-together');
  return ALL_SLOTS.filter((id) => {
    if (id === 'kerosene') {
      return (
        skyTeamHasModule(state.enabledModules, 'kerosene') &&
        !skyTeamHasModule(state.enabledModules, 'kerosene-leak')
      );
    }
    if (id === 'intern_pilot' || id === 'intern_copilot') {
      return skyTeamHasModule(state.enabledModules, 'intern');
    }
    if (id === 'skill_wt_pilot' || id === 'skill_wt_copilot') {
      return wtOn;
    }
    if (id === 'brake_2' || id === 'brake_4' || id === 'brake_6') {
      return !iceBrakesOn;
    }
    if (id.startsWith('ice_brake_')) {
      return iceBrakesOn;
    }
    return true;
  });
}

export function toPlayerView(state: SkyTeamState, playerId: string): SkyTeamPlayerView {
  const myRole = roleOf(state, playerId);
  const alt = getAltitudeStep(state.altitudeIndex);
  const scenario = getSkyTeamScenario(state.scenarioId);
  const pendingIntern = state.moduleState.intern?.pendingToken;
  const mustPlaceIntern = Boolean(pendingIntern && pendingIntern.ownerId === playerId);
  const syncPending = getSyncPendingValue(state);
  const mustPlaceSync = syncPending != null && playerId === state.copilotId;

  const myDice = state.dice
    .filter(
      (d) =>
        d.inHand &&
        ((myRole === 'pilot' && d.color === 'blue') ||
          (myRole === 'copilot' && d.color === 'orange')),
    )
    .map((d) => ({ ...d }));

  const slots = visibleSlots(state).map((id) => {
    const occupied = state.placedDice.find((p) => p.slotId === id) ?? null;
    let canPlace = false;
    if (
      state.phase === 'dice_placement' &&
      !state.rerollPending &&
      state.currentPlayerId === playerId &&
      !occupied
    ) {
      if (mustPlaceSync) {
        canPlace = canPlaceSyncAbilityDie(state, id, syncPending!);
      } else if (mustPlaceIntern) {
        const value = pendingIntern!.value;
        const def = SKY_TEAM_SLOT_DEFS[id];
        const sectionOk =
          def.section !== 'concentration' &&
          def.section !== 'intern' &&
          def.section !== 'kerosene' &&
          def.section !== 'skill';
        const roleOk = def.roles === 'any' || def.roles.includes(myRole);
        const valueOk = def.allowedValues === 'any' || def.allowedValues.includes(value);
        canPlace = sectionOk && roleOk && valueOk;
        if (skyTeamSwitchAlreadyOn(state.switches, id)) canPlace = false;
        if (id === 'flaps_23' && !state.switches.flaps12) canPlace = false;
        if (id === 'flaps_34' && !state.switches.flaps23) canPlace = false;
        if (id === 'flaps_45' && !state.switches.flaps34) canPlace = false;
        if (id === 'brake_4' && !state.switches.brake2) canPlace = false;
        if (id === 'brake_6' && !state.switches.brake4) canPlace = false;
        if (def.section === 'ice-brakes' && !canPlaceInSlot(state, playerId, id, value)) {
          canPlace = false;
        }
      } else {
        canPlace = myDice.some((d) => canPlaceInSlot(state, playerId, id, d.value));
      }
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
    scenarioTier: scenario.tier,
    scenarioTierLabel: scenario.tierLabel,
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
    isMyTurn:
      state.currentPlayerId === playerId &&
      state.phase === 'dice_placement' &&
      !state.rerollPending,
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
    abilitiesModal: state.abilitiesModal
      ? { ...state.abilitiesModal }
      : { open: false, focusedAbilityId: null },
    abilityPicksByPlayerId: Object.fromEntries(
      Object.entries(state.abilityPicksByPlayerId ?? {}).map(([id, picks]) => [id, [...picks]]),
    ),
    specialAbilitySlots: scenario.specialAbilitySlots,
  };
}
