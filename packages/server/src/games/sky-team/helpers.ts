import type {
  ApproachScenario,
  SkyTeamDie,
  SkyTeamRole,
  SkyTeamSlotId,
  SkyTeamState,
  SkyTeamSwitchState,
} from 'shared';
import {
  ALTITUDE_TRACK,
  AXIS_SPIN_THRESHOLD,
  SKY_TEAM_SLOT_DEFS,
  getAltitudeStep,
  getApproachScenario,
  parseIceBrakeSlot,
  skyTeamHasModule,
  skyTeamSwitchAlreadyOn,
} from 'shared';
import { canPlaceIceBrakeSlot } from './modules/ice-brakes.js';
import { closestInternToken, remainingInternCount } from './modules/intern.js';
import { runModulesRoundStart } from './modules/registry.js';
import {
  hasAbility,
  isWorkingTogetherSlot,
  resetSpecialAbilitiesForRound,
} from './special-abilities/abilities.js';

export function emptySwitches(): SkyTeamSwitchState {
  return {
    gear12: false,
    gear34: false,
    gear56: false,
    flaps12: false,
    flaps23: false,
    flaps34: false,
    flaps45: false,
    brake2: false,
    brake4: false,
    brake6: false,
  };
}

export function cloneState(state: SkyTeamState): SkyTeamState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    approach: state.approach.map((s) => ({ ...s })),
    switches: { ...state.switches },
    dice: state.dice.map((d) => ({ ...d })),
    placedDice: state.placedDice.map((p) => ({ ...p })),
    strategyReady: { ...state.strategyReady },
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
    result: state.result ? { ...state.result, winners: [...state.result.winners] } : null,
    eventLog: [...state.eventLog],
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
  };
}

export function roleOf(state: SkyTeamState, playerId: string): SkyTeamRole {
  if (playerId === state.pilotId) return 'pilot';
  if (playerId === state.copilotId) return 'copilot';
  throw new Error('ผู้เล่นไม่ได้อยู่ในเกม');
}

export function playerIdForRole(state: SkyTeamState, role: SkyTeamRole): string {
  return role === 'pilot' ? state.pilotId : state.copilotId;
}

export function currentAltitude(state: SkyTeamState) {
  return getAltitudeStep(state.altitudeIndex);
}

export function atAirport(state: SkyTeamState): boolean {
  const space = state.approach[state.approachPosition];
  return space?.base === 'airport';
}

export function isFinalRound(state: SkyTeamState): boolean {
  return atAirport(state) && currentAltitude(state).isAirplane;
}

export function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export function createDice(pilotId: string, copilotId: string): SkyTeamDie[] {
  const dice: SkyTeamDie[] = [];
  for (let i = 0; i < 4; i++) {
    dice.push({
      id: `pilot-${i}`,
      color: 'blue',
      value: 1,
      inHand: true,
    });
    dice.push({
      id: `copilot-${i}`,
      color: 'orange',
      value: 1,
      inHand: true,
    });
  }
  void pilotId;
  void copilotId;
  return dice;
}

export function rollAllDice(state: SkyTeamState): void {
  for (const die of state.dice) {
    die.value = rollDie();
    die.inHand = true;
  }
  state.placedDice = [];
}

export function buildApproach(scenario: ApproachScenario) {
  return scenario.spaces.map((s) => ({
    index: s.index,
    base: s.base,
    planes: s.traffic,
    printedPlanes: s.traffic,
    ...(s.trafficDieRolls != null && s.trafficDieRolls > 0
      ? { trafficDieRolls: s.trafficDieRolls }
      : {}),
    ...(s.allowedAxisPositions && s.allowedAxisPositions.length > 0
      ? { allowedAxisPositions: [...s.allowedAxisPositions] }
      : {}),
  }));
}

export function appendLog(state: SkyTeamState, message: string): void {
  state.eventLog = [...state.eventLog.slice(-40), message];
}

export function lose(
  state: SkyTeamState,
  reason: NonNullable<SkyTeamState['loseReason']>,
  message: string,
): void {
  state.phase = 'game_over';
  state.loseReason = reason;
  state.winReason = null;
  state.result = { winners: [], reason: message };
  state.currentPlayerId = null;
  state.strategyEndsAtMs = null;
  state.rerollPending = null;
  if (state.moduleState.realtime) state.moduleState.realtime.deadlineAt = null;
  appendLog(state, message);
}

