import type { InsiderPlayerView } from 'shared';
import { GameOverActions } from '../../../components/game-shell';
import { ROLE_TH, insiderRoleCardUrl, insiderRoleTone } from '../lib/roleMeta';

type Props = {
  gameState: InsiderPlayerView;
  winnerNames: string[];
  onLeave: () => void;
  onRestart?: () => void;
};

export function InsiderGameOver({ gameState, winnerNames, onLeave, onRestart }: Props) {
  const gr = gameState.gameResult!;
  const reveal = gameState.gameOverReveal!;
  const noWinners = gr.winners.length === 0;
  const insiderWon = !noWinners && gr.winners.length === 1 && gr.winners[0] === reveal.insiderId;

  let titleClass = 'insider-game-over-title insider-game-over-title--good';
  let titleText = '⚔️ Master & Common ชนะ!';
  let hero = '🏆';
  if (noWinners) {
    titleClass = 'insider-game-over-title insider-game-over-title--neutral';
    titleText = 'เกมจบ';
    hero = '⏱️';
  } else if (insiderWon) {
    titleClass = 'insider-game-over-title insider-game-over-title--evil';
    titleText = '💀 Insider ชนะ!';
    hero = '💀';
  }

  return (
    <div
      className="insider-game-over-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insider-game-over-title"
    >
      <div className="insider-game-over-panel" onClick={(e) => e.stopPropagation()}>
        <div className="insider-game-over-hero" aria-hidden>
          {hero}
        </div>
        <h2 id="insider-game-over-title" className={titleClass}>
          {titleText}
        </h2>
        <p className="insider-game-over-reason">{gr.reason}</p>
        {winnerNames.length > 0 ? (
          <p className="insider-game-over-winners">
            <span className="insider-muted">ผู้ชนะ: </span>
            {winnerNames.join(' · ')}
          </p>
        ) : (
          <p className="insider-game-over-winners insider-muted">ไม่มีผู้ชนะ</p>
        )}

        <div className="insider-game-over-secret card">
          <p className="insider-game-over-secret-label">คำลับ</p>
          <p className="insider-game-over-secret-word">{reveal.secretWord}</p>
          <p className="insider-muted">หมวด {reveal.categoryLabel}</p>
        </div>

        <h3 className="insider-game-over-roles-heading">เปิดเผยบทบาททั้งหมด</h3>
        <div className="insider-game-over-role-grid">
          {gameState.players.map((p) => {
            const role = reveal.roles[p.id] ?? 'common';
            const label = ROLE_TH[role];
            const art = insiderRoleCardUrl(role);
            const tone = insiderRoleTone(role);
            return (
              <div
                key={p.id}
                className={`insider-game-over-role-item insider-game-over-role-item--${tone}`}
              >
                <img
                  src={art}
                  alt={label}
                  className="insider-game-over-role-thumb"
                  loading="lazy"
                />
                <div className="insider-game-over-role-name">{p.name}</div>
                <div className="insider-game-over-role-label">
                  {label}
                  {p.id === reveal.insiderId ? ' 🎯' : ''}
                </div>
              </div>
            );
          })}
        </div>

        <GameOverActions onRestart={onRestart} onLeave={onLeave} />
      </div>
    </div>
  );
}
