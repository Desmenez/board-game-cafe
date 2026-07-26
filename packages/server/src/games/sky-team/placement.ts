import type { SkyTeamAction, SkyTeamSlotId, SkyTeamState } from 'shared';
import {
  MAX_REROLL_TOKENS,
  SKY_TEAM_SLOT_DEFS,
  getSkyTeamScenario,
  resolveAgreedAbilityPicks,
  sanitizeSkyTeamAbilityIds,
  skyTeamSwitchAlreadyOn,
} from 'shared';
import { endRound } from './endRound.js';
import {
  appendLog,
  beginStrategy,
  canPlaceInSlot,
  cloneState,
  explainCannotPlace,
  nextPlayerAfterPlace,
  roleOf,
  rollDie,
  startDicePlacement,
} from './helpers.js';
import { canPlaceIceBrakeSlot, isIceBrakeSlot } from './modules/ice-brakes.js';
import { clearPendingIntern, isConcentrationSlot, isInternSlot } from './modules/intern.js';
import { clearRealtimeDeadline, isRealtimeExpired } from './modules/realtime.js';
import { runModulesOnDiePlaced } from './modules/registry.js';
import { applyPlacementEffects } from './resolve.js';
import {
  canPlaceSyncAbilityDie,
  clearSyncPending,
  closeAnticipation,
  getSyncPendingValue,
  getWorkingTogetherPending,
  handleAdaptationFlip,
  handleAnticipationReroll,
  handleWorkingTogetherPlace,
  isWorkingTogetherSlot,
  tryTriggerSynchronisation,
} from './special-abilities/abilities.js';
import { setupSpecialAbilityState } from './special-abilities/registry.js';

export function handleFinishStrategy(state: SkyTeamState, playerId: string): SkyTeamState {
  const s = cloneState(state);
  if (s.phase !== 'strategy') throw new Error('ไม่ได้อยู่ในช่วง Strategy');
  if (playerId !== s.pilotId && playerId !== s.copilotId) {
    throw new Error('ผู้เล่นไม่ถูกต้อง');
  }
  s.strategyReady[playerId] = true;
  appendLog(s, `${roleOf(s, playerId) === 'pilot' ? 'Pilot' : 'Co-Pilot'} พร้อมแล้ว`);

  if (s.strategyReady[s.pilotId] && s.strategyReady[s.copilotId]) {
    startDicePlacement(s);
  }
  return s;
}

function maybeEndRound(s: SkyTeamState): void {
  if (getSyncPendingValue(s) != null) return;
  if (getWorkingTogetherPending(s)) return;
  const anyInHand = s.dice.some((d) => d.inHand);
  if (!anyInHand && !s.moduleState.intern?.pendingToken) {
    endRound(s);
  }
}

