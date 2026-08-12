import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useMemo, useState } from 'react';
import {
  skullPhaseLabelTh,
  type SkullAction,
  type SkullPlayerView,
} from 'shared';
import {
  GameOverModal,
  GamePlayHeader,
  GameShell,
} from '../../components/game-shell';
import {
  PlayerHand,
  PLAYER_HAND_DOCK_PEEK_RESERVE_PX,
  useLockBodyScroll,
  usePlayDragSensors,
} from '../../components/player-hand';
import { Button } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { cn } from '../../utils/cn';
import { skullDiscLabelTh, skullHandDiscUrl } from './art';
import { SkullBidControls } from './components/SkullBidControls';
import { SkullDiscardModal } from './components/SkullDiscardModal';
import { SkullGameOverBody } from './components/SkullGameOverBody';
import {
  SKULL_PLACE_DROP_ID,
  SkullPlacePanel,
} from './components/SkullPlacePanel';
import { SkullStatusSummary } from './components/SkullStatusSummary';
import { SkullTable } from './components/SkullTable';
import './skull.css';

const HAND_PREFIX = 'skull-hand';

type Props = {
  gameState: SkullPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

function send(sendAction: Props['sendAction'], action: SkullAction) {
  sendAction(action);
}

function subtitle(view: SkullPlayerView): string {
  const active = view.seats.find((s) => s.id === view.activePlayerId);
  const phase = skullPhaseLabelTh(view.phase);
  if (view.phase === 'game_over') return 'เกมจบแล้ว';
  if (view.phase === 'challenge') {
    return `${phase} · ${view.flippedCount}/${view.currentBid} · บนโต๊ะ ${view.discsInPlay}`;
  }
  if (view.phase === 'bidding') {
    return `${phase} · บิด ${view.currentBid} · ตา ${active?.name ?? '…'}`;
  }
  if (active) return `${phase} · ตา ${active.name}`;
  return `${phase} · รอบ ${view.round}`;
}

export function SkullGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragDiscId, setDragDiscId] = useState<string | null>(null);
  const view = gameState;
  const you = view.you;

  useYourTurnToast(you.canAct && view.phase !== 'game_over' && view.phase !== 'round_result');

  const hand = you.hand;
  const selected = useMemo(() => (selectedId ? [selectedId] : []), [selectedId]);
  const playSensors = usePlayDragSensors();
  const isDragging = dragDiscId !== null;
  useLockBodyScroll(isDragging);

  const canPlace =
    you.canAct &&
    (view.phase === 'opening_place' || view.phase === 'decision') &&
    you.legalPlaceDiscIds.length > 0;

  const mustBid =
    view.phase === 'decision' && you.canAct && you.legalPlaceDiscIds.length === 0;

  const selectedDisc = useMemo(
    () => (selectedId ? (hand.find((d) => d.id === selectedId) ?? null) : null),
    [hand, selectedId],
  );

  const dragDisc = useMemo(
    () => (dragDiscId ? (hand.find((d) => d.id === dragDiscId) ?? null) : null),
    [dragDiscId, hand],
  );

  const placeDisc = useCallback(
    (discId: string) => {
      if (!you.legalPlaceDiscIds.includes(discId)) return;
      if (view.phase === 'opening_place') {
        send(sendAction, { type: 'place_opening', discId });
      } else if (view.phase === 'decision') {
        send(sendAction, { type: 'place_disc', discId });
      } else {
        return;
      }
      setSelectedId(null);
    },
    [sendAction, view.phase, you.legalPlaceDiscIds],
  );

  const placeSelected = () => {
    if (!selectedId) return;
    placeDisc(selectedId);
  };

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!canPlace) return;
      const id = event.active.id.toString();
      if (!id.startsWith(`${HAND_PREFIX}-`)) return;
      const discId = id.slice(HAND_PREFIX.length + 1);
      if (!you.legalPlaceDiscIds.includes(discId)) return;
      setDragDiscId(discId);
      setSelectedId(discId);
    },
    [canPlace, you.legalPlaceDiscIds],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const discId = dragDiscId;
      setDragDiscId(null);
      if (!discId || !canPlace) return;
      if (event.over?.id?.toString() === SKULL_PLACE_DROP_ID) {
        placeDisc(discId);
      }
    },
    [canPlace, dragDiscId, placeDisc],
  );

  const onDragCancel = useCallback(() => setDragDiscId(null), []);

  const winners = new Set(view.result?.winners ?? []);
  const iWon = winners.has(myId);

  const showHandDock =
    hand.length > 0 &&
    view.phase !== 'game_over' &&
    view.phase !== 'choose_discard' &&
    view.phase !== 'discard_reveal' &&
    view.phase !== 'choose_first_player' &&
    view.phase !== 'round_result';

  const bidLeader =
    view.challengerId != null
      ? (view.seats.find((s) => s.id === view.challengerId) ?? null)
      : null;
  const activeSeat = view.activePlayerId
    ? (view.seats.find((s) => s.id === view.activePlayerId) ?? null)
    : null;

  const firstPlayerChoices = you.legalFirstPlayerIds
    .map((id) => view.seats.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s != null);

  const showActionPanel =
    (view.phase === 'decision' && you.canAct) ||
    (view.phase === 'opening_place' && you.canAct) ||
    view.phase === 'bidding' ||
    (view.phase === 'challenge' && you.canAct) ||
    view.phase === 'choose_first_player' ||
    view.phase === 'round_result';

  const disabledHandIds = canPlace
    ? hand.filter((d) => !you.legalPlaceDiscIds.includes(d.id)).map((d) => d.id)
    : undefined;

  const boardAndActions = (
    <>
      <div className={cn('skull-main', !showActionPanel && 'skull-main--board-only')}>
        <div className="skull-main__board">
          <SkullTable
            seats={view.seats}
            myId={myId}
            activePlayerId={view.activePlayerId}
            challengerId={view.challengerId}
            legalFlipOwnerIds={you.legalFlipOwnerIds}
            onFlipOwner={(ownerId) => send(sendAction, { type: 'flip', ownerId })}
          />
        </div>

        {showActionPanel ? (
          <aside className="skull-main__actions" aria-label="การกระทำ">
            {view.phase === 'decision' && you.canAct ? (
              <div className="skull-actions">
                {canPlace ? (
                  <SkullPlacePanel
                    title="วางดิสก์"
                    subtitle="ลากจากมือมาวาง · หรือเลือกแล้วกดปุ่ม · หรือเปิดบิด"
                    selectedDisc={selectedDisc}
                    canPlaceSelected={Boolean(
                      selectedId && you.legalPlaceDiscIds.includes(selectedId),
                    )}
                    isDragging={isDragging}
                    onPlace={placeSelected}
                  />
                ) : null}
                <SkullBidControls
                  key={`open-${you.minBid}-${you.maxBid}`}
                  mode="open"
                  minBid={you.minBid}
                  maxBid={you.maxBid}
                  currentBid={view.currentBid}
                  canAct
                  mustBid={mustBid}
                  myId={myId}
                  onBid={(amount) => send(sendAction, { type: 'open_bid', amount })}
                />
              </div>
            ) : null}

            {view.phase === 'opening_place' && you.canAct ? (
              <SkullPlacePanel
                title="วางดิสก์แรก"
                subtitle={
                  view.firstPlayerId === myId
                    ? 'คุณเป็นผู้เริ่ม — วางทีหลังสุด · ลากจากมือหรือกดปุ่ม'
                    : 'ลากดิสก์จากมือมาวาง · หรือเลือกแล้วกดปุ่ม'
                }
                selectedDisc={selectedDisc}
                canPlaceSelected={Boolean(
                  selectedId && you.legalPlaceDiscIds.includes(selectedId),
                )}
                isDragging={isDragging}
                onPlace={placeSelected}
              />
            ) : null}

            {view.phase === 'bidding' ? (
              <SkullBidControls
                key={`raise-${you.minBid}-${you.maxBid}-${view.currentBid}-${you.canAct}`}
                mode="raise"
                minBid={you.minBid}
                maxBid={you.maxBid}
                currentBid={view.currentBid}
                leader={
                  bidLeader
                    ? { id: bidLeader.id, name: bidLeader.name }
                    : null
                }
                activePlayerName={activeSeat?.name ?? null}
                canAct={you.canAct}
                canPass
                myId={myId}
                onBid={(amount) => send(sendAction, { type: 'outbid', amount })}
                onPass={() => send(sendAction, { type: 'pass' })}
              />
            ) : null}

            {view.phase === 'challenge' && you.canAct ? (
              <div className="card skull-place-card">
                <h2 className="skull-panel-title">พลิกดิสก์</h2>
                <p className="skull-panel-sub">
                  พลิกครบ {view.currentBid} ดอก · ตอนนี้ {view.flippedCount} — คลิกเสื่อที่ไฮไลต์
                </p>
              </div>
            ) : null}

            {view.phase === 'choose_first_player' ? (
              <div className="card skull-place-card">
                <h2 className="skull-panel-title">เลือกผู้เริ่มรอบถัดไป</h2>
                <p className="skull-panel-sub">
                  {you.canAct
                    ? 'คุณถูกคัดออก — เลือกผู้เล่นที่เหลือคนหนึ่ง'
                    : 'รอ Challenger ที่ถูกคัดออกเลือกผู้เริ่ม…'}
                </p>
                {you.canAct ? (
                  <div className="skull-first-player-picks">
                    {firstPlayerChoices.map((seat) => (
                      <Button
                        key={seat.id}
                        type="button"
                        onClick={() =>
                          send(sendAction, { type: 'choose_first_player', playerId: seat.id })
                        }
                      >
                        {seat.name}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {view.phase === 'round_result' ? (
              <div className="card skull-place-card">
                <h2 className="skull-panel-title">จบรอบ</h2>
                <p className="skull-panel-sub">{view.lastEvent}</p>
                {you.canAct ? (
                  <Button type="button" onClick={() => send(sendAction, { type: 'ack_round' })}>
                    ไปรอบถัดไป
                  </Button>
                ) : (
                  <p className="skull-panel-sub">รอผู้เล่นอื่นไปรอบถัดไป…</p>
                )}
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>

      {showHandDock ? (
        <PlayerHand
          cards={hand}
          getCardId={(c) => c.id}
          dragMode={canPlace ? 'play' : 'none'}
          dockPeek
          draggableIdPrefix={HAND_PREFIX}
          selectedIds={selected}
          disabledCardIds={disabledHandIds}
          onSelectToggle={(id) => {
            if (view.phase === 'opening_place' || view.phase === 'decision') {
              if (!you.legalPlaceDiscIds.includes(id)) return;
            }
            setSelectedId((prev) => (prev === id ? null : id));
          }}
          getPreview={(card) => ({
            src: skullHandDiscUrl(card),
            alt: skullDiscLabelTh(card),
            caption: skullDiscLabelTh(card),
          })}
          renderCard={({ card }) => (
            <img
              src={skullHandDiscUrl(card)}
              alt={skullDiscLabelTh(card)}
              className="skull-hand-disc"
              loading="lazy"
            />
          )}
          aria-label={`มือของคุณ (${hand.length} ใบ)`}
          className="skull-player-hand-dock"
        />
      ) : null}
    </>
  );

  return (
    <GameShell
      className={cn('skull-page', isDragging && 'skull-page--placing-drag')}
      style={{
        paddingBottom: showHandDock ? PLAYER_HAND_DOCK_PEEK_RESERVE_PX : undefined,
      }}
    >
      <GamePlayHeader
        title="Skull"
        subtitle={subtitle(view)}
        leaveLabel={view.phase === 'game_over' ? 'full' : 'short'}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      <SkullStatusSummary view={view} myId={myId} />

      {canPlace ? (
        <DndContext
          sensors={playSensors}
          collisionDetection={pointerWithin}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          {boardAndActions}
          <DragOverlay dropAnimation={null}>
            {dragDisc ? (
              <img
                src={skullHandDiscUrl(dragDisc)}
                alt=""
                className="skull-drag-overlay"
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        boardAndActions
      )}

      {view.phase === 'choose_discard' || view.phase === 'discard_reveal' ? (
        <SkullDiscardModal
          view={view}
          myId={myId}
          onConfirmRandom={() => send(sendAction, { type: 'confirm_random_discard' })}
          onChooseDiscard={(discId) => send(sendAction, { type: 'choose_discard', discId })}
          onAckReveal={() => send(sendAction, { type: 'ack_round' })}
        />
      ) : null}

      {view.phase === 'game_over' ? (
        <GameOverModal
          titleId="skull-game-over-title"
          panelClassName="skull-game-over-modal"
          onLeave={onLeave}
          onRestart={onRestart}
          tone={iWon ? 'win' : 'default'}
        >
          <SkullGameOverBody
            titleId="skull-game-over-title"
            iWon={iWon}
            reason={view.result?.reason}
            seats={view.seats}
            winners={winners}
            myId={myId}
          />
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
