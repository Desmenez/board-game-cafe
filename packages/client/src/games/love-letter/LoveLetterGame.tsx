import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { LoveLetterAction, LoveLetterCard, LoveLetterPlayerView } from 'shared';
import { loveLetterEditionLabel } from 'shared';
import {
  GameHistoryDisclosure,
  GameOverModal,
  GamePlayHeader,
  GameShell,
} from '../../components/game-shell';
import {
  PlayerHand,
  PLAYER_HAND_DOCK_PEEK_RESERVE_PX,
  PLAYER_HAND_DOCK_RESERVE_PX,
  useLockBodyScroll,
  useNewlyDrawnCardIds,
  usePlayDragSensors,
} from '../../components/player-hand';
import { PlayerRosterStrip } from '../../components/player-roster';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { cn } from '../../utils/cn';
import { LoveLetterBoard } from './components/LoveLetterBoard';
import { LoveLetterCardFace } from './components/LoveLetterCardFace';
import { LoveLetterGameOverBody } from './components/LoveLetterGameOverBody';
import { LoveLetterGuardGuessModal } from './components/LoveLetterGuardGuessModal';
import { LL_PLAY_DROP_ID } from './components/LoveLetterPlayDropzone';
import { LoveLetterPriestPeekModal } from './components/LoveLetterPriestPeekModal';
import { LoveLetterRoundSummaryModal } from './components/LoveLetterRoundSummaryModal';
import { LoveLetterSpectatePendingModal } from './components/LoveLetterSpectatePendingModal';
import { LoveLetterTargetModal } from './components/LoveLetterTargetModal';
import { buildLoveLetterRosterSeats } from './components/loveLetterRosterSeats';
import { loveLetterCardImage, roleLabel } from './lib/cardMeta';
import './love-letter.css';