export function handlePlaceDie(
  state: SkyTeamState,
  playerId: string,
  action: Extract<SkyTeamAction, { type: 'place-die' }>,
): SkyTeamState {
  const s = cloneState(state);
  if (s.phase !== 'dice_placement') throw new Error('ไม่ได้อยู่ในช่วงวางลูกเต๋า');
  if (isRealtimeExpired(s)) throw new Error('Real-Time: หมดเวลาแล้ว');
  if (s.rerollPending) throw new Error('กำลัง reroll อยู่');
  if (s.currentPlayerId !== playerId) throw new Error('ยังไม่ถึงเทิร์นคุณ');

  if (getSyncPendingValue(s) != null) {
    throw new Error('ต้องวาง Synchronisation Traffic die ก่อน');
  }

  const pending = s.moduleState.intern?.pendingToken;
  if (pending && pending.ownerId === playerId) {
    throw new Error('ต้องวาง Intern token ก่อน');
  }

  const wtPending = getWorkingTogetherPending(s);
  if (wtPending && !isWorkingTogetherSlot(action.slotId)) {
    throw new Error('ต้องวางลูกเต๋าบน Working Together ก่อน');
  }

  const die = s.dice.find((d) => d.id === action.dieId);
  if (!die || !die.inHand) throw new Error('ไม่พบลูกเต๋านี้');

  const role = roleOf(s, playerId);
  if (
    (role === 'pilot' && die.color !== 'blue') ||
    (role === 'copilot' && die.color !== 'orange')
  ) {
    throw new Error('ลูกเต๋านี้ไม่ใช่ของคุณ');
  }

  if (isWorkingTogetherSlot(action.slotId)) {
    if ((action.coffeeMods ?? []).length > 0) {
      throw new Error('Working Together ใช้ Coffee ไม่ได้');
    }
    if (!canPlaceInSlot(s, playerId, action.slotId, die.value)) {
      throw new Error('วางในช่องนี้ไม่ได้');
    }
    const wt = handleWorkingTogetherPlace(s, playerId, action.dieId, action.slotId);
    if (wt === 'waiting-partner') return s;
    if (wt === 'resolved') {
      closeAnticipation(s);
      maybeEndRound(s);
      if (s.result || s.phase !== 'dice_placement') return s;
      nextPlayerAfterPlace(s);
      return s;
    }
  }

  const mods = action.coffeeMods ?? [];
  if (mods.length > s.coffeeTokens) throw new Error('Coffee ไม่พอ');

  let value = die.value;
  for (const m of mods) {
    value += m;
  }
  if (value < 1 || value > 6) throw new Error('ค่าลูกเต๋าหลัง Coffee ต้องอยู่ระหว่าง 1–6');

  if (!canPlaceInSlot(s, playerId, action.slotId, value)) {
    throw new Error(explainCannotPlace(s, playerId, action.slotId, value) ?? 'วางลูกเต๋าไม่ได้');
  }

  closeAnticipation(s);

  s.coffeeTokens -= mods.length;
  die.inHand = false;
  die.value = value;
  s.placedDice.push({
    dieId: die.id,
    slotId: action.slotId,
    color: die.color,
    value,
    ownerId: playerId,
    source: 'die',
  });

  appendLog(
    s,
    `${role === 'pilot' ? 'Pilot' : 'Co-Pilot'} วาง ${value} ที่ ${action.slotId}${
      mods.length ? ` (coffee ${mods.join('')})` : ''
    }`,
  );

  const placement = s.placedDice[s.placedDice.length - 1]!;
  runModulesOnDiePlaced(s, placement);
  if (s.result) return s;

  applyPlacementEffects(s, action.slotId, value);
  if (s.result) return s;

  if (isInternSlot(action.slotId) && s.moduleState.intern?.pendingToken) {
    s.currentPlayerId = playerId;
    return s;
  }

  if (tryTriggerSynchronisation(s)) {
    return s;
  }

  maybeEndRound(s);
  if (s.result || s.phase !== 'dice_placement') {
    return s;
  }

  nextPlayerAfterPlace(s);
  return s;
}

export function handlePlaceAbilityDie(
  state: SkyTeamState,
  playerId: string,
  action: Extract<SkyTeamAction, { type: 'place-ability-die' }>,
): SkyTeamState {
  const s = cloneState(state);
  if (s.phase !== 'dice_placement') throw new Error('ไม่ได้อยู่ในช่วงวางลูกเต๋า');
  if (isRealtimeExpired(s)) throw new Error('Real-Time: หมดเวลาแล้ว');
  if (s.rerollPending) throw new Error('กำลัง reroll อยู่');
  if (s.currentPlayerId !== playerId) throw new Error('ยังไม่ถึงเทิร์นคุณ');
  if (playerId !== s.copilotId) throw new Error('Synchronisation ต้องวางโดย Co-Pilot');

  const pendingValue = getSyncPendingValue(s);
  if (pendingValue == null) throw new Error('ไม่มี Synchronisation die ที่รอวาง');

  const mods = action.coffeeMods ?? [];
  if (mods.length > s.coffeeTokens) throw new Error('Coffee ไม่พอ');

  let value = pendingValue;
  for (const m of mods) {
    value += m;
  }
  if (value < 1 || value > 6) throw new Error('ค่าลูกเต๋าหลัง Coffee ต้องอยู่ระหว่าง 1–6');

  if (!canPlaceSyncAbilityDie(s, action.slotId, value)) {
    throw new Error('วางในช่องนี้ไม่ได้');
  }

  s.coffeeTokens -= mods.length;
  s.placedDice.push({
    dieId: `sync-ability-${s.round}-${value}`,
    slotId: action.slotId,
    color: 'orange',
    value,
    ownerId: playerId,
    source: 'ability',
  });
  clearSyncPending(s);

  appendLog(
    s,
    `Synchronisation: Co-Pilot วาง Traffic ${value} ที่ ${action.slotId}${
      mods.length ? ` (coffee ${mods.join('')})` : ''
    }`,
  );

  const placement = s.placedDice[s.placedDice.length - 1]!;
  runModulesOnDiePlaced(s, placement);
  if (s.result) return s;

  applyPlacementEffects(s, action.slotId, value);
  if (s.result) return s;

  maybeEndRound(s);
  if (s.result || s.phase !== 'dice_placement') return s;

  nextPlayerAfterPlace(s);
  return s;
}

