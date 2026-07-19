import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { FUGITIVE_DROP_HAND } from '../lib/fugitiveDraw';

type Props = {
  active: boolean;
  children?: ReactNode;
};

export function FugitiveHandDropZone({ active, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: FUGITIVE_DROP_HAND,
    disabled: !active,
  });

  if (!active) return children ?? null;

  return (
    <>
      <div
        ref={setNodeRef}
        className={['fugitive-hand-drop-zone', isOver ? 'fugitive-hand-drop-zone--over' : '']
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      >
        <span className="fugitive-hand-drop-zone__label">
          {isOver ? 'ปล่อยเพื่อจั่ว' : 'ลากการ์ดจากกองจั่วมาวางที่นี่'}
        </span>
      </div>
      {children}
    </>
  );
}
