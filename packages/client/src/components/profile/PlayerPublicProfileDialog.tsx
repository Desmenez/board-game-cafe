import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getChipDef,
  getIconDef,
  getTitleDef,
  normalizeChipId,
  normalizeIconId,
  normalizeNameplateId,
  normalizePlayerAvatar,
  normalizePlayerAvatarDisplay,
  normalizeTitleId,
  type GameMeta,
  type PlayerAvatarConfig,
  type PlayerAvatarDisplay,
} from 'shared';
import { Swords, Trophy, WifiOff } from 'lucide-react';
import { PlayerAvatar } from '../player-avatar/PlayerAvatar';
import { NameplateFrameVideo } from '../player-avatar/NameplateFrameVideo';
import { nameplateFrameProps } from '../player-avatar/nameplateFrame';
import { chipBackgroundStyle } from '../player-avatar/chipStyle';
import { fetchPublicAchievementUnlocks, fetchPublicProfile } from '../../auth/profileApi';
import { fetchMyMatchHistoryPage } from '../../auth/matchHistoryApi';
import { getCatalogThumb, getGameCoverById } from '../../gameCatalogDisplay';
import { cn } from '../../utils/cn';
import { useBreakpoint } from '../../hooks/useResponsiveSize';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { pickBadgeIconIds } from './pickBadgeIconIds';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const PANEL_WIDTH_PX = 352;
const VIEWPORT_PAD = 12;
const ANCHOR_GAP = 12;
const DISMISS_DRAG_PX = 120;
const DISMISS_VELOCITY = 0.55; // px / ms
const RECENT_MATCH_LIMIT = 1;

function formatMatchWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatGameLabel(gameId: string, game: GameMeta | undefined): string {
  return game?.name ?? gameId.replace(/-/g, ' ');
}

type ProfileHeaderView = {
  name: string;
  handle: string | null;
  avatar: PlayerAvatarConfig;
  avatarUrl: string | null;
  avatarDisplay: PlayerAvatarDisplay;
  nameplateId: string;
  titleId: string;
  iconId: string;
  chipId: string;
};

function seedHeaderFromIdentity(identity: PlayerPublicProfileIdentity): ProfileHeaderView {
  const seedId = identity.userId ?? identity.playerId;
  return {
    name: identity.name.trim() || 'ผู้เล่น',
    handle: identity.handle?.trim() ? identity.handle.trim().toUpperCase() : null,
    avatar: normalizePlayerAvatar(identity.avatar, seedId),
    avatarUrl: identity.avatarUrl ?? null,
    avatarDisplay: normalizePlayerAvatarDisplay(identity.avatarDisplay),
    nameplateId: normalizeNameplateId(identity.nameplateId),
    titleId: normalizeTitleId(identity.titleId),
    iconId: normalizeIconId(identity.iconId),
    chipId: normalizeChipId(identity.chipId),
  };
}
export type ProfileAnchorRect = Pick<
  DOMRect,
  'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'
>;

export interface PlayerPublicProfileIdentity {
  playerId: string;
  name: string;
  avatar?: PlayerAvatarConfig | null;
  avatarUrl?: string | null;
  avatarDisplay?: PlayerAvatarDisplay | null;
  nameplateId?: string | null;
  titleId?: string | null;
  iconId?: string | null;
  chipId?: string | null;
  /** Friend code / handle without `@`. */
  handle?: string | null;
  /** Auth user id when different from seat `playerId` (lobby). */
  userId?: string | null;
}

export interface PlayerPublicProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identity: PlayerPublicProfileIdentity | null;
  /** Bounding box of the clicked seat / row — desktop popover anchors here. */
  anchorRect?: ProfileAnchorRect | null;
  status?: 'online' | 'offline' | null;
  footer?: ReactNode;
}

