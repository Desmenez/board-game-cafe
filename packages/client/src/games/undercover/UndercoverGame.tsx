import { useCallback, useEffect, useState } from 'react';
import type { UndercoverAction, UndercoverPlayerView } from 'shared';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import { Button, Dialog, DialogFooter, DialogTitle } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { startWinCelebrationLoop } from '../../utils/winCelebration';
import { UndercoverClueRound } from './UndercoverClueRound';
import { UndercoverDiscussion } from './UndercoverDiscussion';
import { UndercoverElimination } from './UndercoverElimination';
import { UndercoverGameOver } from './UndercoverGameOver';
import { UndercoverMrWhiteGuess } from './UndercoverMrWhiteGuess';
import { UndercoverRoleReveal } from './UndercoverRoleReveal';
import { UndercoverVoting } from './UndercoverVoting';
import './undercover.css';

type Props = {
  gameState: UndercoverPlayerView;
  myId: string;
  isHost: boolean;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

export function UndercoverGame({ gameState, myId, isHost, sendAction, onLeave, onRestart }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const send = useCallback((a: UndercoverAction) => sendAction(a), [sendAction]);

  const isGameOver = gameState.phase === 'game_over';

  useEffect(() => {
    if (isGameOver) startWinCelebrationLoop();
  }, [isGameOver]);

  const isMyClueTurn =
    gameState.phase === 'clue_round' && gameState.clueTurn.currentPlayerId === myId;
  useYourTurnToast(isMyClueTurn, gameState.phase === 'clue_round');

  const subtitle = (
    <>
      รอบ {gameState.roundNo}
      {gameState.phase !== 'role_reveal' && gameState.phase !== 'game_over' ? (
        <> · {gameState.lastEvent}</>
      ) : null}
    </>
  );

  return (
    <GameShell className="uc-page">
      <GamePlayHeader
        title="Undercover"
        subtitle={subtitle}
        onLeave={onLeave}
        onRestart={onRestart}
        leaveLabel={isGameOver ? 'full' : 'short'}
        trailing={
          gameState.allowRecheckRole &&
          gameState.phase !== 'role_reveal' &&
          gameState.phase !== 'game_over' ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => send({ type: 'recheck_role' })}
            >
              ดูคำของฉัน
            </Button>
          ) : null
        }
      />

      <main className="uc-main">
        {gameState.phase === 'role_reveal' ? (
          <UndercoverRoleReveal
            view={gameState}
            onAcknowledge={() => send({ type: 'acknowledge_role' })}
          />
        ) : null}

        {gameState.phase === 'clue_round' ? (
          <UndercoverClueRound
            view={gameState}
            myId={myId}
            isHost={isHost}
            now={now}
            onComplete={() => send({ type: 'complete_clue' })}
            onSkip={() => send({ type: 'host_skip_player' })}
          />
        ) : null}

        {gameState.phase === 'discussion' ? (
          <UndercoverDiscussion
            players={gameState.players}
            timerEnabled={gameState.timerEnabled}
            discussionEndsAtMs={gameState.discussionEndsAtMs}
            now={now}
            isHost={isHost}
            onStartVoting={() => send({ type: 'start_voting' })}
          />
        ) : null}

        {gameState.phase === 'secret_vote' || gameState.phase === 'tie_break_vote' ? (
          <UndercoverVoting
            players={gameState.players}
            myId={myId}
            voteProgress={gameState.voteProgress}
            yourVoteSubmitted={gameState.yourVoteSubmitted}
            tieBreakCandidates={gameState.tieBreakCandidates}
            isTieBreak={gameState.phase === 'tie_break_vote'}
            onVote={(targetId) => send({ type: 'cast_vote', targetId })}
          />
        ) : null}

        {gameState.phase === 'elimination' ? (
          <UndercoverElimination
            view={gameState}
            onAcknowledge={() => send({ type: 'ack_elimination' })}
          />
        ) : null}

        {gameState.phase === 'mr_white_guess' && gameState.mrWhiteGuessPrompt ? (
          <UndercoverMrWhiteGuess onSubmit={(text) => send({ type: 'mr_white_guess', text })} />
        ) : null}

        {gameState.phase === 'mr_white_guess' && !gameState.mrWhiteGuessPrompt ? (
          <div className="card uc-panel">
            <p className="uc-muted">รอคนที่ถูกคัดออกทายคำ…</p>
          </div>
        ) : null}
      </main>

      {gameState.recheckRoleView ? (
        <Dialog open onOpenChange={(open) => !open && send({ type: 'dismiss_recheck_role' })}>
          <DialogTitle>คำของคุณ</DialogTitle>
          <div className="uc-recheck-body">
            <div className="uc-word-card">
              {gameState.recheckRoleView.secretWord ? (
                <p className="uc-word-card__word">{gameState.recheckRoleView.secretWord}</p>
              ) : (
                <p className="uc-word-card__empty">การ์ดว่าง — ไม่มีคำบนการ์ด</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => send({ type: 'dismiss_recheck_role' })}>
              ปิด
            </Button>
          </DialogFooter>
        </Dialog>
      ) : null}

      {isGameOver ? (
        <GameOverModal
          titleId="undercover-game-over-title"
          panelClassName="uc-game-over-modal"
          onLeave={onLeave}
          onRestart={onRestart}
        >
          <UndercoverGameOver view={gameState} myId={myId} titleId="undercover-game-over-title" />
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
