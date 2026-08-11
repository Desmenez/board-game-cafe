import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  PLAYER_HAND_DOCK_RESERVE_PX,
  useNewlyDrawnCardIds,
} from '../../components/player-hand';
import { PlayerRosterStrip } from '../../components/player-roster';
import { Button } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { LoveLetterBoard } from './components/LoveLetterBoard';
import { LoveLetterCardFace } from './components/LoveLetterCardFace';
import { LoveLetterGameOverBody } from './components/LoveLetterGameOverBody';
import { LoveLetterGuardGuessModal } from './components/LoveLetterGuardGuessModal';
import { LoveLetterPriestPeekModal } from './components/LoveLetterPriestPeekModal';
import { LoveLetterRoundSummaryModal } from './components/LoveLetterRoundSummaryModal';
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

export function LoveLetterGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const drawPileRef = useRef<HTMLDivElement>(null);
  const [shuffleTick, setShuffleTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prevRoundRef = useRef(gameState.roundNo);

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

  const handIds = useMemo(() => gameState.myHand.map((c) => c.id), [gameState.myHand]);
  const newlyDrawn = useNewlyDrawnCardIds(handIds);
  const rosterSeats = useMemo(
    () => buildLoveLetterRosterSeats(gameState.players, gameState.tokensToWin),
    [gameState.players, gameState.tokensToWin],
  );

  useYourTurnToast(isMyTurn && gameState.phase === 'playing' && !isGameOver);

  useEffect(() => {
    if (gameState.roundNo !== prevRoundRef.current) {
      prevRoundRef.current = gameState.roundNo;
      setShuffleTick((t) => t + 1);
    }
  }, [gameState.roundNo]);

  useEffect(() => {
    setSelectedId(null);
  }, [pending?.mode, gameState.roundNo]);

  const toggleSelect = useCallback(
    (id: string) => {
      if (!canChooseDiscard) return;
      const legal = pending?.mode === 'choose_discard' ? pending.legalCardIds : [];
      if (!legal.includes(id)) return;
      setSelectedId((prev) => (prev === id ? null : id));
    },
    [canChooseDiscard, pending],
  );

  const discardSelected = useCallback(() => {
    if (!selectedId || !canChooseDiscard) return;
    sendAction({ type: 'choose_discard', cardId: selectedId } satisfies LoveLetterAction);
    setSelectedId(null);
  }, [selectedId, canChooseDiscard, sendAction]);

  const subtitle = `${loveLetterEditionLabel(gameState.edition)} · รอบ ${gameState.roundNo} · ชนะที่ ${gameState.tokensToWin} โทเคน`;

  const rankings = useMemo(() => {
    return [...gameState.players]
      .sort((a, b) => b.affectionTokens - a.affectionTokens)
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        score: p.affectionTokens,
        isMe: p.id === myId,
        isWinner: gameState.gameResult?.winners.includes(p.id) ?? false,
      }));
  }, [gameState.players, gameState.gameResult, myId]);

  return (
    <GameShell
      className="ll-page"
      style={{
        paddingBottom: gameState.myHand.length > 0 ? PLAYER_HAND_DOCK_RESERVE_PX : undefined,
      }}
    >
      <GamePlayHeader
        title="Love Letter"
        subtitle={subtitle}
        onLeave={onLeave}
        onRestart={onRestart}
        leaveLabel={isGameOver ? 'full' : 'short'}
        trailing={
          <span className="ll-header-event max-w-[12rem] truncate text-sm text-[var(--text-muted)]" title={gameState.lastEvent}>
            {gameState.lastEvent}
          </span>
        }
      />

      <main className="ll-main flex flex-col gap-4 px-4 pb-4">
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
        />

        {canChooseDiscard ? (
          <section className="card ll-discard-hint px-4 py-3 text-center">
            <p className="mb-2 mt-0 text-sm">เลือกการ์ด 1 ใบจากมือเพื่อทิ้ง</p>
            {selectedId ? (
              <Button type="button" onClick={discardSelected}>
                ทิ้งการ์ดที่เลือก
              </Button>
            ) : null}
          </section>
        ) : null}
      </main>

      {gameState.myHand.length > 0 ? (
        <PlayerHand
          cards={gameState.myHand}
          getCardId={(c: LoveLetterCard) => c.id}
          dragMode="none"
          selectedIds={selectedId ? [selectedId] : []}
          onSelectToggle={canChooseDiscard ? toggleSelect : undefined}
          disabledCardIds={
            canChooseDiscard && pending?.mode === 'choose_discard'
              ? gameState.myHand
                  .filter((c) => !pending.legalCardIds.includes(c.id))
                  .map((c) => c.id)
              : []
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
        />
      ) : null}

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
          onGuess={(rank) =>
            sendAction({ type: 'resolve_guard_guess', rank } satisfies LoveLetterAction)
          }
        />
      ) : null}

      {canAckPeek && pending?.mode === 'priest_peek' ? (
        <LoveLetterPriestPeekModal
          targetName={pending.targetName}
          card={pending.card}
          onAck={() => sendAction({ type: 'ack_peek' } satisfies LoveLetterAction)}
        />
      ) : null}

      {isRoundEnd && gameState.lastRoundSummary ? (
        <LoveLetterRoundSummaryModal
          summary={gameState.lastRoundSummary}
          onContinue={() => sendAction({ type: 'ack_round_summary' } satisfies LoveLetterAction)}
        />
      ) : null}

      {isGameOver && gameState.gameResult ? (
        <GameOverModal titleId="ll-game-over-title" onLeave={onLeave} onRestart={onRestart}>
          <LoveLetterGameOverBody
            titleId="ll-game-over-title"
            reason={gameState.gameResult.reason}
            rankings={rankings}
          />
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
