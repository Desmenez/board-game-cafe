import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../../utils/cn';
import { imageMap } from '../../../imageMap';
import { DEFAULT_AIRPLANE_TOKEN_ANCHOR, type AirplaneTokenAnchor } from './airplaneTokenAnchor';

type Props = {
  /** How many airplane tokens on this space (0 = hidden). */
  count: number;
  /** Center anchor — independent of printed plane icons on card art. */
  anchor?: AirplaneTokenAnchor;
  className?: string;
};

/**
 * Movable airplane token on this approach space (removed by Radio).
 * Distinct from the faint printed silhouettes on the left of the card.
 */
export function AirplaneToken({ count, anchor = DEFAULT_AIRPLANE_TOKEN_ANCHOR, className }: Props) {
  const reduceMotion = useReducedMotion();
  if (count <= 0) return null;

  return (
    <div
      className={cn('pointer-events-none absolute -translate-x-1/2 -translate-y-1/2', className)}
      style={{
        left: `${anchor.left}%`,
        top: `${anchor.top}%`,
        width: `${anchor.width}%`,
      }}
      aria-label={`${count} airplane token${count > 1 ? 's' : ''}`}
      title={`Airplane token ×${count} — Radio ลบตัวนี้`}
    >
      <motion.img
        src={imageMap.skyTeam.planeToken}
        alt=""
        className="block w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
        draggable={false}
        initial={reduceMotion ? false : { y: 4, opacity: 0.85, rotate: -4 }}
        animate={
          reduceMotion
            ? { y: 0, rotate: 0, opacity: 1 }
            : {
                y: [0, -3, 0, 2, 0],
                rotate: [-2.5, 2, -1.5, 2.5, -2.5],
                opacity: 1,
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.35 },
              }
        }
      />
      {count >= 1 && (
        <span
          className={cn(
            'absolute -right-[12%] -bottom-[6%] z-1 flex min-w-[1.2em] items-center justify-center',
            'rounded-full bg-white px-[0.3em] py-[0.08em] text-[0.75em] font-bold leading-none text-slate-900',
            'ring-1 ring-black/15 shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
          )}
        >
          ×{count}
        </span>
      )}
    </div>
  );
}
