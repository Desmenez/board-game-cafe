import { useDroppable } from '@dnd-kit/core';
import type { TtrTrainColor } from 'shared';
import { TTR_TRAIN_COLORS } from 'shared';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { TTR_TRAIN_COLOR_LABEL } from '../ttrLabels';

type Props = {
  dropId: string;
  hand: Record<TtrTrainColor, number>;
  canDrop: boolean;
  compact?: boolean;
  cardsClassName?: string;
  /** When set, only these colors with count &gt; 0 are shown. */
  visibleColors?: ReadonlySet<TtrTrainColor>;
  /** How many of each color are currently selected (claim mode). */
  selectedCounts?: Partial<Record<TtrTrainColor, number>>;
  /** Tap a stack to adjust claim payment. */
  onCardTap?: (color: TtrTrainColor) => void;
  /** Override empty-state copy (default: drag-to-draw hint). */
  emptyHint?: string;
};

/** Train cards on hand, doubling as the drop target for drag-to-draw. */
export function TtrTrainHand({
  dropId,
  hand,
  canDrop,
  compact,
  cardsClassName,
  visibleColors,
  selectedCounts,
  onCardTap,
  emptyHint = 'ลากการ์ดรถไฟมาวางที่นี่เพื่อจั่วเข้ามือ',
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId, disabled: !canDrop });
  const owned = TTR_TRAIN_COLORS.filter((c) => {
    if (hand[c] <= 0) return false;
    if (visibleColors && !visibleColors.has(c)) return false;
    return true;
  });
  const interactive = typeof onCardTap === 'function';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'ttr-train-hand-drop',
        compact && 'ttr-train-hand-drop--compact',
        isOver && 'is-over',
        !canDrop && 'is-disabled',
      )}
      aria-label="วางการ์ดรถไฟที่นี่เพื่อจั่ว"
    >
      {owned.length === 0 ? <p className="ttr-train-hand-drop__hint">{emptyHint}</p> : null}
      <div className={cn('ttr-train-hand-drop__cards', cardsClassName)}>
        {owned.map((c) => {
          const selected = selectedCounts?.[c] ?? 0;
          const body = (
            <>
              <img
                src={imageMap.ticketToRide.trainCards[c]}
                alt={TTR_TRAIN_COLOR_LABEL[c]}
                loading="lazy"
              />
              {compact ? null : (
                <span className="ttr-train-hand-card__label">{TTR_TRAIN_COLOR_LABEL[c]}</span>
              )}
              <span className="ttr-train-hand-card__count">
                {selected > 0 ? `${selected}/${hand[c]}` : `x${hand[c]}`}
              </span>
            </>
          );
          if (!interactive) {
            return (
              <div
                key={c}
                className={cn('ttr-train-hand-card', compact && 'ttr-train-hand-card--mini')}
              >
                {body}
              </div>
            );
          }
          return (
            <button
              key={c}
              type="button"
              className={cn(
                'ttr-train-hand-card',
                compact && 'ttr-train-hand-card--mini',
                selected > 0 && 'is-selected',
              )}
              aria-pressed={selected > 0}
              aria-label={`${TTR_TRAIN_COLOR_LABEL[c]} บนมือ ${hand[c]} ใบ${selected > 0 ? ` · เลือก ${selected}` : ''}`}
              onClick={() => onCardTap(c)}
            >
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}
