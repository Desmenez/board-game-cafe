import type { KeyboardEvent, ReactNode } from 'react';
import { Badge } from '../ui';
import { PlayerAvatar } from '../player-avatar';
import './player-roster.css';

export type RosterSeat = {
  id: string;
  name: string;
  /** Current turn / focus actor only — not “waiting to act” crowds. */
  active?: boolean;
  /** Eliminated / out of round. */
  muted?: boolean;
  /** Will skip their next turn (e.g. Stocks). */
  skipped?: boolean;
  /** Seat index / order marker before the name block. */
  leading?: ReactNode;
  status?: ReactNode;
  /** Inline next to the name (icons, small chips). */
  badges?: ReactNode;
  /** Right side of the seat header (e.g. token row). */
  trailing?: ReactNode;
  /** Seat-level right column (e.g. hand meter), outside the main text block. */
  aside?: ReactNode;
  extra?: ReactNode;
  className?: string;
  /** When set, the seat is activatable (click / Enter / Space). */
  onClick?: () => void;
};

export type PlayerRosterStripProps = {
  seats: RosterSeat[];
  myId: string;
  ariaLabel?: string;
  className?: string;
  /** `row` wraps; `grid` is a single scroll-x strip (legacy name). */
  layout?: 'row' | 'grid';
};

export function PlayerRosterStrip({
  seats,
  myId,
  ariaLabel = 'ผู้เล่น',
  className,
  layout = 'row',
}: PlayerRosterStripProps) {
  return (
    <section
      className={[
        'player-roster min-w-0',
        layout === 'grid' ? 'player-roster--grid' : 'player-roster--row',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={ariaLabel}
    >
      <div className="player-roster__seats p-2">
        {seats.map((seat) => {
          const isMe = seat.id === myId;
          const isSkipped = Boolean(seat.skipped);
          const interactive = typeof seat.onClick === 'function';
          return (
            <article
              key={seat.id}
              className={[
                'player-roster__seat min-w-0 rounded-input border border-rule bg-paper-3 text-ink px-3.5 py-3.5',
                isMe ? 'player-roster__seat--me' : '',
                seat.active ? 'player-roster__seat--active' : '',
                seat.muted ? 'player-roster__seat--muted' : '',
                isSkipped && !seat.muted ? 'player-roster__seat--skipped' : '',
                interactive ? 'player-roster__seat--interactive' : '',
                seat.className,
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`${seat.name}${seat.active ? ' — เทิร์นนี้' : ''}${isSkipped ? ' — ข้ามเทิร์น' : ''}${isMe ? ' (คุณ)' : ''}${interactive ? ' — ดูการ์ด' : ''}`}
              {...(interactive
                ? {
                    role: 'button' as const,
                    tabIndex: 0,
                    onClick: seat.onClick,
                    onKeyDown: (e: KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        seat.onClick?.();
                      }
                    },
                  }
                : {})}
            >
              {seat.leading != null ? (
                <div className="player-roster__leading">{seat.leading}</div>
              ) : null}
              <PlayerAvatar
                playerId={seat.id}
                name={seat.name}
                size={38}
                decorative
                className="player-roster__avatar size-9.5 shrink-0"
              />
              <div className="player-roster__main min-w-0 flex flex-col gap-1">
                <header className="player-roster__header">
                  <div className="player-roster__name-row">
                    <span className="player-roster__name truncate font-display font-bold text-ink">
                      {seat.name}
                    </span>
                    {isMe ? (
                      <Badge size="sm" variant="purple" className="player-roster__you">
                        คุณ
                      </Badge>
                    ) : null}
                  </div>
                  {seat.trailing != null ? (
                    <div className="player-roster__trailing">{seat.trailing}</div>
                  ) : null}
                </header>
                {seat.badges != null || isSkipped ? (
                  <div className="player-roster__badges">
                    {isSkipped ? (
                      <Badge size="sm" variant="warning" className="player-roster__skipped-badge">
                        ข้ามเทิร์น
                      </Badge>
                    ) : null}
                    {seat.badges}
                  </div>
                ) : null}
                {seat.status != null ? (
                  <div className="player-roster__status text-sm text-ink-2">{seat.status}</div>
                ) : null}
                {seat.extra != null ? (
                  <div className="player-roster__extra">{seat.extra}</div>
                ) : null}
              </div>
              {seat.aside != null ? <div className="player-roster__aside">{seat.aside}</div> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
