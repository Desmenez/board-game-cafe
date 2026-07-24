import type { SkyTeamPlacedDie, SkyTeamSlotId, SkyTeamState } from 'shared';
import {
  AXIS_SPIN_THRESHOLD,
  MAX_COFFEE_TOKENS,
} from 'shared';
import {
  appendLog,
  atAirport,
  isFinalRound,
  lose,
  slotOccupied,
} from './helpers.js';

function placedOn(state: SkyTeamState, slotId: SkyTeamSlotId): SkyTeamPlacedDie | undefined {
  return state.placedDice.find((p) => p.slotId === slotId);
}

export function resolveAxisIfReady(state: SkyTeamState): void {
  const pilot = placedOn(state, 'axis_pilot');
  const copilot = placedOn(state, 'axis_copilot');
  if (!pilot || !copilot) return;
  // Only resolve once when the second die just completed the pair — check both present
  // Re-entry safe: we recompute absolute tilt from values each time pair is complete.
  // Track whether we already applied this round via lastSpeed-like flag? Use event or
  // store axisResolvedRound. Simpler: apply only when both just became present —
  // call only right after placing on axis.

  const diff = Math.abs(pilot.value - copilot.value);
  if (diff === 0) {
    appendLog(state, 'Axis: ลูกเต๋าเท่ากัน — ไม่เอียง');
    return;
  }
  const towardPilot = pilot.value > copilot.value;
  const delta = towardPilot ? diff : -diff;
  state.axisPosition += delta;
  appendLog(
    state,
    `Axis: เอียง ${diff} ขีดไปทาง${towardPilot ? 'Pilot' : 'Co-Pilot'} (ตำแหน่ง ${state.axisPosition})`,
  );
  if (Math.abs(state.axisPosition) >= AXIS_SPIN_THRESHOLD) {
    lose(state, 'axis_spin', 'เครื่องหมุน (Axis หลุดขีดแดง) — แพ้');
  }
}

export function advanceApproach(state: SkyTeamState, steps: number): void {
  if (steps <= 0) return;

  if (atAirport(state)) {
    lose(state, 'overshoot', 'เลยสนามบิน (Overshoot) — แพ้');
    return;
  }

  for (let i = 0; i < steps; i++) {
    // Collision if current space still has planes when we try to leave it
    const current = state.approach[state.approachPosition];
    if (current && current.planes > 0) {
      lose(state, 'collision', 'ชนเครื่องบินบน Approach — แพ้');
      return;
    }

    const nextIndex = state.approachPosition + 1;
    if (nextIndex >= state.approach.length) {
      lose(state, 'overshoot', 'เลยสนามบิน (Overshoot) — แพ้');
      return;
    }
    state.approachPosition = nextIndex;
  }
  appendLog(state, `Engine: เดินหน้า Approach ${steps} ช่อง`);
}

export function resolveEngineIfReady(state: SkyTeamState): void {
  const pilot = placedOn(state, 'engine_pilot');
  const copilot = placedOn(state, 'engine_copilot');
  if (!pilot || !copilot) return;
  if (state.lastSpeed != null) return; // already resolved this round

  const speed = pilot.value + copilot.value;
  state.lastSpeed = speed;

  if (isFinalRound(state)) {
    appendLog(state, `Engine (รอบสุดท้าย): ความเร็ว ${speed} vs เบรก ${state.brakeLevel}`);
    if (state.brakeLevel < 2 || speed >= state.brakeLevel) {
      lose(
        state,
        'brake_fail',
        `เบรกไม่พอ (ความเร็ว ${speed} / เบรก ${state.brakeLevel}) — แพ้`,
      );
    }
    return;
  }

  // Holding pattern over airport: must not advance
  if (atAirport(state)) {
    if (speed > state.blueAerodynamic) {
      lose(state, 'overshoot', 'Holding pattern — ความเร็วสูงเกินไป เลยสนามบิน — แพ้');
      return;
    }
    appendLog(state, `Engine: Holding ที่สนามบิน — ความเร็ว ${speed} (ไม่เดินหน้า)`);
    return;
  }

  let steps = 0;
  if (speed <= state.blueAerodynamic) {
    steps = 0;
  } else if (speed > state.orangeAerodynamic) {
    steps = 2;
  } else {
    steps = 1;
  }
  appendLog(
    state,
    `Engine: ความเร็ว ${speed} (blue≤${state.blueAerodynamic} / orange≤${state.orangeAerodynamic}) → เดิน ${steps}`,
  );
  advanceApproach(state, steps);
}

