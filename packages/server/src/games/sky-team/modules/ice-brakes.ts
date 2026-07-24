import type { SkyTeamIceBrakesState } from 'shared';
import type { SkyTeamModuleDefinition } from './types.js';

export const iceBrakesModule: SkyTeamModuleDefinition<SkyTeamIceBrakesState> = {
  id: 'ice-brakes',
  setup: () => ({
    markerPosition: 0,
    completedLevels: [],
    pendingPairs: [],
  }),
};
