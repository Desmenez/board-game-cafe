import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import type { ComponentProps } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import type { ExplodingKittensCardType } from 'shared';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { EkModalCard } from './EkModalCard';
import { EkModalShell } from './EkModalShell';
import type { EkActorSlot } from './EkActorsRow';

type CardVisuals = {
  label: Record<ExplodingKittensCardType, string>;
  image: Record<ExplodingKittensCardType, string>;
};

function EkAlterSortableSlot({
  slotId,
  cardType,
  caption,
  cardVisuals,
}: {
  slotId: string;
  cardType: ExplodingKittensCardType;
  caption: string;
  cardVisuals: CardVisuals;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slotId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    touchAction: 'none' as const,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'ek-modal-card ek-modal-card--grid',
        isDragging && 'ek-alter-sort-slot--dragging',
      )}
      {...attributes}
      {...listeners}
    >
      <img
        src={cardVisuals.image[cardType]}
        alt={cardVisuals.label[cardType]}
        className="ek-card-img"
        loading="lazy"
      />
      <div className="ek-modal-card__caption">{caption}</div>
    </div>
  );
}

function ReadOnlyTopThreeGrid({
  cards,
  cardVisuals,
  captionPrefix = '',
}: {
  cards: ExplodingKittensCardType[];
  cardVisuals: CardVisuals;
  captionPrefix?: string;
}) {
  return (
    <div className="ek-modal-card-grid ek-modal-card-grid--3">
      {cards.map((t, i) => (
        <EkModalCard
          key={`${captionPrefix}${t}-${i}`}
          size="grid"
          src={cardVisuals.image[t]}
          alt={cardVisuals.label[t]}
          caption={`${i + 1}. ${cardVisuals.label[t]}`}
        />
      ))}
    </div>
  );
}

export type EkTopThreeModalProps =
  | {
      mode: 'see-the-future';
      cards: ExplodingKittensCardType[];
      cardVisuals: CardVisuals;
      onAck: () => void;
      actor?: EkActorSlot;
    }
  | {
      mode: 'share-the-future';
      cards: ExplodingKittensCardType[];
      cardVisuals: CardVisuals;
      onAck: () => void;
      actor?: EkActorSlot;
    }
  | {
      mode: 'alter-the-future';
      top3: ExplodingKittensCardType[];
      alterOrder: number[];
      cardVisuals: CardVisuals;
      sensors: NonNullable<ComponentProps<typeof DndContext>['sensors']>;
      onDragEnd: (event: DragEndEvent) => void;
      onConfirm: () => void;
      actor?: EkActorSlot;
      /** Share the Future reuse this reorder UI with a different title. */
      title?: string;
    };

export function EkTopThreeModal(props: EkTopThreeModalProps) {
  if (props.mode === 'alter-the-future') {
    const {
      top3,
      alterOrder,
      cardVisuals,
      sensors,
      onDragEnd,
      onConfirm,
      actor,
      title = 'Alter the Future',
    } = props;
    const slotIds = alterOrder.map((_, i) => String(i));
    const cardCount = top3.length;
    return (
      <EkModalShell
        title={title}
        actors={actor ? { from: actor } : undefined}
        actionLine={{
          label: 'แอ็กชัน',
          value:
            cardCount <= 1
              ? cardCount === 0
                ? 'กองว่าง — กดยืนยันเพื่อไปต่อ'
                : 'มี 1 ใบบนสุด — กดยืนยันเพื่อไปต่อ'
              : `ลากสลับลำดับ · ซ้าย = บนสุดของกองที่จะถูกจั่วก่อน (${cardCount} ใบ)`,
        }}
        footer={
          <Button variant="primary" onClick={onConfirm}>
            ยืนยันลำดับ
          </Button>
        }
      >
        {cardCount === 0 ? (
          <p className="ek-modal-shell__hint">ไม่มีใบบนกองให้จัดลำดับ</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={slotIds} strategy={rectSortingStrategy}>
              <div className="ek-modal-card-grid ek-modal-card-grid--3" role="list">
                {alterOrder.map((idx, slot) => {
                  const t = top3[idx];
                  if (t == null) return null;
                  return (
                    <EkAlterSortableSlot
                      key={slot}
                      slotId={String(slot)}
                      cardType={t}
                      caption={`${slot + 1}. ${cardVisuals.label[t]}`}
                      cardVisuals={cardVisuals}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </EkModalShell>
    );
  }

  if (props.mode === 'see-the-future') {
    const { cards, cardVisuals, onAck, actor } = props;
    return (
      <EkModalShell
        title="See the Future"
        actors={actor ? { from: actor } : undefined}
        actionLine={{
          label: 'บนกองจั่ว',
          value: `${cards.length} ใบจากบนสุด (จากบน → ล่าง)`,
        }}
        footer={
          <Button variant="primary" onClick={onAck}>
            รับทราบ
          </Button>
        }
      >
        <ReadOnlyTopThreeGrid cards={cards} cardVisuals={cardVisuals} captionPrefix="see-" />
      </EkModalShell>
    );
  }

  const { cards, cardVisuals, onAck, actor } = props;
  return (
    <EkModalShell
      title="Share the Future"
      actors={actor ? { from: actor } : undefined}
      actionLine={{
        label: 'บนกองจั่ว',
        value: '3 ใบบนสุดที่จะถูกจั่ว (จากบน → ล่าง)',
      }}
      footer={
        <Button variant="primary" onClick={onAck}>
          รับทราบ
        </Button>
      }
    >
      <ReadOnlyTopThreeGrid cards={cards} cardVisuals={cardVisuals} captionPrefix="share-" />
    </EkModalShell>
  );
}
