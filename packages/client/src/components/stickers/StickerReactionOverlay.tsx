import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Player } from 'shared';
import { getStickerDef } from 'shared';
import { PlayerAvatar } from '../player-avatar';
import { cn } from '../../utils/cn';

export interface FloatingSticker {
  key: string;
  playerId: string;
  stickerId: string;
  at: number;
  /** Horizontal jitter in px from the left edge lane. */
  offsetX: number;
}

interface Props {
  items: FloatingSticker[];
  players: readonly Player[];
  onItemComplete: (key: string) => void;
  className?: string;
}

const FLOAT_DURATION_S = 2.6;
const REDUCED_DURATION_S = 0.9;

export function StickerReactionOverlay({ items, players, onItemComplete, className }: Props) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? REDUCED_DURATION_S : FLOAT_DURATION_S;

  return (
    <div
      className={cn(
        'pointer-events-none fixed bottom-20 left-3 z-[60] flex h-[min(56vh,460px)] w-[min(56vw,280px)] flex-col justify-end overflow-visible sm:bottom-24 sm:left-5',
        className,
      )}
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const sticker = getStickerDef(item.stickerId);
          if (!sticker) return null;
          const player = players.find((p) => p.id === item.playerId);
          const name = player?.name ?? 'ผู้เล่น';

          return (
            <motion.div
              key={item.key}
              className="absolute bottom-0 flex max-w-60 flex-col items-center gap-1.5"
              style={{ left: item.offsetX, willChange: 'transform, opacity' }}
              initial={
                reduceMotion ? { opacity: 0, y: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.8 }
              }
              animate={
                reduceMotion
                  ? { opacity: [0, 1, 1, 0], y: 0, scale: 1 }
                  : { opacity: [0, 1, 1, 0], y: -240, scale: 1 }
              }
              transition={
                reduceMotion
                  ? { duration, times: [0, 0.15, 0.7, 1], ease: 'easeOut' }
                  : {
                      // Constant drift — keyframed `y` re-eases each segment and
                      // visibly stutters where the fade starts.
                      y: { duration, ease: 'easeOut' },
                      opacity: { duration, times: [0, 0.1, 0.65, 1], ease: 'easeOut' },
                      scale: { duration: 0.32, ease: [0.34, 1.4, 0.64, 1] },
                    }
              }
              onAnimationComplete={() => onItemComplete(item.key)}
            >
              <img
                src={sticker.imageUrl}
                alt={sticker.label}
                width={128}
                height={128}
                className="h-26 w-26 object-contain drop-shadow-md sm:h-32 sm:w-32"
                draggable={false}
              />
              <div className="flex justify-center items-center gap-1.5 rounded-full bg-black/55 px-1.5 py-0.5 shadow-sm">
                <PlayerAvatar
                  playerId={item.playerId}
                  name={name}
                  avatar={player?.avatar}
                  avatarUrl={player?.avatarUrl}
                  avatarDisplay={player?.avatarDisplay}
                  size={18}
                  decorative
                />
                <span className="max-w-[110px] truncate text-xs font-medium leading-none text-white/90">
                  {name}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
