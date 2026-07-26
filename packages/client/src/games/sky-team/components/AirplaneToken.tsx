import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../../utils/cn';
import { imageMap } from '../../../imageMap';
import { DEFAULT_AIRPLANE_TOKEN_ANCHOR, type AirplaneTokenAnchor } from './airplaneTokenAnchor';

/** Keep in sync with SkyTeamTracksPanel REMOVE/ADD_ANIM_MS. */
export const AIRPLANE_TOKEN_REMOVE_MS = 700;
export const AIRPLANE_TOKEN_ADD_MS = 700;

type Props = {
  /** How many airplane tokens on this space (0 = hidden after exit). */
  count: number;
  /** Rising edge plays a departing-token animation (Radio clear). */
  playRemove?: boolean;
  /** Rising edge plays an arriving-token animation (Traffic Die place). */
  playAdd?: boolean;
  /** Center anchor — independent of printed plane icons on card art. */
  anchor?: AirplaneTokenAnchor;
  className?: string;
};

/**
 * Movable airplane token on this approach space (removed by Radio / added by Traffic Die).
 * Distinct from the faint printed silhouettes on the left of the card.
 */
export function AirplaneToken({
  count,
  playRemove = false,
  playAdd = false,
  anchor = DEFAULT_AIRPLANE_TOKEN_ANCHOR,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();
  const prevRemoveRef = useRef(false);
  const prevAddRef = useRef(false);
  const [ghostKey, setGhostKey] = useState<number | null>(null);
  const [arriveKey, setArriveKey] = useState<number | null>(null);
  const ghostSeq = useRef(0);
  const arriveSeq = useRef(0);
  /** After Radio dissolve, skip the count→0 exit so it doesn't flash twice. */
  const [suppressExit, setSuppressExit] = useState(false);
  /** Hide the live token while the ghost dissolve plays (count is still held). */
  const [hideForRemove, setHideForRemove] = useState(false);
  /** Hide live bump until the arriving ghost lands. */
  const [hideForAdd, setHideForAdd] = useState(false);

  useEffect(() => {
    if (playRemove && !prevRemoveRef.current) {
      if (!reduceMotion) {
        ghostSeq.current += 1;
        setGhostKey(ghostSeq.current);
        setHideForRemove(true);
        setSuppressExit(true);
      } else {
        setHideForRemove(true);
        setSuppressExit(true);
      }
    }
    if (!playRemove && prevRemoveRef.current) {
      setHideForRemove(false);
    }
    prevRemoveRef.current = playRemove;
  }, [playRemove, reduceMotion]);

  useEffect(() => {
    if (playAdd && !prevAddRef.current) {
      if (!reduceMotion) {
        arriveSeq.current += 1;
        setArriveKey(arriveSeq.current);
        setHideForAdd(true);
      } else {
        setHideForAdd(false);
      }
    }
    if (!playAdd && prevAddRef.current) {
      setHideForAdd(false);
    }
    prevAddRef.current = playAdd;
  }, [playAdd, reduceMotion]);

  useEffect(() => {
    if (count > 0) setSuppressExit(false);
  }, [count]);

  const wrapStyle = {
    left: `${anchor.left}%`,
    top: `${anchor.top}%`,
    width: `${anchor.width}%`,
  } as const;

  // While dissolving: keep remaining tokens (count > 1); last token is the ghost only.
  // While arriving: show prior count (count - 1) until ghost lands.
  const showLive = count > 0 && !(hideForRemove && count <= 1) && !(hideForAdd && count <= 1);
  const badgeCount =
    hideForRemove && count > 1
      ? count - 1
      : hideForAdd && count > 0
        ? Math.max(0, count - 1)
        : count;

  return (
    <>
      <AnimatePresence>
        {showLive && (
          <motion.div
            key="plane-token"
            className={cn(
              'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2',
              className,
            )}
            style={wrapStyle}
            aria-label={`${badgeCount} airplane token${badgeCount > 1 ? 's' : ''}`}
            title={`Airplane token ×${badgeCount}`}
            initial={reduceMotion ? false : { y: 4, opacity: 0.85, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={
              suppressExit || reduceMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, y: -36, scale: 0.55, rotate: -12 }
            }
            transition={{
              duration: reduceMotion || suppressExit ? 0 : 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <motion.img
              src={imageMap.skyTeam.planeToken}
              alt=""
              className="block w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              draggable={false}
              animate={
                reduceMotion
                  ? undefined
                  : {
                      y: [0, -3, 0, 2, 0],
                      rotate: [-2.5, 2, -1.5, 2.5, -2.5],
                    }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                      rotate: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
                    }
              }
            />
            <span
              className={cn(
                'absolute -right-[12%] -bottom-[6%] z-1 flex min-w-[1.2em] items-center justify-center',
                'rounded-full bg-white px-[0.3em] py-[0.08em] text-[0.75em] font-bold leading-none text-slate-900',
                'ring-1 ring-black/15 shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
              )}
            >
              ×{Math.max(1, badgeCount)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ghostKey != null && (
          <motion.div
            key={`ghost-${ghostKey}`}
            className="pointer-events-none absolute z-2 -translate-x-1/2 -translate-y-1/2"
            style={wrapStyle}
            aria-hidden
            initial={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            animate={{ opacity: 0, y: -40, scale: 0.5, rotate: -18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: AIRPLANE_TOKEN_REMOVE_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setGhostKey(null)}
          >
            <img
              src={imageMap.skyTeam.planeToken}
              alt=""
              className="block w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              draggable={false}
            />
            <span
              className={cn(
                'absolute -right-[12%] -top-[8%] z-1 flex min-w-[1.2em] items-center justify-center',
                'rounded-full bg-rose-500 px-[0.3em] py-[0.08em] text-[0.7em] font-bold leading-none text-white',
                'shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
              )}
            >
              −1
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {arriveKey != null && (
          <motion.div
            key={`arrive-${arriveKey}`}
            className="pointer-events-none absolute z-2 -translate-x-1/2 -translate-y-1/2"
            style={wrapStyle}
            aria-hidden
            initial={{ opacity: 0, y: 44, scale: 0.45, rotate: 16 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: AIRPLANE_TOKEN_ADD_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => {
              setArriveKey(null);
              setHideForAdd(false);
            }}
          >
            <img
              src={imageMap.skyTeam.planeToken}
              alt=""
              className="block w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              draggable={false}
            />
            <span
              className={cn(
                'absolute -right-[12%] -top-[8%] z-1 flex min-w-[1.2em] items-center justify-center',
                'rounded-full bg-emerald-500 px-[0.3em] py-[0.08em] text-[0.7em] font-bold leading-none text-white',
                'shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
              )}
            >
              +1
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
