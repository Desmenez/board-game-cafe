import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LoveLetterAction, LoveLetterCard, LoveLetterPlayerView } from 'shared';
import { loveLetterEditionLabel } from 'shared';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import {
  PlayerHand,
  PLAYER_HAND_DOCK_RESERVE_PX,
  useNewlyDrawnCardIds,
} from '../../components/player-hand';
import { Button } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import { LoveLetterBoard } from './LoveLetterBoard';
import { LoveLetterCardFace } from './LoveLetterCardFace';
import { LoveLetterGuardGuessModal } from './LoveLetterGuardGuessModal';
import { LoveLetterPlayerStrip } from './LoveLetterPlayerStrip';
import { LoveLetterRoundSummaryModal } from './LoveLetterRoundSummaryModal';
import { LoveLetterTargetModal } from './LoveLetterTargetModal';
import { loveLetterCardImage, roleLabel } from './cardMeta';
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

  useYourTurnToast(isMyTurn && gameState.phase === 'playing' && !isGameOver);

  useEffect(() => {
    if (gameState.roundNo !== prevRoundRef.current) {
      prevRoundRef.current = gameState.roundNo;
      setShuffleTick((t) => t + 1);
    }
  }, [gameState.roundNo]);

  useEffect(() => {
    if (isGameOver) startWinCelebrationLoop();
  }, [isGameOver]);

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
        trailing={
          <span className="ll-header-event" title={gameState.lastEvent}>
            {gameState.lastEvent}
          </span>
        }
      />

      <main className="ll-main">
        <LoveLetterPlayerStrip
          players={gameState.players}
          myId={myId}
          tokensToWin={gameState.tokensToWin}
        />

        <LoveLetterBoard
          ref={drawPileRef}
          drawPileCount={gameState.drawPileCount}
          setAsideCards={gameState.setAsideCards}
          shuffleTick={shuffleTick}
        />

        {canChooseDiscard ? (
          <section className="card ll-discard-hint">
            <p>เลือกการ์ด 1 ใบจากมือเพื่อทิ้ง</p>
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
          onClose={onLeave}
        />
      ) : null}

      {canGuardGuess && pending?.mode === 'guard_guess' ? (
        <LoveLetterGuardGuessModal
          targetName={pending.targetName}
          onGuess={(rank) =>
            sendAction({ type: 'resolve_guard_guess', rank } satisfies LoveLetterAction)
          }
          onClose={onLeave}
        />
      ) : null}

      {canAckPeek && pending?.mode === 'priest_peek' ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ll-peek-title"
        >
          <div className="card ll-modal">
            <h2 id="ll-peek-title" className="ll-modal__title">
              Priest — มือของ {pending.targetName}
            </h2>
            <div className="ll-modal__peek-card">
              <LoveLetterCardFace card={pending.card} size="modal" />
              <p>{roleLabel(pending.card.role)}</p>
            </div>
            <Button
              type="button"
              onClick={() => sendAction({ type: 'ack_peek' } satisfies LoveLetterAction)}
            >
              ตกลง
            </Button>
          </div>
        </div>
      ) : null}

      {isRoundEnd && gameState.lastRoundSummary ? (
        <LoveLetterRoundSummaryModal
          summary={gameState.lastRoundSummary}
          onContinue={() => sendAction({ type: 'ack_round_summary' } satisfies LoveLetterAction)}
        />
      ) : null}

      {isGameOver && gameState.gameResult ? (
        <GameOverModal titleId="ll-game-over-title" onLeave={onLeave} onRestart={onRestart}>
          <h2 id="ll-game-over-title" className="ll-modal__title">
            Love Letter — จบเกม
          </h2>
          <p className="ll-modal__subtitle">{gameState.gameResult.reason}</p>
          <ol className="ll-game-over-rankings">
            {rankings.map((r) => (
              <li
                key={r.name}
                className={[
                  r.isWinner ? 'll-game-over-rankings__winner' : '',
                  r.isMe ? 'll-game-over-rankings__me' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="ll-game-over-rankings__rank">#{r.rank}</span>
                <span className="ll-game-over-rankings__name">{r.name}</span>
                <span className="ll-game-over-rankings__score">{r.score} โทเคน</span>
              </li>
            ))}
          </ol>
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
