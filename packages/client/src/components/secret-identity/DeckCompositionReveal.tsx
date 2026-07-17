import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import type { GameProgressValue } from '../game-shell';
import { GroupAcknowledgeGate } from '../session-sync';
import { Button, Dialog, DialogDescription, DialogFooter, DialogTitle } from '../ui';
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
  /** When set, shows a "?" control that opens a detail dialog with this copy. */
  description?: string;
  /** Optional secondary line in the detail dialog (e.g. English role name). */
  detailSubtitle?: string;
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
  gridClassName?: string;
};

const DEFAULT_GRID_CLASS = 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5';

const DETAIL_TITLE_ID = 'deck-comp-detail-title';

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
  acknowledgeLabel = 'รับทราบการ์ดในเกม',
  acknowledgedLabel = 'รับทราบแล้ว — รอผู้เล่นคนอื่น',
  waitingFlipLabel = 'รอเปิดการ์ด…',
  progressLabel = 'รับทราบการ์ดแล้ว',
  className,
  gridClassName = DEFAULT_GRID_CLASS,
}: DeckCompositionRevealProps) {
  const slotsKey = useMemo(() => slots.map((s) => s.key).join('|'), [slots]);
  const [flipsDone, setFlipsDone] = useState(slots.length === 0);
  const [detailSlot, setDetailSlot] = useState<DeckCompositionSlot | null>(null);

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

  useEffect(() => {
    setDetailSlot(null);
  }, [slotsKey]);

  return (
    <>
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
        <div className="deck-comp w-full!" aria-live="polite">
          <p className="deck-comp__status">{flipsDone ? readyStatus : flippingStatus}</p>
          <div className={cn('deck-comp__grid', gridClassName)}>
            {slots.map((slot, idx) => (
              <div
                key={slot.key}
                className={cn(
                  'deck-comp__slot',
                  slot.tone === 'good' && 'deck-comp__slot--good',
                  slot.tone === 'evil' && 'deck-comp__slot--evil',
                )}
              >
                {slot.description ? (
                  <button
                    type="button"
                    className="deck-comp__help"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailSlot(slot);
                    }}
                    aria-label={`คำอธิบาย ${slot.label}`}
                  >
                    ?
                  </button>
                ) : null}
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
                      <div className="deck-comp__label py-2">{slot.label}</div>
                    </div>
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GroupAcknowledgeGate>

      <Dialog
        open={detailSlot !== null}
        onOpenChange={(open) => {
          if (!open) setDetailSlot(null);
        }}
        className={cn(
          'deck-comp-detail max-w-md md:max-w-2xl',
          detailSlot?.tone === 'good' && 'deck-comp-detail--good',
          detailSlot?.tone === 'evil' && 'deck-comp-detail--evil',
        )}
        aria-labelledby={DETAIL_TITLE_ID}
      >
        {detailSlot ? (
          <div className="deck-comp-detail__layout">
            <div className="deck-comp-detail__media">
              <img
                src={detailSlot.imageSrc}
                alt=""
                className="deck-comp-detail__img"
                decoding="async"
              />
            </div>
            <div className="deck-comp-detail__copy">
              <div className="deck-comp-detail__heading">
                <DialogTitle id={DETAIL_TITLE_ID} className="deck-comp-detail__title">
                  {detailSlot.label}
                </DialogTitle>
                {detailSlot.detailSubtitle ? (
                  <p className="deck-comp-detail__subtitle">{detailSlot.detailSubtitle}</p>
                ) : null}
              </div>
              <DialogDescription className="deck-comp-detail__desc">
                {detailSlot.description}
              </DialogDescription>
              <DialogFooter className="deck-comp-detail__footer">
                <Button
                  type="button"
                  variant="secondary"
                  className="deck-comp-detail__close"
                  onClick={() => setDetailSlot(null)}
                >
                  ปิด
                </Button>
              </DialogFooter>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
