import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { SPLENDOR_BANK_DROP_ID } from './splendorDragUtils';

type Props = {
  active: boolean;
  children: ReactNode;
};

export function SplendorBankDropZone({ active, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: SPLENDOR_BANK_DROP_ID,
    disabled: !active,
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        'splendor-bank-drop',
        active ? 'splendor-bank-drop--active' : '',
        isOver ? 'splendor-bank-drop--over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {active && (
        <p className="splendor-bank-drop__hint" role="status">
          {isOver ? 'ปล่อยเพื่อคืนโทเคน' : 'ลากโทเคนของคุณมาคืนที่ธนาคาร'}
        </p>
      )}
      {children}
    </div>
  );
}