export function handlePlaceInternToken(
  state: SkyTeamState,
  playerId: string,
  slotId: SkyTeamSlotId,
): SkyTeamState {
  const s = cloneState(state);
  if (s.phase !== 'dice_placement') throw new Error('ไม่ได้อยู่ในช่วงวางลูกเต๋า');
  if (isRealtimeExpired(s)) throw new Error('Real-Time: หมดเวลาแล้ว');
  if (s.rerollPending) throw new Error('กำลัง reroll อยู่');
  if (s.currentPlayerId !== playerId) throw new Error('ยังไม่ถึงเทิร์นคุณ');

  const intern = s.moduleState.intern;
  const pending = intern?.pendingToken;
  if (!intern || !pending || pending.ownerId !== playerId) {
    throw new Error('ไม่มี Intern token ที่รอวาง');
  }

  if (isInternSlot(slotId)) {
    throw new Error('ไม่สามารถวาง Intern token บน Intern board ได้');
  }
  if (isConcentrationSlot(slotId)) {
    throw new Error('Intern token วางบน Concentration ไม่ได้');
  }
  if (slotId === 'kerosene') {
    throw new Error('Intern token วางบน Kerosene ไม่ได้');
  }
  if (isWorkingTogetherSlot(slotId)) {
    throw new Error('Intern token วางบน Working Together ไม่ได้');
  }

  const role = roleOf(s, playerId);
  const value = pending.value;

  if (s.placedDice.some((p) => p.slotId === slotId)) {
    throw new Error('ช่องนี้มีของวางแล้ว');
  }
  if (skyTeamSwitchAlreadyOn(s.switches, slotId)) {
    throw new Error('สวิตช์เปิดอยู่แล้ว');
  }
  const def = SKY_TEAM_SLOT_DEFS[slotId];
  if (def.roles !== 'any' && !def.roles.includes(role)) {
    throw new Error('ช่องนี้ไม่ใช่สีของคุณ');
  }
  if (def.allowedValues !== 'any' && !def.allowedValues.includes(value)) {
    throw new Error('ค่า token ไม่ตรงกับช่อง');
  }
  if (slotId === 'flaps_23' && !s.switches.flaps12) throw new Error('ต้องปลด Flaps ตามลำดับ');
  if (slotId === 'flaps_34' && !s.switches.flaps23) throw new Error('ต้องปลด Flaps ตามลำดับ');
  if (slotId === 'flaps_45' && !s.switches.flaps34) throw new Error('ต้องปลด Flaps ตามลำดับ');
  if (slotId === 'brake_4' && !s.switches.brake2) throw new Error('ต้องปลดเบรกตามลำดับ');
  if (slotId === 'brake_6' && !s.switches.brake4) throw new Error('ต้องปลดเบรกตามลำดับ');
  if (isIceBrakeSlot(slotId) && !canPlaceIceBrakeSlot(s, slotId)) {
    throw new Error('ต้องปลด Ice Brakes ตามลำดับ');
  }

  const color = role === 'pilot' ? 'blue' : 'orange';
  s.placedDice.push({
    dieId: pending.tokenId,
    slotId,
    color,
    value,
    ownerId: playerId,
    source: 'intern',
  });
  clearPendingIntern(s);

  appendLog(
    s,
    `${role === 'pilot' ? 'Pilot' : 'Co-Pilot'} วาง Intern token ${value} ที่ ${slotId}`,
  );

  const placement = s.placedDice[s.placedDice.length - 1]!;
  runModulesOnDiePlaced(s, placement);
  if (s.result) return s;

  applyPlacementEffects(s, slotId, value);
  if (s.result) return s;

  if (tryTriggerSynchronisation(s)) {
    return s;
  }

  maybeEndRound(s);
  if (s.result || s.phase !== 'dice_placement') {
    return s;
  }

  nextPlayerAfterPlace(s);
  return s;
}

