import { useMemo } from 'react';
import type { CamelUpPlayerView } from 'shared';
import { GamePlayHeader, GameShell } from '../../components/game-shell';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { CamelUpActionPanel } from './CamelUpActionPanel';
import { CamelUpBettingArea } from './CamelUpBettingArea';
import { CamelUpGameOverModal } from './CamelUpGameOverModal';
import { CamelUpPlayerBar } from './CamelUpPlayerBar';
import { CamelUpPyramidPanel } from './CamelUpPyramidPanel';
import { CamelUpTrack } from './CamelUpTrack';
import './camel-up.css';

type Props = {
  gameState: CamelUpPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

export function CamelUpGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const isMyTurn = gameState.activePlayerId === myId && gameState.canAct;
  useYourTurnToast(isMyTurn);

  const activeName = useMemo(() => {
    if (!gameState.activePlayerId) return null;
    return gameState.players.find((p) => p.id === gameState.activePlayerId)?.name ?? null;
  }, [gameState.activePlayerId, gameState.players]);

  const subtitle = useMemo(() => {
    const parts = [`Leg ${gameState.leg}`];
    if (activeName) parts.push(`ตา: ${activeName}`);
    return parts.join(' · ');
  }, [activeName, gameState.leg]);

  const isGameOver = gameState.phase === 'game_over';

  return (
    <GameShell className="camel-up-page">
      <GamePlayHeader
        title="Camel Up"
        subtitle={subtitle}
        leaveLabel={isGameOver ? 'full' : 'short'}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      {gameState.lastEvent ? (
        <p className="camel-up-event" role="status">
          {gameState.lastEvent}
        </p>
      ) : null}

      <div className="camel-up-layout">
        <div className="camel-up-layout__main">
          <CamelUpTrack
            track={gameState.track}
            desertTiles={gameState.desertTiles}
            players={gameState.players}
            lastRoll={gameState.lastRoll}
          />
          <CamelUpBettingArea
            legBetStacks={gameState.legBetStacks}
            overallWinnerPiles={gameState.overallWinnerPiles}
            overallLoserPiles={gameState.overallLoserPiles}
            players={gameState.players}
            revealed={Boolean(gameState.overallBetsRevealed)}
          />
        </div>

        <aside className="camel-up-layout__side">
          <CamelUpPyramidPanel
            pyramidDiceRemaining={gameState.pyramidDiceRemaining}
            rolledDice={gameState.rolledDice}
          />
          <CamelUpPlayerBar
            players={gameState.players}
            myId={myId}
            raceCardsInHand={gameState.raceCardsInHand}
            activePlayerId={gameState.activePlayerId}
          />
          {!isGameOver ? (
            <CamelUpActionPanel
              legalActions={gameState.legalActions}
              canAct={gameState.canAct}
              sendAction={sendAction}
            />
          ) : null}
        </aside>
      </div>

      {isGameOver ? (
        <CamelUpGameOverModal
          gameState={gameState}
          myId={myId}
          onLeave={onLeave}
          onRestart={onRestart}
        />
      ) : null}
    </GameShell>
  );
}
