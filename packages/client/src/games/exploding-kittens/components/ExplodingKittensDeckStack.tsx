import { motion, useReducedMotion } from 'motion/react';
import { CARD_BACK_URL } from '../lib/cardMeta';

const EK_DECK_LAYER_COUNT = 5;
const EK_SHUFFLE_ANIMATION_DURATION_S = 2;

export function ExplodingKittensDeckStack({ shuffleTick }: { shuffleTick: number }) {
  const reduceMotion = useReducedMotion();
  const shuffleEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
  return (
    <div className="ek-deck-stack-inner" aria-hidden>
      <motion.div
        key={shuffleTick}
        className="ek-deck-stack-motion"
        initial={{ rotate: 0, x: 0 }}
        animate={
          reduceMotion || shuffleTick === 0
            ? { rotate: 0, x: 0 }
            : { rotate: [0, -6, 5.5, -3.5, 0], x: [0, 4, -4, 2, 0] }
        }
        transition={{ duration: EK_SHUFFLE_ANIMATION_DURATION_S, ease: shuffleEase }}
      >
        {Array.from({ length: EK_DECK_LAYER_COUNT }, (_, i) => (
          <motion.img
            key={i}
            src={CARD_BACK_URL}
            alt=""
            className="ek-deck-layer"
            style={{
              left: i * 6,
              top: -i * 6,
              zIndex: EK_DECK_LAYER_COUNT - i,
            }}
            initial={false}
            animate={
              reduceMotion || shuffleTick === 0
                ? { x: 0, y: 0, rotate: 0 }
                : {
                    x: [0, (i % 2 === 0 ? 3 : -3) + i * 0.4, 0],
                    y: [0, -5, 0],
                    rotate: [0, (i - 2) * 3, 0],
                  }
            }
            transition={{
              duration: EK_SHUFFLE_ANIMATION_DURATION_S,
              ease: shuffleEase,
              delay: i * 0.1,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
