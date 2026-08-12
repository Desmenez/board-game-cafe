import { useDroppable } from '@dnd-kit/core';
import type { SkullDisc } from 'shared';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { skullDiscLabelTh, skullHandDiscUrl } from '../art';

export const SKULL_PLACE_DROP_ID = 'skull-place-zone';

type Props = {
  title: string;
  subtitle: string;
  selectedDisc: SkullDisc | null;
  canPlaceSelected: boolean;
  isDragging: boolean;
  onPlace: () => void;
};

export function SkullPlacePanel({
  title,
  subtitle,
  selectedDisc,
  canPlaceSelected,
  isDragging,
  onPlace,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: SKULL_PLACE_DROP_ID,
    disabled: false,
  });

  const hint = isOver
    ? 'วางที่นี่'
    : isDragging
      ? 'ลากมาวางบนวง'
      : selectedDisc
        ? skullDiscLabelTh(selectedDisc)
        : 'ลากจากมือ · หรือเลือกแล้วกดปุ่ม';

  return (
    <div className="card skull-place-card">
      <h2 className="skull-panel-title">{title}</h2>
      <p className="skull-panel-sub">{subtitle}</p>

      <div
        ref={setNodeRef}
        className={cn(
          'skull-place-drop',
          isDragging && 'skull-place-drop--dragging',
          isOver && 'skull-place-drop--over',
          selectedDisc && !isDragging && 'skull-place-drop--ready',
        )}
        aria-label="ลากดิสก์จากมือมาวางที่นี่"
      >
        <div className="skull-place-drop__slot" aria-hidden>
          {selectedDisc && !isOver ? (
            <img
              src={skullHandDiscUrl(selectedDisc)}
              alt=""
              className="skull-place-drop__preview"
            />
          ) : (
            <span className="skull-place-drop__ring" />
          )}
        </div>
        <p className="skull-place-drop__hint">{hint}</p>
      </div>

      <div className="skull-bid-actions">
        <Button type="button" disabled={!canPlaceSelected} onClick={onPlace}>
          {selectedDisc ? `วาง${skullDiscLabelTh(selectedDisc)}` : 'วางดิสก์ที่เลือก'}
        </Button>
      </div>
    </div>
  );
}