export function win(state: SkyTeamState, message: string): void {
  state.phase = 'game_over';
  state.winReason = 'landed';
  state.loseReason = null;
  state.result = {
    winners: [state.pilotId, state.copilotId],
    reason: message,
  };
  state.currentPlayerId = null;
  state.strategyEndsAtMs = null;
  state.rerollPending = null;
  if (state.moduleState.realtime) state.moduleState.realtime.deadlineAt = null;
  appendLog(state, message);
}

export function beginStrategy(state: SkyTeamState): void {
  state.phase = 'strategy';
  state.strategyReady = { [state.pilotId]: false, [state.copilotId]: false };
  state.strategyEndsAtMs = null;
  state.currentPlayerId = null;
  state.rerollPending = null;
  state.lastSpeed = null;
  state.placedDice = [];
  if (state.moduleState.realtime) state.moduleState.realtime.deadlineAt = null;
  for (const die of state.dice) {
    die.inHand = true;
  }

  const alt = currentAltitude(state);
  if (alt.grantsReroll) {
    state.rerollTokens += 1;
    appendLog(state, `ได้รับ Reroll token ที่ ${alt.feet} ft`);
  }
  appendLog(state, `รอบ ${state.round}: Strategy — ${alt.feet === 0 ? 'ลงจอด' : `${alt.feet} ft`}`);
}

export function startDicePlacement(state: SkyTeamState): void {
  rollAllDice(state);
  state.phase = 'dice_placement';
  state.strategyEndsAtMs = null;
  const alt = currentAltitude(state);
  state.currentPlayerId = playerIdForRole(state, alt.firstPlayer);
  appendLog(state, 'SILENT PHASE — วางลูกเต๋า');
  runModulesRoundStart(state);
  resetSpecialAbilitiesForRound(state);
}

export function slotOccupied(state: SkyTeamState, slotId: SkyTeamSlotId): boolean {
  return state.placedDice.some((p) => p.slotId === slotId);
}

export function canPlaceInSlot(
  state: SkyTeamState,
  playerId: string,
  slotId: SkyTeamSlotId,
  value: number,
): boolean {
  return explainCannotPlace(state, playerId, slotId, value) == null;
}

