import type { ExplodingKittensPlayerView } from 'shared';
import type { RosterSeat } from '../../../components/player-roster';
import { Badge } from '../../../components/ui';
import { getPlayerFrontRowBadges, type FrontRowBadge } from '../lib/playerBadges';

function frontBadgeVariant(
  variant: FrontRowBadge['variant'],
): 'info' | 'accent' | 'warning' {
  if (variant === 'ill-take' || variant === 'blind') return 'info';
  if (variant === 'tower' || variant === 'mark') return 'accent';
  return 'warning';
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
    const showPending = p.alive && p.pendingTurns > 1;
    const hasExtraBadges = frontBadges.length > 0 || showPending;

    return {
      id: p.id,
      name: p.name,
      active: isCurrent && p.alive,
      muted: !p.alive,
      mutedLabel: !p.alive ? 'ตาย' : undefined,
      leading: (
        <span className="ek-roster-seat-index" aria-hidden>
          {i + 1}
        </span>
      ),
      badges: hasExtraBadges ? (
        <>
          {frontBadges.map((b) => (
            <Badge key={b.key} size="sm" variant={frontBadgeVariant(b.variant)} title={b.title}>
              {b.label}
            </Badge>
          ))}
          {showPending ? (
            <Badge size="sm" variant="warning" title="ค้างหลายเทิร์น">
              ×{p.pendingTurns}
            </Badge>
          ) : null}
        </>
      ) : undefined,
      status: compact || !p.alive ? undefined : `${p.handCount} ใบ`,
    };
  });
}
