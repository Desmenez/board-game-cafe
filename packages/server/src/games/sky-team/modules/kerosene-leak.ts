import type { SkyTeamKeroseneLeakState } from 'shared';
import type { SkyTeamModuleDefinition } from './types.js';
import { KEROSENE_START } from './kerosene.js';

export const keroseneLeakModule: SkyTeamModuleDefinition<SkyTeamKeroseneLeakState> = {
  id: 'kerosene-leak',
  setup: () => ({
    remaining: KEROSENE_START,
  }),
};