/** Human-readable reason, or null if placement is legal. */
export function explainCannotPlace(
  state: SkyTeamState,
  playerId: string,
  slotId: SkyTeamSlotId,
  value: number,
): string | null {
  if (state.phase !== 'dice_placement') return 'ไม่ได้อยู่ในช่วงวางลูกเต๋า';
  if (state.rerollPending) return 'กำลัง reroll อยู่';
  if (state.currentPlayerId !== playerId) return 'ยังไม่ถึงเทิร์นคุณ';
  if (slotOccupied(state, slotId)) return 'ช่องนี้มีลูกเต๋าแล้ว';
  if (skyTeamSwitchAlreadyOn(state.switches, slotId)) {
    return 'สวิตช์เปิดอยู่แล้ว';
  }
  const realtimeDeadline = state.moduleState.realtime?.deadlineAt;
  if (realtimeDeadline != null && Date.now() >= realtimeDeadline) return 'Real-Time: หมดเวลาแล้ว';

  const role = roleOf(state, playerId);
  const def = SKY_TEAM_SLOT_DEFS[slotId];
  if (def.roles !== 'any' && !def.roles.includes(role)) {
    return role === 'pilot' ? 'ช่องนี้เป็นของ Co-Pilot' : 'ช่องนี้เป็นของ Pilot';
  }
  if (def.allowedValues !== 'any' && !def.allowedValues.includes(value)) {
    return `ช่องนี้รับค่า ${def.allowedValues.join(', ')} (ตอนนี้ ${value})`;
  }

  if (slotId === 'flaps_23' && !state.switches.flaps12) return 'ต้องปลด Flaps ตามลำดับ';
  if (slotId === 'flaps_34' && !state.switches.flaps23) return 'ต้องปลด Flaps ตามลำดับ';
  if (slotId === 'flaps_45' && !state.switches.flaps34) return 'ต้องปลด Flaps ตามลำดับ';

  if (slotId === 'brake_2' || slotId === 'brake_4' || slotId === 'brake_6') {
    if (skyTeamHasModule(state.enabledModules, 'ice-brakes')) {
      return 'ใช้ Ice Brakes แทนเบรกปกติ';
    }
  }
  if (slotId === 'brake_4' && !state.switches.brake2) return 'ต้องปลดเบรกตามลำดับ';
  if (slotId === 'brake_6' && !state.switches.brake4) return 'ต้องปลดเบรกตามลำดับ';

  if (slotId === 'kerosene') {
    if (!skyTeamHasModule(state.enabledModules, 'kerosene')) return 'ไม่ได้เปิดโมดูล Kerosene';
    if (skyTeamHasModule(state.enabledModules, 'kerosene-leak')) {
      return 'Kerosene ถูกแทนที่ด้วย Leak';
    }
  }

  if (slotId === 'intern_pilot' || slotId === 'intern_copilot') {
    if (!skyTeamHasModule(state.enabledModules, 'intern')) return 'ไม่ได้เปิดโมดูล Intern';
    const intern = state.moduleState.intern;
    if (!intern || remainingInternCount(intern.wells) === 0) return 'ไม่มี Intern token เหลือ';
    if (intern.pendingToken) return 'ต้องวาง Intern token ที่ค้างอยู่ก่อน';
    const sideRole = slotId === 'intern_pilot' ? 'pilot' : 'copilot';
    if (role !== sideRole) return 'ช่อง Intern ไม่ใช่ฝั่งคุณ';
    const next = closestInternToken(intern.wells, sideRole);
    if (!next || next.value === value) {
      return `ลูกเต๋าต้องไม่เท่า Intern token ถัดไป (${next?.value ?? '?'})`;
    }
  }

  if (parseIceBrakeSlot(slotId)) {
    if (!canPlaceIceBrakeSlot(state, slotId)) return 'วาง Ice Brakes ในช่องนี้ไม่ได้ตอนนี้';
  }

  if (isWorkingTogetherSlot(slotId)) {
    if (!hasAbility(state, 'working-together')) return 'ไม่ได้เลือก Working Together';
    const rt = state.specialAbilityState['working-together'];
    if (!rt) return 'Working Together ไม่พร้อม';
    const pending = rt.workingTogether;
    if (rt.usedThisRound && !pending) return 'ใช้ Working Together ไปแล้วในรอบนี้';
    if (pending && playerId === pending.initiatorId) {
      return 'รออีกฝ่ายวาง Working Together';
    }
    if (!pending) {
      const partner = playerId === state.pilotId ? state.copilotId : state.pilotId;
      const partnerRole = roleOf(state, partner);
      const partnerColor = partnerRole === 'pilot' ? 'blue' : 'orange';
      if (!state.dice.some((d) => d.color === partnerColor && d.inHand)) {
        return 'อีกฝ่ายไม่มีลูกเต๋าในมือ — ใช้ Working Together ไม่ได้';
      }
    }
  }

  return null;
}

export function nextPlayerAfterPlace(state: SkyTeamState): void {
  const other = state.currentPlayerId === state.pilotId ? state.copilotId : state.pilotId;
  const otherHasDice = state.dice.some((d) => {
    const ownerRole = d.color === 'blue' ? 'pilot' : 'copilot';
    const ownerId = playerIdForRole(state, ownerRole);
    return ownerId === other && d.inHand;
  });
  const meHasDice = state.dice.some((d) => {
    const ownerRole = d.color === 'blue' ? 'pilot' : 'copilot';
    const ownerId = playerIdForRole(state, ownerRole);
    return ownerId === state.currentPlayerId && d.inHand;
  });

  if (otherHasDice) {
    state.currentPlayerId = other;
  } else if (meHasDice) {
    // keep same player
  } else {
    state.currentPlayerId = null;
  }
}

export function mandatoryFilled(state: SkyTeamState): boolean {
  const need: SkyTeamSlotId[] = ['axis_pilot', 'axis_copilot', 'engine_pilot', 'engine_copilot'];
  return need.every((id) => slotOccupied(state, id));
}

export function allSwitchesGreen(switches: SkyTeamSwitchState): boolean {
  return (
    switches.gear12 &&
    switches.gear34 &&
    switches.gear56 &&
    switches.flaps12 &&
    switches.flaps23 &&
    switches.flaps34 &&
    switches.flaps45
  );
}

export function axisIsLevel(state: SkyTeamState): boolean {
  return state.axisPosition === 0;
}

export function noPlanesLeft(state: SkyTeamState): boolean {
  return state.approach.every((s) => s.planes <= 0);
}

export function scenarioFromState(state: SkyTeamState): ApproachScenario {
  return getApproachScenario(state.scenarioId);
}

export { ALTITUDE_TRACK, AXIS_SPIN_THRESHOLD };
