import type { TtrMapDefinition, TtrRouteDef } from './model.js';

export interface TtrMapIndex {
  cityNameById: Readonly<Record<string, string>>;
  routeById: Readonly<Record<string, TtrRouteDef>>;
  routeIdsByGroup: Readonly<Record<string, string[]>>;
}

const CACHE = new WeakMap<TtrMapDefinition, TtrMapIndex>();

/** Lookup tables for a map. Cached per definition so callers can index freely. */
export function ttrMapIndex(map: TtrMapDefinition): TtrMapIndex {
  const cached = CACHE.get(map);
  if (cached) return cached;

  const cityNameById: Record<string, string> = {};
  for (const c of map.cities) cityNameById[c.id] = c.name;

  const routeById: Record<string, TtrRouteDef> = {};
  const routeIdsByGroup: Record<string, string[]> = {};
  for (const r of map.routes) {
    routeById[r.id] = r;
    (routeIdsByGroup[r.groupId] ??= []).push(r.id);
  }

  const index: TtrMapIndex = { cityNameById, routeById, routeIdsByGroup };
  CACHE.set(map, index);
  return index;
}

export function ttrCityName(map: TtrMapDefinition, cityId: string): string {
  return ttrMapIndex(map).cityNameById[cityId] ?? cityId;
}
