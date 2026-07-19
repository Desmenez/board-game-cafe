import { useDraggable } from '@dnd-kit/core';
import type { FugitiveDrawPile, FugitivePlayerView } from 'shared';
import { DeckStack } from '../../../components/deck-stack';
import { FUGITIVE_CARD_BACK } from '../lib/cardMeta';
import { pileDragId } from '../lib/fugitiveDraw';

type Props = {
  counts: FugitivePlayerView['deckCounts'];
  canDraw: boolean;
  drawsRequired: number;
  onDraw: (pile: FugitiveDrawPile) => void;
};

function DeckPile({
  pile,
  label,
  count,
  canDraw,
  onDraw,
}: {
  pile: FugitiveDrawPile;
  label: string;
  count: number;
  canDraw: boolean;
  onDraw: (pile: FugitiveDrawPile) => void;
}) {
  const draggable = canDraw && count > 0;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: pileDragId(pile),
    disabled: !draggable,
  });

  return (
    <div className="fugitive-deck">
      <div
        ref={setNodeRef}
        className={[
          'fugitive-deck__pile',
          draggable ? 'fugitive-deck__pile--draggable' : '',
          draggable ? 'fugitive-deck__zone' : '',
          isDragging ? 'fugitive-deck__pile--dragging' : '',
          count === 0 ? 'fugitive-deck__pile--empty' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...(draggable ? listeners : {})}
        {...(draggable ? attributes : {})}
        aria-label={
          draggable
            ? `ลากจากกอง ${label} (${count} ใบ) ลงมือเพื่อจั่ว`
            : `กอง ${label} (${count} ใบ)`
        }
        onClick={() => {
          if (draggable) onDraw(pile);
        }}
        onKeyDown={(e) => {
          if (!draggable) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onDraw(pile);
          }
        }}
      >
        {count > 0 ? (
          <DeckStack
            backSrc={FUGITIVE_CARD_BACK}
            className="fugitive-deck-stack"
            layerClassName="fugitive-deck-layer"
            offset={5}
          />
        ) : null}
        <span className="fugitive-deck__count">{count}</span>
      </div>
      <span className="fugitive-deck__label">{label}</span>
    </div>
  );
}

export function FugitiveDeckPiles({ counts, canDraw, drawsRequired, onDraw }: Props) {
  const piles: { id: FugitiveDrawPile; label: string; count: number }[] = [
    { id: 'pile1', label: '4 – 14', count: counts.pile1 },
    { id: 'pile2', label: '15 – 28', count: counts.pile2 },
    { id: 'pile3', label: '29 – 41', count: counts.pile3 },
  ];

  return (
    <section
      className={['fugitive-decks-wrap', canDraw ? 'fugitive-decks-wrap--draw' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="กองจั่วการ์ด"
    >
      {canDraw && (
        <p className="fugitive-decks-wrap__hint">
          ลากจากกองจั่วลงมือเพื่อจั่ว
          {drawsRequired > 0 ? ` (อีก ${drawsRequired} ใบ)` : ''}
        </p>
      )}
      <div className="fugitive-decks">
        {piles.map((p) => (
          <DeckPile
            key={p.id}
            pile={p.id}
            label={p.label}
            count={p.count}
            canDraw={canDraw}
            onDraw={onDraw}
          />
        ))}
      </div>
    </section>
  );
}
