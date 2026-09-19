import { useMemo, useState } from 'react';
import type { CodenamesAction, CodenamesPlayerView } from 'shared';
import {
  GameHistoryDisclosure,
  GamePlayHeader,
  GameShell,
} from '../../components/game-shell';
import { PlayerRosterStrip } from '../../components/player-roster';
import { Badge } from '../../components/ui';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { CN_STAGE_LABEL, CN_TEAM_LABEL, cnTeamName } from './art';
import './codenames.css';
import { CodenamesActionPanel } from './components/CodenamesActionPanel';
import { CodenamesBoard } from './components/CodenamesBoard';
import { CodenamesClueBanner } from './components/CodenamesClueBanner';
import { CodenamesGameOverModal } from './components/CodenamesGameOverModal';
import { CodenamesRoleRevealModal } from './components/CodenamesRoleRevealModal';
import { buildCodenamesRosterSeats } from './components/codenamesRosterSeats';

type Props = {
  gameState: CodenamesPlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

export function CodenamesGame({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const [clueWord, setClueWord] = useState('');
  const [clueCountInput, setClueCountInput] = useState('2');
  const send = (action: CodenamesAction) => sendAction(action);
  const isGameOver = gameState.phase === 'game_over';
  const canGuess = gameState.canAct && gameState.turnStage === 'guess';

  useYourTurnToast(gameState.canAct, gameState.phase === 'playing');

  const rosterSeats = useMemo(() => buildCodenamesRosterSeats(gameState), [gameState]);

  const clueGiverName = useMemo(() => {
    const id = gameState.currentClue?.byPlayerId;
    if (!id) return '';
    return gameState.players.find((player) => player.id === id)?.name ?? id;
  }, [gameState.currentClue, gameState.players]);

  const pendingGuessNamesByCard = useMemo(() => {
    const map = new Map<number, Array<{ id: string; name: string }>>();
    for (const [pid, cardIndex] of Object.entries(gameState.pendingGuessByPlayer)) {
      if (cardIndex === undefined) continue;
      const name = gameState.players.find((player) => player.id === pid)?.name ?? 'ผู้เล่น';
      const prev = map.get(cardIndex) ?? [];
      prev.push({ id: pid, name });
      map.set(cardIndex, prev);
    }
    return map;
  }, [gameState.pendingGuessByPlayer, gameState.players]);

  const subtitle = (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge size="sm" variant={gameState.turnTeam === 'red' ? 'danger' : 'info'}>
        เทิร์น{cnTeamName(gameState.turnTeam)}
      </Badge>
      <span>{CN_STAGE_LABEL[gameState.turnStage]}</span>
    </span>
  );

  return (
    <GameShell className="flex flex-col gap-3 pb-5">
      <GamePlayHeader
        title="Codenames"
        subtitle={subtitle}
        trailing={
          <p className="max-w-xs text-xs text-ink-2">
            {CN_TEAM_LABEL.red} {gameState.redRemaining} · {CN_TEAM_LABEL.blue}{' '}
            {gameState.blueRemaining}
          </p>
        }
        leaveLabel={isGameOver ? 'full' : 'short'}
        onLeave={onLeave}
        onRestart={onRestart}
      />

      <GameHistoryDisclosure
        title={`ผู้เล่น · ${gameState.players.length} คน`}
        defaultOpen
        className="sticky top-4 z-20"
      >
        <PlayerRosterStrip
          className="cn-roster"
          layout="grid"
          myId={myId}
          ariaLabel="สถานะผู้เล่น Codenames"
          seats={rosterSeats}
        />
      </GameHistoryDisclosure>

      {gameState.phase !== 'role_reveal' ? (
        <CodenamesClueBanner view={gameState} clueGiverName={clueGiverName} />
      ) : null}

      {gameState.lastEvent ? (
        <p className="text-sm text-ink-2" role="status">
          {gameState.lastEvent}
        </p>
      ) : null}

      <CodenamesActionPanel
        view={gameState}
        clueWord={clueWord}
        setClueWord={setClueWord}
        clueCountInput={clueCountInput}
        setClueCountInput={setClueCountInput}
        send={send}
      />

      <CodenamesBoard
        view={gameState}
        canGuess={canGuess}
        myPendingGuessCardIndex={gameState.pendingGuessByPlayer[myId]}
        pendingGuessNamesByCard={pendingGuessNamesByCard}
        send={send}
      />

      {gameState.phase === 'role_reveal' ? (
        <CodenamesRoleRevealModal view={gameState} myId={myId} send={send} />
      ) : null}

      {isGameOver ? (
        <CodenamesGameOverModal
          view={gameState}
          myId={myId}
          onLeave={onLeave}
          onRestart={onRestart}
        />
      ) : null}
    </GameShell>
  );
}
