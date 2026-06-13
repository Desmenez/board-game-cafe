import { Trophy } from 'lucide-react';
import { useMemo } from 'react';
import type { CamelUpPlayerView } from 'shared';
import { GameOverModal } from '../../components/game-shell';
import { CAMEL_COLOR_LABEL } from './camelMeta';

type Props = {
  gameState: CamelUpPlayerView;
  myId: string;
  onLeave: () => void;
  onRestart?: () => void;
};

const PLACE_MEDAL: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export function CamelUpGameOverModal({ gameState, myId, onLeave, onRestart }: Props) {
  const winnerIds = gameState.result?.winners ?? [];
  const iWon = winnerIds.includes(myId);

  const leaderboard = useMemo(() => {
    const winners = new Set(winnerIds);
    const breakdown = gameState.scoringBreakdown ?? [];
    const byId = new Map(breakdown.map((b) => [b.playerId, b]));
    return gameState.players
      .map((p) => {
        const row = byId.get(p.id);
        return {
          id: p.id,
          name: p.name,
          ep: row?.totalEp ?? p.ep,
          isWinner: winners.has(p.id),
          isMe: p.id === myId,
        };
      })
      .sort((a, b) => {
        if (b.ep !== a.ep) return b.ep - a.ep;
        return a.name.localeCompare(b.name, 'th');
      })
      .map((row, index) => ({ ...row, place: index + 1 }));
  }, [gameState.players, gameState.scoringBreakdown, myId, winnerIds]);

  const winnerNames = useMemo(
    () =>
      (gameState.result?.winners ?? [])
        .map((id) => gameState.players.find((p) => p.id === id)?.name ?? id)
        .join(' · '),
    [gameState.players, gameState.result?.winners],
  );

  return (
    <GameOverModal
      titleId="camel-up-game-over-title"
      panelClassName="camel-up-game-over-modal"
      onLeave={onLeave}
      onRestart={onRestart}
    >
      <div className="camel-up-game-over-hero">
        <Trophy
          className={[
            'camel-up-game-over-trophy',
            iWon ? 'camel-up-game-over-trophy--me' : '',
          ].join(' ')}
          size={48}
          strokeWidth={1.6}
          aria-hidden
        />
        <p className="camel-up-game-over-kicker">เกมจบแล้ว</p>
        <h2
          id="camel-up-game-over-title"
          className={['camel-up-game-over-title', iWon ? 'camel-up-game-over-title--win' : ''].join(
            ' ',
          )}
        >
          {iWon ? 'ยินดีด้วย — คุณชนะ!' : 'สรุปผลการแข่งขัน'}
        </h2>
        {winnerNames ? (
          <p className="camel-up-game-over-winners">
            ผู้ชนะ: <strong>{winnerNames}</strong>
          </p>
        ) : null}
        {gameState.raceWinnerColor ? (
          <p className="camel-up-game-over-race">
            อูฐชนะ: <strong>{CAMEL_COLOR_LABEL[gameState.raceWinnerColor]}</strong>
            {gameState.raceLoserColor ? (
              <>
                {' '}
                · อูฐแพ้: <strong>{CAMEL_COLOR_LABEL[gameState.raceLoserColor]}</strong>
              </>
            ) : null}
          </p>
        ) : null}
        {gameState.result?.reason ? (
          <p className="camel-up-game-over-reason">{gameState.result.reason}</p>
        ) : null}
      </div>

      <h3 className="camel-up-game-over-board-title">อันดับ EP</h3>
      <ol className="camel-up-game-over-board" aria-label="อันดับผู้เล่น">
        {leaderboard.map((row) => (
          <li
            key={row.id}
            className={[
              'camel-up-game-over-row',
              row.isWinner ? 'camel-up-game-over-row--winner' : '',
              row.isMe ? 'camel-up-game-over-row--me' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="camel-up-game-over-row__place" aria-label={`อันดับ ${row.place}`}>
              {PLACE_MEDAL[row.place] ?? row.place}
            </span>
            <span className="camel-up-game-over-row__name">
              {row.name}
              {row.isMe ? <span className="camel-up-game-over-row__you">คุณ</span> : null}
            </span>
            <span className="camel-up-game-over-row__score">
              <span className="camel-up-game-over-row__score-value">{row.ep}</span>
              <span className="camel-up-game-over-row__score-unit">EP</span>
            </span>
          </li>
        ))}
      </ol>
    </GameOverModal>
  );
}
