import type { ComponentType, SVGProps } from 'react';
import { getSkyTeamScenario } from 'shared';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import '../../../components/game-lobby-options/sky-team/sky-team-lobby-options.css';

type FlagSvgProps = SVGProps<SVGSVGElement>;
type FlagComponent = ComponentType<FlagSvgProps>;

function ScenarioCountryFlag({ countryCode }: { countryCode: string }) {
  const code = countryCode.trim().toUpperCase();
  const Flag = (FlagIcons as Record<string, FlagComponent | undefined>)[code];
  if (!Flag) return <span className="st-scenario-card__flag-fallback" />;
  return <Flag className="st-scenario-card__flag" />;
}

type Props = {
  scenarioId: string;
  /** Fallback title if scenario lookup fails. */
  scenarioName: string;
  tierLabel: string;
};

/**
 * Compact lobby-style scenario chrome for the Approach track drawer
 * (header + slim location art — no modules body).
 */
export function SkyTeamScenarioDrawerHeader({ scenarioId, scenarioName }: Props) {
  const scenario = getSkyTeamScenario(scenarioId);
  const code = scenario.code;
  const shortName = scenario.shortName || scenarioName;
  const art = imageMap.skyTeam.scenarios[scenarioId];

  return (
    <div className={cn('st-scenario-card', `st-scenario-card--${scenario.tier}`, 'st-scenario-drawer-head')}>
      <header className="st-scenario-card__header">
        <span className="st-scenario-card__dot" aria-hidden />
        <div className="st-scenario-card__titles">
          <span className="st-scenario-card__code">{code}</span>
          <span className="st-scenario-card__short">{shortName}</span>
        </div>
        <span className="st-scenario-card__stamp" aria-hidden>
          <span className="st-scenario-card__stamp-ring">
            <ScenarioCountryFlag countryCode={scenario.countryCode} />
          </span>
        </span>
      </header>
      <div className="st-scenario-drawer-head__art" aria-hidden>
        {art ? (
          <img src={art} alt="" className="st-scenario-drawer-head__art-img object-cover!" draggable={false} />
        ) : (
          <div className="st-scenario-drawer-head__art-fallback" />
        )}
      </div>
    </div>
  );
}