export function resolveRadio(state: SkyTeamState, value: number): void {
  // Die value 1 = current position; count value spaces starting at current
  const targetIndex = state.approachPosition + (value - 1);
  const space = state.approach[targetIndex];
  if (!space || space.planes <= 0) {
    appendLog(state, `Radio ${value}: ไม่มีเครื่องบินในช่องนั้น`);
    return;
  }
  space.planes -= 1;
  appendLog(state, `Radio ${value}: เคลียร์เครื่องบินที่ช่อง +${value - 1} (เหลือ ${space.planes})`);
}

export function resolveLandingGear(state: SkyTeamState, slotId: SkyTeamSlotId): void {
  const key =
    slotId === 'gear_12' ? 'gear12' : slotId === 'gear_34' ? 'gear34' : slotId === 'gear_56' ? 'gear56' : null;
  if (!key) return;
  if (state.switches[key]) {
    appendLog(state, 'Landing Gear: สวิตช์เปิดอยู่แล้ว — ไม่มีผล');
    return;
  }
  state.switches[key] = true;
  state.blueAerodynamic += 1;
  appendLog(state, `Landing Gear: เปิด ${key} — Blue aero → ${state.blueAerodynamic}`);
}

export function resolveFlaps(state: SkyTeamState, slotId: SkyTeamSlotId): void {
  const map = {
    flaps_12: 'flaps12',
    flaps_23: 'flaps23',
    flaps_34: 'flaps34',
    flaps_45: 'flaps45',
  } as const;
  const key = map[slotId as keyof typeof map];
  if (!key) return;
  if (state.switches[key]) {
    appendLog(state, 'Flaps: สวิตช์เปิดอยู่แล้ว — ไม่มีผล');
    return;
  }
  state.switches[key] = true;
  state.orangeAerodynamic += 1;
  appendLog(state, `Flaps: เปิด ${key} — Orange aero → ${state.orangeAerodynamic}`);
}

export function resolveBrake(state: SkyTeamState, slotId: SkyTeamSlotId): void {
  if (slotId === 'brake_2') {
    if (state.switches.brake2) return;
    state.switches.brake2 = true;
    state.brakeLevel = 2;
    appendLog(state, 'Brakes: เปิด 2');
  } else if (slotId === 'brake_4') {
    if (state.switches.brake4) return;
    state.switches.brake4 = true;
    state.brakeLevel = 4;
    appendLog(state, 'Brakes: เปิด 4');
  } else if (slotId === 'brake_6') {
    if (state.switches.brake6) return;
    state.switches.brake6 = true;
    state.brakeLevel = 6;
    appendLog(state, 'Brakes: เปิด 6');
  }
}

export function resolveConcentration(state: SkyTeamState): void {
  if (state.coffeeTokens >= MAX_COFFEE_TOKENS) {
    appendLog(state, 'Concentration: Coffee เต็มแล้ว (3)');
    return;
  }
  state.coffeeTokens += 1;
  appendLog(state, `Concentration: ได้ Coffee (รวม ${state.coffeeTokens})`);
}

export function applyPlacementEffects(
  state: SkyTeamState,
  slotId: SkyTeamSlotId,
  value: number,
): void {
  const section = slotId.startsWith('axis')
    ? 'axis'
    : slotId.startsWith('engine')
      ? 'engine'
      : slotId.startsWith('radio')
        ? 'radio'
        : slotId.startsWith('gear')
          ? 'gear'
          : slotId.startsWith('flaps')
            ? 'flaps'
            : slotId.startsWith('brake')
              ? 'brake'
              : 'concentration';

  switch (section) {
    case 'axis':
      if (slotOccupied(state, 'axis_pilot') && slotOccupied(state, 'axis_copilot')) {
        resolveAxisIfReady(state);
      }
      break;
    case 'engine':
      if (slotOccupied(state, 'engine_pilot') && slotOccupied(state, 'engine_copilot')) {
        resolveEngineIfReady(state);
      }
      break;
    case 'radio':
      resolveRadio(state, value);
      break;
    case 'gear':
      resolveLandingGear(state, slotId);
      break;
    case 'flaps':
      resolveFlaps(state, slotId);
      break;
    case 'brake':
      resolveBrake(state, slotId);
      break;
    case 'concentration':
      resolveConcentration(state);
      break;
  }
}
