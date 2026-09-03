import { useDraggable } from '@dnd-kit/core';
import type { SplendorGem } from 'shared';
import { cn } from '../../../utils/cn';
import { SplendorChip } from './SplendorChip';

type Props = {
  dragId: string;
  kind: SplendorGem | 'gold';
  size?: 'sm' | 'md' | 'lg';
  count?: number;
  disabled?: boolean;
  onClick?: () => void;
};

export function SplendorDraggableChip({
  dragId,
  kind,
  size = 'sm',
  count,
  disabled,
  onClick,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    disabled,
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      disabled={disabled}
      className={cn('splendor-draggable-chip', isDragging && 'splendor-draggable-chip--dragging')}
      onClick={onClick}
      {...listeners}
      {...attributes}
    >
      <SplendorChip kind={kind} size={size} count={count} />
    </button>
  );
}
