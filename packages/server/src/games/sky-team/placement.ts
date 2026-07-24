import type { SkyTeamAction, SkyTeamState } from 'shared';
import { endRound } from './endRound.js';
import {
  appendLog,
  canPlaceInSlot,
  cloneState,
  nextPlayerAfterPlace,
  roleOf,
  rollDie,
  startDicePlacement,
} from './helpers.js';
import { applyPlacementEffects } from './resolve.js';
import { runModulesOnDiePlaced } from './modules/registry.js';

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

export function handlePlaceDie(
  state: SkyTeamState,
  playerId: string,
  action: Extract<SkyTeamAction, { type: 'place-die' }>,
): SkyTeamState {
  const s = cloneState(state);
  if (s.phase !== 'dice_placement') throw new Error('ไม่ได้อยู่ในช่วงวางลูกเต๋า');
  if (s.rerollPending) throw new Error('กำลัง reroll อยู่');
  if (s.currentPlayerId !== playerId) throw new Error('ยังไม่ถึงเทิร์นคุณ');

  const die = s.dice.find((d) => d.id === action.dieId);
  if (!die || !die.inHand) throw new Error('ไม่พบลูกเต๋านี้');

  const role = roleOf(s, playerId);
  if ((role === 'pilot' && die.color !== 'blue') || (role === 'copilot' && die.color !== 'orange')) {
    throw new Error('ลูกเต๋านี้ไม่ใช่ของคุณ');
  }

  const mods = action.coffeeMods ?? [];
  if (mods.length > s.coffeeTokens) throw new Error('Coffee ไม่พอ');

  let value = die.value;
  for (const m of mods) {
    value += m;
  }
  if (value < 1 || value > 6) throw new Error('ค่าลูกเต๋าหลัง Coffee ต้องอยู่ระหว่าง 1–6');

  if (!canPlaceInSlot(s, playerId, action.slotId, value)) {
    throw new Error('วางในช่องนี้ไม่ได้');
  }

  s.coffeeTokens -= mods.length;
  die.inHand = false;
  die.value = value;
  s.placedDice.push({
    dieId: die.id,
    slotId: action.slotId,
    color: die.color,
    value,
    ownerId: playerId,
  });

  appendLog(
    s,
    `${role === 'pilot' ? 'Pilot' : 'Co-Pilot'} วาง ${value} ที่ ${action.slotId}${
      mods.length ? ` (coffee ${mods.join('')})` : ''
    }`,
  );

  applyPlacementEffects(s, action.slotId, value);
  if (s.result) return s;

  const placement = s.placedDice[s.placedDice.length - 1]!;
  runModulesOnDiePlaced(s, placement);
  if (s.result) return s;

  if (s.placedDice.length >= 8) {
    endRound(s);
    return s;
  }

  nextPlayerAfterPlace(s);
  return s;
}

export function handleUseReroll(state: SkyTeamState, playerId: string): SkyTeamState {
  const s = cloneState(state);
  if (s.phase !== 'dice_placement') throw new Error('ใช้ Reroll ได้เฉพาะช่วงวางลูกเต๋า');
  if (s.rerollPending) throw new Error('กำลัง reroll อยู่แล้ว');
  if (s.rerollTokens <= 0) throw new Error('ไม่มี Reroll token');
  if (playerId !== s.pilotId && playerId !== s.copilotId) throw new Error('ผู้เล่นไม่ถูกต้อง');

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

export function applySkyTeamTimerExpiry(state: SkyTeamState): SkyTeamState {
  if (state.phase !== 'strategy') return state;
  if (state.strategyEndsAtMs == null) return state;
  if (Date.now() < state.strategyEndsAtMs) return state;
  const s = cloneState(state);
  appendLog(s, 'หมดเวลา Strategy — เริ่มทอยลูกเต๋า');
  startDicePlacement(s);
  return s;
}
