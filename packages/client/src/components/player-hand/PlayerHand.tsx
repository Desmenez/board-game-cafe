import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDndMonitor,
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
import { usePlayPeelSwipe } from './usePlayPeelSwipe';
import type { PlayerHandProps } from './types';
import './player-hand.css';

function joinClass(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

/** Only mount under a parent <DndContext> when dragMode is `play`. */
function PlayerHandPlayDragMonitor({
  draggableIdPrefix,
  revealPlayDock,
  onDragFromHandChange,
}: {
  draggableIdPrefix: string;
  revealPlayDock: () => void;
  onDragFromHandChange: (dragging: boolean) => void;
}) {
  const draggingRef = useRef(false);

  useDndMonitor({
    onDragStart({ active }) {
      const id = String(active.id);
      if (!id.startsWith(`${draggableIdPrefix}-`)) return;
      draggingRef.current = true;
      onDragFromHandChange(true);
      revealPlayDock();
    },
    onDragEnd() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      onDragFromHandChange(false);
    },
    onDragCancel() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      onDragFromHandChange(false);
    },
  });

  return null;
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
  dockPeek,
  className,
  'aria-label': ariaLabel = 'การ์ดบนมือ',
}: PlayerHandProps<T>) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [previewCard, setPreviewCard] = useState<T | null>(null);
  const [playDockExpanded, setPlayDockExpanded] = useState(false);
  const [playDockHovered, setPlayDockHovered] = useState(false);
  const [playDragFromHand, setPlayDragFromHand] = useState(false);
  const peelRef = useRef<HTMLDivElement>(null);
  const peelCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playDragFromHandRef = useRef(false);
  const slotRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const isPlayPeek = dockPeek ?? dragMode === 'play';
  const isPlayDockRevealed = playDockExpanded || playDockHovered || playDragFromHand;

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

  useEffect(() => {
    if (!isPlayPeek) {
      setPlayDockExpanded(false);
      setPlayDockHovered(false);
    }
  }, [isPlayPeek]);

  // Leaving play drag (e.g. Fugitive turn ends) should collapse — keep dockPeek so CSS
  // stays in half-card mode instead of jumping to the full always-open dock.
  useEffect(() => {
    if (dragMode === 'play') return;
    setPlayDockExpanded(false);
    setPlayDockHovered(false);
    setPlayDragFromHand(false);
    playDragFromHandRef.current = false;
    if (peelCollapseTimerRef.current) {
      clearTimeout(peelCollapseTimerRef.current);
      peelCollapseTimerRef.current = null;
    }
  }, [dragMode]);

  useEffect(() => {
    return () => {
      if (peelCollapseTimerRef.current) clearTimeout(peelCollapseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isPlayPeek || !playDockExpanded) return;
    const onPointerDown = (event: PointerEvent) => {
      if (peelRef.current?.contains(event.target as Node)) return;
      setPlayDockExpanded(false);
      setPlayDockHovered(false);
      if (peelCollapseTimerRef.current) {
        clearTimeout(peelCollapseTimerRef.current);
        peelCollapseTimerRef.current = null;
      }
    };
    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true });
  }, [isPlayPeek, playDockExpanded]);

  const cancelPeelCollapse = useCallback(() => {
    if (peelCollapseTimerRef.current) {
      clearTimeout(peelCollapseTimerRef.current);
      peelCollapseTimerRef.current = null;
    }
  }, []);

  const schedulePeelCollapse = useCallback(() => {
    cancelPeelCollapse();
    peelCollapseTimerRef.current = setTimeout(() => {
      setPlayDockHovered(false);
      peelCollapseTimerRef.current = null;
    }, 280);
  }, [cancelPeelCollapse]);

  const onPeelFocusCapture = useCallback(() => {
    if (!isPlayPeek) return;
    cancelPeelCollapse();
    setPlayDockHovered(true);
  }, [cancelPeelCollapse, isPlayPeek]);

  const onPeelPointerEnter = useCallback(
    (event: React.PointerEvent) => {
      if (!isPlayPeek || event.pointerType === 'touch') return;
      cancelPeelCollapse();
      setPlayDockHovered(true);
    },
    [cancelPeelCollapse, isPlayPeek],
  );

  const onPeelPointerLeave = useCallback(
    (event: React.PointerEvent) => {
      if (!isPlayPeek || event.pointerType === 'touch' || playDragFromHandRef.current) return;
      schedulePeelCollapse();
    },
    [isPlayPeek, schedulePeelCollapse],
  );

  const revealPlayDock = useCallback(() => {
    if (isPlayPeek) {
      cancelPeelCollapse();
      setPlayDockExpanded(true);
      setPlayDockHovered(true);
    }
  }, [cancelPeelCollapse, isPlayPeek]);

  const onCardPointerEnter = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, cardId: string) => {
      setHoveredId(cardId);
      if (isPlayPeek && event.pointerType === 'mouse') {
        cancelPeelCollapse();
        setPlayDockHovered(true);
      }
    },
    [cancelPeelCollapse, isPlayPeek],
  );

  const onPlayDragFromHandChange = useCallback((dragging: boolean) => {
    playDragFromHandRef.current = dragging;
    setPlayDragFromHand(dragging);
  }, []);

  const collapsePlayDock = useCallback(() => {
    cancelPeelCollapse();
    setPlayDockExpanded(false);
    setPlayDockHovered(false);
  }, [cancelPeelCollapse]);

  const peelSwipe = usePlayPeelSwipe({
    enabled: isPlayPeek,
    onSwipeUp: revealPlayDock,
    onSwipeDown: collapsePlayDock,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
            onPointerEnter={(event) => onCardPointerEnter(event, cardId)}
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleReorderDragEnd}
      >
        <SortableContext items={cardIds} strategy={horizontalListSortingStrategy}>
          {fan}
        </SortableContext>
      </DndContext>
    ) : (
      fan
    );

  return (
    <>
      {isPlayPeek && dragMode === 'play' ? (
        <PlayerHandPlayDragMonitor
          draggableIdPrefix={draggableIdPrefix}
          revealPlayDock={revealPlayDock}
          onDragFromHandChange={onPlayDragFromHandChange}
        />
      ) : null}
      <PlayerHandDrawGhosts flights={flights} onFlightComplete={finishCard} />
      <div
        className={joinClass(
          'player-hand-dock',
          isPlayPeek && 'player-hand-dock--play-peek',
          isPlayPeek && isPlayDockRevealed && 'player-hand-dock--revealed',
          dragMode === 'play' && 'player-hand-dock--play-drag',
          className,
        )}
        data-player-hand-dock
        aria-expanded={isPlayPeek ? isPlayDockRevealed : undefined}
      >
        <div
          ref={peelRef}
          className="player-hand-dock__peel"
          onPointerEnter={onPeelPointerEnter}
          onPointerLeave={onPeelPointerLeave}
          onFocusCapture={onPeelFocusCapture}
          onBlurCapture={(event) => {
            if (peelRef.current?.contains(event.relatedTarget as Node)) return;
            schedulePeelCollapse();
          }}
          {...peelSwipe}
        >
          <div className="player-hand-dock__inner">
            <div className="player-hand-fan-scroll">{fanWrapped}</div>
          </div>
        </div>
      </div>
      <HandCardPreviewModal
        open={previewCard !== null && previewContent !== null}
        preview={previewContent}
        onClose={() => setPreviewCard(null)}
      />
    </>
  );
}
