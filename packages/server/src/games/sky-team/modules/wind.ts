import type { SkyTeamWindState } from 'shared';
import type { SkyTeamModuleDefinition } from './types.js';

/** Center index on the Wind ring (Milestone 3). */
export const WIND_CENTER_POSITION = 0;

export const windModule: SkyTeamModuleDefinition<SkyTeamWindState> = {
  id: 'wind',
  setup: () => ({
    position: WIND_CENTER_POSITION,
    modifier: 0,
  }),
};
