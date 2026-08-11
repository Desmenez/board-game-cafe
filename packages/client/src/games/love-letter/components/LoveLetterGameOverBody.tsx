import { Crown, Heart } from 'lucide-react';
import { PlayerIdentity } from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';

export type LoveLetterRanking = {
  playerId: string;
  rank: number;
  name: string;
  score: number;
  isMe: boolean;
  isWinner: boolean;
};

type Props = {
  titleId: string;
  reason: string;
  rankings: LoveLetterRanking[];
  tokensToWin: number;
};

export function LoveLetterGameOverBody({ titleId, reason, rankings, tokensToWin }: Props) {
  const winners = rankings.filter((r) => r.isWinner);
  const tie = winners.length > 1;
  const winnerLine = tie
    ? `${winners.map((w) => w.name).join(' · ')} เสมอ`
    : `${winners[0]?.name ?? '—'} ชนะเกม`;

  return (
    <div className="ll-game-over">
      <header className="ll-game-over__hero">
        <div className="ll-game-over__badge" aria-hidden>
          <Crown size={18} strokeWidth={1.75} />
        </div>
        <p className="ll-game-over__kicker">จบเกม</p>
        <h2 id={titleId} className="ll-game-over__title">
          {winnerLine}
        </h2>
        <p className="ll-game-over__reason">{reason}</p>
      </header>

      <ol className="ll-game-over__list" aria-label="อันดับสุดท้าย">
        {rankings.map((r) => (
          <li
            key={r.playerId}
            className={cn(
              'll-game-over__row',
              r.isWinner && 'll-game-over__row--winner',
            )}
          >
            <span className="ll-game-over__place" aria-label={`อันดับ ${r.rank}`}>
              #{r.rank}
            </span>
            <div className="ll-game-over__main">
              <PlayerIdentity
                playerId={r.playerId}
                name={r.name}
                avatarSize={36}
                secondary={
                  <span
                    className={cn(
                      'll-game-over__status',
                      r.isWinner && 'll-game-over__status--win',
                    )}
                  >
                    {r.isWinner ? (tie ? 'ได้แชมป์' : 'ชนะเกม') : 'อันดับ'}
                    {r.isMe ? ' · คุณ' : ''}
                  </span>
                }
              />
            </div>
            <span
              className="ll-token-chip ll-game-over__tokens"
              title="โทเคนความรัก"
              aria-label={`โทเคน ${r.score} จาก ${tokensToWin}`}
            >
              <Heart
                size={11}
                strokeWidth={2.25}
                className={cn(
                  'text-[var(--ll-accent,#c41e3a)] shrink-0',
                  r.score > 0 && 'fill-current',
                )}
                aria-hidden
              />
              <span className="tabular-nums">
                {r.score}/{tokensToWin}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
