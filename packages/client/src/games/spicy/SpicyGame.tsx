import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { PlayerIdentity } from '../../components/player-avatar';
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
  spicySpecialUrl,
  spicyTrophyUrl,
  spicyWorldsEndUrl,
} from './art';
import { SpicyChallengeRevealModal } from './components/SpicyChallengeRevealModal';
import { SpicyDeclareModal } from './components/SpicyDeclareModal';
import { SPICY_PLAY_DROP_ID, SpicyPlayDropzone } from './components/SpicyPlayDropzone';
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

const HAND_PREFIX = 'hand';

export function SpicyGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const view = gameState;
  const you = view.you;
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [pendingPlayId, setPendingPlayId] = useState<string | null>(null);
  const playSensors = usePlayDragSensors();

  useYourTurnToast(you.canAct && view.phase !== 'game_over' && view.phase !== 'challenge_reveal');

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
    hand.length > 0 && view.phase !== 'game_over' && view.phase !== 'challenge_reveal';

  const activeName = view.seats.find((s) => s.id === view.activePlayerId)?.name;
  const meName = view.seats.find((s) => s.id === myId)?.name ?? 'คุณ';
  const topOwner = view.topOwnerId ? view.seats.find((s) => s.id === view.topOwnerId) : null;
  const rosterSeats = useMemo(() => buildSpicyRosterSeats(view), [view]);

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
      <aside className="spicy-side-strip" aria-label="สถานะโต๊ะ">
        <div className="spicy-side-claim" aria-live="polite">
          <span className="spicy-side-label">ใบบนสุด</span>
          {view.topDeclaration && topOwner ? (
            <div className="spicy-side-claim__body">
              <PlayerIdentity
                playerId={topOwner.id}
                name={topOwner.name}
                avatarSize={40}
                secondary={
                  <span className="spicy-claim__decl">
                    ประกาศ {spicyDeclareLabelTh(view.topDeclaration)}
                  </span>
                }
              />
              <span className="spicy-side-claim__count">{view.spicyStackCount} ใบในกอง</span>
            </div>
          ) : (
            <span className="spicy-side-empty">ยังไม่มีใบบนสุด</span>
          )}
        </div>

        <div className="spicy-trophies">
          <span className="spicy-side-label">ถ้วยรางวัล</span>
          <div className="spicy-trophies__cards" role="list">
            {view.trophiesLeft > 0 ? (
              Array.from({ length: view.trophiesLeft }, (_, i) => (
                <img
                  key={`trophy-${i}`}
                  role="listitem"
                  src={spicyTrophyUrl()}
                  alt={`ถ้วยรางวัลเหลือใบที่ ${i + 1}`}
                  className="spicy-trophy-mini"
                />
              ))
            ) : (
              <span className="spicy-side-empty">หมดแล้ว</span>
            )}
          </div>
        </div>
        {view.specialCard ? (
          <div className="spicy-special-mini">
            <span className="spicy-side-label">SPICE IT UP</span>
            <img
              src={spicySpecialUrl(view.specialCard)}
              alt={spicySpecialLabelTh(view.specialCard)}
              className="spicy-special-mini__img"
              title={spicySpecialLabelTh(view.specialCard)}
            />
            <span className="spicy-side-meta">{spicySpecialLabelTh(view.specialCard)}</span>
          </div>
        ) : null}
        {view.cardsUntilWorldsEnd === 0 ? (
          <div className="spicy-special-mini">
            <span className="spicy-side-label">World’s End</span>
            <img src={spicyWorldsEndUrl()} alt="World's End" className="spicy-special-mini__img" />
          </div>
        ) : null}
      </aside>

      <section className="card spicy-piles-row" aria-label="โต๊ะเกม">
        <div className="spicy-piles-grid">
          <div className="spicy-pile-box">
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
            <p className="spicy-pile-count">
              {view.drawCount} ใบ
              {view.cardsUntilWorldsEnd != null ? (
                <>
                  <br />
                  <span className="spicy-pile-meta">WE ~{view.cardsUntilWorldsEnd}</span>
                </>
              ) : null}
            </p>
          </div>

          <div
            className={cn(
              'spicy-pile-box spicy-pile-box--spicy',
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
                  <DeckStack
                    backSrc={spicyCardBackUrl()}
                    layers={Math.min(5, Math.max(1, view.spicyStackCount))}
                    className="spicy-deck-stack"
                    layerClassName="spicy-deck-layer"
                    offset={4}
                  />
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
                  </div>

                  {you.canDecline ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="spicy-decline-btn"
                      onClick={() => send(sendAction, { type: 'decline_challenge' })}
                    >
                      ไม่ท้า (ถ้วย)
                    </Button>
                  ) : null}
                </div>
              ) : you.canDecline ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => send(sendAction, { type: 'decline_challenge' })}
                >
                  ไม่ท้า (ถ้วย)
                </Button>
              ) : null}

              {canDragPlay && !isDragging ? (
                <p className="spicy-pile-hint">ลากจากมือมาวาง · หรือแตะการ์ด</p>
              ) : null}
            </div>
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
              dockPeek={you.canTuck}
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
        >
          <h2 id="spicy-game-over-title" className="text-xl font-semibold">
            {iWon ? 'คุณชนะ!' : 'จบเกม'}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{view.result?.reason}</p>
          {view.scores ? (
            <ul className="mt-4 space-y-2 text-sm">
              {view.scores
                .slice()
                .sort((a, b) => b.total - a.total)
                .map((sc) => (
                  <li key={sc.playerId} className="flex justify-between gap-4">
                    <PlayerIdentity
                      playerId={sc.playerId}
                      name={sc.name}
                      avatarSize={32}
                      trailing={winners.has(sc.playerId) ? '★' : undefined}
                    />
                    <span className="shrink-0 tabular-nums">
                      {sc.total}{' '}
                      <span className="text-[var(--text-secondary)]">
                        ({sc.wonCards}+{sc.trophies * 10}−{sc.handPenalty})
                      </span>
                    </span>
                  </li>
                ))}
            </ul>
          ) : null}
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
