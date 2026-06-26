import { motion, useReducedMotion } from 'motion/react';
import { forwardRef } from 'react';
import './deck-stack.css';

const DEFAULT_LAYERS = 5;
const DEFAULT_OFFSET_PX = 6;
const SHUFFLE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type DeckStackProps = {
  backSrc: string;
  layers?: number;
  offset?: number | { x: number; y: number };
  className?: string;
  innerClassName?: string;
  motionClassName?: string;
  layerClassName?: string;
  shuffleTick?: number;
  shuffleDuration?: number;
  layerShuffleDelay?: number;
  ariaHidden?: boolean;
};

function layerPosition(
  index: number,
  offset: number | { x: number; y: number } | undefined,
): { left: number; top: number } {
  const resolved = offset ?? DEFAULT_OFFSET_PX;
  const x = typeof resolved === 'number' ? resolved : resolved.x;
  const y = typeof resolved === 'number' ? resolved : resolved.y;
  return { left: index * x, top: -index * y };
}

export const DeckStack = forwardRef<HTMLDivElement, DeckStackProps>(function DeckStack(
  {
    backSrc,
    layers = DEFAULT_LAYERS,
    offset,
    className,
    innerClassName,
    motionClassName,
    layerClassName,
    shuffleTick,
    shuffleDuration = 2,
    layerShuffleDelay = 0.1,
    ariaHidden = true,
  },
  ref,
) {
  const reduceMotion = useReducedMotion();
  const shuffleEnabled = shuffleTick !== undefined;
  const shouldAnimate = shuffleEnabled && shuffleTick > 0 && !reduceMotion;

  const rootClass = ['deck-stack', className].filter(Boolean).join(' ');
  const innerClass = ['deck-stack__inner', innerClassName].filter(Boolean).join(' ');
  const motionClass = ['deck-stack__motion', motionClassName].filter(Boolean).join(' ');

  const layerElements = Array.from({ length: layers }, (_, i) => {
    const pos = layerPosition(i, offset);
    const style = { ...pos, zIndex: layers - i };
    const layerClass = ['deck-stack__layer', layerClassName].filter(Boolean).join(' ');

    if (!shuffleEnabled) {
      return <img key={i} src={backSrc} alt="" className={layerClass} style={style} />;
    }

    return (
      <motion.img
        key={i}
        src={backSrc}
        alt=""
        className={layerClass}
        style={style}
        initial={false}
        animate={
          shouldAnimate
            ? {
                x: [0, (i % 2 === 0 ? 3 : -3) + i * 0.4, 0],
                y: [0, -5, 0],
                rotate: [0, (i - 2) * 3, 0],
              }
            : { x: 0, y: 0, rotate: 0 }
        }
        transition={{
          duration: shuffleDuration,
          ease: SHUFFLE_EASE,
          delay: i * layerShuffleDelay,
        }}
      />
    );
  });

  const motionBody = shuffleEnabled ? (
    <motion.div
      key={shuffleTick}
      className={motionClass}
      initial={{ rotate: 0, x: 0 }}
      animate={
        shouldAnimate ? { rotate: [0, -6, 5.5, -3.5, 0], x: [0, 4, -4, 2, 0] } : { rotate: 0, x: 0 }
      }
      transition={{ duration: shuffleDuration, ease: SHUFFLE_EASE }}
    >
      {layerElements}
    </motion.div>
  ) : (
    <div className={motionClass}>{layerElements}</div>
  );

  return (
    <div ref={ref} className={rootClass} aria-hidden={ariaHidden || undefined}>
      <div className={innerClass}>{motionBody}</div>
    </div>
  );
});
