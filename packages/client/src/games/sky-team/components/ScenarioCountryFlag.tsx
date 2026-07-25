import type { ComponentType, SVGProps } from 'react';
import * as FlagIcons from 'country-flag-icons/react/3x2';

type FlagSvgProps = SVGProps<SVGSVGElement>;
type FlagComponent = ComponentType<FlagSvgProps>;

export function ScenarioCountryFlag({ countryCode }: { countryCode: string }) {
  const code = countryCode.trim().toUpperCase();
  const Flag = (FlagIcons as Record<string, FlagComponent | undefined>)[code];
  if (!Flag) return <span className="st-scenario-card__flag-fallback" />;
  return <Flag className="st-scenario-card__flag" />;
}
