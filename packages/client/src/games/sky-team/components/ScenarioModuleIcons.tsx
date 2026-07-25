import type { SkyTeamModuleId } from 'shared';
import { SKY_TEAM_MODULE_META } from 'shared';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';

type Props = {
  modules: readonly SkyTeamModuleId[];
  className?: string;
};

/**
 * Printed Special Module tokens for the scenario card header
 * (e.g. Kerosene truck on OSL). Skips modules without art (Traffic Die / Turns).
 */
export function ScenarioModuleIcons({ modules, className }: Props) {
  const icons = modules
    .map((id) => {
      const src = imageMap.skyTeam.modules[id];
      if (!src) return null;
      return { id, src, name: SKY_TEAM_MODULE_META[id]?.name ?? id };
    })
    .filter((x): x is { id: SkyTeamModuleId; src: string; name: string } => x != null);

  if (icons.length === 0) return null;

  return (
    <ul className={cn('st-scenario-card__modules', className)} aria-label="Special modules">
      {icons.map(({ id, src, name }) => (
        <li key={id} className="st-scenario-card__module" title={name}>
          <img src={src} alt={name} draggable={false} />
        </li>
      ))}
    </ul>
  );
}
