import { useCallback, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Link } from 'react-router-dom';
import {
  PlayerHand,
  PLAYER_HAND_DOCK_RESERVE_PX,
  useNewlyDrawnCardIds,
  type PlayerHandDragMode,
} from '../components/player-hand';
import { Button } from '../components/ui';
import './player-hand-demo.css';

type DemoCard = {
  id: string;
  label: string;
  src: string;
};

const DEMO_DECK_IMAGE =
  'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1777557982/cover_v1euj7.jpg';

const CARD_IMAGES = [
  'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1778991655/cover_cvy1xh.webp',
  'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1774628592/cover_pkoxtl.jpg',
  'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1776344821/cover_uj4rum.png',
];

let nextCardNum = 1;

function makeCard(): DemoCard {
  const n = nextCardNum++;
  const src = CARD_IMAGES[n % CARD_IMAGES.length] ?? DEMO_DECK_IMAGE;
  return { id: `demo-${n}`, label: `การ์ด ${n}`, src };
}

function PlayDropBoard({
  dragging,
  tableCards,
  onClearTable,
}: {
  dragging: boolean;
  tableCards: DemoCard[];
  onClearTable: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'demo-play-zone' });

  return (
    <section className="ph-demo-table" aria-label="โต๊ะเล่น">
      <div
        ref={setNodeRef}
        className={[
          'ph-demo-table__board',
          dragging ? 'ph-demo-table__board--active' : '',
          isOver ? 'ph-demo-table__board--over' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <p className="ph-demo-table__label">
          {isOver ? 'ปล่อยเพื่อเล่นการ์ด' : 'โซนวางการ์ด'}
        </p>
        <p className="ph-demo-table__hint">
          ลากการ์ดจากมือด้านล่างมาวางในพื้นที่นี้ — พื้นที่ drop ขนาดเต็มสำหรับทดสอบ drag &amp; play
        </p>

        <div className="ph-demo-table__played" aria-label="การ์ดบนโต๊ะ">
          {tableCards.length === 0 ? (
            <p className="ph-demo-table__played-empty">ยังไม่มีการ์ดบนโต๊ะ</p>
          ) : (
            tableCards.map((card) => (
              <figure key={card.id} className="ph-demo-played-card">
                <img src={card.src} alt={card.label} />
                <figcaption className="ph-demo-played-card__cap">{card.label}</figcaption>
              </figure>
            ))
          )}
        </div>
      </div>

      {tableCards.length > 0 ? (
        <Button type="button" size="sm" variant="secondary" onClick={onClearTable}>
          ล้างการ์ดบนโต๊ะ
        </Button>
      ) : null}
    </section>
  );
}

export function PlayerHandDemoPage() {
  const deckRef = useRef<HTMLButtonElement>(null);
  const [cards, setCards] = useState<DemoCard[]>(() => [makeCard(), makeCard(), makeCard()]);
  const [tableCards, setTableCards] = useState<DemoCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragMode, setDragMode] = useState<PlayerHandDragMode>('play');
  const [playDragId, setPlayDragId] = useState<string | null>(null);
  const [lastPlay, setLastPlay] = useState<string | null>(null);
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);
  const newlyDrawnIds = useNewlyDrawnCardIds(cardIds);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const drawCard = useCallback(() => {
    setCards((prev) => [...prev, makeCard()]);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const onReorder = useCallback((orderedIds: string[]) => {
    setCards((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      return orderedIds.map((id) => map.get(id)).filter((c): c is DemoCard => c != null);
    });
  }, []);

  const onPlayDragEnd = useCallback(
    (event: DragEndEvent) => {
      setPlayDragId(null);
      if (event.over?.id !== 'demo-play-zone' || !event.active.id.toString().startsWith('hand-')) {
        return;
      }
      const cardId = event.active.id.toString().replace(/^hand-/, '');
      const played = cards.find((c) => c.id === cardId);
      if (!played) return;

      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setTableCards((t) => (t.some((c) => c.id === cardId) ? t : [...t, played]));
      setSelectedIds((prev) => prev.filter((id) => id !== cardId));
      setLastPlay(cardId);
    },
    [cards],
  );

  const onPlayDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id.toString();
    if (id.startsWith('hand-')) setPlayDragId(id.replace(/^hand-/, ''));
  }, []);

  const activeCard = playDragId ? cards.find((c) => c.id === playDragId) : null;

  const hand = (
    <PlayerHand
      cards={cards}
      getCardId={(c) => c.id}
      selectedIds={selectedIds}
      onSelectToggle={toggleSelect}
      dragMode={dragMode}
      onReorder={dragMode === 'reorder' ? onReorder : undefined}
      draggableIdPrefix="hand"
      drawAnimation={{ newlyDrawnIds, drawFromRef: deckRef }}
      getPreview={(c) => ({ src: c.src, alt: c.label, caption: c.label })}
      renderCard={({ card }) => <img src={card.src} alt={card.label} />}
    />
  );

  return (
    <div
      className="page container flex flex-col gap-4"
      style={{ paddingBottom: PLAYER_HAND_DOCK_RESERVE_PX + 24 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={{ margin: 0 }}>Player Hand Demo</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Tabletopia-style hand — hover, double-click preview, draw animation, DnD modes
          </p>
        </div>
        <Link to="/" className="btn btn-secondary">
          กลับหน้าแรก
        </Link>
      </div>

      <div className="card flex flex-wrap gap-2 items-center">
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>โหมด:</span>
        {(['none', 'reorder', 'play'] as const).map((mode) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={dragMode === mode ? 'primary' : 'secondary'}
            onClick={() => setDragMode(mode)}
          >
            {mode}
          </Button>
        ))}
        <Button type="button" size="sm" variant="secondary" onClick={() => setCards([])}>
          ล้างมือ
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setCards([makeCard()])}>
          มือ 1 ใบ
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setCards(Array.from({ length: 8 }, () => makeCard()))}
        >
          มือ 8 ใบ
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setCards(Array.from({ length: 15 }, () => makeCard()))}
        >
          มือ 15 ใบ
        </Button>
      </div>

      <div className="card flex flex-wrap gap-3 items-start">
        <Button ref={deckRef} type="button" variant="primary" onClick={drawCard}>
          จั่วการ์ด (animation จากปุ่มนี้)
        </Button>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 420 }}>
          คลิกการ์ดเพื่อเลือก · double-click ดูใหญ่ · บนมือถือแตะเพื่อ lift
          {dragMode === 'play' ? ' · โหมด play: ลากการ์ดไปโซนวางด้านบน' : ''}
          {dragMode === 'reorder' ? ' · โหมด reorder: ลากการ์ดบนมือเพื่อสลับตำแหน่ง' : ''}
          {lastPlay ? ` · เล่นล่าสุด: ${lastPlay}` : ''}
        </p>
      </div>

      {dragMode === 'play' ? (
        <DndContext sensors={sensors} onDragStart={onPlayDragStart} onDragEnd={onPlayDragEnd}>
          <div className="ph-demo-layout--play">
            <PlayDropBoard
              dragging={playDragId !== null}
              tableCards={tableCards}
              onClearTable={() => setTableCards([])}
            />
            {hand}
          </div>
          <DragOverlay>
            {activeCard ? (
              <img
                src={activeCard.src}
                alt=""
                style={{
                  width: 112,
                  borderRadius: 8,
                  boxShadow: 'var(--shadow-lg)',
                }}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <>
          <div
            className="card"
            style={{
              minHeight: 100,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            พื้นที่เกม (โหมด {dragMode})
            {dragMode === 'reorder' ? ' — ลากการ์ดบนมือซ้าย-ขวาเพื่อเรียงลำดับ' : ' — สลับเป็น play เพื่อทดสอบโซน drop'}
          </div>
          {hand}
        </>
      )}
    </div>
  );
}
