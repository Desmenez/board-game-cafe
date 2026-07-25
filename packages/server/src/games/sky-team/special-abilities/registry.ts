import type { SkyTeamSpecialAbilityId, SkyTeamSpecialAbilityRuntimeState } from 'shared';
import { SKY_TEAM_SPECIAL_ABILITY_DEFS } from 'shared';

export type SpecialAbilityRuntimeMap = Partial<
  Record<SkyTeamSpecialAbilityId, SkyTeamSpecialAbilityRuntimeState>
>;

/** Initialize runtime flags for lobby-selected abilities. */
export function setupSpecialAbilityState(
  selectedIds: readonly SkyTeamSpecialAbilityId[],
): SpecialAbilityRuntimeMap {
  const out: SpecialAbilityRuntimeMap = {};
  for (const id of selectedIds) {
    if (!SKY_TEAM_SPECIAL_ABILITY_DEFS[id]) continue;
    out[id] = {
      usedThisRound: false,
      usedThisGame: false,
    };
  }
  return out;
}
