import { motion, AnimatePresence } from 'motion/react';

type Flight = {
  cardId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  previewSrc?: string;
};

type Props = {
  flights: Flight[];
  onFlightComplete?: (cardId: string) => void;
};

export function PlayerHandDrawGhosts({ flights, onFlightComplete }: Props) {
  return (
    <AnimatePresence>
      {flights.map((f) => (
        <motion.div
          key={f.cardId}
          className="player-hand-draw-ghost"
          initial={{
            left: f.from.x,
            top: f.from.y,
            x: '-50%',
            y: '-50%',
            scale: 0.55,
            opacity: 0.95,
          }}
          animate={{
            left: f.to.x,
            top: f.to.y,
            scale: 1,
            opacity: 1,
          }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'fixed' }}
          onAnimationComplete={() => onFlightComplete?.(f.cardId)}
        >
          {f.previewSrc ? <img src={f.previewSrc} alt="" /> : null}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
