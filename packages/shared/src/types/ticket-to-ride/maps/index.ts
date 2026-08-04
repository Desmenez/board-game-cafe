import type { TtrMapDefinition, TtrMapId } from '../model.js';
import { TTR_EUROPE_MAP } from './europe.js';
import { TTR_INDIA_MAP } from './india.js';
import { TTR_UNITED_STATES_MAP } from './united-states.js';

export { TTR_EUROPE_MAP, TTR_INDIA_MAP, TTR_UNITED_STATES_MAP };

export const TTR_DEFAULT_MAP_ID: TtrMapId = 'united-states';

export const TTR_MAPS: Readonly<Record<TtrMapId, TtrMapDefinition>> = {
  'united-states': TTR_UNITED_STATES_MAP,
  europe: TTR_EUROPE_MAP,
  india: TTR_INDIA_MAP,
};

export const TTR_MAP_IDS: readonly TtrMapId[] = Object.keys(TTR_MAPS) as TtrMapId[];

export function isTtrMapId(value: unknown): value is TtrMapId {
  return typeof value === 'string' && value in TTR_MAPS;
}

/** Unknown ids fall back to the default map so a stale lobby option can never break setup. */
export function getTtrMap(mapId: TtrMapId | string | undefined): TtrMapDefinition {
  return isTtrMapId(mapId) ? TTR_MAPS[mapId] : TTR_MAPS[TTR_DEFAULT_MAP_ID];
}
