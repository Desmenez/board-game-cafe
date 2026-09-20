import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Connect4Action, Connect4PlayerView } from 'shared';
import { GameOverModal, GamePlayHeader, GameShell } from '../../components/game-shell';
import { PlayerIdentity } from '../../components/player-avatar';
import { PlayerRosterStrip } from '../../components/player-roster';
import { useYourTurnToast } from '../../hooks/useYourTurnToast';
import { Connect4Board } from './Connect4Board';
import { buildConnect4RosterSeats } from './components/connect4RosterSeats';
import './connect-4.css';

const COLOR_LABEL = { red: 'แดง', yellow: 'เหลือง' } as const;
/** After the winning disc lands, keep the board visible so the line of 4 can be read. */
const GAME_OVER_REVEAL_MS = 2000;

type Props = {
  gameState: Connect4PlayerView;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
};

export function Connect4Game({ gameState, myId, sendAction, onLeave, onRestart }: Props) {
  const view = gameState;
  const isMyTurn = view.canAct && view.phase === 'playing';
  useYourTurnToast(isMyTurn, view.phase !== 'game_over');

  const [dropAnimating, setDropAnimating] = useState(false);
  const [revealGameOver, setRevealGameOver] = useState(false);
  const onAnimatingChange = useCallback((animating: boolean) => {
    setDropAnimating(animating);
  }, []);

  useEffect(() => {
    if (view.phase !== 'game_over' || dropAnimating) {
      setRevealGameOver(false);
      return;
    }
    const timer = window.setTimeout(() => setRevealGameOver(true), GAME_OVER_REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [view.phase, dropAnimating]);

  const rosterSeats = useMemo(() => buildConnect4RosterSeats(view), [view]);
  const activePlayer = view.players.find((player) => player.id === view.currentPlayerId);
  const iWon = Boolean(view.result?.winners.includes(myId));
  const isDraw = view.phase === 'game_over' && (view.result?.winners.length ?? 0) === 0;
  const showGameOver = view.phase === 'game_over' && revealGameOver;

  const send = (action: Connect4Action) => sendAction(action);

  const subtitle =
    view.phase === 'game_over'
      ? 'เกมจบแล้ว'
      : isMyTurn
        ? `ตาของคุณ · ${COLOR_LABEL[view.myColor]}`
        : `ตาของ ${activePlayer?.name ?? '…'} · ${activePlayer ? COLOR_LABEL[activePlayer.color] : ''}`;

  return (
    <GameShell className="c4-page">
      <GamePlayHeader
        title="Connect 4"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {activePlayer && view.phase !== 'game_over' ? (
              <PlayerIdentity
                playerId={activePlayer.id}
                name={activePlayer.name}
                avatarSize={28}
                secondary={isMyTurn ? 'ตาของคุณ' : undefined}
              />
            ) : (
              <span>{subtitle}</span>
            )}
          </span>
        }
        onLeave={onLeave}
        onRestart={onRestart}
        leaveLabel={view.phase === 'game_over' ? 'full' : 'short'}
      />
      <PlayerRosterStrip
        layout="row"
        myId={myId}
        ariaLabel="ผู้เล่น Connect 4"
        seats={rosterSeats}
      />
      <section className="card space-y-3 p-4">
        <p className="text-center text-sm text-ink-2">
          {view.phase === 'game_over'
            ? (view.result?.reason ?? 'เกมจบแล้ว')
            : isMyTurn
              ? 'คลิกคอลัมน์เพื่อหยอดตัวหมาก'
              : `รอ ${activePlayer?.name ?? 'คู่แข่ง'} หยอด`}
        </p>
        <Connect4Board
          board={view.board}
          lastMove={view.lastMove}
          winningLine={view.winningLine}
          legalColumns={view.legalColumns}
          myColor={view.myColor}
          canAct={isMyTurn}
          onDrop={(col) => send({ type: 'drop', col })}
          onAnimatingChange={onAnimatingChange}
        />
      </section>
      {showGameOver ? (
        <GameOverModal
          titleId="c4-game-over"
          gameId="connect-4"
          onLeave={onLeave}
          onRestart={onRestart}
          tone={isDraw ? 'default' : iWon ? 'win' : 'lose'}
        >
          <header className="text-center">
            <p className="mt-2 text-xs tracking-wide text-ink-3 uppercase">เกมจบแล้ว</p>
            <h2 id="c4-game-over" className="font-display text-2xl font-bold text-ink">
              {isDraw ? 'เสมอ' : iWon ? 'ยินดีด้วย — คุณชนะ!' : 'คุณแพ้'}
            </h2>
            {view.result?.reason ? (
              <p className="mt-1 text-sm text-ink-2">{view.result.reason}</p>
            ) : null}
          </header>
          <ol className="mt-4 space-y-2 text-left">
            {view.players.map((player) => {
              const isWinner = view.result?.winners.includes(player.id) ?? false;
              return (
                <li
                  key={player.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-rule bg-paper-2 px-3 py-2"
                >
                  <span
                    className={`c4-roster-swatch c4-roster-swatch--${player.color}`}
                    aria-hidden
                  />
                  <PlayerIdentity
                    playerId={player.id}
                    name={player.name}
                    avatarSize={36}
                    secondary={
                      player.id === myId ? 'คุณ' : isWinner ? 'ชนะ' : isDraw ? 'เสมอ' : undefined
                    }
                    className="min-w-0 flex-1"
                    trailing={
                      <span className="ml-2 text-sm font-semibold text-ink-2">
                        {COLOR_LABEL[player.color]}
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ol>
        </GameOverModal>
      ) : null}
    </GameShell>
  );
}
