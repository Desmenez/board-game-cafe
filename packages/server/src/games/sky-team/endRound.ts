import type { SkyTeamState } from 'shared';
import {
  allSwitchesGreen,
  appendLog,
  atAirport,
  axisIsLevel,
  beginStrategy,
  currentAltitude,
  lose,
  mandatoryFilled,
  noPlanesLeft,
  win,
} from './helpers.js';
import { runModulesEndRound, runModulesValidateFinalLanding } from './modules/registry.js';
import { clearRealtimeDeadline } from './modules/realtime.js';

export function endRound(state: SkyTeamState): void {
  state.phase = 'end_round';
  state.currentPlayerId = null;
  state.rerollPending = null;
  clearRealtimeDeadline(state);

  if (!mandatoryFilled(state)) {
    lose(state, 'missing_mandatory', 'ไม่ได้วาง Axis/Engines ครบทั้งสองสี — แพ้');
    return;
  }

  if (state.result) return;

  runModulesEndRound(state);
  if (state.result) return;

  // Descend altitude
  if (state.altitudeIndex < 6) {
    state.altitudeIndex += 1;
  }
  const alt = currentAltitude(state);
  appendLog(state, `ลดความสูง → ${alt.isAirplane ? 'Airplane / ลงจอด' : `${alt.feet} ft`}`);

  // Crash before airport
  if (alt.isAirplane && !atAirport(state)) {
    lose(state, 'crash_before_airport', 'ถึงพื้นก่อนถึงสนามบิน — แพ้');
    return;
  }

  // Final landing check when both airport + airplane altitude
  if (alt.isAirplane && atAirport(state)) {
    checkLandingVictory(state);
    return;
  }

  // Next round
  state.round += 1;
  state.placedDice = [];
  for (const die of state.dice) {
    die.inHand = true;
  }
  state.lastSpeed = null;
  beginStrategy(state);
}

function checkLandingVictory(state: SkyTeamState): void {
  const speed = state.lastSpeed ?? 99;
  const okPlanes = noPlanesLeft(state);
  const okSwitches = allSwitchesGreen(state.switches);
  const okAxis = axisIsLevel(state);
  const okBrake = state.brakeLevel >= 2 && speed < state.brakeLevel;

  if (okPlanes && okSwitches && okAxis && okBrake) {
    const moduleFail = runModulesValidateFinalLanding(state);
    if (moduleFail) {
      const reason = moduleFail.includes('Ice Brakes')
        ? 'ice_brakes_incomplete'
        : 'intern_untrained';
      lose(state, reason, moduleFail);
      return;
    }
    win(state, 'ลงจอดสำเร็จ! ผู้โดยสารปรบมือ');
    return;
  }

  // Sole brake failure — dedicated lose reason so the client shows brake-fail art.
  if (!okBrake && okPlanes && okSwitches && okAxis) {
    lose(state, 'brake_fail', `เบรกไม่พอ (ความเร็ว ${speed} / เบรก ${state.brakeLevel}) — แพ้`);
    return;
  }

  const parts: string[] = [];
  if (!okPlanes) parts.push('ยังมีเครื่องบินบน Approach');
  if (!okSwitches) parts.push('Landing Gear/Flaps ไม่ครบ');
  if (!okAxis) parts.push('Axis ไม่ตรง');
  if (!okBrake) parts.push(`เบรกไม่พอ (speed ${speed} / brake ${state.brakeLevel})`);
  lose(state, 'incomplete_landing', `ลงจอดไม่สำเร็จ — ${parts.join(', ')}`);
}
