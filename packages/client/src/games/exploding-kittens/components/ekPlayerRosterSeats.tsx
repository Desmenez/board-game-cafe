import type { ExplodingKittensPlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';
import { getPlayerFrontRowBadges, type FrontRowBadge } from '../lib/playerBadges';

function frontBadgeVariant(variant: FrontRowBadge['variant']): 'warning' | 'accent' | 'purple' {
  if (variant === 'ill-take') return 'warning';
  if (variant === 'tower') return 'accent';
  return 'purple';
}

export type BuildEkPlayerRosterSeatsOptions = {
  /** Dock strip — skip hand-count status to keep chips short */
  compact?: boolean;
};

/** Shared seat model for status disclosure + modal/dock turn strip. */
export function buildEkPlayerRosterSeats(
  gs: ExplodingKittensPlayerView,
  options: BuildEkPlayerRosterSeatsOptions = {},
): RosterSeat[] {
  const { compact = false } = options;

  return gs.players.map((p, i) => {
    const isCurrent = p.id === gs.currentPlayerId;
    const frontBadges = getPlayerFrontRowBadges(gs, p.id, p.alive);

    return {
      id: p.id,
      name: p.name,
      active: isCurrent && p.alive,
      muted: !p.alive,
      leading: (
        <span className="ek-roster-seat-index" aria-hidden>
          {i + 1}
        </span>
      ),
      badges: (
        <>
          {isCurrent && p.alive ? (
            <Badge size="sm" variant="accent">
              ตาปัจจุบัน
            </Badge>
          ) : null}
          {!p.alive ? (
            <Badge size="sm" variant="danger">
              ตาย
            </Badge>
          ) : null}
          {frontBadges.map((b) => (
            <Badge key={b.key} size="sm" variant={frontBadgeVariant(b.variant)} title={b.title}>
              {b.label}
            </Badge>
          ))}
          {p.alive && p.pendingTurns > 1 ? (
            <Badge size="sm" variant="warning" title="ค้างหลายเทิร์น">
              ×{p.pendingTurns}
            </Badge>
          ) : null}
        </>
      ),
      status: compact ? undefined : p.alive ? (
        <span>มือ {p.handCount} ใบ</span>
      ) : (
        <span className="text-ink-2">ตายแล้ว</span>
      ),
    };
  });
}
