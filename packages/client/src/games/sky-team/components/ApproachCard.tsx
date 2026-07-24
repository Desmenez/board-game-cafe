import type { ApproachBase } from 'shared';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';

type Props = {
  base: ApproachBase;
  planes?: number;
  compact?: boolean;
  /** Fill a board well — no chrome, art covers the bay. */
  bay?: boolean;
  /** Smaller card in vertical track modal. */
  strip?: boolean;
  label?: string;
  className?: string;
};

export function ApproachCard({
  base,
  planes = 0,
  compact = false,
  bay = false,
  strip = false,
  label,
  className,
}: Props) {
  const src =
    base === 'airport'
      ? imageMap.skyTeam.approachAirport
      : base === 'cloud'
        ? imageMap.skyTeam.approachCloud
        : imageMap.skyTeam.approachSky;

  const planeOverlay =
    planes > 0 ? (
      <div
        className={cn(
          'pointer-events-none absolute inset-0 flex flex-wrap items-center justify-center',
          strip ? 'gap-0.5 p-1' : 'gap-0.5 p-1.5',
          bay && 'gap-0.5 p-1',
        )}
        aria-label={`${planes} airplanes`}
      >
        {Array.from({ length: Math.min(planes, 6) }, (_, i) => (
          <img
            key={i}
            src={imageMap.skyTeam.planeToken}
            alt=""
            className={cn(
              'invert',
              strip ? 'w-[18%] max-w-7' : 'w-[28%] max-w-12',
              bay && 'w-[22%] max-w-none',
            )}
            draggable={false}
          />
        ))}
        {planes > 6 && (
          <span className="text-[0.65rem] font-semibold text-white">+{planes - 6}</span>
        )}
      </div>
    ) : null;

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        !bay && 'rounded-xl border border-white/12',
        bay && 'h-full w-full rounded-none border-0 bg-transparent overflow-visible',
        strip && 'rounded-md',
        className,
      )}
    >
      {strip ? (
        <div className="relative aspect-[340/188] overflow-hidden">
          <img
            src={src}
            alt=""
            className="block h-full w-full object-cover object-center"
            draggable={false}
          />
          {planeOverlay}
        </div>
      ) : (
        <>
          <img
            src={src}
            alt=""
            className={cn(
              'block w-full',
              bay ? 'h-full object-contain object-center' : 'h-auto',
            )}
            draggable={false}
          />
          {planeOverlay}
        </>
      )}
      {label && !bay && (
        <span
          className={cn(
            'flex items-center justify-between bg-black/45 px-1.5 py-0.5 text-center text-white',
            strip ? 'text-[0.6rem]' : compact ? 'text-xs' : 'text-xs',
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
