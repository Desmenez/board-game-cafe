import { motion } from 'motion/react';
import type { SurviveTheIslandPlacement } from 'shared';
import { STI_CREATURE_LABEL, stiAdventurerSrc, stiArt, stiCreatureSrc } from '../art';

type Point = { left: number; top: number };

type Props = {
  placement: SurviveTheIslandPlacement;
  playerName: string;
  point: Point;
  reduceMotion: boolean;
  onDone: () => void;
};

function placementArt(placement: SurviveTheIslandPlacement): { src: string; label: string } {
  if (placement.kind === 'adventurer') {
    return { src: stiAdventurerSrc(placement.color ?? 'blue'), label: 'วางผจญภัย' };
  }
  if (placement.kind === 'raft') {
    return { src: stiArt.tokens.raft, label: 'วางแพ' };
  }
  const kind = placement.creatureKind ?? 'shark';
  return { src: stiCreatureSrc(kind), label: STI_CREATURE_LABEL[kind] };
}

export function SurviveTheIslandPlacementPopup({
  placement,
  playerName,
  point,
  reduceMotion,
  onDone,
}: Props) {
  const art = placementArt(placement);

  return (
    <div
      className="pointer-events-none absolute z-50 w-[9%] -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${point.left}%`, top: `${point.top}%` }}
    >
      <motion.div
        key={placement.id}
        role="status"
        aria-live="polite"
        aria-label={`${playerName} ${art.label}`}
        className="flex flex-col items-center gap-0.5"
        initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1.8 }}
        animate={
          reduceMotion
            ? { opacity: [1, 1, 0], scale: 1 }
            : { opacity: [1, 1, 0], scale: [1.8, 1, 1] }
        }
        transition={{
          duration: reduceMotion ? 0.4 : 0.5,
          times: [0, 0.55, 1],
          ease: 'easeInOut',
        }}
        onAnimationComplete={onDone}
      >
        <span className="max-w-full truncate rounded-full bg-slate-950/88 px-1.5 py-px text-[10px] font-bold text-white shadow-md">
          {playerName}
        </span>
        <img
          src={art.src}
          alt=""
          className="h-10 w-10 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
        />
      </motion.div>
    </div>
  );
}
