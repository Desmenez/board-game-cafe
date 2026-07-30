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
};

/** Train cards on hand, doubling as the drop target for drag-to-draw. */
export function TtrTrainHand({ dropId, hand, canDrop, compact, cardsClassName }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId, disabled: !canDrop });
  const owned = TTR_TRAIN_COLORS.filter((c) => hand[c] > 0);

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
      {owned.length === 0 ? (
        <p className="ttr-train-hand-drop__hint">ลากการ์ดรถไฟมาวางที่นี่เพื่อจั่วเข้ามือ</p>
      ) : null}
      <div className={cn('ttr-train-hand-drop__cards', cardsClassName)}>
        {owned.map((c) => (
          <div
            key={c}
            className={cn('ttr-train-hand-card', compact && 'ttr-train-hand-card--mini')}
          >
            <img
              src={imageMap.ticketToRide.trainCards[c]}
              alt={TTR_TRAIN_COLOR_LABEL[c]}
              loading="lazy"
            />
            {compact ? null : (
              <span className="ttr-train-hand-card__label">{TTR_TRAIN_COLOR_LABEL[c]}</span>
            )}
            <span className="ttr-train-hand-card__count">x{hand[c]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
