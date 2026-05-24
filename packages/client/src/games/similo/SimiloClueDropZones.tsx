import { useDroppable } from '@dnd-kit/core';
import type { SimiloOrientation } from 'shared';
import { SIMILO_DROP_DIFFERENT, SIMILO_DROP_SIMILAR } from './similoClueDrop';

type DropSlotProps = {
  orientation: SimiloOrientation;
  isDragging: boolean;
  disabled?: boolean;
};

function ClueDropSlot({ orientation, isDragging, disabled }: DropSlotProps) {
  const isSimilar = orientation === 'similar';
  const dropId = isSimilar ? SIMILO_DROP_SIMILAR : SIMILO_DROP_DIFFERENT;
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    disabled: disabled || !isDragging,
  });

  const showTarget = isDragging && !disabled;
  const showOver = showTarget && isOver;

  return (
    <div
      ref={setNodeRef}
      className={[
        'similo-clue-drop',
        isSimilar ? 'similo-clue-drop--similar' : 'similo-clue-drop--different',
        showTarget ? 'similo-clue-drop--active' : '',
        showOver ? 'similo-clue-drop--over' : '',
        disabled ? 'similo-clue-drop--disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={
        isSimilar ? 'วางการ์ดที่นี่ — คล้ายตัวละครลับ' : 'วางการ์ดที่นี่ — ต่างจากตัวละครลับ'
      }
    >
      <div
        className={[
          'similo-clue-drop__frame',
          isSimilar ? 'similo-clue-drop__frame--portrait' : 'similo-clue-drop__frame--landscape',
        ].join(' ')}
        aria-hidden
      >
        <span className="similo-clue-drop__glyph">{isSimilar ? '↑' : '→'}</span>
      </div>
      <div className="similo-clue-drop__copy">
        <span className="similo-clue-drop__title">{isSimilar ? 'คล้าย' : 'ต่าง'}</span>
        <span className="similo-clue-drop__hint">
          {isSimilar ? 'แนวตั้ง · เหมือนตัวละครลับ' : 'แนวนอน · ไม่เหมือนตัวละครลับ'}
        </span>
      </div>
      {showOver ? (
        <span className="similo-clue-drop__release">ปล่อยเพื่อเล่นการ์ด</span>
      ) : showTarget ? (
        <span className="similo-clue-drop__release similo-clue-drop__release--muted">
          ลากการ์ดมาวาง
        </span>
      ) : null}
    </div>
  );
}

type Props = {
  isDragging: boolean;
  disabled?: boolean;
};

export function SimiloClueDropZones({ isDragging, disabled }: Props) {
  return (
    <div className="similo-clue-drop-zones" role="group" aria-label="เล่นการ์ดคำใบ้">
      <ClueDropSlot orientation="similar" isDragging={isDragging} disabled={disabled} />
      <ClueDropSlot orientation="different" isDragging={isDragging} disabled={disabled} />
    </div>
  );
}
