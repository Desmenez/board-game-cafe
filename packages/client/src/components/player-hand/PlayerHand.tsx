import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HandCardPreviewModal } from './HandCardPreviewModal';
import { PlayerHandDrawGhosts } from './PlayerHandDrawGhosts';
import {
  PlayerHandFanItemDraggable,
  PlayerHandFanItemPlain,
  PlayerHandFanItemSortable,
} from './PlayerHandFanItem';
import { useHandDrawAnimation } from './useHandDrawAnimation';
import type { PlayerHandProps } from './types';
import './player-hand.css';

function joinClass(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

export function PlayerHand<T>({
  cards,
  getCardId,
  renderCard,
  selectedIds = [],
  onSelectToggle,
  disabledCardIds = [],
  onCardDoubleClick,
  dragMode = 'none',
  onReorder,
  draggableIdPrefix = 'hand',
  drawAnimation,
  getPreview,
  className,
  'aria-label': ariaLabel = 'การ์ดบนมือ',
}: PlayerHandProps<T>) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [previewCard, setPreviewCard] = useState<T | null>(null);
  const slotRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const cardIds = useMemo(() => cards.map(getCardId), [cards, getCardId]);
  const disabledSet = useMemo(() => new Set(disabledCardIds), [disabledCardIds]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const getSlotElement = useCallback((cardId: string) => slotRefs.current.get(cardId) ?? null, []);

  const registerSlot = useCallback((cardId: string, el: HTMLLIElement | null) => {
    if (el) slotRefs.current.set(cardId, el);
    else slotRefs.current.delete(cardId);
  }, []);

  const getPreviewSrc = useCallback(
    (cardId: string) => {
      const card = cards.find((c) => getCardId(c) === cardId);
      if (!card || !getPreview) return undefined;
      return getPreview(card).src;
    },
    [cards, getCardId, getPreview],
  );

  const { drawingIds, flights, finishCard } = useHandDrawAnimation({
    drawAnimation,
    getSlotElement,
    getPreviewSrc,
  });

  useEffect(() => {
    if (hoveredId && drawingIds.has(hoveredId)) {
      setHoveredId(null);
    }
    if (pinnedId && drawingIds.has(pinnedId)) {
      setPinnedId(null);
    }
  }, [drawingIds, hoveredId, pinnedId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleReorderDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = cardIds.indexOf(String(active.id));
      const newIndex = cardIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      onReorder?.(arrayMove(cardIds, oldIndex, newIndex));
    },
    [cardIds, onReorder],
  );

  const previewContent = previewCard && getPreview ? getPreview(previewCard) : null;

  if (cards.length === 0) return null;

  const FanItem =
    dragMode === 'reorder'
      ? PlayerHandFanItemSortable
      : dragMode === 'play'
        ? PlayerHandFanItemDraggable
        : PlayerHandFanItemPlain;

  const fan = (
    <ul className="player-hand-fan" role="list" aria-label={ariaLabel}>
      {cards.map((card, index) => {
        const cardId = getCardId(card);
        const isHovered = hoveredId === cardId;
        const isPinned = pinnedId === cardId;
        const isSelected = selectedSet.has(cardId);
        const isDisabled = disabledSet.has(cardId);
        const isDrawing = drawingIds.has(cardId);
        const interactive = Boolean(onSelectToggle) && !isDisabled;

        const face = renderCard({
          card,
          index,
          isHovered,
          isPinned,
          isSelected,
          isDisabled,
          isDrawing,
        });

        return (
          <FanItem
            key={cardId}
            cardId={cardId}
            index={index}
            isHovered={isHovered}
            isPinned={isPinned}
            isSelected={isSelected}
            isDisabled={isDisabled}
            isDrawing={isDrawing}
            interactive={interactive}
            dragMode={dragMode}
            draggableIdPrefix={draggableIdPrefix}
            registerSlot={registerSlot}
            face={face}
            onPointerEnter={() => setHoveredId(cardId)}
            onPointerLeave={() => setHoveredId((id) => (id === cardId ? null : id))}
            onClick={() => {
              if ('ontouchstart' in window && interactive) {
                setPinnedId((id) => (id === cardId ? null : cardId));
              }
              if (interactive) onSelectToggle?.(cardId);
            }}
            onDoubleClick={() => {
              if (getPreview) {
                setPreviewCard(card);
              }
              onCardDoubleClick?.(cardId, card);
            }}
          />
        );
      })}
    </ul>
  );

  const fanWrapped =
    dragMode === 'reorder' && onReorder ? (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorderDragEnd}>
        <SortableContext items={cardIds} strategy={horizontalListSortingStrategy}>
          {fan}
        </SortableContext>
      </DndContext>
    ) : (
      fan
    );

  return (
    <>
      <PlayerHandDrawGhosts flights={flights} onFlightComplete={finishCard} />
      <div className={joinClass('player-hand-dock', className)} data-player-hand-dock>
        <div className="player-hand-dock__inner">{fanWrapped}</div>
      </div>
      <HandCardPreviewModal
        open={previewCard !== null && previewContent !== null}
        preview={previewContent}
        onClose={() => setPreviewCard(null)}
      />
    </>
  );
}
