import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Salem1692Action, Salem1692PlayerView } from 'shared';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import { PlayerHand, PLAYER_HAND_DOCK_RESERVE_PX } from '../../components/player-hand';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import { Salem1692AccusationRevealModal } from './Salem1692AccusationRevealModal';
import { Salem1692Board } from './Salem1692Board';
import { Salem1692CardFace } from './Salem1692CardFace';
import { Salem1692ConspiracyModal } from './Salem1692ConspiracyModal';
import { Salem1692DawnModal } from './Salem1692DawnModal';
import { Salem1692NightPanel } from './Salem1692NightPanel';
import { Salem1692PlayPanel } from './Salem1692PlayPanel';
import { Salem1692PlayerStrip } from './Salem1692PlayerStrip';
import { Salem1692TryalRow } from './Salem1692TryalRow';
import { salem1692CardLabelTh } from './cardMeta';
import './salem-1692.css';

type Salem1692PlayingCardKind = Salem1692PlayerView['you']['hand'][number]['kind'];

type Props = {
  gameState: Salem1692PlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

function needsTarget(kind: Salem1692PlayingCardKind): boolean {
  return kind !== 'witness' && kind !== 'alibi_green' && kind !== 'conspiracy' && kind !== 'night';
}

function needsSecondTarget(kind: Salem1692PlayingCardKind): boolean {
  return kind === 'scapegoat' || kind === 'robbery';
}

export function Salem1692Game({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const deckRef = useRef<HTMLDivElement>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [secondTargetId, setSecondTargetId] = useState<string | null>(null);
  const [shuffleTick, setShuffleTick] = useState(0);

  const isMyTurn = gameState.currentPlayerId === myId;
  const isGameOver = gameState.phase === 'game_over';
  const selectedCard = gameState.you.hand.find((c) => c.id === selectedCardId) ?? null;

  useYourTurnToast(isMyTurn && gameState.phase === 'playing' && !isGameOver);

  useEffect(() => {
    if (isGameOver) startWinCelebrationLoop();
  }, [isGameOver]);

  useEffect(() => {
    setSelectedCardId(null);
    setTargetId(null);
    setSecondTargetId(null);
  }, [gameState.currentPlayerId, gameState.phase]);

  const send = useCallback((a: Salem1692Action) => sendAction(a), [sendAction]);

  const livingOthers = useMemo(
    () => gameState.players.filter((p) => p.alive && p.id !== myId).map((p) => p.id),
    [gameState.players, myId],
  );

  const canPlaySelected = useMemo(() => {
    if (!selectedCard || !isMyTurn || gameState.phase !== 'playing') return false;
    if (!needsTarget(selectedCard.kind)) return true;
    if (!targetId) return false;
    if (needsSecondTarget(selectedCard.kind)) return Boolean(secondTargetId);
    return true;
  }, [selectedCard, isMyTurn, gameState.phase, targetId, secondTargetId]);

  const playSelected = useCallback(() => {
    if (!selectedCard || !canPlaySelected) return;
    send({
      type: 'play_card',
      cardId: selectedCard.id,
      targetId: needsTarget(selectedCard.kind) ? (targetId ?? undefined) : undefined,
      secondTargetId: needsSecondTarget(selectedCard.kind)
        ? (secondTargetId ?? undefined)
        : undefined,
    });
    setSelectedCardId(null);
    setTargetId(null);
    setSecondTargetId(null);
  }, [selectedCard, canPlaySelected, send, targetId, secondTargetId]);

  const currentName =
    gameState.players.find((p) => p.id === gameState.currentPlayerId)?.name ?? '—';
  const subtitle = `เทิร์น: ${currentName} · กองเหลือ ${gameState.drawPileCount} · Witch ${gameState.revealedWitchTryalCount}/${gameState.totalWitchTryalCount}`;

  const accusationTryalsForModal = useMemo(() => {
    const pending = gameState.pendingAccusation;
    if (!pending || pending.actorId !== myId) return null;
    if (pending.targetId === myId) {
      return gameState.you.tryals.filter((t) => !t.revealed);
    }
    return pending.unrevealedTryalIds.map((id) => ({
      id,
      kind: 'not_witch' as const,
      revealed: false,
    }));
  }, [gameState.pendingAccusation, gameState.you.tryals, myId]);

  return (
    <GameShell
      className="s1692-shell"
      style={{
        paddingBottom: gameState.you.hand.length > 0 ? PLAYER_HAND_DOCK_RESERVE_PX : undefined,
      }}
    >
      <GamePlayHeader
        title="Salem 1692"
        subtitle={subtitle}
        onLeave={onLeave}
        onRestart={onRestart}
        trailing={
          <span className="s1692-event" title={gameState.lastEvent}>
            {gameState.lastEvent}
          </span>
        }
      />

      <main className="flex flex-col gap-4">
        <Salem1692PlayerStrip
          players={gameState.players}
          currentPlayerId={gameState.currentPlayerId}
        />

        <Salem1692TryalRow tryals={gameState.you.tryals} title="Tryal ของคุณ" />

        <Salem1692Board
          ref={deckRef}
          drawPileCount={gameState.drawPileCount}
          discardPileCount={gameState.discardPileCount}
          shuffleTick={shuffleTick}
        />

        {gameState.phase === 'playing' && (
          <>
            <Salem1692PlayPanel
              isMyTurn={isMyTurn}
              hasDrawnThisTurn={gameState.you.hasDrawnThisTurn}
              canPlay={canPlaySelected}
              onDrawTwo={() => {
                send({ type: 'draw_two' });
                setShuffleTick((t) => t + 1);
              }}
              onPlaySelected={playSelected}
              selectedCardId={selectedCardId}
            />

            {selectedCard && needsTarget(selectedCard.kind) && (
              <section className="s1692-panel">
                <h3 style={{ marginTop: 0 }}>
                  เลือกเป้าหมาย — {salem1692CardLabelTh(selectedCard.kind)}
                </h3>
                <Salem1692PlayerStrip
                  players={gameState.players.filter((p) => p.alive && p.id !== myId)}
                  currentPlayerId={null}
                  selectableIds={livingOthers}
                  onSelectPlayer={(id) => {
                    if (!targetId || !needsSecondTarget(selectedCard.kind)) {
                      setTargetId(id);
                      return;
                    }
                    if (id !== targetId) setSecondTargetId(id);
                  }}
                />
                {needsSecondTarget(selectedCard.kind) && targetId && (
                  <p style={{ fontSize: '0.85rem' }}>
                    เป้าหมาย 1: {gameState.players.find((p) => p.id === targetId)?.name} —
                    เลือกเป้าหมาย 2
                  </p>
                )}
              </section>
            )}
          </>
        )}

        {(gameState.phase === 'night_witch' ||
          gameState.phase === 'night_constable' ||
          gameState.phase === 'night_confess') && (
          <Salem1692NightPanel
            phase={gameState.phase}
            players={gameState.players}
            myId={myId}
            myTryals={gameState.you.tryals}
            nightStepEndsAtMs={gameState.nightStepEndsAtMs}
            canNightWitchKill={gameState.canNightWitchKill}
            canNightConstableSave={gameState.canNightConstableSave}
            canNightConfess={gameState.canNightConfess}
            onWitchKill={(townHallId) => send({ type: 'night_witch_kill', townHallId })}
            onConstableSave={(id) => send({ type: 'night_constable_save', targetId: id })}
            onConfess={(tryalId) => send({ type: 'night_confess', tryalId })}
            onSkipConfess={() => send({ type: 'night_skip_confess' })}
            onAckNight={() => send({ type: 'ack_night_result' })}
          />
        )}

        <PlayerHand
          cards={gameState.you.hand}
          getCardId={(c) => c.id}
          dragMode="none"
          selectedIds={selectedCardId ? [selectedCardId] : []}
          onSelectToggle={
            isMyTurn && gameState.phase === 'playing'
              ? (id) => setSelectedCardId((prev) => (prev === id ? null : id))
              : undefined
          }
          renderCard={({ card }) => (
            <Salem1692CardFace card={card} selected={selectedCardId === card.id} />
          )}
        />
      </main>

      {gameState.phase === 'dawn' && gameState.canDawnBlackCat && (
        <Salem1692DawnModal
          players={gameState.players}
          witchTeamIds={gameState.witchTeamIds}
          onPlace={(targetId) => send({ type: 'dawn_place_black_cat', targetId })}
        />
      )}

      {gameState.phase === 'conspiracy' && gameState.pendingConspiracy && (
        <Salem1692ConspiracyModal
          revealerName={gameState.pendingConspiracy.revealerName}
          blackCatHolderId={gameState.pendingConspiracy.blackCatHolderId}
          myId={myId}
          myTryals={gameState.you.tryals}
          needsReveal={gameState.pendingConspiracy.needsReveal}
          awaitingView={gameState.pendingConspiracy.awaitingView}
          onRevealTryal={(tryalId) => send({ type: 'conspiracy_reveal_tryal', tryalId })}
          onAckView={() => send({ type: 'conspiracy_ack_view' })}
        />
      )}

      {gameState.pendingAccusation &&
        gameState.pendingAccusation.actorId === myId &&
        accusationTryalsForModal && (
          <Salem1692AccusationRevealModal
            targetName={gameState.pendingAccusation.targetName}
            tryals={accusationTryalsForModal}
            onReveal={(tryalId) =>
              send({
                type: 'reveal_tryal_on_accusation',
                targetId: gameState.pendingAccusation!.targetId,
                tryalId,
              })
            }
          />
        )}

      {isGameOver && gameState.gameResult ? (
        <GameOverModal titleId="s1692-game-over-title" onLeave={onLeave} onRestart={onRestart}>
          <h2 id="s1692-game-over-title">Salem 1692 — จบเกม</h2>
          <p>{gameState.gameResult.reason}</p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {gameState.gameResult.winners.map((id) => (
              <li key={id}>{gameState.players.find((p) => p.id === id)?.name ?? id}</li>
            ))}
          </ul>
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
