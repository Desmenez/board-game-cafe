import type { SkyTeamApproachSpaceState, SkyTeamModuleId, SkyTeamPlayerView } from 'shared';
import { ALTITUDE_TRACK } from 'shared';
import { cn } from '../../../utils/cn';
import { approachCardOverlays } from '../approachMarks';
import { ApproachCard } from './ApproachCard';
import { AltitudeCard } from './AltitudeCard';

const stripList =
  'mx-auto mt-3 flex w-full max-w-[20rem] max-h-[min(70vh,40rem)] flex-col gap-2 overflow-y-auto overscroll-contain px-4 pb-4';

type ApproachProps = {
  approach: SkyTeamApproachSpaceState[];
  enabledModules: readonly SkyTeamModuleId[];
  /** Current plane space — omit in lobby preview (no highlight). */
  approachPosition?: number;
};

/** Approach strip only — airport at top → start at bottom. */
export function SkyTeamApproachTrackPanel({
  approach,
  enabledModules,
  approachPosition,
}: ApproachProps) {
  const topFirst = [...approach].reverse();

  return (
    <div className={stripList}>
      {topFirst.map((space) => {
        const here = approachPosition != null && space.index === approachPosition;
        const overlays = approachCardOverlays(space, { enabledModules });
        const axisHint =
          enabledModules.includes('turns') &&
          space.allowedAxisPositions &&
          space.allowedAxisPositions.length > 0
            ? `Axis ${space.allowedAxisPositions.join('/')}`
            : undefined;
        const trafficHint =
          space.planes > 0 ? `Airplane ×${space.planes}` : 'ไม่มี airplane token';
        const labelParts = [
          here ? 'คุณอยู่ที่นี่' : null,
          trafficHint,
          axisHint,
        ].filter(Boolean);

        return (
          <div
            key={`${space.index}-${space.planes}`}
            className={cn(
              'w-full shrink-0 overflow-hidden rounded-lg',
              here && 'shadow-[0_0_0_2px_#fbbf24,0_0_10px_rgba(251,191,36,0.35)]',
            )}
          >
            <ApproachCard
              base={space.base}
              // Live tokens only — printed setup icons never change after Radio.
              printedPlanes={0}
              planes={space.planes}
              topMarks={overlays.topMarks}
              dieWell={overlays.dieWell}
              strip
              label={labelParts.join(' · ')}
            />
          </div>
        );
      })}
    </div>
  );
}

type AltitudeProps = {
  view: SkyTeamPlayerView;
};

/** Altitude strip only — landing at top → 6000 at bottom. */
export function SkyTeamAltitudeTrackPanel({ view }: AltitudeProps) {
  const topFirst = [...ALTITUDE_TRACK].reverse();

  return (
    <div className={stripList}>
      {topFirst.map((step) => {
        const trackIndex = ALTITUDE_TRACK.findIndex((s) => s.feet === step.feet);
        const here = trackIndex === view.altitudeIndex;
        return (
          <div
            key={step.feet}
            className={cn(
              'w-full shrink-0 overflow-hidden rounded-lg',
              here && 'shadow-[0_0_0_2px_#fbbf24,0_0_10px_rgba(251,191,36,0.35)]',
            )}
          >
            <AltitudeCard
              feet={step.feet}
              isAirplane={step.isAirplane}
              firstPlayer={step.firstPlayer}
              strip
            />
          </div>
        );
      })}
    </div>
  );
}
