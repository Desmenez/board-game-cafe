import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { SPLENDOR_BANK_DROP_ID } from '../splendorDragUtils';

export type SplendorBankDropMode = 'return' | 'undo';

type Props = {
  mode: SplendorBankDropMode | null;
  children: ReactNode;
};

const HINT: Record<SplendorBankDropMode, { idle: string; over: string }> = {
  return: {
    idle: 'ลากโทเคนของคุณมาคืนที่ธนาคาร',
    over: 'ปล่อยเพื่อคืนโทเคน',
  },
  undo: {
    idle: 'ลากกลับมาที่ธนาคารเพื่อยกเลิก',
    over: 'ปล่อยเพื่อยกเลิก',
  },
};

export function SplendorBankDropZone({ mode, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: SPLENDOR_BANK_DROP_ID,
    disabled: mode == null,
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        'splendor-bank-drop',
        mode ? 'splendor-bank-drop--active' : '',
        isOver ? 'splendor-bank-drop--over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {mode ? (
        <p className="splendor-bank-drop__hint" role="status">
          {isOver ? HINT[mode].over : HINT[mode].idle}
        </p>
      ) : null}
      {children}
    </div>
  );
}
