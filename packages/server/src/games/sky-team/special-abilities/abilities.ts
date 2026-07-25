import type { SkyTeamSlotId, SkyTeamState } from 'shared';
import {
  ABILITY_TRAFFIC_DIE_FACES,
  MAX_COFFEE_TOKENS,
  MAX_REROLL_TOKENS,
  SKY_TEAM_SLOT_DEFS,
} from 'shared';
import { appendLog, roleOf, rollDie, slotOccupied } from '../helpers.js';

const WT = 'working-together' as const;
const SYNC = 'synchronisation' as const;
const MASTERY = 'mastery' as const;
const CONTROL = 'control' as const;
const ANTICIPATION = 'anticipation' as const;
const ADAPTATION = 'adaptation' as const;

export function hasAbility(
  state: SkyTeamState,
  id:
    | typeof WT
    | typeof SYNC
    | typeof MASTERY
    | typeof CONTROL
    | typeof ANTICIPATION
    | typeof ADAPTATION,
): boolean {
  return state.selectedSpecialAbilityIds.includes(id);
}

export function oppositeDieFace(value: number): number {
  return 7 - value;
}

export function rollAbilityTrafficDie(): number {
  const i = Math.floor(Math.random() * ABILITY_TRAFFIC_DIE_FACES.length);
  return ABILITY_TRAFFIC_DIE_FACES[i]!;
}

export function isWorkingTogetherSlot(slotId: SkyTeamSlotId): boolean {
  return slotId === 'skill_wt_pilot' || slotId === 'skill_wt_copilot';
}

export function getSyncPendingValue(state: SkyTeamState): number | undefined {
  return state.specialAbilityState[SYNC]?.pendingValue;
}

export function getWorkingTogetherPending(state: SkyTeamState) {
  return state.specialAbilityState[WT]?.workingTogether;
}

export function isAnticipationOpen(state: SkyTeamState): boolean {
  return Boolean(state.specialAbilityState[ANTICIPATION]?.anticipationOpen);
}

export function canUseAdaptation(state: SkyTeamState, playerId: string): boolean {
  if (!hasAbility(state, ADAPTATION)) return false;
  const rt = state.specialAbilityState[ADAPTATION];
  if (!rt) return false;
  return !(rt.usedByPlayerIds ?? []).includes(playerId);
}

/** Reset per-round flags when dice placement starts. */
export function resetSpecialAbilitiesForRound(state: SkyTeamState): void {
  for (const id of state.selectedSpecialAbilityIds) {
    const rt = state.specialAbilityState[id];
    if (!rt) continue;
    rt.usedThisRound = false;
    rt.pendingValue = undefined;
    rt.workingTogether = undefined;
    rt.anticipationOpen = false;
  }

  if (hasAbility(state, ANTICIPATION)) {
    const rt = state.specialAbilityState[ANTICIPATION];
    if (rt) rt.anticipationOpen = true;
  }
}

export function closeAnticipation(state: SkyTeamState): void {
  const rt = state.specialAbilityState[ANTICIPATION];
  if (rt) rt.anticipationOpen = false;
}

function playerHasHandDie(state: SkyTeamState, playerId: string): boolean {
  const role = roleOf(state, playerId);
  const color = role === 'pilot' ? 'blue' : 'orange';
  return state.dice.some((d) => d.color === color && d.inHand);
}

function partnerId(state: SkyTeamState, playerId: string): string {
  return playerId === state.pilotId ? state.copilotId : state.pilotId;
}

/**
 * Mastery — matching engines → +1 reroll (if supply remains).
 * Call when both engines resolve.
 */
export function applyMasteryAfterEngines(state: SkyTeamState): void {
  if (!hasAbility(state, MASTERY)) return;
  const rt = state.specialAbilityState[MASTERY];
  if (!rt || rt.usedThisRound) return;

  const pilot = state.placedDice.find((p) => p.slotId === 'engine_pilot');
  const copilot = state.placedDice.find((p) => p.slotId === 'engine_copilot');
  if (!pilot || !copilot || pilot.value !== copilot.value) return;

  rt.usedThisRound = true;
  if (state.rerollTokens >= MAX_REROLL_TOKENS) {
    appendLog(state, `Mastery: Engine เท่ากัน (${pilot.value}) — Reroll เต็มแล้ว`);
    return;
  }
  state.rerollTokens += 1;
  appendLog(
    state,
    `Mastery: Engine เท่ากัน (${pilot.value}) — ได้ Reroll (รวม ${state.rerollTokens})`,
  );
}

/**
 * Control — matching axis → +1 coffee (if room).
 */
