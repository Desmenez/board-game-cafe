import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { SPLENDOR_PLAYER_DROP_ID } from './splendorDragUtils';

type Props = {
  active: boolean;
  children: ReactNode;
  /** In hand dock — skip default hint; only show feedback while hovering. */
  hideHint?: boolean;
};

export function SplendorPlayerDropZone({ active, children, hideHint = false }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: SPLENDOR_PLAYER_DROP_ID,
    disabled: !active,
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        'splendor-player-drop',
        active ? 'splendor-player-drop--active' : '',
        isOver ? 'splendor-player-drop--over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {active && (!hideHint || isOver) ? (
        <p className="splendor-player-drop__hint" role="status">
          {isOver ? 'ปล่อยเพื่อหยิบโทเคน' : 'ลากโทเคนจากธนาคารมาวางที่นี่'}
        </p>
      ) : null}
      {children}
    </div>
  );
}
