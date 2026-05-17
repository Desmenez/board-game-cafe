import { Trophy } from 'lucide-react';
import { useMemo } from 'react';
import type { CupTheCrabCard, CupTheCrabPlayerView } from 'shared';
import { GameOverModal } from '../../components/game-shell';
import { startCupTheCrabWinCelebrationLoop } from '../../utils/winCelebration';

type Props = {
  gameState: CupTheCrabPlayerView;
  myId: string;
  onLeave: () => void;
  onRestart?: () => void;
};

function cupScoreFromPile(pile: CupTheCrabCard[]): number {
  return pile.filter((c) => c.kind === 'cup').reduce((sum, c) => sum + (c.value ?? 0), 0);
}

const PLACE_MEDAL: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export function CtcGameOverModal({ gameState, myId, onLeave, onRestart }: Props) {
  const piles = gameState.allScorePiles ?? { [myId]: gameState.myScorePile };
  const winners = new Set(gameState.result?.winners ?? []);
  const iWon = winners.has(myId);

  const leaderboard = useMemo(() => {
    return gameState.players
      .map((p) => ({
        id: p.id,
        name: p.name,
        score: cupScoreFromPile(piles[p.id] ?? []),
        isWinner: winners.has(p.id),
        isMe: p.id === myId,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name, 'th');
      })
      .map((row, index) => ({ ...row, place: index + 1 }));
  }, [gameState.players, myId, piles, winners]);

  const winnerNames = useMemo(
    () =>
      (gameState.result?.winners ?? [])
        .map((id) => gameState.players.find((p) => p.id === id)?.name ?? id)
        .join(' · '),
    [gameState.players, gameState.result?.winners],
  );

  return (
    <GameOverModal
      titleId="ctc-game-over-title"
      panelClassName="ctc-game-over-modal"
      onLeave={onLeave}
      onRestart={onRestart}
      startCelebration={startCupTheCrabWinCelebrationLoop}
    >
      <div className="ctc-game-over-hero">
        <Trophy
          className={['ctc-game-over-trophy', iWon ? 'ctc-game-over-trophy--me' : ''].join(' ')}
          size={48}
          strokeWidth={1.6}
          aria-hidden
        />
        <p className="ctc-game-over-kicker">เกมจบแล้ว</p>
        <h2
          id="ctc-game-over-title"
          className={['ctc-game-over-title', iWon ? 'ctc-game-over-title--win' : ''].join(' ')}
        >
          {iWon ? 'ยินดีด้วย — คุณชนะ!' : 'สรุปผลการแข่งขัน'}
        </h2>
        {winnerNames ? (
          <p className="ctc-game-over-winners">
            ผู้ชนะ: <strong>{winnerNames}</strong>
          </p>
        ) : null}
        {gameState.result?.reason ? (
          <p className="ctc-game-over-reason">{gameState.result.reason}</p>
        ) : null}
      </div>

      <h3 className="ctc-game-over-board-title">อันดับคะแนนถ้วย</h3>
      <p className="ctc-game-over-board-note">นับเฉพาะถ้วยในกองคะแนน</p>
      <ol className="ctc-game-over-board" aria-label="อันดับผู้เล่น">
        {leaderboard.map((row) => (
          <li
            key={row.id}
            className={[
              'ctc-game-over-row',
              row.isWinner ? 'ctc-game-over-row--winner' : '',
              row.isMe ? 'ctc-game-over-row--me' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="ctc-game-over-row__place" aria-label={`อันดับ ${row.place}`}>
              {PLACE_MEDAL[row.place] ?? row.place}
            </span>
            <span className="ctc-game-over-row__name">
              {row.name}
              {row.isMe ? <span className="ctc-game-over-row__you">คุณ</span> : null}
            </span>
            <span className="ctc-game-over-row__score">
              <span className="ctc-game-over-row__score-value">{row.score}</span>
              <span className="ctc-game-over-row__score-unit">แต้ม</span>
            </span>
          </li>
        ))}
      </ol>
    </GameOverModal>
  );
}
