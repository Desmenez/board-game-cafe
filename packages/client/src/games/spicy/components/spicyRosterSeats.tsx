import type { ReactNode } from 'react';
import { Hand, Layers, Trophy } from 'lucide-react';
import type { SpicyPlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';

function StatChip({
  icon,
  value,
  label,
  title,
  emphasize,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  title: string;
  emphasize?: boolean;
}) {
  return (
    <span
      className={emphasize ? 'spicy-roster-stat spicy-roster-stat--on' : 'spicy-roster-stat'}
      title={title}
      aria-label={`${label} ${value}`}
    >
      {icon}
      <span className="spicy-roster-stat__value tabular-nums">{value}</span>
    </span>
  );
}

export function buildSpicyRosterSeats(view: SpicyPlayerView): RosterSeat[] {
  return view.seats.map((s, i) => {
    const isActive = s.id === view.activePlayerId && view.phase !== 'game_over';
    const isTopOwner = s.id === view.topOwnerId;
    const declined =
      view.phase === 'trophy_window' && view.declineChallengeIds.includes(s.id);

    return {
      id: s.id,
      name: s.name,
      active: isActive,
      leading: (
        <span className="text-xs tabular-nums text-[var(--text-secondary)]" aria-hidden>
          {i + 1}
        </span>
      ),
      badges: (
        <>
          {isTopOwner && view.spicyStackCount > 0 ? (
            <Badge size="sm" variant="outline" title="เจ้าของใบบนสุดของกอง">
              บนสุด
            </Badge>
          ) : null}
          {declined ? (
            <Badge size="sm" variant="outline" title="ไม่ท้าถ้วย">
              ไม่ท้า
            </Badge>
          ) : null}
          <span className="spicy-roster-stats inline-flex flex-wrap items-center gap-1">
            <StatChip
              icon={<Hand size={12} strokeWidth={2.25} aria-hidden />}
              value={s.handCount}
              label="มือ"
              title="การ์ดในมือ"
            />
            <StatChip
              icon={<Layers size={12} strokeWidth={2.25} aria-hidden />}
              value={s.wonCount}
              label="กองชนะ"
              title="กองชนะ — นับเป็นคะแนนท้ายเกม"
              emphasize={s.wonCount > 0}
            />
            <StatChip
              icon={<Trophy size={12} strokeWidth={2.25} aria-hidden />}
              value={s.trophies}
              label="ถ้วย"
              title="ถ้วยรางวัล (+10 แต้มต่อถ้วย)"
              emphasize={s.trophies > 0}
            />
          </span>
        </>
      ),
    };
  });
}
