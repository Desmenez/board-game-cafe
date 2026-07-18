import { useDroppable } from '@dnd-kit/core';
import { CAMEL_UP_LEG_HAND_DROP_ID } from '../lib/camelUpLegBetDnd';

type Props = {
  canDrop: boolean;
  isDragging: boolean;
};

export function CamelUpLegBetHandDock({ canDrop, isDragging }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: CAMEL_UP_LEG_HAND_DROP_ID,
    disabled: !canDrop,
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        'camel-up-leg-hand-dock',
        canDrop ? 'camel-up-leg-hand-dock--drop' : '',
        isOver ? 'camel-up-leg-hand-dock--over' : '',
        isDragging && canDrop ? 'camel-up-leg-hand-dock--dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="วาง Leg bet"
    >
      <p className="camel-up-leg-hand-dock__hint">
        {isOver ? 'ปล่อยเพื่อรับ Leg bet' : 'ลากการ์ด Leg bet มาวางที่นี่'}
      </p>
    </div>
  );
}
