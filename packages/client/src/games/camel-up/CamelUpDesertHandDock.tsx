import { CSS } from '@dnd-kit/utilities';
import { useDraggable } from '@dnd-kit/core';
import type { CamelUpDesertEffect } from 'shared';
import { camelUpDesertTileUrl } from './assetMeta';
import { desertDragId } from './camelUpDesertDnd';

const DESERT_HAND_TILES: { effect: CamelUpDesertEffect; label: string }[] = [
  { effect: 'oasis', label: 'Oasis (+1)' },
  { effect: 'mirage', label: 'Mirage (-1)' },
];

function DesertHandTile({ effect, label }: { effect: CamelUpDesertEffect; label: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: desertDragId(effect),
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className="camel-up-desert-hand__tile"
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.45 : 1 }}
      aria-label={`ลาก ${label}`}
      {...attributes}
      {...listeners}
    >
      <img
        src={camelUpDesertTileUrl(effect)}
        alt=""
        className="camel-up-desert-hand__img"
        loading="lazy"
      />
      <span className="camel-up-desert-hand__label">{label}</span>
    </button>
  );
}

type Props = {
  isDragging: boolean;
};

export function CamelUpDesertHandDock({ isDragging }: Props) {
  return (
    <div
      className={['camel-up-desert-hand', isDragging ? 'camel-up-desert-hand--dragging' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="Desert tiles บนมือ"
    >
      <p className="camel-up-desert-hand__hint">ลาก Oasis หรือ Mirage ไปวางบนช่องที่ไฮไลต์</p>
      <div className="camel-up-desert-hand__tiles">
        {DESERT_HAND_TILES.map(({ effect, label }) => (
          <DesertHandTile key={effect} effect={effect} label={label} />
        ))}
      </div>
    </div>
  );
}
