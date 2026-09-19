import type { CodenamesPlayerView } from 'shared';
import { cn } from '../../../utils/cn';
import { cnTeamName } from '../art';

type Props = {
  view: CodenamesPlayerView;
  clueGiverName: string;
};

export function CodenamesClueBanner({ view, clueGiverName }: Props) {
  if (view.turnStage !== 'guess' || !view.currentClue) {
    const red = view.turnTeam === 'red';
    return (
      <p
        className={cn(
          'rounded-card border px-3 py-2.5 text-sm',
          red
            ? 'border-red-400/55 bg-gradient-to-br from-red-950/80 to-zinc-950/90 text-red-100/85'
            : 'border-sky-400/55 bg-gradient-to-br from-sky-950/80 to-zinc-950/90 text-sky-100/85',
        )}
      >
        {view.turnStage === 'clue'
          ? `รอ ${cnTeamName(view.turnTeam)} ให้คำใบ้`
          : 'กำลังเตรียมคำใบ้…'}
      </p>
    );
  }

  const clue = view.currentClue;
  const guessCap = view.guessesUsedThisTurn + view.guessesRemainingThisTurn;

  return (
    <div
      className={cn(
        'rounded-card border px-3.5 py-3',
        clue.team === 'red'
          ? 'border-red-400/55 bg-gradient-to-br from-red-950/80 to-zinc-950/90'
          : 'border-sky-400/55 bg-gradient-to-br from-sky-950/80 to-zinc-950/90',
      )}
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.72rem] font-extrabold tracking-wider text-ink-3 uppercase">
          คำใบ้รอบนี้
        </span>
        {clueGiverName ? <span className="text-sm text-ink-2">จาก {clueGiverName}</span> : null}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-display text-[clamp(1.75rem,5vw,2.35rem)] leading-tight font-black tracking-[-0.03em] text-ink">
          {clue.clueWord}
        </span>
        <span className="text-[1.75rem] font-bold text-ink-3">:</span>
        <span
          className="inline-flex min-w-9 items-center justify-center rounded-lg border border-white/20 bg-black/35 px-3 py-1 font-display text-[clamp(1.5rem,4vw,2rem)] font-black text-white"
          aria-label={`เกี่ยวข้อง ${clue.clueCount} ${view.boardVariant === 'pictures' ? 'รูป' : 'คำ'}`}
        >
          {clue.clueCount}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-white/15 pt-2.5 text-sm text-ink-2">
        <span className="text-ink-3">เกี่ยวข้อง</span>
        <strong className="text-ink">{clue.clueCount}</strong>
        <span> {view.boardVariant === 'pictures' ? 'รูปที่ตั้งใจใบ้' : 'คำที่ตั้งใจใบ้'}</span>
        <span className="text-ink-3">·</span>
        <span className="text-ink-3">เดาได้อีก</span>
        <strong className="text-lg text-ink">{view.guessesRemainingThisTurn}</strong>
        <span>/ {guessCap} ครั้งสูงสุดในเทิร์นนี้</span>
      </div>
    </div>
  );
}
