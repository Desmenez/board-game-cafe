import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  spicyDeclareLabelTh,
  spicyPhaseLabelTh,
  spicySpecialLabelTh,
  type SpicyAction,
  type SpicyCard,
  type SpicyDeclaration,
  type SpicyPlayerView,
} from 'shared';
import {
  GameHistoryDisclosure,
  GameOverModal,
  GamePlayHeader,
  GameShell,
} from '../../components/game-shell';
import { DeckStack } from '../../components/deck-stack';
import { PlayerAvatar } from '../../components/player-avatar';
import { PlayerRosterStrip } from '../../components/player-roster';
import {
  PlayerHand,
  PLAYER_HAND_DOCK_PEEK_RESERVE_PX,
  useLockBodyScroll,
  usePlayDragSensors,
} from '../../components/player-hand';
import { Button } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { cn } from '../../utils/cn';
import {
  spicyCardBackUrl,
  spicyCardFaceUrl,
  spicyCardLabelTh,
  spicyDeclaredFaceUrl,
  spicySpecialUrl,
  spicyTrophyUrl,
  spicyWorldsEndUrl,
} from './art';
import { SpicyChallengeRevealModal } from './components/SpicyChallengeRevealModal';
import { SpicyDeclareModal } from './components/SpicyDeclareModal';
import { SPICY_PLAY_DROP_ID, SpicyPlayDropzone } from './components/SpicyPlayDropzone';
import { SpicyGameOverBody } from './components/SpicyGameOverBody';
import { SpicyPassToast, SpicyRoundSummaryToast } from './components/SpicyRoundSummaryToast';
import { SpicyTuckModal } from './components/SpicyTuckModal';
import { buildSpicyRosterSeats } from './components/spicyRosterSeats';
import './spicy.css';

type Props = {
  gameState: SpicyPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

function send(sendAction: Props['sendAction'], action: SpicyAction) {
  sendAction(action);
}

function DeclineTrophyButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="spicy-action-btn spicy-decline-btn"
      onClick={onClick}
    >
      ไม่ท้า (ถ้วย)
    </Button>
  );
}

const HAND_PREFIX = 'hand';

