import type { SkyTeamInternState } from 'shared';
import type { SkyTeamModuleDefinition } from './types.js';

export const internModule: SkyTeamModuleDefinition<SkyTeamInternState> = {
  id: 'intern',
  setup: () => ({
    // Milestone 3: shuffle face-up tokens onto the Intern board
    tokens: [],
  }),
};
