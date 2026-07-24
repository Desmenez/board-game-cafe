import type { SkyTeamPlayerView } from 'shared';
import { SKY_TEAM_MODULE_META, SKY_TEAM_SPECIAL_ABILITY_DEFS } from 'shared';

/** Compact readout of lobby-selected expansions + live module meters. */
export function SkyTeamModuleSummary({ view }: { view: SkyTeamPlayerView }) {
  if (view.enabledModules.length === 0 && view.selectedSpecialAbilityIds.length === 0) {
    return null;
  }

  const kerosene = view.moduleState.kerosene;
  const traffic = view.moduleState.trafficDie;

  return (
    <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs">
      {view.enabledModules.length > 0 && (
        <p className="m-0">
          <span className="font-semibold text-white/80">Modules: </span>
          {view.enabledModules.map((id) => SKY_TEAM_MODULE_META[id].name).join(' · ')}
        </p>
      )}
      {view.selectedSpecialAbilityIds.length > 0 && (
        <p className="mt-1 mb-0">
          <span className="font-semibold text-white/80">Abilities: </span>
          {view.selectedSpecialAbilityIds
            .map((id) => SKY_TEAM_SPECIAL_ABILITY_DEFS[id].name)
            .join(' · ')}
        </p>
      )}
      {kerosene && (
        <p className="mt-1 mb-0 text-amber-100/90">
          Kerosene: {kerosene.remaining}
          {kerosene.diePlacedThisRound ? ' · fueled' : ''}
        </p>
      )}
      {traffic && (
        <p className="mt-1 mb-0 text-sky-100/90">
          Traffic supply: {traffic.remainingAirplaneTokens}
          {traffic.lastRolls.length > 0
            ? ` · rolled ${traffic.lastRolls.join(', ')}`
            : ''}
        </p>
      )}
      {view.enabledModules.includes('turns') && (
        <p className="mt-1 mb-0 text-white/70">
          Turns: axis {view.axisPosition} (ต้องตรงช่องตอนเดินหน้า)
        </p>
      )}
    </div>
  );
}