export function SpicyGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const view = gameState;
  const you = view.you;
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [pendingPlayId, setPendingPlayId] = useState<string | null>(null);
  const playSensors = usePlayDragSensors();

  useYourTurnToast(
    you.canAct &&
      view.phase !== 'game_over' &&
      view.phase !== 'challenge_reveal' &&
      view.phase !== 'round_summary',
  );

  const hand = you.hand;
  const canDragPlay = you.canPlay || you.canCopyCat;
  const pendingCard = pendingPlayId ? (hand.find((c) => c.id === pendingPlayId) ?? null) : null;
  const dragCard = dragCardId ? (hand.find((c) => c.id === dragCardId) ?? null) : null;
  const isDragging = dragCardId !== null;
  useLockBodyScroll(isDragging);

  useEffect(() => {
    setPendingPlayId(null);
    setDragCardId(null);
  }, [view.phase, view.activePlayerId, you.canPlay, you.canCopyCat]);

  const winners = new Set(view.result?.winners ?? []);
  const iWon = winners.has(myId);
  const showHand =
    hand.length > 0 &&
    view.phase !== 'game_over' &&
    view.phase !== 'challenge_reveal' &&
    view.phase !== 'round_summary';

  const activeName = view.seats.find((s) => s.id === view.activePlayerId)?.name;
  const meName = view.seats.find((s) => s.id === myId)?.name ?? 'คุณ';
  const topOwner = view.topOwnerId ? view.seats.find((s) => s.id === view.topOwnerId) : null;
  const rosterSeats = useMemo(() => buildSpicyRosterSeats(view), [view]);
  const roundToastKey = view.roundSummary
    ? `${view.roundSummary.reason}:${view.roundSummary.rows.map((r) => `${r.playerId}:${r.points}`).join(',')}`
    : '';
  const lastRoundToastKey = useRef('');
  const lastPassNoticeSeq = useRef<number | null>(null);

  useEffect(() => {
    if (view.phase !== 'round_summary' || !view.roundSummary || !roundToastKey) return;
    if (lastRoundToastKey.current === roundToastKey) return;
    lastRoundToastKey.current = roundToastKey;
    const summary = view.roundSummary;
    toast.custom(
      (toastState) => (
        <SpicyRoundSummaryToast
          summary={summary}
          seats={view.seats}
          myId={myId}
          visible={toastState.visible}
        />
      ),
      {
        id: `spicy-round-${roundToastKey}`,
        duration: 2800,
        position: 'top-left',
      },
    );
    send(sendAction, { type: 'ack_round' });
  }, [myId, roundToastKey, sendAction, view.phase, view.roundSummary, view.seats]);

  useEffect(() => {
    const notice = view.passNotice;
    if (lastPassNoticeSeq.current === null) {
      lastPassNoticeSeq.current = view.passNoticeSeq;
      return;
    }
    if (!notice || view.passNoticeSeq <= lastPassNoticeSeq.current) return;
    lastPassNoticeSeq.current = view.passNoticeSeq;
    toast.custom(
      (toastState) => (
        <SpicyPassToast
          playerId={notice.playerId}
          playerName={notice.playerName}
          myId={myId}
          visible={toastState.visible}
        />
      ),
      {
        id: `spicy-pass-${view.passNoticeSeq}`,
        duration: 2200,
        position: 'top-left',
      },
    );
  }, [myId, view.passNotice, view.passNoticeSeq]);

  const openPlayForCard = useCallback(
    (cardId: string) => {
      if (!canDragPlay) return;
      if (!hand.some((c) => c.id === cardId)) return;
      setPendingPlayId(cardId);
    },
    [canDragPlay, hand],
  );

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!canDragPlay) return;
      const id = event.active.id.toString();
      if (!id.startsWith(`${HAND_PREFIX}-`)) return;
      const cardId = id.slice(HAND_PREFIX.length + 1);
      if (!hand.some((c) => c.id === cardId)) return;
      setDragCardId(cardId);
    },
    [canDragPlay, hand],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const cardId = dragCardId;
      setDragCardId(null);
      if (!cardId || !canDragPlay) return;
      const overId = event.over?.id?.toString();
      if (overId === SPICY_PLAY_DROP_ID) openPlayForCard(cardId);
    },
    [dragCardId, canDragPlay, openPlayForCard],
  );

  const onDragCancel = useCallback(() => setDragCardId(null), []);

  const confirmDeclare = (declaration: SpicyDeclaration) => {
    if (!pendingPlayId) return;
    // Prefer normal play when it's your turn; Copy Cat is for others in the window.
    if (you.canPlay) {
      send(sendAction, {
        type: 'play_card',
        cardId: pendingPlayId,
        number: declaration.number,
        spice: declaration.spice,
      });
    } else if (you.canCopyCat) {
      send(sendAction, { type: 'copy_cat', cardId: pendingPlayId });
    }
    setPendingPlayId(null);
  };

  const subtitle = () => {
    const phase = spicyPhaseLabelTh(view.phase);
    if (view.phase === 'game_over') return 'เกมจบแล้ว';
    if (view.topDeclaration) {
      return `${phase} · บนสุด ${spicyDeclareLabelTh(view.topDeclaration)} · กอง ${view.spicyStackCount}`;
    }
    return `${phase} · ตา ${activeName ?? '…'}`;
  };

  const board = (
    <div className="spicy-main">
      <section className="card spicy-piles-row" aria-label="โต๊ะเกม">
        <div className="spicy-piles-grid">
          <div className="spicy-pile-box relative">
            <h4 className="spicy-pile-title">กองจั่ว</h4>
            <div className="spicy-card-slot">
              {view.drawCount > 0 ? (
                <DeckStack
                  backSrc={spicyCardBackUrl()}
                  layers={Math.min(5, Math.max(1, Math.ceil(view.drawCount / 16)))}
                  className="spicy-deck-stack"
                  layerClassName="spicy-deck-layer"
                  offset={5}
                />
              ) : (
                <div className="spicy-card-empty">ว่าง</div>
              )}
            </div>
            <p className="spicy-pile-count">{view.drawCount} ใบ</p>
            {view.cardsUntilWorldsEnd != null ? (
              <p className="m-0 max-w-[12rem] text-center text-xs leading-snug font-semibold text-[var(--text-secondary)]">
                {view.cardsUntilWorldsEnd <= 0
                  ? 'จั่วครั้งถัดไปจะจบเกม'
                  : `จะจบเกมในอีก ${view.cardsUntilWorldsEnd} ใบจั่ว`}
              </p>
            ) : null}
            {view.specialCard ? (
              <img
                src={spicySpecialUrl(view.specialCard)}
                alt={spicySpecialLabelTh(view.specialCard)}
                title={spicySpecialLabelTh(view.specialCard)}
                className="pointer-events-none absolute top-10 left-1.5 z-10 w-8 rounded-sm border border-[var(--border-subtle,var(--border))] bg-[rgb(11_13_22)] object-contain shadow-md"
                style={{ aspectRatio: '331 / 514' }}
              />
            ) : null}
            {view.cardsUntilWorldsEnd != null ? (
              <img
                src={spicyWorldsEndUrl()}
                alt="World’s End"
                title="World’s End"
                className="pointer-events-none absolute top-10 right-1.5 z-10 w-9 rounded-sm border border-[var(--border-subtle,var(--border))] bg-[rgb(11_13_22)] object-contain shadow-md"
                style={{ aspectRatio: '331 / 514' }}
              />
            ) : null}
          </div>

          <div
            className={cn(
              'spicy-pile-box spicy-pile-box--spicy relative',
              canDragPlay && 'spicy-pile-box--playable',
              isDragging && canDragPlay && 'spicy-pile-box--dragging',
            )}
          >
            <h4 className="spicy-pile-title">กองเผ็ด</h4>

            <SpicyPlayDropzone disabled={!canDragPlay} active={canDragPlay}>
              <div
                className={cn(
                  'spicy-card-slot',
                  view.spiceRaiderIndex != null && 'spicy-card-slot--raider',
                )}
              >
                {view.spicyStackCount > 0 ? (
                  <>
                    <DeckStack
                      backSrc={spicyCardBackUrl()}
                      layers={Math.min(5, Math.max(1, view.spicyStackCount))}
                      className="spicy-deck-stack"
                      layerClassName="spicy-deck-layer"
                      offset={4}
                    />
                    {view.topDeclaration ? (
                      <div
                        className="spicy-deck-claim"
                        role="img"
                        aria-live="polite"
                        aria-label={`ประกาศบนสุด ${spicyDeclareLabelTh(view.topDeclaration)}${
                          topOwner ? ` โดย ${topOwner.name}` : ''
                        }`}
                      >
                        <img
                          src={spicyDeclaredFaceUrl(view.topDeclaration)}
                          alt=""
                          className="block size-full rounded-[var(--radius-sm,0.35rem)] object-contain"
                        />
                        <span
                          className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-sm,0.35rem)] bg-black/50"
                          aria-hidden
                        >
                          <CircleHelp className="size-10 text-white drop-shadow" strokeWidth={2.25} />
                        </span>
                        {topOwner ? (
                          <PlayerAvatar
                            playerId={topOwner.id}
                            name={topOwner.name}
                            size={24}
                            decorative
                            className="spicy-deck-claim__who z-10"
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="spicy-card-empty">
                    {canDragPlay ? 'ลากการ์ดมาวาง' : 'กองว่าง'}
                  </div>
                )}
              </div>
            </SpicyPlayDropzone>

            <p className="spicy-pile-count">
              {view.spicyStackCount} ใบ
              {view.spiceRaiderIndex != null ? (
                <>
                  <br />
                  <span className="spicy-pile-meta spicy-pile-meta--raider">Paw</span>
                </>
              ) : null}
            </p>

            <div className="spicy-pile-controls">
              {you.canPass || you.canChallenge || you.canChallengeCopy ? (
                <div
                  className={cn(
                    'spicy-action-row',
                    (you.canChallenge || you.canChallengeCopy) && 'spicy-action-row--challenge',
                  )}
                  role="group"
                  aria-label={
                    you.canChallenge || you.canChallengeCopy
                      ? 'ข้ามหรือท้าทายใบบนสุด'
                      : 'ข้ามตา'
                  }
                >
                  {you.canChallenge || you.canChallengeCopy ? (
                    <div className="spicy-action-row__head">
                      <span className="spicy-challenge-panel__kicker">ท้าทาย</span>
                      {view.topDeclaration ? (
                        <span className="spicy-challenge-panel__claim">
                          {spicyDeclareLabelTh(view.topDeclaration)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="spicy-action-row__btns">
                    {you.canPass ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="spicy-action-btn spicy-skip-btn"
                        onClick={() => send(sendAction, { type: 'pass' })}
                      >
                        ข้าม · จั่ว 1
                      </Button>
                    ) : null}
                    {you.canChallenge ? (
                      <>
                        <Button
                          type="button"
                          variant="danger"
                          className="spicy-action-btn spicy-challenge-btn"
                          onClick={() => send(sendAction, { type: 'challenge', trait: 'number' })}
                        >
                          เลขผิด!
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="spicy-action-btn spicy-challenge-btn"
                          onClick={() => send(sendAction, { type: 'challenge', trait: 'spice' })}
                        >
                          เครื่องเทศผิด!
                        </Button>
                      </>
                    ) : null}
                    {you.canChallengeCopy ? (
                      <Button
                        type="button"
                        variant="danger"
                        className="spicy-action-btn spicy-challenge-btn"
                        onClick={() => send(sendAction, { type: 'challenge_copy' })}
                      >
                        Wrong!
                      </Button>
                    ) : null}
                    {you.canDecline ? (
                      <DeclineTrophyButton
                        onClick={() => send(sendAction, { type: 'decline_challenge' })}
                      />
                    ) : null}
                  </div>
                </div>
              ) : you.canDecline ? (
                <div className="spicy-action-row__btns">
                  <DeclineTrophyButton
                    onClick={() => send(sendAction, { type: 'decline_challenge' })}
                  />
                </div>
              ) : null}

              {canDragPlay && !isDragging ? (
                <p className="spicy-pile-hint">ลากจากมือมาวาง · หรือแตะการ์ด</p>
              ) : null}
            </div>

            {view.trophiesLeft > 0 ? (
              <ul
                className="pointer-events-none absolute top-10 right-1.5 z-10 flex w-9 flex-col gap-1"
                aria-label={`ถ้วยรางวัลเหลือ ${view.trophiesLeft} ใบ`}
              >
                {Array.from({ length: view.trophiesLeft }, (_, i) => (
                  <li key={`trophy-${i}`}>
                    <img
                      src={spicyTrophyUrl()}
                      alt=""
                      className="w-full rounded-sm border border-[var(--border-subtle,var(--border))] bg-[rgb(11_13_22)] object-contain shadow-md"
                      style={{ aspectRatio: '331 / 514' }}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <GameShell
      className={cn('spicy-page', isDragging && 'spicy-page--dragging')}
      style={{
        paddingBottom: showHand ? PLAYER_HAND_DOCK_PEEK_RESERVE_PX : undefined,
      }}
    >
      <GamePlayHeader
        title="Spicy"
        subtitle={subtitle()}
        leaveLabel={view.phase === 'game_over' ? 'full' : 'short'}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      <p className="spicy-last-event mb-3 text-sm text-[var(--text-secondary)]">{view.lastEvent}</p>

      <GameHistoryDisclosure
        title={`ผู้เล่น · ${view.seats.length} คน`}
        defaultOpen
        className="spicy-roster sticky top-4 z-20 mb-4"
      >
        <PlayerRosterStrip
          layout="grid"
          myId={myId}
          ariaLabel="สถานะผู้เล่น Spicy"
          seats={rosterSeats}
        />
      </GameHistoryDisclosure>

      {canDragPlay ? (
        <DndContext
          sensors={playSensors}
          collisionDetection={pointerWithin}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          {board}
          {showHand ? (
            <PlayerHand
              cards={hand}
              getCardId={(c: SpicyCard) => c.id}
              dragMode="play"
              dockPeek
              draggableIdPrefix={HAND_PREFIX}
              selectedIds={pendingPlayId ? [pendingPlayId] : []}
              onSelectToggle={openPlayForCard}
              getPreview={(card) => ({
                src: spicyCardFaceUrl(card),
                alt: spicyCardLabelTh(card),
                caption: spicyCardLabelTh(card),
              })}
              renderCard={({ card }) => (
                <img
                  src={spicyCardFaceUrl(card)}
                  alt={spicyCardLabelTh(card)}
                  className="spicy-hand-card-img"
                  loading="lazy"
                />
              )}
              aria-label={`มือของคุณ (${hand.length} ใบ)`}
            />
          ) : null}
          <DragOverlay dropAnimation={null}>
            {dragCard ? (
              <img
                src={spicyCardFaceUrl(dragCard)}
                alt={spicyCardLabelTh(dragCard)}
                className="spicy-drag-overlay"
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <>
          {board}
          {showHand ? (
            <PlayerHand
              cards={hand}
              getCardId={(c: SpicyCard) => c.id}
              dragMode="none"
              dockPeek
              selectedIds={[]}
              getPreview={(card) => ({
                src: spicyCardFaceUrl(card),
                alt: spicyCardLabelTh(card),
                caption: spicyCardLabelTh(card),
              })}
              renderCard={({ card }) => (
                <img
                  src={spicyCardFaceUrl(card)}
                  alt={spicyCardLabelTh(card)}
                  className="spicy-hand-card-img"
                  loading="lazy"
                />
              )}
              aria-label={`มือของคุณ (${hand.length} ใบ)`}
            />
          ) : null}
        </>
      )}

      {pendingCard && (you.canPlay || you.canCopyCat) ? (
        <SpicyDeclareModal
          open
          card={pendingCard}
          mode={you.canPlay ? 'play' : 'copy'}
          legalDeclarations={you.legalDeclarations}
          copyDeclaration={view.lastPlay?.declaration ?? null}
          actorId={myId}
          actorName={meName}
          onConfirm={confirmDeclare}
          onCancel={() => setPendingPlayId(null)}
        />
      ) : null}

      {you.canTuck ? (
        <SpicyTuckModal
          open
          hand={hand}
          onConfirm={(cardIds) => send(sendAction, { type: 'tuck_cards', cardIds })}
        />
      ) : null}

      {view.phase === 'challenge_reveal' && view.challengeReveal ? (
        <SpicyChallengeRevealModal
          reveal={view.challengeReveal}
          seats={view.seats}
          myId={myId}
          canAck={you.canAckChallenge}
          onAck={() => send(sendAction, { type: 'ack_challenge' })}
        />
      ) : null}

      {view.phase === 'game_over' ? (
        <GameOverModal
          titleId="spicy-game-over-title"
          onLeave={onLeave}
          onRestart={onRestart}
          tone={iWon ? 'win' : 'default'}
          panelClassName="spicy-game-over-modal"
        >
          <SpicyGameOverBody
            titleId="spicy-game-over-title"
            iWon={iWon}
            reason={view.result?.reason}
            scores={view.scores ?? []}
            winners={winners}
            myId={myId}
          />
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
