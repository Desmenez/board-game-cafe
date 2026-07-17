import type { ReactNode } from 'react';
import './player-roster.css';

export type RosterSeat = {
  id: string;
  name: string;
  /** Current turn / active seat. */
  active?: boolean;
  /** Eliminated / out of round. */
  muted?: boolean;
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
};

export type PlayerRosterStripProps = {
  seats: RosterSeat[];
  myId: string;
  ariaLabel?: string;
  className?: string;
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
      <div className="player-roster__seats">
        {seats.map((seat) => {
          const isMe = seat.id === myId;
          return (
            <article
              key={seat.id}
              className={[
                'player-roster__seat min-w-0 rounded-input border border-rule bg-paper-3 text-ink',
                isMe ? 'player-roster__seat--me' : '',
                seat.active ? 'player-roster__seat--active' : '',
                seat.muted ? 'player-roster__seat--muted' : '',
                seat.className,
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`${seat.name}${seat.active ? ' — เทิร์นนี้' : ''}${isMe ? ' (คุณ)' : ''}`}
            >
              {seat.leading != null ? (
                <div className="player-roster__leading">{seat.leading}</div>
              ) : null}
              <div className="player-roster__main min-w-0">
                <header className="player-roster__header">
                  <div className="player-roster__name-row">
                    <span className="player-roster__name truncate font-display font-bold text-ink">
                      {seat.name}
                    </span>
                    {isMe ? (
                      <span className="player-roster__you font-label text-xs text-ink-2">
                        (คุณ)
                      </span>
                    ) : null}
                    {seat.badges}
                  </div>
                  {seat.trailing != null ? (
                    <div className="player-roster__trailing">{seat.trailing}</div>
                  ) : null}
                </header>
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
