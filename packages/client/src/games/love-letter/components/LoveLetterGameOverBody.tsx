import { cn } from '../../../utils/cn';

export type LoveLetterRanking = {
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
};

export function LoveLetterGameOverBody({ titleId, reason, rankings }: Props) {
  return (
    <div className="ll-game-over">
      <h2 id={titleId} className="ll-modal-shell__title m-0">
        Love Letter — จบเกม
      </h2>
      <p className="m-0 text-sm text-[var(--text-muted)]">{reason}</p>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {rankings.map((r) => (
          <li
            key={r.name}
            className={cn(
              'flex items-center gap-3 rounded-md bg-[var(--bg-elevated)] px-3 py-2',
              r.isWinner &&
                'border border-[var(--ll-accent,#c41e3a)] bg-[var(--ll-accent-soft,rgba(196,30,58,0.12))]',
            )}
          >
            <span className="min-w-[1.5rem] font-bold text-[var(--text-muted)]">#{r.rank}</span>
            <span className={cn('flex-1', r.isMe && 'font-bold')}>{r.name}</span>
            <span className="font-semibold text-[var(--ll-accent,#c41e3a)]">{r.score} โทเคน</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