export function handleAnticipationRerollAction(
  state: SkyTeamState,
  playerId: string,
  dieId: string,
): SkyTeamState {
  const s = cloneState(state);
  if (isRealtimeExpired(s)) throw new Error('Real-Time: หมดเวลาแล้ว');
  handleAnticipationReroll(s, playerId, dieId);
  return s;
}

export function handleAdaptationFlipAction(
  state: SkyTeamState,
  playerId: string,
  dieId: string,
): SkyTeamState {
  const s = cloneState(state);
  if (isRealtimeExpired(s)) throw new Error('Real-Time: หมดเวลาแล้ว');
  handleAdaptationFlip(s, playerId, dieId);
  return s;
}

export function handleUseReroll(state: SkyTeamState, playerId: string): SkyTeamState {
  const s = cloneState(state);
  if (s.phase !== 'dice_placement') throw new Error('ใช้ Reroll ได้เฉพาะช่วงวางลูกเต๋า');
  if (isRealtimeExpired(s)) throw new Error('Real-Time: หมดเวลาแล้ว');
  if (s.rerollPending) throw new Error('กำลัง reroll อยู่แล้ว');
  if (s.rerollTokens <= 0) throw new Error('ไม่มี Reroll token');
  if (playerId !== s.pilotId && playerId !== s.copilotId) throw new Error('ผู้เล่นไม่ถูกต้อง');
  if (s.moduleState.intern?.pendingToken) {
    throw new Error('ต้องวาง Intern token ก่อน');
  }
  if (getSyncPendingValue(s) != null) throw new Error('ต้องวาง Synchronisation ก่อน');
  if (getWorkingTogetherPending(s)) throw new Error('ต้องจบ Working Together ก่อน');

  s.rerollTokens -= 1;
  s.rerollPending = {
    initiatedBy: playerId,
    pilotDieIds: null,
    copilotDieIds: null,
  };
  appendLog(s, 'ใช้ Reroll token — ทั้งคู่เลือกลูกเต๋าที่จะทอยใหม่');
  return s;
}

export function handleConfirmReroll(
  state: SkyTeamState,
  playerId: string,
  dieIds: string[],
): SkyTeamState {
  const s = cloneState(state);
  if (!s.rerollPending) throw new Error('ไม่มี Reroll ที่รออยู่');

  const role = roleOf(s, playerId);
  const unique = [...new Set(dieIds)];
  for (const id of unique) {
    const die = s.dice.find((d) => d.id === id);
    if (!die || !die.inHand) throw new Error('เลือกลูกเต๋าในมือเท่านั้น');
    if (role === 'pilot' && die.color !== 'blue') throw new Error('ลูกเต๋าไม่ใช่ของ Pilot');
    if (role === 'copilot' && die.color !== 'orange') throw new Error('ลูกเต๋าไม่ใช่ของ Co-Pilot');
  }

  if (role === 'pilot') {
    if (s.rerollPending.pilotDieIds) throw new Error('Pilot ยืนยัน reroll แล้ว');
    s.rerollPending.pilotDieIds = unique;
  } else {
    if (s.rerollPending.copilotDieIds) throw new Error('Co-Pilot ยืนยัน reroll แล้ว');
    s.rerollPending.copilotDieIds = unique;
  }

  if (s.rerollPending.pilotDieIds != null && s.rerollPending.copilotDieIds != null) {
    for (const id of [...s.rerollPending.pilotDieIds, ...s.rerollPending.copilotDieIds]) {
      const die = s.dice.find((d) => d.id === id);
      if (die && die.inHand) die.value = rollDie();
    }
    appendLog(s, 'Reroll เสร็จแล้ว');
    s.rerollPending = null;
  }
  return s;
}

export function handleCancelReroll(state: SkyTeamState, playerId: string): SkyTeamState {
  const s = cloneState(state);
  if (!s.rerollPending) throw new Error('ไม่มี Reroll ที่รออยู่');
  if (playerId !== s.pilotId && playerId !== s.copilotId) throw new Error('ผู้เล่นไม่ถูกต้อง');

  s.rerollTokens = Math.min(MAX_REROLL_TOKENS, s.rerollTokens + 1);
  s.rerollPending = null;
  appendLog(s, 'ยกเลิก Reroll — คืน token');
  return s;
}

