import type { SkyTeamRealtimeState } from 'shared';
import type { SkyTeamModuleDefinition } from './types.js';

export const REALTIME_DURATION_SECONDS = 60;

export const realtimeModule: SkyTeamModuleDefinition<SkyTeamRealtimeState> = {
  id: 'real-time',
  setup: () => ({
    deadlineAt: null,
    durationSeconds: REALTIME_DURATION_SECONDS,
  }),
};
