import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import type { ComponentProps } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import type { ExplodingKittensCardType } from 'shared';
import { Button } from '../../../components/ui';

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
      className={`ek-modal-card-preview ek-alter-sort-slot${isDragging ? ' ek-alter-sort-slot--dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <img
        src={cardVisuals.image[cardType]}
        alt={cardVisuals.label[cardType]}
        className="ek-card-img"
        loading="lazy"
      />
      <div className="ek-card-caption">{caption}</div>
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
  /** e.g. '' or 'see-' for keys */
  captionPrefix?: string;
}) {
  return (
    <div className="ek-modal-card-grid ek-modal-card-grid--dense ek-alter-future-modal-grid ek-see-future-peek-grid ek-top-three-modal-grid">
      {cards.map((t, i) => (
        <div key={`${captionPrefix}${t}-${i}`} className="ek-modal-card-preview">
          <img
            src={cardVisuals.image[t]}
            alt={cardVisuals.label[t]}
            className="ek-card-img"
            loading="lazy"
          />
          <div className="ek-card-caption">
            {i + 1}. {cardVisuals.label[t]}
          </div>
        </div>
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
    }
  | {
      mode: 'share-the-future';
      cards: ExplodingKittensCardType[];
      cardVisuals: CardVisuals;
      onAck: () => void;
    }
  | {
      mode: 'alter-the-future';
      top3: ExplodingKittensCardType[];
      alterOrder: [number, number, number];
      cardVisuals: CardVisuals;
      sensors: NonNullable<ComponentProps<typeof DndContext>['sensors']>;
      onDragEnd: (event: DragEndEvent) => void;
      onConfirm: () => void;
    };

/**
 * โมดัล 3 ใบบนกอง — แยกโหมดชัด: See / Share (ดูอย่างเดียว) กับ Alter (ลากสลับ)
 * ไม่ใช้โค้ดร่วมระหว่าง share กับ see/alter นอกจาก grid อ่านอย่างเดียวภายในไฟล์นี้
 */
export function EkTopThreeModal(props: EkTopThreeModalProps) {
  if (props.mode === 'alter-the-future') {
    const { top3, alterOrder, cardVisuals, sensors, onDragEnd, onConfirm } = props;
    return (
      <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
        <div className="modal ek-multi-card-modal">
          <h2>Alter the Future</h2>
          <p className="ek-see-future-modal-hint">
            ลากการ์ดเพื่อสลับลำดับ · ซ้าย = บนสุดของกองที่จะถูกจั่วก่อน — แล้วกดยืนยัน
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={['0', '1', '2']} strategy={rectSortingStrategy}>
              <div
                className="ek-modal-card-grid ek-modal-card-grid--dense ek-alter-future-modal-grid ek-see-future-modal-cards ek-alter-future-dnd-grid ek-top-three-modal-grid"
                role="list"
              >
                {[0, 1, 2].map((slot) => {
                  const idx = alterOrder[slot];
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
          <Button block onClick={onConfirm}>
            ยืนยันลำดับ
          </Button>
        </div>
      </div>
    );
  }

  if (props.mode === 'see-the-future') {
    const { cards, cardVisuals, onAck } = props;
    return (
      <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
        <div className="modal ek-multi-card-modal">
          <h2>See the Future</h2>
          <p className="ek-see-future-modal-hint">
            บนกองจั่ว {cards.length} ใบล่างสุด (จากบน → ล่าง)
          </p>
          <ReadOnlyTopThreeGrid cards={cards} cardVisuals={cardVisuals} captionPrefix="see-" />
          <Button block onClick={onAck}>
            รับทราบ
          </Button>
        </div>
      </div>
    );
  }

  const { cards, cardVisuals, onAck } = props;
  return (
    <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
      <div className="modal ek-multi-card-modal">
        <h2>Share the Future</h2>
        <p className="ek-see-future-modal-hint">
          ผู้เล่นก่อนหน้าจัดกองให้แล้ว — ดู 3 ใบบนสุดที่จะถูกจั่ว (จากบน → ล่าง)
        </p>
        <ReadOnlyTopThreeGrid cards={cards} cardVisuals={cardVisuals} captionPrefix="share-" />
        <Button block onClick={onAck}>
          รับทราบ
        </Button>
      </div>
    </div>
  );
}
