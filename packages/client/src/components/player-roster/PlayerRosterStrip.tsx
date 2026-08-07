import { useCallback, useEffect, useMemo, type KeyboardEvent, type ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { useReducedMotion } from 'motion/react';
import { Badge } from '../ui';
import {
  PlayerAvatar,
  PlayerAvatarIconBadge,
  PlayerNameplate,
  NameplateFrameVideo,
  nameplateFrameProps,
  usePlayerAvatar,
} from '../player-avatar';
import { cn } from '../../utils/cn';
import { useRosterCarouselIdleReturn } from './useRosterCarouselIdleReturn';
import './player-roster.css';

export type RosterSeat = {
  id: string;
  name: string;
  /** Current turn / focus actor only — not “waiting to act” crowds. */
  active?: boolean;
  /** Eliminated / out of round. */
  muted?: boolean;
  /** Solid danger chip when muted (e.g. "ตาย", "ตกรอบ"). */
  mutedLabel?: string;
  /** Will skip their next turn (e.g. Stocks). */
  skipped?: boolean;
  /** Seat index / order marker — rendered absolute top-right on the seat. */
  leading?: ReactNode;
  /** Plain string → solid Badge; ReactNode sits in solid status chip surface. */
  status?: ReactNode;
  /** Extra game-specific chips (turn / muted are built-in). */
  badges?: ReactNode;
  /** Right side of the seat header (e.g. token row). */
  trailing?: ReactNode;
  /** Seat-level right column (e.g. hand meter), outside the main text block. */
  aside?: ReactNode;
  extra?: ReactNode;
  className?: string;
  /** When set, the seat is activatable (click / Enter / Space). */
  onClick?: () => void;
  /** Optional override; defaults from room seat via PlayerAvatarProvider. */
  equippedNameplateId?: string | null;
  equippedTitleId?: string | null;
  equippedIconId?: string | null;
  equippedChipId?: string | null;
};

export type PlayerRosterStripProps = {
  seats: RosterSeat[];
  myId: string;
  ariaLabel?: string;
  className?: string;
  /** `row` wraps; `grid` is a looping center-active carousel. */
  layout?: 'row' | 'grid';
};

/** Embla disables loop unless slide content fills the viewport — duplicate seats. */
const LOOP_COPIES = 3;

type CarouselSlide = {
  seat: RosterSeat;
  key: string;
  logicalIndex: number;
};

function buildLoopSlides(seats: RosterSeat[]): CarouselSlide[] {
  if (seats.length === 0) return [];
  if (seats.length === 1) {
    return [{ seat: seats[0], key: seats[0].id, logicalIndex: 0 }];
  }
  return Array.from({ length: LOOP_COPIES }, (_, copy) =>
    seats.map((seat, logicalIndex) => ({
      seat,
      key: `${copy}:${seat.id}`,
      logicalIndex,
    })),
  ).flat();
}

/** Prefer middle copy for turn changes; nearest duplicate when returning from browse. */
function resolveActiveSnapIndex(
  emblaApi: EmblaCarouselType | undefined,
  logicalActive: number,
  seatCount: number,
  preferMiddle: boolean,
): number {
  if (logicalActive < 0 || seatCount <= 0) return -1;
  if (seatCount === 1) return 0;

  const candidates = Array.from(
    { length: LOOP_COPIES },
    (_, copy) => copy * seatCount + logicalActive,
  );

  if (preferMiddle || !emblaApi) {
    return candidates[Math.floor(LOOP_COPIES / 2)] ?? candidates[0];
  }

  const selected = emblaApi.selectedScrollSnap();
  return candidates.reduce((best, i) =>
    Math.abs(i - selected) < Math.abs(best - selected) ? i : best,
  );
}

function RosterSeatCard({ seat, myId }: { seat: RosterSeat; myId: string }) {
  const isMe = seat.id === myId;
  const isSkipped = Boolean(seat.skipped);
  const isActive = Boolean(seat.active);
  const mutedLabel = seat.muted && seat.mutedLabel ? seat.mutedLabel : null;
  const hasBuiltinBadges = isSkipped || isActive || mutedLabel != null;
  const interactive = typeof seat.onClick === 'function';
  const roomSeat = usePlayerAvatar(seat.id);
  const nameplateId = seat.equippedNameplateId ?? roomSeat?.equippedNameplateId;
  const titleId = seat.equippedTitleId ?? roomSeat?.equippedTitleId;
  const iconId = seat.equippedIconId ?? roomSeat?.equippedIconId;
  const chipId = seat.equippedChipId ?? roomSeat?.equippedChipId;
  const frame = nameplateFrameProps(nameplateId);
  const statusContent =
    seat.status == null ? null : typeof seat.status === 'string' ? (
      <Badge size="sm" variant="default" className="shrink-0">
        {seat.status}
      </Badge>
    ) : (
      seat.status
    );
  const statusIsBadge = typeof seat.status === 'string';
  const showChipRow = hasBuiltinBadges || seat.badges != null || statusContent != null;

  return (
    <article
      className={cn(
        'player-roster__seat relative flex min-w-0 flex-row items-center gap-3 overflow-hidden rounded-input border border-rule px-3.5 py-3.5 text-ink',
        seat.leading != null && 'pr-11',
        !frame.hasArt && 'bg-paper-3',
        frame.className,
        isMe && 'player-roster__seat--me',
        seat.active && 'player-roster__seat--active',
        seat.muted && 'player-roster__seat--muted',
        isSkipped && !seat.muted && 'player-roster__seat--skipped',
        interactive && 'player-roster__seat--interactive',
        seat.className,
      )}
      style={frame.style}
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
      <NameplateFrameVideo nameplateId={nameplateId} />
      {seat.leading != null ? (
        <div className="player-roster__leading absolute top-0 right-0 z-10">{seat.leading}</div>
      ) : null}
      <span className="relative z-1 size-12 shrink-0 self-center">
        <PlayerAvatar
          playerId={seat.id}
          name={seat.name}
          size={52}
          decorative
          className="size-12"
        />
        <PlayerAvatarIconBadge iconId={iconId} avatarSize={52} />
      </span>
      <div className="relative z-1 flex min-w-0 flex-1 flex-col gap-1">
        <header className="player-roster__header m-0 flex items-start justify-between gap-2">
          <div className="player-roster__name-row flex min-w-0 flex-nowrap items-end gap-1.5">
            <PlayerNameplate
              name={seat.name}
              nameplateId={nameplateId}
              titleId={titleId}
              chipId={chipId}
              surface="text"
              className="player-roster__name min-w-0 text-[0.95rem] font-semibold"
              nameClassName="truncate font-display font-bold text-ink"
            />
            {isMe ? (
              <Badge size="sm" variant="purple" className="player-roster__you shrink-0">
                คุณ
              </Badge>
            ) : null}
          </div>
          {seat.trailing != null ? <div className="shrink-0">{seat.trailing}</div> : null}
        </header>
        {showChipRow ? (
          <div className="player-roster__badges mt-1 flex flex-wrap items-center gap-1">
            {isSkipped ? (
              <Badge size="sm" variant="warning" className="shrink-0">
                ข้ามเทิร์น
              </Badge>
            ) : null}
            {isActive ? (
              <Badge size="sm" variant="accent" className="shrink-0">
                ตา
              </Badge>
            ) : null}
            {mutedLabel != null ? (
              <Badge size="sm" variant="danger" className="shrink-0">
                {mutedLabel}
              </Badge>
            ) : null}
            {seat.badges}
            {statusContent != null ? (
              statusIsBadge ? (
                statusContent
              ) : (
                <div className="player-roster__status">{statusContent}</div>
              )
            ) : null}
          </div>
        ) : null}
        {seat.extra != null ? <div className="mt-2">{seat.extra}</div> : null}
      </div>
      {seat.aside != null ? (
        <div className="relative z-1 shrink-0 self-center">{seat.aside}</div>
      ) : null}
    </article>
  );
}

function RosterCarousel({
  seats,
  myId,
  ariaLabel,
  className,
}: {
  seats: RosterSeat[];
  myId: string;
  ariaLabel: string;
  className?: string;
}) {
  const preferReducedMotion = Boolean(useReducedMotion());
  const logicalActive = useMemo(() => seats.findIndex((s) => s.active), [seats]);
  const slides = useMemo(() => buildLoopSlides(seats), [seats]);
  const canLoop = seats.length > 1;
  const wheelPlugins = useMemo(() => [WheelGesturesPlugin({ forceWheelAxis: 'x' })], []);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: canLoop,
      align: 'center',
      containScroll: false,
      skipSnaps: false,
      duration: preferReducedMotion ? 0 : 25,
    },
    // Vertical mouse wheel / trackpad pans the horizontal roster on desktop
    wheelPlugins,
  );

  const resolveReturnIndex = useCallback(
    () => resolveActiveSnapIndex(emblaApi, logicalActive, seats.length, false),
    [emblaApi, logicalActive, seats.length],
  );

  const { onPointerEnter, onPointerLeave } = useRosterCarouselIdleReturn(
    emblaApi,
    resolveReturnIndex,
    preferReducedMotion,
  );

  useEffect(() => {
    if (!emblaApi || logicalActive < 0) return;
    const target = resolveActiveSnapIndex(emblaApi, logicalActive, seats.length, true);
    if (target < 0) return;
    emblaApi.scrollTo(target, preferReducedMotion);
  }, [emblaApi, logicalActive, seats.length, preferReducedMotion]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
  }, [emblaApi, slides.length, canLoop]);

  return (
    <section
      className={cn('player-roster player-roster--grid min-w-0', className)}
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="player-roster__viewport" ref={emblaRef}>
        <div className="player-roster__seats player-roster__seats--carousel p-2">
          {slides.map(({ seat, key }) => (
            <div key={key} className="player-roster__slide">
              <RosterSeatCard seat={seat} myId={myId} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PlayerRosterStrip({
  seats,
  myId,
  ariaLabel = 'ผู้เล่น',
  className,
  layout = 'row',
}: PlayerRosterStripProps) {
  if (layout === 'grid') {
    return <RosterCarousel seats={seats} myId={myId} ariaLabel={ariaLabel} className={className} />;
  }

  return (
    <section
      className={cn('player-roster player-roster--row min-w-0', className)}
      aria-label={ariaLabel}
    >
      <div className="player-roster__seats p-2">
        {seats.map((seat) => (
          <RosterSeatCard key={seat.id} seat={seat} myId={myId} />
        ))}
      </div>
    </section>
  );
}
