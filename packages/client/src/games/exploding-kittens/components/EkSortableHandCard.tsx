import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { ExplodingKittensCard, ExplodingKittensCardType } from 'shared';
import { CARD_IMAGE, CARD_LABEL } from '../lib/cardMeta';

export function EkSortableHandCard({
  card,
  onPeek,
  showDragHandle,
  selectionActive,
  selected,
  canSelectCard,
  onToggleSelect,
}: {
  card: ExplodingKittensCard;
  onPeek: (t: ExplodingKittensCardType) => void;
  showDragHandle: boolean;
  selectionActive: boolean;
  selected: boolean;
  canSelectCard: boolean;
  onToggleSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 40 : undefined,
  };
  const face = (
    <>
      <img src={CARD_IMAGE[card.type]} alt="" className="ek-card-img" loading="lazy" aria-hidden />
      <div className="ek-hand-card-caption">{CARD_LABEL[card.type]}</div>
    </>
  );
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ek-hand-sort-card ek-hand-card-with-zoom${isDragging ? ' ek-hand-sort-card--dragging' : ''}${selected ? ' ek-hand-sort-card--selected' : ''}`}
      {...attributes}
    >
      <div className="ek-hand-sort-card__body-wrap">
        {selectionActive ? (
          <button
            type="button"
            className={`ek-hand-sort-card__face${canSelectCard ? '' : ' ek-hand-sort-card__face--blocked'}`}
            disabled={!canSelectCard}
            aria-pressed={selected}
            aria-label={`${selected ? 'ยกเลิกการเลือก' : 'เลือก'} ${CARD_LABEL[card.type]}`}
            onClick={() => {
              if (canSelectCard) onToggleSelect();
            }}
          >
            {face}
          </button>
        ) : (
          <div className="ek-hand-sort-card__face ek-hand-sort-card__face--static">{face}</div>
        )}
        <button
          type="button"
          className="ek-hand-card-zoom-btn"
          aria-label={`ดูการ์ด ${CARD_LABEL[card.type]} แบบเต็ม`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onPeek(card.type);
          }}
        >
          ?
        </button>
      </div>
      {showDragHandle ? (
        <button
          type="button"
          className="ek-hand-sort-card__grip"
          aria-label="ลากเพื่อจัดเรียงมือ"
          {...listeners}
        >
          <span className="ek-hand-sort-card__grip-bars" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <span className="ek-hand-sort-card__grip-text">ลากเรียง</span>
        </button>
      ) : null}
    </div>
  );
}