export function applyControlAfterAxis(state: SkyTeamState): void {
  if (!hasAbility(state, CONTROL)) return;
  const rt = state.specialAbilityState[CONTROL];
  if (!rt || rt.usedThisRound) return;

  const pilot = state.placedDice.find((p) => p.slotId === 'axis_pilot');
  const copilot = state.placedDice.find((p) => p.slotId === 'axis_copilot');
  if (!pilot || !copilot || pilot.value !== copilot.value) return;

  rt.usedThisRound = true;
  if (state.coffeeTokens >= MAX_COFFEE_TOKENS) {
    appendLog(state, `Control: Axis เท่ากัน (${pilot.value}) — Coffee เต็มแล้ว`);
    return;
  }
  state.coffeeTokens += 1;
  appendLog(
    state,
    `Control: Axis เท่ากัน (${pilot.value}) — ได้ Coffee (รวม ${state.coffeeTokens})`,
  );
}

/**
 * Synchronisation — ≥1 gear + ≥1 flaps → roll Traffic die for Co-Pilot.
 * Returns true if a pending placement was opened (caller should not advance turn yet).
 */
export function tryTriggerSynchronisation(state: SkyTeamState): boolean {
  if (!hasAbility(state, SYNC)) return false;
  const rt = state.specialAbilityState[SYNC];
  if (!rt || rt.usedThisRound || rt.pendingValue != null) return false;

  const hasGear = state.placedDice.some((p) => p.slotId.startsWith('gear_'));
  const hasFlaps = state.placedDice.some((p) => p.slotId.startsWith('flaps_'));
  if (!hasGear || !hasFlaps) return false;

  const value = rollAbilityTrafficDie();
  rt.usedThisRound = true;
  rt.pendingValue = value;
  state.currentPlayerId = state.copilotId;
  appendLog(state, `Synchronisation: ทอย Traffic die ได้ ${value} — Co-Pilot ต้องวาง (ไม่สนสี)`);
  return true;
}

/** Legal Synchronisation placement (ignore colour; coffee ok). */
export function canPlaceSyncAbilityDie(
  state: SkyTeamState,
  slotId: SkyTeamSlotId,
  value: number,
): boolean {
  if (state.phase !== 'dice_placement') return false;
  if (getSyncPendingValue(state) == null) return false;
  if (slotOccupied(state, slotId)) return false;

  const def = SKY_TEAM_SLOT_DEFS[slotId];
  if (def.section === 'skill' || def.section === 'intern' || def.section === 'kerosene') {
    return false;
  }
  if (def.allowedValues !== 'any' && !def.allowedValues.includes(value)) return false;

  if (slotId === 'flaps_23' && !state.switches.flaps12) return false;
  if (slotId === 'flaps_34' && !state.switches.flaps23) return false;
  if (slotId === 'flaps_45' && !state.switches.flaps34) return false;
  if (slotId === 'brake_2' || slotId === 'brake_4' || slotId === 'brake_6') {
    if (state.enabledModules.includes('ice-brakes')) return false;
  }
  if (slotId === 'brake_4' && !state.switches.brake2) return false;
  if (slotId === 'brake_6' && !state.switches.brake4) return false;

  return true;
}

export function clearSyncPending(state: SkyTeamState): void {
  const rt = state.specialAbilityState[SYNC];
  if (rt) rt.pendingValue = undefined;
}

/**
 * Start / continue Working Together.
 * Returns 'waiting-partner' | 'resolved' | 'not-wt'.
 */
export function handleWorkingTogetherPlace(
  state: SkyTeamState,
  playerId: string,
  dieId: string,
  slotId: SkyTeamSlotId,
): 'waiting-partner' | 'resolved' | 'not-wt' {
  if (!isWorkingTogetherSlot(slotId)) return 'not-wt';
  if (!hasAbility(state, WT)) throw new Error('ไม่ได้เลือก Working Together');

  const rt = state.specialAbilityState[WT];
  if (!rt) throw new Error('Working Together ไม่พร้อม');
  if (rt.usedThisRound && !rt.workingTogether) {
    throw new Error('ใช้ Working Together ไปแล้วในรอบนี้');
  }

  const role = roleOf(state, playerId);
  const expectedSlot = role === 'pilot' ? 'skill_wt_pilot' : 'skill_wt_copilot';
  if (slotId !== expectedSlot) throw new Error('ช่อง Working Together ไม่ตรงบทบาท');

  const die = state.dice.find((d) => d.id === dieId);
  if (!die || !die.inHand) throw new Error('ไม่พบลูกเต๋านี้');

  const pending = rt.workingTogether;
  if (!pending) {
    // Initiate — both must have a die available
    const partner = partnerId(state, playerId);
    if (!playerHasHandDie(state, partner)) {
      throw new Error('อีกฝ่ายไม่มีลูกเต๋าในมือ — ใช้ Working Together ไม่ได้');
    }

    die.inHand = false;
    state.placedDice.push({
      dieId: die.id,
      slotId,
      color: die.color,
      value: die.value,
      ownerId: playerId,
      source: 'skill',
    });
    rt.workingTogether = { initiatorId: playerId, initiatorDieId: die.id };
    state.currentPlayerId = partner;
    appendLog(
      state,
      `Working Together: ${role === 'pilot' ? 'Pilot' : 'Co-Pilot'} วาง ${die.value} — อีกฝ่ายต้องวางด้วย`,
    );
    return 'waiting-partner';
  }

  // Partner completes
  if (playerId === pending.initiatorId) {
    throw new Error('รออีกฝ่ายวาง Working Together');
  }

  die.inHand = false;
  state.placedDice.push({
    dieId: die.id,
    slotId,
    color: die.color,
    value: die.value,
    ownerId: playerId,
    source: 'skill',
  });

  const initDie = state.dice.find((d) => d.id === pending.initiatorDieId);
  if (!initDie) throw new Error('ไม่พบลูกเต๋า initiator');

  const vA = initDie.value;
  const vB = die.value;
  initDie.value = vB;
  die.value = vA;
  initDie.inHand = true;
  die.inHand = true;

  state.placedDice = state.placedDice.filter((p) => p.source !== 'skill');
  rt.workingTogether = undefined;
  rt.usedThisRound = true;
  state.currentPlayerId = pending.initiatorId;

  appendLog(state, `Working Together: สลับค่า ${vA}↔${vB} — คืนลูกเต๋าทั้งคู่`);
  return 'resolved';
}

