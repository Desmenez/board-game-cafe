import { CSS } from '@dnd-kit/utilities';
import { useDraggable } from '@dnd-kit/core';
import type { CamelUpColor, CamelUpPlayerView } from 'shared';
import { camelUpLegBetTileUrl } from './assetMeta';
import { CAMEL_COLOR_LABEL, camelColorClass } from './camelMeta';
import { legBetDragId } from './camelUpLegBetDnd';

function LegBetDraggableTile({ color, value }: { color: CamelUpColor; value: number }) {
  const src = camelUpLegBetTileUrl(color, value);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: legBetDragId(color),
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className="camel-up-leg-stack__tile camel-up-leg-stack__tile--draggable"
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.45 : 1 }}
      aria-label={`ลาก Leg bet ${CAMEL_COLOR_LABEL[color]} ${value} EP`}
      {...attributes}
      {...listeners}
    >
      <img src={src} alt="" className="camel-up-leg-stack__tile-img" loading="lazy" />
    </button>
  );
}

function LegBetStackColumn({
  stack,
  draggable,
}: {
  stack: CamelUpPlayerView['legBetStacks'][0];
  draggable: boolean;
}) {
  const top = stack.values[0];
  const under = stack.values[1];

  return (
    <div
      className={[
        'camel-up-leg-stack rounded-2xl overflow-hidden border-2',
        camelColorClass(stack.color),
      ].join(' ')}
    >
      <div className="camel-up-leg-stack__pile">
        {stack.values.length === 0 ? (
          <div className="camel-up-leg-stack__empty" aria-hidden>
            <span className="camel-up-leg-stack__empty-label">หมด</span>
          </div>
        ) : (
          <>
            {under !== undefined ? (
              <img
                src={camelUpLegBetTileUrl(stack.color, under)}
                alt=""
                className="camel-up-leg-stack__tile-img camel-up-leg-stack__tile-img--under"
                loading="lazy"
                aria-hidden
              />
            ) : null}
            {draggable && top !== undefined ? (
              <LegBetDraggableTile color={stack.color} value={top} />
            ) : top !== undefined ? (
              <img
                src={camelUpLegBetTileUrl(stack.color, top)}
                alt=""
                className="camel-up-leg-stack__tile-img camel-up-leg-stack__tile-img--top"
                loading="lazy"
              />
            ) : null}
            {stack.values.length > 1 ? (
              <span
                className="camel-up-leg-stack__count"
                aria-label={`เหลือ ${stack.values.length} ใบ`}
              >
                {stack.values.length}
              </span>
            ) : null}
          </>
        )}
      </div>
      <span className="camel-up-leg-stack__label text-black! mt-2!">
        {CAMEL_COLOR_LABEL[stack.color]}
      </span>
    </div>
  );
}

type Props = {
  stacks: CamelUpPlayerView['legBetStacks'];
  draggableColors: readonly CamelUpColor[];
};

export function CamelUpLegBetStacks({ stacks, draggableColors }: Props) {
  const draggableSet = new Set(draggableColors);

  return (
    <div className="camel-up-leg-stacks" role="list" aria-label="Leg betting tiles">
      {stacks.map((stack) => (
        <LegBetStackColumn
          key={stack.color}
          stack={stack}
          draggable={draggableSet.has(stack.color) && stack.values.length > 0}
        />
      ))}
    </div>
  );
}