function placeDesktopPanel(
  anchor: ProfileAnchorRect,
  panelHeight: number,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceRight = vw - anchor.right - ANCHOR_GAP - VIEWPORT_PAD;
  const spaceLeft = anchor.left - ANCHOR_GAP - VIEWPORT_PAD;

  let left: number;
  if (spaceRight >= PANEL_WIDTH_PX) {
    left = anchor.right + ANCHOR_GAP;
  } else if (spaceLeft >= PANEL_WIDTH_PX) {
    left = anchor.left - ANCHOR_GAP - PANEL_WIDTH_PX;
  } else if (spaceRight >= spaceLeft) {
    left = Math.max(VIEWPORT_PAD, vw - VIEWPORT_PAD - PANEL_WIDTH_PX);
  } else {
    left = VIEWPORT_PAD;
  }

  let top = anchor.top;
  const maxTop = vh - VIEWPORT_PAD - Math.min(panelHeight, vh - VIEWPORT_PAD * 2);
  if (top > maxTop) top = Math.max(VIEWPORT_PAD, maxTop);
  if (top < VIEWPORT_PAD) top = VIEWPORT_PAD;

  return { top, left };
}

export function PlayerPublicProfileDialog({
  open,
  onOpenChange,
  identity,
  anchorRect = null,
  status = null,
  footer,
}: PlayerPublicProfileDialogProps) {
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint !== 'base' && breakpoint !== 'sm';
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const dragSessionRef = useRef<{
    pointerId: number;
    startY: number;
    startTime: number;
    mode: 'undecided' | 'drag' | 'scroll';
  } | null>(null);
  const [entered, setEntered] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [desktopPos, setDesktopPos] = useState<{ top: number; left: number } | null>(null);

  const identityKey = open && identity ? (identity.userId ?? identity.playerId) : null;
  const seededHeader = useMemo(
    () => (open && identity ? seedHeaderFromIdentity(identity) : null),
    [open, identity],
  );
  const [headerOverride, setHeaderOverride] = useState<ProfileHeaderView | null>(null);
  const [overrideKey, setOverrideKey] = useState<string | null>(null);
  const [badgeIconIds, setBadgeIconIds] = useState<string[]>([]);
  const [badgesKey, setBadgesKey] = useState<string | null>(null);

  const header =
    seededHeader && overrideKey === identityKey && headerOverride ? headerOverride : seededHeader;
  const badgeIcons = badgesKey === identityKey ? badgeIconIds : [];
  const badgesPending = Boolean(identityKey) && badgesKey !== identityKey;

  const historyUserId =
    open && identity
      ? identity.userId?.trim() || (identity.handle ? identity.playerId : null)
      : null;

  const gamesQuery = useQuery({
    queryKey: ['games-catalog'],
    queryFn: async () => {
      const res = await fetch(`${SERVER_URL}/api/games`);
      const list = (await res.json()) as GameMeta[];
      return Array.isArray(list) ? list : [];
    },
    staleTime: 5 * 60_000,
    enabled: open,
  });

  const recentMatchQuery = useQuery({
    queryKey: ['public-recent-match', historyUserId],
    queryFn: async () => {
      const page = await fetchMyMatchHistoryPage(historyUserId!, 0, RECENT_MATCH_LIMIT);
      return page.items[0] ?? null;
    },
    enabled: Boolean(historyUserId),
    staleTime: 60_000,
  });

  const gamesById = useMemo(() => {
    const map = new Map<string, GameMeta>();
    for (const game of gamesQuery.data ?? []) map.set(game.id, game);
    return map;
  }, [gamesQuery.data]);

  const recentMatch = recentMatchQuery.data ?? null;
  /** Pending only when there is no cached row yet — avoids empty→skeleton flash. */
  const matchSlotPending = Boolean(historyUserId) && recentMatchQuery.isPending;

  useEffect(() => {
    if (!open || !identity || !identityKey) {
      setHeaderOverride(null);
      setOverrideKey(null);
      setBadgeIconIds([]);
      setBadgesKey(null);
      return;
    }

    const profileUserId = identity.userId?.trim() || null;
    const fetchUserId = profileUserId || (identity.handle ? identity.playerId : null);
    if (!fetchUserId) {
      setBadgesKey(identityKey);
      setBadgeIconIds([]);
      return;
    }

    let cancelled = false;
    void Promise.all([
      profileUserId && !identity.handle ? fetchPublicProfile(fetchUserId) : Promise.resolve(null),
      fetchPublicAchievementUnlocks(fetchUserId),
    ]).then(([profile, unlocks]) => {
      if (cancelled) return;
      if (profile) {
        setHeaderOverride({
          name: profile.display_name.trim() || identity.name.trim() || 'ผู้เล่น',
          handle: profile.handle,
          avatar: normalizePlayerAvatar(profile.avatar_config, profile.id),
          avatarUrl: profile.avatar_url ?? null,
          avatarDisplay: normalizePlayerAvatarDisplay(profile.avatar_display),
          nameplateId: normalizeNameplateId(profile.equipped_nameplate_id),
          titleId: normalizeTitleId(profile.equipped_title_id),
          iconId: normalizeIconId(profile.equipped_icon_id),
          chipId: normalizeChipId(profile.equipped_chip_id),
        });
        setOverrideKey(identityKey);
        setBadgeIconIds(pickBadgeIconIds(unlocks, profile.equipped_icon_id ?? identity.iconId));
      } else {
        setBadgeIconIds(pickBadgeIconIds(unlocks, identity.iconId));
      }
      setBadgesKey(identityKey);
    });

    return () => {
      cancelled = true;
    };
  }, [open, identity, identityKey]);

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      setDesktopPos(null);
      setDragY(0);
      setDragging(false);
      dragSessionRef.current = null;
      return;
    }
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);

    const enterId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setEntered(true));
    });

    return () => {
      window.cancelAnimationFrame(enterId);
      document.removeEventListener('keydown', onKey);
      restoreFocusRef.current?.focus();
    };
  }, [open, onOpenChange]);

  useLayoutEffect(() => {
    if (!open || !isDesktop || !anchorRect) {
      if (open && isDesktop && !anchorRect) {
        setDesktopPos({
          top: VIEWPORT_PAD,
          left: Math.max(VIEWPORT_PAD, window.innerWidth - PANEL_WIDTH_PX - VIEWPORT_PAD),
        });
      }
      return;
    }
    const height = panelRef.current?.offsetHeight ?? 420;
    setDesktopPos(placeDesktopPanel(anchorRect, height));
    // Anchor once per open / target — do not re-place when async rows load (avoids jump).
  }, [open, isDesktop, anchorRect, identityKey, footer]);

  useEffect(() => {
    if (!open || !isDesktop || !anchorRect) return;
    const onResize = () => {
      const height = panelRef.current?.offsetHeight ?? 420;
      setDesktopPos(placeDesktopPanel(anchorRect, height));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, isDesktop, anchorRect]);

  if (!open || !identity || !header) return null;

  const frame = nameplateFrameProps(header.nameplateId);
  const titleDef = getTitleDef(header.titleId);
  const chipDef = getChipDef(normalizeChipId(header.chipId));
  const label = header.name;
  const avatarPlayerId = identity.userId ?? identity.playerId;
  const showRecentMatches = Boolean(historyUserId);
  const showCosmeticsRow = Boolean(identityKey);
  const matchGame = recentMatch ? gamesById.get(recentMatch.game_id) : undefined;
  const matchCover = recentMatch
    ? (matchGame ? getCatalogThumb(matchGame) : '') || getGameCoverById(recentMatch.game_id)
    : '';

  const endMobileDrag = (clientY: number) => {
    const session = dragSessionRef.current;
    dragSessionRef.current = null;
    if (!session || session.mode !== 'drag') {
      setDragging(false);
      setDragY(0);
      return;
    }
    const dy = Math.max(0, clientY - session.startY);
    const elapsed = Math.max(1, performance.now() - session.startTime);
    const velocity = dy / elapsed;
    setDragging(false);
    if (dy >= DISMISS_DRAG_PX || velocity >= DISMISS_VELOCITY) {
      onOpenChange(false);
      return;
    }
    setDragY(0);
  };

  const onPanelPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isDesktop || e.button !== 0) return;
    dragSessionRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startTime: performance.now(),
      mode: 'undecided',
    };
  };

  const onPanelPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;

    const dy = e.clientY - session.startY;
    if (session.mode === 'undecided') {
      if (Math.abs(dy) < 10) return;
      const atTop = (bodyRef.current?.scrollTop ?? 0) <= 0;
      if (dy > 0 && atTop) {
        session.mode = 'drag';
        setDragging(true);
        try {
          panelRef.current?.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      } else {
        session.mode = 'scroll';
        return;
      }
    }
    if (session.mode !== 'drag') return;
    e.preventDefault();
    setDragY(Math.max(0, dy));
  };

  const onPanelPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    endMobileDrag(e.clientY);
  };

  const onPanelPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    dragSessionRef.current = null;
    setDragging(false);
    setDragY(0);
  };

  const backdropOpacity = entered ? Math.max(0, 1 - dragY / 280) : 0;

  const mobileTransform = entered ? `translateY(${dragY}px)` : 'translateY(105%)';

  return createPortal(
    <div
      className={cn(
        'public-profile-layer',
        isDesktop ? 'public-profile-layer--desktop' : 'public-profile-layer--mobile',
        entered && 'public-profile-layer--open',
      )}
      role="presentation"
    >
      <button
        type="button"
        className="public-profile-layer__backdrop"
        aria-label="ปิดโปรไฟล์"
        style={{ opacity: backdropOpacity }}
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={panelRef}
        className={cn(
          'public-profile-dialog room-night-dialog overflow-hidden border border-rule p-0!',
          isDesktop ? 'public-profile-dialog--desktop' : 'public-profile-dialog--mobile',
          dragging && 'public-profile-dialog--dragging',
        )}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby="public-profile-title"
        aria-describedby="public-profile-desc"
        style={
          isDesktop && desktopPos
            ? {
                top: desktopPos.top,
                left: desktopPos.left,
                width: PANEL_WIDTH_PX,
                maxHeight: `calc(100dvh - ${VIEWPORT_PAD * 2}px)`,
              }
            : !isDesktop
              ? {
                  transform: mobileTransform,
                  transition: dragging ? 'none' : undefined,
                }
              : undefined
        }
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={onPanelPointerDown}
        onPointerMove={onPanelPointerMove}
        onPointerUp={onPanelPointerUp}
        onPointerCancel={onPanelPointerCancel}
      >
        <div
          className={cn(
            'public-profile-dialog__shell relative overflow-hidden rounded-[inherit]',
            frame.className,
            frame.hasArt && 'public-profile-dialog__shell--has-plate',
          )}
          style={frame.style}
        >
          <NameplateFrameVideo nameplateId={header.nameplateId} />
          <div className="public-profile-dialog__scrim" aria-hidden />

          <div
            ref={bodyRef}
            className="public-profile-dialog__body relative z-2 max-h-[inherit] overflow-y-auto overscroll-contain px-4 pt-20 pb-4"
          >
            {!isDesktop ? (
              <div
                className="public-profile-dialog__grab absolute inset-x-0 top-0 z-3 flex h-11 cursor-grab items-start justify-center pt-2.5 active:cursor-grabbing"
                aria-hidden
              >
                <div className="public-profile-dialog__handle-bar" />
              </div>
            ) : null}
            <div className="-mt-10 mb-3 flex h-20 items-end gap-3">
              <span className="relative size-20 shrink-0 overflow-hidden rounded-[1.15rem] border-[3px] border-[color-mix(in_oklch,var(--color-paper-2)_75%,transparent)] bg-paper-2 shadow-sm">
                <PlayerAvatar
                  playerId={avatarPlayerId}
                  name={label}
                  avatar={header.avatar}
                  avatarUrl={header.avatarUrl}
                  avatarDisplay={header.avatarDisplay}
                  size={80}
                  decorative
                  className="size-full rounded-none! border-0!"
                />
                {status === 'offline' ? (
                  <span
                    className="absolute right-0.5 bottom-0.5 z-2 grid size-5 place-items-center rounded-full border-2 border-paper-2 bg-paper-3 text-[#a78bfa]"
                    title="ออฟไลน์"
                  >
                    <WifiOff size={10} strokeWidth={2.5} aria-hidden />
                  </span>
                ) : status === 'online' ? (
                  <span
                    className="absolute right-0.5 bottom-0.5 z-2 size-4 rounded-full border-2 border-paper-2 bg-success"
                    title="ออนไลน์"
                    aria-hidden
                  />
                ) : null}
              </span>
            </div>

            <h2
              id="public-profile-title"
              className="public-profile-dialog__name m-0 min-h-8 font-display text-2xl leading-8 font-extrabold tracking-[-0.03em] text-ink"
            >
              <span
                className={cn(
                  'player-nameplate__label',
                  chipDef &&
                    `player-nameplate__label--chip player-nameplate__label--chip-${chipDef.theme}`,
                )}
                style={chipBackgroundStyle(chipDef)}
              >
                {label}
              </span>
            </h2>
            <p
              id="public-profile-desc"
              className="public-profile-dialog__handle mt-1 mb-0 flex min-h-5 flex-wrap items-center gap-2 text-sm leading-5 text-ink-2"
            >
              {header.handle ? (
                <span className="font-mono tracking-wide">@{header.handle}</span>
              ) : (
                <span className="invisible font-mono tracking-wide" aria-hidden>
                  @XXXXXX
                </span>
              )}
            </p>

            {showCosmeticsRow ? (
              <div className="mt-3 flex h-7 items-center gap-2 overflow-hidden">
                {titleDef ? (
                  <span className="inline-flex h-6 max-w-full shrink-0 items-center truncate rounded-pill border border-rule bg-paper-3/70 px-2.5 text-xs font-semibold text-ink backdrop-blur-sm">
                    {titleDef.label}
                  </span>
                ) : null}
                {!badgesPending
                  ? badgeIcons.map((id) => {
                      const def = getIconDef(id);
                      if (!def) return null;
                      return (
                        <img
                          key={id}
                          src={def.imageUrl}
                          alt={def.label}
                          title={def.label}
                          width={28}
                          height={28}
                          className="size-7 shrink-0 object-contain drop-shadow-sm"
                          draggable={false}
                        />
                      );
                    })
                  : null}
              </div>
            ) : null}

            {showRecentMatches ? (
              <section
                className="public-profile-dialog__recent mt-4"
                aria-labelledby="public-profile-recent-heading"
              >
                <h3
                  id="public-profile-recent-heading"
                  className="public-profile-dialog__recent-title m-0 mb-2 font-label text-[0.7rem] font-bold tracking-[0.08em] text-ink-2 uppercase"
                >
                  ประวัติการเล่นล่าสุด
                </h3>
                <div className="min-h-11">
                  {matchSlotPending ? (
                    <div
                      className="h-11 animate-pulse rounded-input border border-rule/60 bg-paper-3/40"
                      aria-busy="true"
                    />
                  ) : recentMatch == null ? (
                    <p className="m-0 flex h-11 items-center rounded-input border border-rule/70 bg-paper-3/45 px-3 text-xs leading-5 text-ink-2">
                      ยังไม่มีประวัติการเล่น
                    </p>
                  ) : (
                    <div
                      className={cn(
                        'grid h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-input border px-2',
                        recentMatch.iWon
                          ? 'border-pear/35 bg-pear/8'
                          : 'border-rule/80 bg-paper-3/50',
                      )}
                    >
                      <span
                        className={cn(
                          'relative size-8 shrink-0 overflow-hidden rounded-md border border-rule bg-paper-2',
                          !matchCover && 'grid place-items-center',
                        )}
                        aria-hidden
                      >
                        {matchCover ? (
                          <img
                            src={matchCover}
                            alt=""
                            className="size-full object-cover"
                            decoding="async"
                            draggable={false}
                          />
                        ) : (
                          <Swords size={14} className="text-ink-2" strokeWidth={1.75} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="m-0 truncate text-xs font-bold text-ink">
                          {formatGameLabel(recentMatch.game_id, matchGame)}
                        </p>
                        <p className="m-0 truncate text-[0.65rem] leading-4 text-ink-2">
                          {formatMatchWhen(recentMatch.ended_at)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-0.5 rounded-pill border px-1.5 py-0.5 text-[0.65rem] font-semibold',
                          recentMatch.iWon
                            ? 'border-pear/40 bg-pear/15 text-pear'
                            : 'border-rule bg-paper-2/70 text-ink-2',
                        )}
                      >
                        {recentMatch.iWon ? (
                          <>
                            <Trophy size={10} aria-hidden />
                            ชนะ
                          </>
                        ) : (
                          'จบ'
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {footer != null ? <div className="mt-4 flex flex-col gap-2">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
