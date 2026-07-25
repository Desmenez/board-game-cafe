import type { SkyTeamRealtimeState, SkyTeamState } from 'shared';
import { appendLog } from '../helpers.js';
import type { SkyTeamModuleDefinition } from './types.js';

export const REALTIME_DURATION_SECONDS = 60;

export function clearRealtimeDeadline(state: SkyTeamState): void {
  const rt = state.moduleState.realtime;
  if (rt) rt.deadlineAt = null;
}

export function startRealtimeDeadline(state: SkyTeamState): void {
  const rt = state.moduleState.realtime;
  if (!rt) return;
  rt.deadlineAt = Date.now() + rt.durationSeconds * 1000;
  appendLog(state, `Real-Time: เริ่มจับเวลา ${rt.durationSeconds} วินาที`);
}

export function isRealtimeExpired(state: SkyTeamState, now = Date.now()): boolean {
  const deadline = state.moduleState.realtime?.deadlineAt;
  if (deadline == null) return false;
  return now >= deadline;
}

export const realtimeModule: SkyTeamModuleDefinition<SkyTeamRealtimeState> = {
  id: 'real-time',
  setup: () => ({
    deadlineAt: null,
    durationSeconds: REALTIME_DURATION_SECONDS,
  }),
  onRoundStart: (state) => {
    startRealtimeDeadline(state);
    return state;
  },
};