type Props = {
  gameState: LoveLetterPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

const HAND_PREFIX = 'hand';

export function LoveLetterGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const drawPileRef = useRef<HTMLDivElement>(null);
  const [shuffleTick, setShuffleTick] = useState(0);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const prevRoundRef = useRef(gameState.roundNo);
  const playSensors = usePlayDragSensors();

  const isMyTurn = gameState.currentPlayerId === myId;
  const isGameOver = gameState.phase === 'game_over';
  const isRoundEnd = gameState.phase === 'round_end';

  const pending = gameState.pendingAction;
  const canChooseDiscard =
    pending?.mode === 'choose_discard' && pending.actorId === myId && gameState.phase === 'playing';
  const canTarget =
    pending?.mode === 'target_player' && pending.actorId === myId && gameState.phase === 'playing';
  const canGuardGuess =
    pending?.mode === 'guard_guess' && pending.actorId === myId && gameState.phase === 'playing';
  const canAckPeek =
    pending?.mode === 'priest_peek' && pending.actorId === myId && gameState.phase === 'playing';
  const spectatePending =
    gameState.phase === 'playing' &&
    pending != null &&
    pending.actorId !== myId &&
    (pending.mode === 'target_player' ||
      pending.mode === 'guard_guess' ||
      pending.mode === 'priest_peek');

  const legalIds = useMemo(() => {
    if (!canChooseDiscard || pending?.mode !== 'choose_discard') return new Set<string>();
    return new Set(pending.legalCardIds);
  }, [canChooseDiscard, pending]);

  const handIds = useMemo(() => gameState.myHand.map((c) => c.id), [gameState.myHand]);
  const newlyDrawn = useNewlyDrawnCardIds(handIds);
  const rosterSeats = useMemo(
    () => buildLoveLetterRosterSeats(gameState.players, gameState.tokensToWin),
    [gameState.players, gameState.tokensToWin],
  );

  const dragCard = useMemo(
    () => (dragCardId ? (gameState.myHand.find((c) => c.id === dragCardId) ?? null) : null),
    [dragCardId, gameState.myHand],
  );
  const isDragging = dragCardId !== null;
  useLockBodyScroll(isDragging);

  useYourTurnToast(isMyTurn && gameState.phase === 'playing' && !isGameOver);

  useEffect(() => {
    if (gameState.roundNo !== prevRoundRef.current) {
      prevRoundRef.current = gameState.roundNo;
      setShuffleTick((t) => t + 1);
    }
  }, [gameState.roundNo]);

  useEffect(() => {
    setDragCardId(null);
  }, [pending?.mode, gameState.roundNo]);

  const playCard = useCallback(
    (cardId: string) => {
      if (!canChooseDiscard || !legalIds.has(cardId)) return;
      sendAction({ type: 'choose_discard', cardId } satisfies LoveLetterAction);
    },
    [canChooseDiscard, legalIds, sendAction],
  );

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!canChooseDiscard) return;
      const id = event.active.id.toString();
      if (!id.startsWith(`${HAND_PREFIX}-`)) return;
      const cardId = id.slice(HAND_PREFIX.length + 1);
      if (!legalIds.has(cardId)) return;
      setDragCardId(cardId);
    },
    [canChooseDiscard, legalIds],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const cardId = dragCardId;
      setDragCardId(null);
      if (!cardId || !canChooseDiscard) return;
      const overId = event.over?.id?.toString();
      if (overId === LL_PLAY_DROP_ID) playCard(cardId);
    },
    [dragCardId, canChooseDiscard, playCard],
  );

  const onDragCancel = useCallback(() => setDragCardId(null), []);

  const subtitle = `${loveLetterEditionLabel(gameState.edition)} · รอบ ${gameState.roundNo} · ชนะที่ ${gameState.tokensToWin} โทเคน`;

  const rankings = useMemo(() => {
    return [...gameState.players]
      .sort((a, b) => b.affectionTokens - a.affectionTokens)
      .map((p, i) => ({
        playerId: p.id,
        rank: i + 1,
        name: p.name,
        score: p.affectionTokens,
        isMe: p.id === myId,
        isWinner: gameState.gameResult?.winners.includes(p.id) ?? false,
      }));
  }, [gameState.players, gameState.gameResult, myId]);

  const handReserve = canChooseDiscard
    ? PLAYER_HAND_DOCK_PEEK_RESERVE_PX
    : PLAYER_HAND_DOCK_RESERVE_PX;

  return (
    <GameShell
      className={cn('ll-page', isDragging && 'll-page--dragging')}
      style={{
        paddingBottom: gameState.myHand.length > 0 ? handReserve : undefined,
      }}
    >
      <GamePlayHeader
        title="Love Letter"
        subtitle={subtitle}
        onLeave={onLeave}
        onRestart={onRestart}
        leaveLabel={isGameOver ? 'full' : 'short'}
        trailing={
          <span
            className="ll-header-event max-w-[14rem] truncate text-sm text-[var(--text-muted)]"
            title={gameState.lastEvent}
          >
            {gameState.lastEvent}
          </span>
        }
      />

      <DndContext
        sensors={playSensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <main className="ll-main flex w-full flex-col gap-4 pb-4">
          <GameHistoryDisclosure
            title={`ผู้เล่น · ${gameState.players.length} คน`}
            defaultOpen
            className="ll-roster sticky top-4 z-20"
          >
            <PlayerRosterStrip
              layout="grid"
              myId={myId}
              ariaLabel="สถานะผู้เล่น Love Letter"
              seats={rosterSeats}
              className="ll-strip"
            />
          </GameHistoryDisclosure>

          <LoveLetterBoard
            ref={drawPileRef}
            drawPileCount={gameState.drawPileCount}
            setAsideCards={gameState.setAsideCards}
            shuffleTick={shuffleTick}
            playActive={canChooseDiscard}
            isDragging={isDragging}
          />

          {canChooseDiscard ? (
            <p className="ll-play-hint m-0 text-center text-sm text-[var(--ll-accent)]" aria-live="polite">
              กดค้างแล้วลากการ์ดไปโซนเล่น · หรือแตะการ์ดเพื่อเล่นทันที
            </p>
          ) : gameState.phase === 'playing' && gameState.myHand.length > 0 ? (
            <p className="m-0 text-center text-sm text-[var(--text-muted)]">รอตาคุณ…</p>
          ) : null}
        </main>

        {gameState.myHand.length > 0 ? (
          <PlayerHand
            cards={gameState.myHand}
            getCardId={(c: LoveLetterCard) => c.id}
            dragMode={canChooseDiscard ? 'play' : 'none'}
            dockPeek={canChooseDiscard}
            draggableIdPrefix={HAND_PREFIX}
            onSelectToggle={canChooseDiscard ? playCard : undefined}
            disabledCardIds={
              canChooseDiscard
                ? gameState.myHand.filter((c) => !legalIds.has(c.id)).map((c) => c.id)
                : gameState.myHand.map((c) => c.id)
            }
            renderCard={({ card }) => <LoveLetterCardFace card={card} size="hand" faceDown={false} />}
            getPreview={(card) => ({
              src: loveLetterCardImage(card),
              alt: roleLabel(card.role),
              caption: roleLabel(card.role),
            })}
            drawAnimation={{
              newlyDrawnIds: newlyDrawn,
              drawFromRef: drawPileRef,
            }}
            aria-label="มือของคุณ"
            className="ll-player-hand"
          />
        ) : null}

        <DragOverlay dropAnimation={null}>
          {dragCard ? (
            <div className="ll-drag-overlay">
              <LoveLetterCardFace card={dragCard} size="hand" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {canTarget && pending?.mode === 'target_player' ? (
        <LoveLetterTargetModal
          effectRole={pending.effectRole}
          targets={pending.targets}
          onSelect={(id) =>
            sendAction({ type: 'resolve_target', targetPlayerId: id } satisfies LoveLetterAction)
          }
        />
      ) : null}

      {canGuardGuess && pending?.mode === 'guard_guess' ? (
        <LoveLetterGuardGuessModal
          targetName={pending.targetName}
          targetId={pending.targetPlayerId}
          onGuess={(rank) =>
            sendAction({ type: 'resolve_guard_guess', rank } satisfies LoveLetterAction)
          }
        />
      ) : null}

      {canAckPeek && pending?.mode === 'priest_peek' && pending.card ? (
        <LoveLetterPriestPeekModal
          targetName={pending.targetName}
          card={pending.card}
          onAck={() => sendAction({ type: 'ack_peek' } satisfies LoveLetterAction)}
        />
      ) : null}

      {spectatePending && pending ? (
        <LoveLetterSpectatePendingModal pending={pending} players={gameState.players} />
      ) : null}

      {isRoundEnd && gameState.lastRoundSummary ? (
        <LoveLetterRoundSummaryModal
          summary={gameState.lastRoundSummary}
          players={gameState.players}
          tokensToWin={gameState.tokensToWin}
          myId={myId}
          onContinue={() => sendAction({ type: 'ack_round_summary' } satisfies LoveLetterAction)}
        />
      ) : null}

      {isGameOver && gameState.gameResult ? (
        <GameOverModal titleId="ll-game-over-title" onLeave={onLeave} onRestart={onRestart}>
          <LoveLetterGameOverBody
            titleId="ll-game-over-title"
            reason={gameState.gameResult.reason}
            rankings={rankings}
            tokensToWin={gameState.tokensToWin}
          />
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
