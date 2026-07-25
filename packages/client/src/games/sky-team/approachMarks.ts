import type { SkyTeamApproachSpaceState } from 'shared';
import type { ApproachDieWell, ApproachTopMark } from './components/ApproachCard';

/** Axis dial ticks shown on approach cards (left → right). */
const AXIS_DIAL_POSITIONS = [-2, -1, 0, 1, 2] as const;

/**
 * Printed Turns dial on the approach strip (axis −2‥2).
 * Always shown when the scenario space has `allowedAxisPositions` — the module
 * only controls whether illegal axis fails the advance.
 * Forbidden → red X; center allowed → black triangle; side allowed → green outline.
 */
export function turnsTopMarks(space: SkyTeamApproachSpaceState): ApproachTopMark[] {
  const allowed = space.allowedAxisPositions;
  if (!allowed || allowed.length === 0) return [];

  const allowedSet = new Set(allowed);
  return AXIS_DIAL_POSITIONS.map((pos) => {
    if (!allowedSet.has(pos)) return 'ban';
    if (pos === 0) return 'arrow-down';
    return 'arrow-right';
  });
}

/**
 * Printed Traffic Die icons on the approach strip.
 * Always shown when the scenario space has `trafficDieRolls` — the module only
 * controls whether those icons actually roll at round start.
 */
export function trafficDieWell(space: SkyTeamApproachSpaceState): ApproachDieWell {
  const rolls = space.trafficDieRolls ?? 0;
  if (rolls <= 0) return false;
  const slots = Math.min(4, Math.max(1, rolls)) as 1 | 2 | 3 | 4;
  return { slots };
}

export function approachCardOverlays(
  space: SkyTeamApproachSpaceState,
): { topMarks: ApproachTopMark[]; dieWell: ApproachDieWell } {
  return {
    topMarks: turnsTopMarks(space),
    dieWell: trafficDieWell(space),
  };
}
