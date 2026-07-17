import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import type { GameProgressValue } from '../game-shell';
import { GroupAcknowledgeGate } from '../session-sync';
import './deck-composition.css';

/** Stagger timing — keep in sync with motion transitions. */
export const DECK_COMP_FLIP_STAGGER_SEC = 0.3;
export const DECK_COMP_FLIP_DURATION_SEC = 1;
export const DECK_COMP_DWELL_AFTER_LAST_MS = 800;

export type DeckCompositionTone = 'default' | 'good' | 'evil';

export type DeckCompositionSlot = {
  key: string;
  imageSrc: string;
  label: string;
  tone?: DeckCompositionTone;
};

export type DeckCompositionRevealProps = {
  slots: DeckCompositionSlot[];
  cardBackSrc: string;
  hasAcknowledged: boolean;
  progress: GameProgressValue;
  onAcknowledge: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Shown under the grid while cards are flipping */
  flippingStatus?: string;
  /** Shown under the grid after flips finish */
  readyStatus?: string;
  acknowledgeLabel?: string;
  acknowledgedLabel?: string;
  waitingFlipLabel?: string;
  progressLabel?: string;
  className?: string;
};

export function DeckCompositionReveal({
  slots,
  cardBackSrc,
  hasAcknowledged,
  progress,
  onAcknowledge,
  title = 'บทบาทในเกมนี้',
  subtitle = 'เปิดเผยเฉพาะว่ามีบทอะไรในสำรับ — ไม่บอกว่าใครถือบทไหน',
  flippingStatus = 'กำลังเปิดเผยบทบาททั้งหมด…',
  readyStatus = 'บทบาทที่อยู่ในเกมนี้',
  acknowledgeLabel = 'รับทราบสำรับ',
  acknowledgedLabel = 'รับทราบแล้ว — รอผู้เล่นคนอื่น',
  waitingFlipLabel = 'รอเปิดการ์ด…',
  progressLabel = 'รับทราบสำรับแล้ว',
  className,
}: DeckCompositionRevealProps) {
  const slotsKey = useMemo(() => slots.map((s) => s.key).join('|'), [slots]);
  const [flipsDone, setFlipsDone] = useState(slots.length === 0);

  useEffect(() => {
    if (slots.length === 0) {
      setFlipsDone(true);
      return;
    }
    setFlipsDone(false);
    const totalMs =
      Math.max(0, slots.length - 1) * DECK_COMP_FLIP_STAGGER_SEC * 1000 +
      DECK_COMP_FLIP_DURATION_SEC * 1000 +
      DECK_COMP_DWELL_AFTER_LAST_MS;
    const t = window.setTimeout(() => setFlipsDone(true), totalMs);
    return () => window.clearTimeout(t);
  }, [slotsKey, slots.length]);

  return (
    <GroupAcknowledgeGate
      className={className}
      title={title}
      subtitle={subtitle}
      acknowledged={!flipsDone || hasAcknowledged}
      onAcknowledge={() => {
        if (!flipsDone || hasAcknowledged) return;
        onAcknowledge();
      }}
      progress={progress}
      acknowledgeLabel={flipsDone ? acknowledgeLabel : waitingFlipLabel}
      acknowledgedLabel={hasAcknowledged ? acknowledgedLabel : waitingFlipLabel}
      progressLabel={progressLabel}
    >
      <div className="deck-comp" aria-live="polite">
        <p className="deck-comp__status">{flipsDone ? readyStatus : flippingStatus}</p>
        <div className="deck-comp__grid">
          {slots.map((slot, idx) => (
            <div
              key={slot.key}
              className={cn(
                'deck-comp__slot',
                slot.tone === 'good' && 'deck-comp__slot--good',
                slot.tone === 'evil' && 'deck-comp__slot--evil',
              )}
            >
              <div className="deck-comp__perspective">
                <motion.div
                  className="deck-comp__inner"
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: 180 }}
                  transition={{
                    delay: idx * DECK_COMP_FLIP_STAGGER_SEC,
                    duration: DECK_COMP_FLIP_DURATION_SEC,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="deck-comp__face deck-comp__face--back" aria-hidden>
                    <img
                      src={cardBackSrc}
                      alt=""
                      className="deck-comp__img"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <div className="deck-comp__face deck-comp__face--front">
                    <img
                      src={slot.imageSrc}
                      alt={slot.label}
                      className="deck-comp__img"
                      loading="eager"
                      decoding="async"
                    />
                    <div className="deck-comp__label">{slot.label}</div>
                  </div>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GroupAcknowledgeGate>
  );
}
