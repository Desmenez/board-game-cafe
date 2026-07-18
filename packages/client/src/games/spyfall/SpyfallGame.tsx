import { useCallback, useEffect, useMemo } from 'react';
import type { SpyfallAction, SpyfallPlayerView } from 'shared';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import { useDeadlineCountdown } from '../../hooks/useDeadlineCountdown';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import { SpyfallAccusationPanel } from './SpyfallAccusationPanel';
import { SpyfallQuestioning } from './SpyfallQuestioning';
import { SpyfallRoleReveal } from './SpyfallRoleReveal';
import { SpyfallRoundSummaryModal } from './SpyfallRoundSummaryModal';
import { SpyfallScoreboard } from './SpyfallScoreboard';
import { SpyfallSpyGuessModal } from './SpyfallSpyGuessModal';
import './spyfall.css';

type Props = {
  gameState: SpyfallPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

export function SpyfallGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const send = useCallback((a: SpyfallAction) => sendAction(a), [sendAction]);

  const isGameOver = gameState.phase === 'game_over';
  const isRoundEnd = gameState.phase === 'round_end';

  useEffect(() => {
    if (isGameOver) startWinCelebrationLoop();
  }, [isGameOver]);

  const { label: remainLabel } = useDeadlineCountdown(
    gameState.phase === 'questioning' ? gameState.roundEndsAtMs : null,
  );

  const isMyTurnToAsk = gameState.phase === 'questioning' && gameState.currentAskerId === myId;
  useYourTurnToast(isMyTurnToAsk, gameState.phase === 'questioning');

  const subtitle = (
    <>
      รอบ {gameState.roundNo}/{gameState.totalRounds}
      {remainLabel != null ? (
        <>
          {' '}
          · <span className="sf-timer">เหลือ {remainLabel}</span>
        </>
      ) : null}
    </>
  );

  const rankings = useMemo(() => {
    return [...gameState.players]
      .sort((a, b) => (gameState.scores[b.id] ?? 0) - (gameState.scores[a.id] ?? 0))
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        score: gameState.scores[p.id] ?? 0,
        isMe: p.id === myId,
        isWinner: gameState.gameResult?.winners.includes(p.id) ?? false,
      }));
  }, [gameState.players, gameState.scores, gameState.gameResult, myId]);

  return (
    <GameShell className="sf-page">
      <GamePlayHeader
        title="Spyfall"
        subtitle={subtitle}
        onLeave={onLeave}
        onRestart={onRestart}
        trailing={
          <span className="sf-header-event" title={gameState.lastEvent}>
            {gameState.lastEvent}
          </span>
        }
      />

      <main className="sf-main">
        <SpyfallScoreboard players={gameState.players} scores={gameState.scores} myId={myId} />

        {gameState.phase === 'role_reveal' ? (
          <SpyfallRoleReveal
            view={gameState}
            onAcknowledge={() => send({ type: 'acknowledge_role' })}
          />
        ) : null}

        {gameState.phase === 'questioning' ? (
          <SpyfallQuestioning
            players={gameState.players}
            myId={myId}
            currentAskerId={gameState.currentAskerId}
            lastAskerId={gameState.lastAskerId}
            canAccuse
            accusationUsedByMe={gameState.accusationUsedByMe}
            canSpyReveal={gameState.canSpyReveal}
            onAsk={(targetId) => send({ type: 'ask_player', targetId })}
            onAccuse={(suspectId) => send({ type: 'initiate_accusation', suspectId })}
            onSpyReveal={() => send({ type: 'spy_reveal' })}
          />
        ) : null}

        {gameState.phase === 'accusation_vote' && gameState.pendingAccusation ? (
          <SpyfallAccusationPanel
            players={gameState.players}
            myId={myId}
            pending={gameState.pendingAccusation}
            onVote={(suspectId) => send({ type: 'cast_vote', suspectId })}
          />
        ) : null}

        {gameState.phase === 'spy_guess' && gameState.you.isSpy && gameState.locationChoices ? (
          <SpyfallSpyGuessModal
            choices={gameState.locationChoices}
            onGuess={(locationId) => send({ type: 'spy_guess_location', locationId })}
          />
        ) : null}

        {gameState.phase === 'spy_guess' && !gameState.you.isSpy ? (
          <div className="sf-panel">
            <h2>Spy กำลังทายสถานที่</h2>
            <p>รอ Spy เลือกสถานที่…</p>
          </div>
        ) : null}
      </main>

      {isRoundEnd ? (
        <SpyfallRoundSummaryModal
          view={gameState}
          onAck={() => send({ type: 'ack_round_summary' })}
        />
      ) : null}

      {isGameOver && gameState.gameResult ? (
        <GameOverModal titleId="sf-game-over-title" onLeave={onLeave} onRestart={onRestart}>
          <h2 id="sf-game-over-title">Spyfall — จบเกม</h2>
          <p>{gameState.gameResult.reason}</p>
          <ol style={{ margin: '1rem 0 0', paddingLeft: '1.25rem' }}>
            {rankings.map((r) => (
              <li key={r.name} style={{ marginBottom: '0.35rem' }}>
                #{r.rank} {r.name} — {r.score} คะแนน{r.isWinner ? ' 🏆' : ''}
              </li>
            ))}
          </ol>
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
