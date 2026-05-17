import { useDraggable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import type { PlayerHandDragMode } from './types';

type FanItemShellProps = {
  cardId: string;
  index: number;
  isLifted: boolean;
  isDrawing: boolean;
  slotRef: (el: HTMLLIElement | null) => void;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
};

function FanItemShell({
  index,
  isLifted,
  isDrawing,
  slotRef,
  className,
  style,
  children,
  dragAttributes,
  dragListeners,
}: FanItemShellProps) {
  return (
    <li
      ref={slotRef}
      className={[
        'player-hand-fan__item',
        isLifted ? 'player-hand-fan__item--lifted' : '',
        isDrawing ? 'player-hand-fan__item--drawing' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ zIndex: isLifted ? 200 : index + 1, ...style }}
      {...dragAttributes}
      {...dragListeners}
    >
      {children}
    </li>
  );
}

export type PlayerHandFanItemContentProps = {
  cardId: string;
  index: number;
  isHovered: boolean;
  isPinned: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  isDrawing: boolean;
  interactive: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onClick: () => void;
  onDoubleClick: () => void;
  face: ReactNode;
  dragMode: PlayerHandDragMode;
  draggableIdPrefix: string;
  registerSlot: (cardId: string, el: HTMLLIElement | null) => void;
};

function PlayerHandCardButton({
  interactive,
  isSelected,
  isDisabled,
  isDrawing,
  isLifted,
  onPointerEnter,
  onPointerLeave,
  onClick,
  onDoubleClick,
  face,
}: Pick<
  PlayerHandFanItemContentProps,
  | 'interactive'
  | 'isSelected'
  | 'isDisabled'
  | 'isDrawing'
  | 'onPointerEnter'
  | 'onPointerLeave'
  | 'onClick'
  | 'onDoubleClick'
  | 'face'
> & { isLifted: boolean }) {
  return (
    <button
      type="button"
      className={[
        'player-hand-card',
        interactive ? 'player-hand-card--interactive' : '',
        isSelected ? 'player-hand-card--selected' : '',
        isDisabled ? 'player-hand-card--disabled' : '',
        isDrawing ? 'player-hand-card--drawing' : '',
        isLifted ? 'player-hand-card--lifted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={isDisabled && interactive}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <span className="player-hand-card__face">{face}</span>
    </button>
  );
}

export function PlayerHandFanItemPlain(props: PlayerHandFanItemContentProps) {
  const isLifted = (props.isHovered || props.isPinned) && !props.isDrawing;
  const slotRef = (el: HTMLLIElement | null) => props.registerSlot(props.cardId, el);

  return (
    <FanItemShell
      cardId={props.cardId}
      index={props.index}
      isLifted={isLifted}
      isDrawing={props.isDrawing}
      slotRef={slotRef}
    >
      <PlayerHandCardButton {...props} isLifted={isLifted} face={props.face} />
    </FanItemShell>
  );
}

export function PlayerHandFanItemSortable(props: PlayerHandFanItemContentProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.cardId,
  });
  const isLifted = (props.isHovered || props.isPinned || isDragging) && !props.isDrawing;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const slotRef = (el: HTMLLIElement | null) => {
    setNodeRef(el);
    props.registerSlot(props.cardId, el);
  };

  return (
    <FanItemShell
      cardId={props.cardId}
      index={props.index}
      isLifted={isLifted}
      isDrawing={props.isDrawing}
      slotRef={slotRef}
      style={style}
      dragAttributes={attributes}
      dragListeners={listeners}
      className={isDragging ? 'player-hand-fan__item--dragging' : undefined}
    >
      <PlayerHandCardButton {...props} isLifted={isLifted} face={props.face} />
    </FanItemShell>
  );
}

export function PlayerHandFanItemDraggable(props: PlayerHandFanItemContentProps) {
  const dndId = `${props.draggableIdPrefix}-${props.cardId}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dndId,
  });
  const isLifted = (props.isHovered || props.isPinned || isDragging) && !props.isDrawing;
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const slotRef = (el: HTMLLIElement | null) => {
    setNodeRef(el);
    props.registerSlot(props.cardId, el);
  };

  return (
    <FanItemShell
      cardId={props.cardId}
      index={props.index}
      isLifted={isLifted}
      isDrawing={props.isDrawing}
      slotRef={slotRef}
      style={style}
      dragAttributes={attributes}
      dragListeners={listeners}
    >
      <PlayerHandCardButton {...props} isLifted={isLifted} face={props.face} />
    </FanItemShell>
  );
}
