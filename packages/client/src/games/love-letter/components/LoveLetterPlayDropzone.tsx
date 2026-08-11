import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export const LL_PLAY_DROP_ID = 'll-play-zone';

type Props = {
  disabled: boolean;
  active: boolean;
  children?: ReactNode;
  className?: string;
};

export function LoveLetterPlayDropzone({ disabled, active, children, className }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: LL_PLAY_DROP_ID,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'll-play-zone',
        active && !disabled && 'll-play-zone--active',
        isOver && !disabled && 'll-play-zone--over',
        className,
      )}
      aria-label={active ? 'ลากการ์ดมาวางที่นี่เพื่อเล่น' : 'โซนเล่นการ์ด'}
    >
      {children}
    </div>
  );
}
