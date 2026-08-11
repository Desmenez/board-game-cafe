import { Heart, Shield } from 'lucide-react';
import type { LoveLetterPublicPlayer } from 'shared';
import { Badge } from '../../../components/ui';
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
      badges: (
        <>
          {p.handmaidProtected ? (
            <Badge size="sm" variant="default" className="shrink-0 gap-1">
              <Shield size={12} className="text-(--ll-accent,#c41e3a)" aria-hidden />
              คุ้มครอง
            </Badge>
          ) : null}
          <span
            className="ll-token-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs tabular-nums shrink-0"
            title="โทเคนความรัก (Affection) — สะสมจนครบเพื่อชนะเกม"
            aria-label={`โทเคน ${p.affectionTokens} จาก ${tokensToWin}`}
          >
            <Heart
              size={12}
              strokeWidth={2.25}
              className={cn(
                'text-(--ll-accent,#c41e3a)',
                p.affectionTokens > 0 && 'fill-current',
              )}
              aria-hidden
            />
            <span>
              {p.affectionTokens}/{tokensToWin}
            </span>
          </span>
          <Badge size="sm" variant="default" className="shrink-0">
            มือ: {out ? '—' : p.handCount}
          </Badge>
        </>
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
          <p className="m-0 text-xs text-(--text-muted)">ยังไม่ทิ้งการ์ด</p>
        ),
    };
  });
}