export function handleAnticipationReroll(
  state: SkyTeamState,
  playerId: string,
  dieId: string,
): void {
  if (!hasAbility(state, ANTICIPATION)) throw new Error('ไม่ได้เลือก Anticipation');
  if (!isAnticipationOpen(state)) throw new Error('ใช้ Anticipation ตอนนี้ไม่ได้');
  if (state.phase !== 'dice_placement') throw new Error('ใช้ Anticipation ได้เฉพาะช่วงวางลูกเต๋า');
  if (state.currentPlayerId !== playerId) throw new Error('ยังไม่ถึงเทิร์นคุณ');

  // First player only (altitude firstPlayer for this round)
  const firstId = state.currentPlayerId;
  if (playerId !== firstId) throw new Error('Anticipation ใช้ได้เฉพาะ First Player');

  // No control-panel placements yet by first player this round
  const alreadyPlaced = state.placedDice.some(
    (p) => p.ownerId === playerId && p.source !== 'skill',
  );
  if (alreadyPlaced) throw new Error('วางลูกเต๋าไปแล้ว — Anticipation หมดสิทธิ์');

  const role = roleOf(state, playerId);
  const die = state.dice.find((d) => d.id === dieId);
  if (!die || !die.inHand) throw new Error('ไม่พบลูกเต๋านี้');
  if (
    (role === 'pilot' && die.color !== 'blue') ||
    (role === 'copilot' && die.color !== 'orange')
  ) {
    throw new Error('ลูกเต๋านี้ไม่ใช่ของคุณ');
  }

  const before = die.value;
  die.value = rollDie();
  closeAnticipation(state);
  const rt = state.specialAbilityState[ANTICIPATION];
  if (rt) rt.usedThisRound = true;
  appendLog(state, `Anticipation: ทอยใหม่ ${before} → ${die.value}`);
}

export function handleAdaptationFlip(state: SkyTeamState, playerId: string, dieId: string): void {
  if (!canUseAdaptation(state, playerId)) {
    throw new Error('ใช้ Adaptation ไม่ได้ (ใช้ไปแล้วหรือไม่ได้เลือก)');
  }
  if (state.phase !== 'dice_placement') throw new Error('ใช้ Adaptation ได้เฉพาะช่วงวางลูกเต๋า');
  if (state.rerollPending) throw new Error('กำลัง reroll อยู่');
  if (getSyncPendingValue(state) != null) throw new Error('ต้องวาง Synchronisation ก่อน');
  if (getWorkingTogetherPending(state)) throw new Error('ต้องจบ Working Together ก่อน');

  const role = roleOf(state, playerId);
  const die = state.dice.find((d) => d.id === dieId);
  if (!die || !die.inHand) throw new Error('ไม่พบลูกเต๋านี้');
  if (
    (role === 'pilot' && die.color !== 'blue') ||
    (role === 'copilot' && die.color !== 'orange')
  ) {
    throw new Error('ลูกเต๋านี้ไม่ใช่ของคุณ');
  }

  const before = die.value;
  die.value = oppositeDieFace(before);
  const rt = state.specialAbilityState[ADAPTATION]!;
  rt.usedByPlayerIds = [...(rt.usedByPlayerIds ?? []), playerId];
  appendLog(
    state,
    `Adaptation: ${role === 'pilot' ? 'Pilot' : 'Co-Pilot'} พลิก ${before} → ${die.value}`,
  );
}
