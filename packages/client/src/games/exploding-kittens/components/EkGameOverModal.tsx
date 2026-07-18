import type { ExplodingKittensPlayerView } from 'shared';
import { GameOverActions } from '../../../components/game-shell';

type GameOverRankingRow = {
  playerId: string;
  place: number;
  name: string;
};

type Props = {
  gs: ExplodingKittensPlayerView;
  myId: string;
  gameOverRanking: GameOverRankingRow[];
  onLeave: () => void;
  onRestart?: () => void;
};

export function EkGameOverModal({ gs, myId, gameOverRanking, onLeave, onRestart }: Props) {
  if (gs.phase !== 'game_over') return null;

  return (
    <div
      className="modal-overlay ek-game-over-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ek-game-over-title"
    >
      <div className="modal ek-game-over-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ek-game-over-toolbar">
          <p className="ek-game-over-kicker" id="ek-game-over-title">
            🏆 เกมจบแล้ว
          </p>
          <GameOverActions onLeave={onLeave} onRestart={onRestart} layout="inline" />
        </div>

        <div className="ek-game-over-hero" aria-live="polite">
          <p className="ek-game-over-hero-label">ผู้ชนะ</p>
          <p className="ek-game-over-hero-names">{gs.winnerName ?? gs.winnerId ?? '—'}</p>
        </div>

        {gameOverRanking.length > 0 && (
          <>
            <h3 className="ek-game-over-ranking-heading">
              ลำดับการตกรอบ{' '}
              <span className="ek-game-over-ranking-sub">(ตายช้าสุด → ตายเร็วสุด)</span>
            </h3>
            <ul className="ek-game-over-ranking-list">
              {gameOverRanking.map((row) => (
                <li key={row.playerId} className="ek-game-over-ranking-row">
                  <span className="ek-game-over-ranking-place">{row.place}</span>
                  <span className="ek-game-over-ranking-name">
                    {row.name}
                    {row.playerId === myId ? ' (คุณ)' : ''}
                  </span>
                  <span className="ek-game-over-ranking-badge">ตกรอบ</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
