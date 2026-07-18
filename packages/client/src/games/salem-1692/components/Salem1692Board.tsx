import { useDraggable, useDroppable } from '@dnd-kit/core';
import { forwardRef, type ReactNode, type Ref } from 'react';
import type { Salem1692PendingPlay, Salem1692PlayingCard } from 'shared';
import { DeckStack } from '../../../components/deck-stack';
import { Button } from '../../../components/ui';
import { CARD_BACK_URL, salem1692CardLabelTh, salem1692PlayingCardImage } from '../lib/cardMeta';

export const SALEM_DRAW_DRAG_ID = 'salem-draw-token';
export const SALEM_DISCARD_DROP_ID = 'salem-discard-play-zone';
export const SALEM_HAND_DROP_ID = 'salem-hand-dropzone';

function DrawPileSlot({
  deckRef,
  drawPileCount,
  shuffleTick,
  canDraw,
  drawsLeftThisAction,
  onDraw,
}: {
  deckRef: Ref<HTMLDivElement>;
  drawPileCount: number;
  shuffleTick: number;
  canDraw: boolean;
  drawsLeftThisAction: number | null;
  onDraw: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: SALEM_DRAW_DRAG_ID,
    disabled: !canDraw || drawPileCount === 0,
  });

  return (
    <div
      className={`s1692-pile s1692-pile--draw${canDraw ? ' s1692-pile--can-draw' : ''}${
        isDragging ? ' s1692-pile--dragging' : ''
      }`}
    >
      <div className="s1692-pile__label">กองจั่ว</div>
      <div
        ref={setNodeRef}
        className="s1692-pile__visual"
        {...(canDraw ? { ...listeners, ...attributes } : {})}
      >
        <DeckStack
          ref={deckRef}
          backSrc={CARD_BACK_URL}
          className="s1692-deck-stack"
          motionClassName="s1692-deck-stack-motion"
          layerClassName="s1692-deck-layer"
          shuffleTick={shuffleTick}
        />
      </div>
      <div className="s1692-pile__meta">{drawPileCount} ใบ</div>
      <Button type="button" size="sm" disabled={!canDraw || drawPileCount === 0} onClick={onDraw}>
        {drawsLeftThisAction != null ? `จั่ว (เหลือ ${drawsLeftThisAction})` : 'จั่ว 1 ใบ'}
      </Button>
      {canDraw ? (
        <p className="s1692-pile__hint">ลากกองจั่วลงมือเพื่อจั่ว · จั่วครบ 2 ใบแล้วจบเทิร์น</p>
      ) : null}
    </div>
  );
}

function DiscardPileSlot({
  discardTop,
  discardPileCount,
  canDropPlay,
  pendingPlay,
  cardsPlayedThisTurn,
  canEndTurn,
  onEndTurn,
  children,
}: {
  discardTop: Salem1692PlayingCard | null;
  discardPileCount: number;
  canDropPlay: boolean;
  pendingPlay: Salem1692PendingPlay | null;
  cardsPlayedThisTurn: number;
  canEndTurn: boolean;
  onEndTurn: () => void;
  children?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: SALEM_DISCARD_DROP_ID,
    disabled: !canDropPlay,
  });

  const staged = pendingPlay?.card ?? null;
  const face = staged ?? discardTop;
  const showEndTurn = cardsPlayedThisTurn >= 1;

  return (
    <div
      ref={setNodeRef}
      className={[
        's1692-pile',
        's1692-pile--discard',
        canDropPlay ? 's1692-pile--can-drop' : '',
        isOver && canDropPlay ? 's1692-pile--over' : '',
        staged ? 's1692-pile--staging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="s1692-pile__label">กองทิ้ง</div>
      <div className="s1692-pile__visual">
        {face ? (
          <div className="s1692-pile__card-face">
            <img
              src={salem1692PlayingCardImage(face.kind)}
              alt={salem1692CardLabelTh(face.kind)}
              className="s1692-pile__card-img"
              loading="lazy"
            />
            <span className="s1692-pile__card-cap">{salem1692CardLabelTh(face.kind)}</span>
          </div>
        ) : (
          <div className="s1692-pile__empty">ว่าง</div>
        )}
      </div>
      <div className="s1692-pile__meta">{discardPileCount} ใบ</div>
      {staged && pendingPlay ? (
        <p className="s1692-pile__staging-label">
          <strong>{pendingPlay.actorName}</strong> กำลังเล่น {salem1692CardLabelTh(staged.kind)}
        </p>
      ) : canDropPlay ? (
        <p className="s1692-pile__hint">ลากการ์ดจากมือมาวางที่นี่เพื่อเล่น</p>
      ) : null}
      {showEndTurn ? (
        <Button
          type="button"
          size="sm"
          variant="primary"
          disabled={!canEndTurn}
          onClick={onEndTurn}
        >
          จบตา
          {canEndTurn ? ` (${cardsPlayedThisTurn} ใบ)` : ' — รอจบแอ็กชันก่อน'}
        </Button>
      ) : null}
      {children}
    </div>
  );
}

type Props = {
  drawPileCount: number;
  discardPileCount: number;
  discardTop: Salem1692PlayingCard | null;
  shuffleTick: number;
  canDraw: boolean;
  canDropPlay: boolean;
  drawsLeftThisAction: number | null;
  pendingPlay: Salem1692PendingPlay | null;
  revealedWitchTryalCount: number;
  totalWitchTryalCount: number;
  cardsPlayedThisTurn: number;
  canEndTurn: boolean;
  onDraw: () => void;
  onEndTurn: () => void;
  sectionDesc: string;
};

export const Salem1692Board = forwardRef<HTMLDivElement, Props>(function Salem1692Board(
  {
    drawPileCount,
    discardPileCount,
    discardTop,
    shuffleTick,
    canDraw,
    canDropPlay,
    drawsLeftThisAction,
    pendingPlay,
    revealedWitchTryalCount,
    totalWitchTryalCount,
    cardsPlayedThisTurn,
    canEndTurn,
    onDraw,
    onEndTurn,
    sectionDesc,
  },
  ref,
) {
  return (
    <section className="card s1692-market-card" aria-label="กลางโต๊ะ">
      <h2 className="s1692-section-title">กลางโต๊ะ</h2>
      <p className="s1692-section-desc">{sectionDesc}</p>
      <div className="s1692-market-trio">
        <div className="s1692-market-trio__piles">
          <DrawPileSlot
            deckRef={ref}
            drawPileCount={drawPileCount}
            shuffleTick={shuffleTick}
            canDraw={canDraw}
            drawsLeftThisAction={drawsLeftThisAction}
            onDraw={onDraw}
          />
          <DiscardPileSlot
            discardTop={discardTop}
            discardPileCount={discardPileCount}
            canDropPlay={canDropPlay}
            pendingPlay={pendingPlay}
            cardsPlayedThisTurn={cardsPlayedThisTurn}
            canEndTurn={canEndTurn}
            onEndTurn={onEndTurn}
          />
        </div>
        <div className="s1692-pile s1692-pile--tryal">
          <div className="s1692-pile__label">Witch Tryal</div>
          <p className="s1692-pile__tryal-count">
            {revealedWitchTryalCount} / {totalWitchTryalCount}
          </p>
          <p className="s1692-pile__hint">เปิดเผยแล้ว / ทั้งหมด</p>
        </div>
      </div>
    </section>
  );
});

export function Salem1692HandDockDropzone({ disabled }: { disabled: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: SALEM_HAND_DROP_ID,
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      className={[
        's1692-hand-dock-dropzone',
        isOver && !disabled ? 's1692-hand-dock-dropzone--over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    />
  );
}
