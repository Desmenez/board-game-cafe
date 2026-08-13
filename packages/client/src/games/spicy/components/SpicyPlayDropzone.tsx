import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export const SPICY_PLAY_DROP_ID = 'spicy-play-zone';

type Props = {
  disabled: boolean;
  active: boolean;
  children?: ReactNode;
  className?: string;
};

export function SpicyPlayDropzone({ disabled, active, children, className }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: SPICY_PLAY_DROP_ID,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'spicy-play-zone',
        active && !disabled && 'spicy-play-zone--active',
        isOver && !disabled && 'spicy-play-zone--over',
        className,
      )}
      aria-label={active ? 'ลากการ์ดมาวางที่นี่เพื่อเล่น' : 'กองเผ็ด'}
    >
      {children}
    </div>
  );
}
