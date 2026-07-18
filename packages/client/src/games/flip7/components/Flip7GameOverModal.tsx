import type { Flip7PlayerView } from 'shared';
import { useMemo } from 'react';
import { GameOverActions } from '../../../components/game-shell';
import { PlayerAvatar } from '../../../components/player-avatar';
import { buildFlip7GameOverBoard } from '../lib/flip7Ui';

type Props = {
  gameState: Flip7PlayerView;
  myId: string;
  onLeave: () => void;
  onRestart?: () => void;
};

export function Flip7GameOverModal({ gameState, myId, onLeave, onRestart }: Props) {
  const result = gameState.gameResult;
  const board = useMemo(() => {
    if (!result) return [];
    return buildFlip7GameOverBoard(gameState.players, result.winners);
  }, [gameState.players, result]);

  if (!result) return null;

  return (
    <div
      className="modal-overlay f7-game-over-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="f7-game-over-title"
    >
      <div className="modal f7-game-over-modal" onClick={(e) => e.stopPropagation()}>
        <div className="f7-game-over-toolbar">
          <p className="f7-game-over-kicker" id="f7-game-over-title">
            🏆 เกมจบแล้ว
          </p>
        </div>

        <div className="f7-game-over-hero" aria-live="polite">
          <p className="f7-game-over-hero-label">ผู้ชนะ</p>
          <div className="f7-game-over-hero-winners">
            {result.winners.length === 0 ? (
              <p className="f7-game-over-hero-names">—</p>
            ) : (
              result.winners.map((id) => {
                const p = gameState.players.find((x) => x.id === id);
                const name = p?.name ?? id;
                return (
                  <span key={id} className="f7-game-over-hero-winner">
                    <PlayerAvatar
                      playerId={id}
                      name={name}
                      size={40}
                      decorative
                      className="f7-player-avatar"
                    />
                    <span className="f7-game-over-hero-winner-name">{name}</span>
                  </span>
                );
              })
            )}
          </div>
          <p className="f7-game-over-hero-reason">{result.reason}</p>
        </div>

        {board.length > 0 ? (
          <>
            <h3 className="f7-game-over-score-heading">
              คะแนนรวม{' '}
              <span className="f7-game-over-score-sub">
                (เป้าหมาย {gameState.targetScore} แต้ม · เรียงจากมากไปน้อย)
              </span>
            </h3>
            <div className="f7-game-over-table-wrap">
              <table className="f7-game-over-table">
                <thead>
                  <tr>
                    <th scope="col" className="w-16">
                      อันดับ
                    </th>
                    <th scope="col">ผู้เล่น</th>
                    <th scope="col">แต้ม</th>
                    <th scope="col" className="f7-game-over-table__th-narrow">
                      สถานะ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((row) => (
                    <tr
                      key={row.id}
                      className={row.isWinner ? 'f7-game-over-table__row--winner' : undefined}
                    >
                      <td className="f7-game-over-table__place">{row.place}</td>
                      <td className="f7-game-over-table__name">
                        <span className="f7-table-who">
                          <PlayerAvatar
                            playerId={row.id}
                            name={row.name}
                            size={28}
                            decorative
                            className="f7-player-avatar"
                          />
                          <span>
                            {row.name}
                            {row.id === myId ? ' (คุณ)' : ''}
                          </span>
                        </span>
                      </td>
                      <td className="f7-game-over-table__score">{row.totalScore}</td>
                      <td className="f7-game-over-table__badge-cell">
                        {row.isWinner ? (
                          <span className="f7-game-over-winner-badge">ชนะ</span>
                        ) : (
                          <span className="f7-game-over-table__dash">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        <GameOverActions onLeave={onLeave} onRestart={onRestart} layout="inline" />
      </div>
    </div>
  );
}
