import type { SkyTeamApproachSpaceState, SkyTeamModuleId, SkyTeamPlayerView } from 'shared';
import { skyTeamHasModule } from 'shared';
import type { ApproachDieWell, ApproachTopMark } from './components/ApproachCard';

/** Axis dial ticks shown on approach cards (left → right). */
const AXIS_DIAL_POSITIONS = [-2, -1, 0, 1, 2] as const;

function has(modules: readonly SkyTeamModuleId[], id: SkyTeamModuleId): boolean {
  return skyTeamHasModule(modules, id);
}

/**
 * Turns: always 5 marks for axis −2‥2 when this space has turn constraints.
 * Forbidden → red X; center allowed → black triangle; side allowed → green outline.
 */
export function turnsTopMarks(
  space: SkyTeamApproachSpaceState,
  enabledModules: readonly SkyTeamModuleId[],
): ApproachTopMark[] {
  if (!has(enabledModules, 'turns')) return [];
  const allowed = space.allowedAxisPositions;
  if (!allowed || allowed.length === 0) return [];

  const allowedSet = new Set(allowed);
  return AXIS_DIAL_POSITIONS.map((pos) => {
    if (!allowedSet.has(pos)) return 'ban';
    if (pos === 0) return 'arrow-down';
    return 'arrow-right';
  });
}

/** Traffic Die: empty die icons = how many rolls when stopping here. */
export function trafficDieWell(
  space: SkyTeamApproachSpaceState,
  enabledModules: readonly SkyTeamModuleId[],
): ApproachDieWell {
  if (!has(enabledModules, 'traffic-die')) return false;
  const rolls = space.trafficDieRolls ?? 0;
  if (rolls <= 0) return false;
  const slots = Math.min(3, Math.max(1, rolls)) as 1 | 2 | 3;
  return { slots };
}

export function approachCardOverlays(
  space: SkyTeamApproachSpaceState,
  view: Pick<SkyTeamPlayerView, 'enabledModules'>,
): { topMarks: ApproachTopMark[]; dieWell: ApproachDieWell } {
  return {
    topMarks: turnsTopMarks(space, view.enabledModules),
    dieWell: trafficDieWell(space, view.enabledModules),
  };
}