export function handleSetAbilitiesModal(
  state: SkyTeamState,
  playerId: string,
  action: Extract<SkyTeamAction, { type: 'set-abilities-modal' }>,
): SkyTeamState {
  const s = cloneState(state);
  if (playerId !== s.pilotId && playerId !== s.copilotId) throw new Error('ผู้เล่นไม่ถูกต้อง');
  if (s.phase === 'ability_pick') throw new Error('ยังเลือก Special Ability ไม่เสร็จ');
  if (s.selectedSpecialAbilityIds.length === 0) {
    throw new Error('แมตช์นี้ไม่มี Special Ability');
  }

  if (!action.open) {
    s.abilitiesModal = { open: false, focusedAbilityId: null };
    return s;
  }

  let focused =
    action.focusedAbilityId === undefined
      ? s.abilitiesModal.focusedAbilityId
      : action.focusedAbilityId;

  if (focused != null && !s.selectedSpecialAbilityIds.includes(focused)) {
    throw new Error('Special Ability นี้ไม่ได้ถูกเลือกในแมตช์');
  }

  if (focused == null && s.selectedSpecialAbilityIds.length === 1) {
    focused = s.selectedSpecialAbilityIds[0]!;
  }

  s.abilitiesModal = { open: true, focusedAbilityId: focused };
  return s;
}

export function handleSetAbilityPicks(
  state: SkyTeamState,
  playerId: string,
  abilityIds: readonly string[],
): SkyTeamState {
  const s = cloneState(state);
  if (s.phase !== 'ability_pick') throw new Error('ไม่ได้อยู่ในช่วงเลือก Special Ability');
  if (playerId !== s.pilotId && playerId !== s.copilotId) throw new Error('ผู้เล่นไม่ถูกต้อง');

  const slots = getSkyTeamScenario(s.scenarioId).specialAbilitySlots;
  if (slots <= 0) throw new Error('แมตช์นี้ไม่ต้องเลือก Special Ability');

  const sanitized = sanitizeSkyTeamAbilityIds(abilityIds, slots);
  s.abilityPicksByPlayerId = {
    ...s.abilityPicksByPlayerId,
    [playerId]: sanitized,
  };
  return s;
}

export function handleConfirmAbilityPicks(state: SkyTeamState, playerId: string): SkyTeamState {
  const s = cloneState(state);
  if (s.phase !== 'ability_pick') throw new Error('ไม่ได้อยู่ในช่วงเลือก Special Ability');
  if (playerId !== s.pilotId && playerId !== s.copilotId) throw new Error('ผู้เล่นไม่ถูกต้อง');

  const slots = getSkyTeamScenario(s.scenarioId).specialAbilitySlots;
  if (slots <= 0) throw new Error('แมตช์นี้ไม่ต้องเลือก Special Ability');

  const agreed = resolveAgreedAbilityPicks(
    s.abilityPicksByPlayerId,
    [s.pilotId, s.copilotId],
    slots,
  );
  if (agreed.length !== slots) {
    throw new Error('ทั้งสองคนต้องเลือก Special Ability ให้ตรงกันก่อน');
  }

  s.selectedSpecialAbilityIds = [...agreed];
  s.specialAbilityState = setupSpecialAbilityState(agreed);
  s.abilityPicksByPlayerId = { [s.pilotId]: [], [s.copilotId]: [] };
  appendLog(s, `เลือก Special Ability: ${agreed.join(', ')}`);
  beginStrategy(s);
  return s;
}

export function applySkyTeamTimerExpiry(state: SkyTeamState): SkyTeamState {
  // Strategy has no timer — only Real-Time module ends placement early.
  if (state.phase === 'dice_placement' && isRealtimeExpired(state)) {
    const s = cloneState(state);
    clearRealtimeDeadline(s);
    s.rerollPending = null;
    clearPendingIntern(s);
    clearSyncPending(s);
    const wt = s.specialAbilityState['working-together'];
    if (wt) wt.workingTogether = undefined;
    appendLog(s, 'Real-Time: หมดเวลา — จบรอบทันที (ลูกเต๋าที่ยังไม่วางถูกเพิกเฉย)');
    endRound(s);
    return s;
  }

  return state;
}
