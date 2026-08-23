import { useDraggable } from '@dnd-kit/core';
import type { SplendorGem } from 'shared';
import { cn } from '../../utils/cn';
import { SplendorChip } from './SplendorChip';

type Props = {
  dragId: string;
  kind: SplendorGem | 'gold';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
};

export function SplendorDraggableChip({ dragId, kind, size = 'sm', disabled }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    disabled,
  });

  return (
    <span
      ref={setNodeRef}
      className={cn('splendor-draggable-chip', isDragging && 'splendor-draggable-chip--dragging')}
      {...listeners}
      {...attributes}
    >
      <SplendorChip kind={kind} size={size} />
    </span>
  );
}
