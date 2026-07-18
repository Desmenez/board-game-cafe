import { motion } from 'motion/react';
import { Check, Swords, X } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { GamePhasePanel } from '../../../components/game-shell';
import { imageMap } from '../../../imageMap';

const QUEST_REVEAL_FLIP_SEC = 0.58;

type Props = {
  sequence: boolean[];
  shown: number;
  questVotesCount?: { success: number; fail: number };
};

export function AvalonQuestRevealOverlay({ sequence, shown, questVotesCount }: Props) {
  const total = sequence.length;

  return (
    <GamePhasePanel
      className="quest-reveal-overlay"
      title={
        <span className="inline-flex items-center gap-2">
          <Swords size={21} aria-hidden />
          เปิดผลการ์ด Quest
        </span>
      }
      description="ระบบสับลำดับและเปิดทีละใบ โดยไม่เปิดเผยว่าใครลง Success หรือ Fail"
    >
      {questVotesCount && (questVotesCount.success > 0 || questVotesCount.fail > 0) && (
        <div
          className="mb-4 flex flex-wrap items-center justify-center gap-2"
          role="status"
          aria-live="polite"
        >
          <span className="w-full text-center font-label text-xs text-ink-2">ที่เปิดแล้ว</span>
          <Badge variant="success">
            <Check size={12} aria-hidden /> Success {questVotesCount.success}
          </Badge>
          <Badge variant="danger">
            <X size={12} aria-hidden /> Fail {questVotesCount.fail}
          </Badge>
        </div>
      )}

      <div className="quest-reveal-grid">
        {sequence.map((success, i) => {
          const revealed = i < shown;
          const justRevealed = revealed && i === shown - 1;
          return (
            <div
              key={i}
              className={`quest-reveal-card-slot ${revealed ? 'is-revealed' : 'is-face-down'} ${justRevealed ? 'just-flipped' : ''}`}
            >
              <div className="quest-reveal-flip-perspective">
                <motion.div
                  className="quest-reveal-flip-inner"
                  initial={false}
                  animate={{ rotateY: revealed ? 180 : 0 }}
                  transition={{
                    duration: justRevealed ? QUEST_REVEAL_FLIP_SEC : 0.02,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="quest-reveal-flip-face quest-reveal-flip-face--back" aria-hidden>
                    <img
                      src={imageMap.avalon.roleCardBack}
                      alt=""
                      className="quest-reveal-flip-img"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <div className="quest-reveal-flip-face quest-reveal-flip-face--front">
                    <img
                      src={success ? imageMap.avalon.quest.success : imageMap.avalon.quest.fail}
                      alt={success ? 'Success' : 'Fail'}
                      className="quest-reveal-flip-img"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

      {shown === 0 && (
        <p className="mt-4 animate-pulse text-center text-sm text-ink-2 motion-reduce:animate-none">
          กำลังสับการ์ด…
        </p>
      )}
      {shown > 0 && shown < total && (
        <p className="mt-4 text-center text-sm text-ink-2">
          เปิดแล้ว <strong>{shown}</strong> / {total} ใบ
        </p>
      )}
      {shown === total && (
        <p className="mt-4 text-center text-sm font-bold text-pear">
          ครบทุกใบแล้ว — กำลังสรุปผล Quest…
        </p>
      )}
    </GamePhasePanel>
  );
}
