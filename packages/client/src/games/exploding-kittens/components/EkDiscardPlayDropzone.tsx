import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

export const EK_DISCARD_PLAY_DROP_ID = 'ek-discard-play-zone';

export function EkDiscardPlayDropzone({
  disabled,
  active,
  children,
}: {
  disabled: boolean;
  active: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: EK_DISCARD_PLAY_DROP_ID,
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      className={[
        'ek-pile-box',
        'ek-pile-discard',
        'ek-pile-discard--play-zone',
        active && !disabled ? 'ek-pile-discard--play-zone-active' : '',
        isOver && !disabled ? 'ek-pile-discard--play-zone-over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
