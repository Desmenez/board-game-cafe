import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { MARRAKECH_DIE_FACES } from 'shared';
import { cn } from '../../../utils/cn';

/** Face-swap gaps (ms) — fast then slowing so the landing feels earned. */
const ROLL_TICKS = [0, 70, 70, 80, 90, 100, 120, 145, 175, 210, 250];

/** Total roll animation length; callers can use it to schedule follow-up motion. */
export const MARRAKECH_DIE_ROLL_MS = ROLL_TICKS.reduce((sum, t) => sum + t, 0) + 260;

const SETTLE_MS = 380;

function randomFace(): number {
  return MARRAKECH_DIE_FACES[Math.floor(Math.random() * MARRAKECH_DIE_FACES.length)]!;
}

type Props = {
  value: number | null;
  className?: string;
  /** Bump to replay the roll animation. It settles on `value`, then calls `onRollEnd`. */
  rollToken?: number;
  onRollEnd?: () => void;
};

/** Marrakech die (1–4). Numeric face — easier to read at a glance than slipper pips. */
export function SlipperDie({ value, className, rollToken = 0, onRollEnd }: Props) {
  const reduceMotion = useReducedMotion();
  const [rollingFace, setRollingFace] = useState<number | null>(null);
  const [settling, setSettling] = useState(false);
  const onRollEndRef = useRef(onRollEnd);
  onRollEndRef.current = onRollEnd;

  useEffect(() => {
    if (!rollToken) return;

    if (reduceMotion) {
      onRollEndRef.current?.();
      return;
    }

    // Set the first face synchronously so the real result never flashes first.
    setRollingFace(randomFace());
    setSettling(false);

    const timers: number[] = [];
    let elapsed = 0;
    for (const tick of ROLL_TICKS) {
      elapsed += tick;
      if (tick > 0) {
        timers.push(window.setTimeout(() => setRollingFace(randomFace()), elapsed));
      }
    }
    elapsed += 260;
    timers.push(
      window.setTimeout(() => {
        setRollingFace(null);
        setSettling(true);
        onRollEndRef.current?.();
      }, elapsed),
    );
    timers.push(window.setTimeout(() => setSettling(false), elapsed + SETTLE_MS));

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      setRollingFace(null);
      setSettling(false);
    };
  }, [rollToken, reduceMotion]);

  const settled = value != null && value >= 1 && value <= 4 ? value : null;
  const shown = rollingFace ?? settled;
  const rolling = rollingFace != null;

  return (
    <div
      className={cn(
        'mk-die',
        rolling && 'mk-die--rolling',
        settling && 'mk-die--settle',
        className,
      )}
      aria-live="polite"
      aria-label={rolling ? 'กำลังทอยลูกเต๋า' : settled != null ? `ทอยได้ ${settled}` : 'ลูกเต๋า'}
    >
      <span className={cn('mk-die__value', shown == null && 'mk-die__value--empty')}>
        {shown ?? '?'}
      </span>
    </div>
  );
}
