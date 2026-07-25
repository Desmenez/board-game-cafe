import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';

/** Keep in sync with SkyTeamTracksPanel REROLL_GRANT_MS. */
export const ALTITUDE_REROLL_GRANT_MS = 700;

type Props = {
  feet: number;
  isAirplane?: boolean;
  firstPlayer?: 'pilot' | 'copilot';
  compact?: boolean;
  /** Fill a board well — art only. */
  bay?: boolean;
  /** Smaller card in vertical track modal. */
  strip?: boolean;
  /** Rising edge: pop Reroll token overlay (round-start grant). */
  playRerollGrant?: boolean;
  className?: string;
};

export function AltitudeCard({
  feet,
  isAirplane = false,
  firstPlayer,
  compact = false,
  bay = false,
  strip = false,
  playRerollGrant = false,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();
  const src = imageMap.skyTeam.altitude[feet] ?? imageMap.skyTeam.altitude[0];
  return (
    <div
      className={cn(
        'relative',
        !bay && 'rounded-xl border border-white/12',
        !bay && !playRerollGrant && 'overflow-hidden',
        bay && 'h-full w-full rounded-none border-0 bg-transparent overflow-visible',
        strip && 'rounded-md',
        className,
      )}
    >
      {strip ? (
        <div className="aspect-[340/188] overflow-hidden">
          <img
            src={src}
            alt=""
            className="block h-full w-full object-cover object-center"
            draggable={false}
          />
        </div>
      ) : (
        <img
          src={src}
          alt=""
          className={cn('block w-full', bay ? 'h-full object-contain object-center' : 'h-auto')}
          draggable={false}
        />
      )}
      <AnimatePresence>
        {playRerollGrant && (
          <motion.div
            key="reroll-grant"
            className="st-altitude-reroll-grant"
            initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.35, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: -8 }}
            transition={{
              duration: reduceMotion ? 0 : ALTITUDE_REROLL_GRANT_MS / 1000,
              ease: [0.22, 1, 0.36, 1],
            }}
            aria-label="ได้รับ Reroll token"
          >
            <img src={imageMap.skyTeam.rerollToken} alt="" draggable={false} />
            <span>+1</span>
          </motion.div>
        )}
      </AnimatePresence>
      {!bay && (
        <div
          className={cn(
            'flex items-center justify-between gap-1.5 bg-black/45 px-1.5 py-0.5 text-white',
            strip ? 'text-[0.6rem]' : 'text-xs',
            compact && !strip && 'text-[0.7rem]',
          )}
        >
          <span>{isAirplane ? 'Landing' : `${feet} ft`}</span>
          {firstPlayer && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[0.65em] font-semibold',
                firstPlayer === 'pilot'
                  ? 'bg-blue-500/35 text-sky-100'
                  : 'bg-orange-500/35 text-orange-100',
              )}
            >
              {firstPlayer === 'pilot' ? 'Pilot เริ่ม' : 'Co-Pilot เริ่ม'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
