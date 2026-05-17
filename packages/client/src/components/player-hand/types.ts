import type { ReactNode, RefObject } from 'react';

export type PlayerHandDragMode = 'none' | 'reorder' | 'play';

export type PlayerHandCardRenderProps<T> = {
  card: T;
  index: number;
  isHovered: boolean;
  isPinned: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  /** True while draw-in animation is running for this card */
  isDrawing: boolean;
};

export type PlayerHandPreviewContent = {
  src: string;
  alt: string;
  caption?: ReactNode;
};

export type PlayerHandDrawAnimation = {
  /** Card ids that just entered the hand (e.g. from useNewlyDrawnCardIds) */
  newlyDrawnIds?: string[];
  drawFromRef?: RefObject<HTMLElement | null>;
  drawFromRect?: DOMRect | null;
};

export type PlayerHandProps<T> = {
  cards: T[];
  getCardId: (card: T) => string;
  renderCard: (props: PlayerHandCardRenderProps<T>) => ReactNode;
  selectedIds?: string[];
  onSelectToggle?: (id: string) => void;
  disabledCardIds?: readonly string[];
  onCardDoubleClick?: (id: string, card: T) => void;
  dragMode?: PlayerHandDragMode;
  onReorder?: (orderedIds: string[]) => void;
  /** Prefix for @dnd-kit ids in play mode, e.g. `hand` → `hand-${cardId}` */
  draggableIdPrefix?: string;
  drawAnimation?: PlayerHandDrawAnimation;
  getPreview?: (card: T) => PlayerHandPreviewContent;
  className?: string;
  'aria-label'?: string;
};

/** Suggested bottom padding when a fixed hand dock is visible */
export const PLAYER_HAND_DOCK_RESERVE_PX = 168;
