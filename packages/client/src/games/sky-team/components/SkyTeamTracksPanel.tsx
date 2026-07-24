import type { SkyTeamPlayerView } from 'shared';
import { ALTITUDE_TRACK } from 'shared';
import { cn } from '../../../utils/cn';
import { ApproachCard } from './ApproachCard';
import { AltitudeCard } from './AltitudeCard';

const stripList =
  'mx-auto mt-3 flex w-full max-w-[20rem] max-h-[min(70vh,40rem)] flex-col gap-2 overflow-y-auto overscroll-contain px-4';

type ApproachProps = {
  view: SkyTeamPlayerView;
};

/** Approach strip only — airport at top → start at bottom. */
export function SkyTeamApproachTrackPanel({ view }: ApproachProps) {
  const topFirst = [...view.approach].reverse();

  return (
    <div className={stripList}>
      {topFirst.map((space) => {
        const here = space.index === view.approachPosition;
        return (
          <div
            key={space.index}
            className={cn(
              'w-full shrink-0 overflow-hidden rounded-lg',
              here && 'shadow-[0_0_0_2px_#fbbf24,0_0_10px_rgba(251,191,36,0.35)]',
            )}
          >
            <ApproachCard
              base={space.base}
              planes={space.planes}
              strip
              label={here ? 'คุณอยู่ที่นี่' : undefined}
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
