import { Crown, Trophy } from 'lucide-react';
import type { ExplodingKittensPlayerView } from 'shared';
import { GameOverModal } from '../../../components/game-shell';
import { PlayerAvatar } from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';

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

  const winnerId = gs.winnerId ?? null;
  const winnerName = gs.winnerName ?? gs.players.find((p) => p.id === winnerId)?.name ?? null;
  const iWon = Boolean(winnerId && winnerId === myId);

  return (
    <GameOverModal
      titleId="ek-game-over-title"
      onLeave={onLeave}
      onRestart={onRestart}
      tone={iWon ? 'win' : 'default'}
      panelClassName="ek-game-over-modal"
    >
      <div className="ek-game-over">
        <header className={cn('ek-game-over__hero', iWon && 'ek-game-over__hero--win')}>
          <div className="ek-game-over__trophy" aria-hidden>
            {iWon ? (
              <Crown size={28} strokeWidth={1.75} />
            ) : (
              <Trophy size={28} strokeWidth={1.75} />
            )}
          </div>
          <p className="ek-game-over__kicker">เกมจบแล้ว</p>
          <h2 id="ek-game-over-title" className="ek-game-over__title">
            {iWon ? 'ยินดีด้วย — คุณชนะ!' : 'สรุปผล'}
          </h2>
          {winnerName ? (
            <p className="ek-game-over__winners" aria-live="polite">
              ผู้ชนะ: <strong>{winnerName}</strong>
            </p>
          ) : null}
        </header>

        {gameOverRanking.length > 0 ? (
          <>
            <h3 className="ek-game-over__board-title">
              ลำดับการตกรอบ{' '}
              <span className="ek-game-over__board-sub">(ตายช้าสุด → ตายเร็วสุด)</span>
            </h3>
            <ol className="ek-game-over__list" aria-label="ลำดับการตกรอบ">
              {winnerId && winnerName ? (
                <li
                  className={cn(
                    'ek-game-over__row',
                    'ek-game-over__row--winner',
                    winnerId === myId && 'ek-game-over__row--me',
                  )}
                >
                  <span
                    className="ek-game-over__place ek-game-over__place--gold"
                    aria-label="ผู้ชนะ"
                  >
                    ★
                  </span>
                  <span className="ek-game-over__avatar">
                    <PlayerAvatar playerId={winnerId} name={winnerName} size={44} decorative />
                  </span>
                  <div className="ek-game-over__who">
                    <div className="ek-game-over__name-row">
                      <Crown
                        className="ek-game-over__crown"
                        size={14}
                        strokeWidth={2.25}
                        aria-hidden
                      />
                      <span className="ek-game-over__name">{winnerName}</span>
                      {winnerId === myId ? <span className="ek-game-over__you">คุณ</span> : null}
                    </div>
                    <span className="ek-game-over__winner-tag">ชนะ</span>
                  </div>
                </li>
              ) : null}

              {gameOverRanking.map((row) => {
                const isMe = row.playerId === myId;
                return (
                  <li
                    key={row.playerId}
                    className={cn('ek-game-over__row', isMe && 'ek-game-over__row--me')}
                  >
                    <span className="ek-game-over__place" aria-label={`ลำดับ ${row.place}`}>
                      {row.place}
                    </span>
                    <span className="ek-game-over__avatar">
                      <PlayerAvatar playerId={row.playerId} name={row.name} size={36} decorative />
                    </span>
                    <div className="ek-game-over__who">
                      <div className="ek-game-over__name-row">
                        <span className="ek-game-over__name">{row.name}</span>
                        {isMe ? <span className="ek-game-over__you">คุณ</span> : null}
                      </div>
                    </div>
                    <span className="ek-game-over__out-tag">ตกรอบ</span>
                  </li>
                );
              })}
            </ol>
          </>
        ) : null}
      </div>
    </GameOverModal>
  );
}
