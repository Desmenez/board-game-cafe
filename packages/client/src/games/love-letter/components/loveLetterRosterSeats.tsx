import { Heart, Shield } from 'lucide-react';
import type { LoveLetterPublicPlayer } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { cn } from '../../../utils/cn';
import { LoveLetterCardFace } from './LoveLetterCardFace';

export function buildLoveLetterRosterSeats(
  players: LoveLetterPublicPlayer[],
  tokensToWin: number,
): RosterSeat[] {
  return players.map((p) => {
    const out = !p.inRound;
    return {
      id: p.id,
      name: p.name,
      active: p.isCurrent,
      muted: out,
      mutedLabel: out ? 'ออกจากรอบ' : undefined,
      badges: p.handmaidProtected ? (
        <Shield
          size={14}
          className="text-[var(--ll-accent,#c41e3a)] shrink-0"
          aria-label="ได้รับความคุ้มครอง"
        />
      ) : null,
      trailing: (
        <div
          className="flex items-center gap-0.5 shrink-0"
          aria-label={`โทเคน ${p.affectionTokens} จาก ${tokensToWin}`}
        >
          {Array.from({ length: tokensToWin }, (_, i) => {
            const earned = i < p.affectionTokens;
            return (
              <Heart
                key={i}
                size={14}
                strokeWidth={2}
                className={cn('ll-token', earned ? 'll-token--earned fill-current' : 'opacity-25')}
                aria-hidden
              />
            );
          })}
          <span className="ml-1 text-[0.7rem] text-[var(--text-muted)]">
            {p.affectionTokens}/{tokensToWin}
          </span>
        </div>
      ),
      status: (
        <div className="flex gap-2 text-sm text-[var(--text-muted)]">
          <span>มือ: {out ? '—' : p.handCount}</span>
          {out ? (
            <span className="font-semibold text-[var(--ll-accent,#c41e3a)]">ออกจากรอบ</span>
          ) : null}
        </div>
      ),
      extra:
        p.discardPile.length > 0 ? (
          <div className="flex flex-wrap gap-1" role="list" aria-label="การ์ดที่ทิ้ง">
            {p.discardPile.map((card, idx) => (
              <div key={`${card.id}-${idx}`} role="listitem" className={cn(idx > 0 && '-ml-2')}>
                <LoveLetterCardFace card={card} size="tiny" />
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 text-xs text-[var(--text-muted)]">ยังไม่ทิ้งการ์ด</p>
        ),
    };
  });
}
