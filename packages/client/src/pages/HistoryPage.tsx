/* Hallmark · macrostructure: Workbench (timeline ledger)
 * tone: warm retrospective · theme: Midnight · enrichment: none
 * nav: route-local back · footer: none
 * pre-emit critique: P4 H5 E4 S4 R5 V4
 */
import { useEffect, useMemo, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { GameMeta } from 'shared';
import { ArrowLeft, CalendarClock, History, Swords, Trophy } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import {
  fetchMyMatchHistoryPage,
  fetchMyMatchHistoryStats,
  MATCH_HISTORY_PAGE_SIZE,
  type MatchHistoryItem,
} from '../auth/matchHistoryApi';
import { getCatalogThumb } from '../gameCatalogDisplay';
import { Badge } from '../components/ui';
import { cn } from '../utils/cn';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function MatchCard({ item, game }: { item: MatchHistoryItem; game: GameMeta | undefined }) {
  const title = game?.name ?? item.game_id;
  const cover = game ? getCatalogThumb(game) : '';

  return (
    <article
      className={cn(
        'history-match grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-card border bg-paper-2 p-3',
        item.iWon ? 'border-pear/35' : 'border-rule',
      )}
    >
      <div
        className={cn(
          'relative size-14 shrink-0 overflow-hidden rounded-input border border-rule bg-paper-3',
          !cover && 'grid place-items-center',
        )}
        aria-hidden
      >
        {cover ? (
          <img src={cover} alt="" className="size-full object-cover" decoding="async" />
        ) : (
          <Swords size={20} className="text-ink-2" strokeWidth={1.75} />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="m-0 min-w-0 flex-1 truncate font-display text-base font-extrabold tracking-[-0.02em] text-ink">
            {title}
          </h2>
          <Badge variant={item.iWon ? 'success' : 'outline'} size="sm" className="shrink-0">
            {item.iWon ? (
              <>
                <Trophy size={12} aria-hidden />
                คุณชนะ
              </>
            ) : (
              'จบแมตช์'
            )}
          </Badge>
        </div>

        <p className="mt-1 mb-0 truncate text-xs leading-5 text-ink-2">
          <span className="inline-flex items-center gap-1 align-middle">
            <CalendarClock size={12} aria-hidden />
            {formatWhen(item.ended_at)}
          </span>
          <span className="mx-1.5 text-rule" aria-hidden>
            ·
          </span>
          <span className="font-label tracking-[0.03em]">ห้อง {item.room_code}</span>
          {item.result_reason ? (
            <>
              <span className="mx-1.5 text-rule" aria-hidden>
                ·
              </span>
              <span>{item.result_reason}</span>
            </>
          ) : null}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <ul className="m-0 flex min-w-0 list-none flex-wrap gap-1.5 p-0">
            {item.players.map((player, index) => (
              <li
                key={`${item.id}-${player.user_id ?? player.display_name}-${index}`}
                className={cn(
                  'max-w-40 truncate rounded-pill border px-2 py-0.5 text-[0.7rem] font-semibold',
                  player.is_winner
                    ? 'border-pear/40 bg-pear/10 text-pear'
                    : 'border-rule bg-paper-3 text-ink-2',
                )}
                title={player.display_name}
              >
                {player.display_name}
                {player.is_winner ? ' · ชนะ' : ''}
              </li>
            ))}
          </ul>
          <Link
            to={`/games/${item.game_id}/leaderboard`}
            className="ml-auto shrink-0 text-xs font-bold text-pear no-underline hover:underline"
          >
            อันดับเกม
          </Link>
        </div>
      </div>
    </article>
  );
}

export function HistoryPage() {
  const { configured, loading, user } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const gamesQuery = useQuery({
    queryKey: ['games-catalog'],
    queryFn: async () => {
      const res = await fetch(`${SERVER_URL}/api/games`);
      const list = (await res.json()) as GameMeta[];
      return Array.isArray(list) ? list : [];
    },
    staleTime: 5 * 60_000,
  });

  const statsQuery = useQuery({
    queryKey: ['match-history-stats', user?.id],
    queryFn: () => fetchMyMatchHistoryStats(user!.id),
    enabled: Boolean(user),
  });

  const historyQuery = useInfiniteQuery({
    queryKey: ['match-history', user?.id],
    queryFn: ({ pageParam }) => fetchMyMatchHistoryPage(user!.id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: Boolean(user),
  });

  const {
    data: historyData,
    isLoading: fetchingFirstPage,
    isFetchingNextPage: fetchingMore,
    hasNextPage: hasMore,
    fetchNextPage,
    isError: historyError,
  } = historyQuery;

  const gamesById = useMemo(
    () => new Map((gamesQuery.data ?? []).map((g) => [g.id, g])),
    [gamesQuery.data],
  );

  const items = useMemo(
    () => historyData?.pages.flatMap((page) => page.items) ?? [],
    [historyData],
  );

  const stats = useMemo(() => {
    const total = statsQuery.data?.total ?? 0;
    const wins = statsQuery.data?.wins ?? 0;
    const rate = total > 0 ? Math.round((wins / total) * 100) : 0;
    return { total, wins, rate };
  }, [statsQuery.data]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !user) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (!hasMore || fetchingMore) return;
        void fetchNextPage();
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [user, hasMore, fetchingMore, fetchNextPage]);

  if (!configured) return <Navigate to="/" replace />;
  if (loading) {
    return (
      <div className="page app-night-page">
        <p className="p-8 text-ink-2">กำลังโหลด…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="page app-night-page">
      <div className="mx-auto w-full max-w-shell px-4 pt-10 pb-24 sm:px-6 lg:px-16 lg:pt-16">
        <Link
          to="/"
          className="mb-6 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-ink-2 no-underline hover:text-ink"
        >
          <ArrowLeft size={20} aria-hidden />
          กลับหน้าแรก
        </Link>

        <header className="mb-8">
          <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
            บัญชีของคุณ
          </span>
          <h1 className="mt-3 mb-2 flex flex-wrap items-center gap-3 font-display text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-tight text-ink">
            <History size={28} className="text-pear" aria-hidden />
            ประวัติการเล่น
          </h1>
          <p className="m-0 max-w-[58ch] text-ink-2">
            แมตช์ที่บันทึกไว้เมื่อคุณเข้าสู่ระบบตอนจบเกม
          </p>
        </header>

        {!fetchingFirstPage && stats.total > 0 ? (
          <section className="mb-8 grid grid-cols-3 gap-3 sm:gap-4" aria-label="สรุปประวัติ">
            {[
              { label: 'แมตช์', value: String(stats.total) },
              { label: 'ชนะ', value: String(stats.wins) },
              { label: 'อัตราชนะ', value: `${stats.rate}%` },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-card border border-rule bg-paper-2 px-3 py-4 text-center sm:px-4"
              >
                <p className="m-0 font-label text-[0.7rem] font-bold tracking-[0.06em] text-ink-2 uppercase">
                  {stat.label}
                </p>
                <p className="mt-2 mb-0 font-display text-2xl font-extrabold tracking-tight text-ink tabular-nums sm:text-3xl">
                  {stat.value}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        {fetchingFirstPage ? (
          <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="กำลังโหลดประวัติ">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-card border border-rule bg-paper-2"
              />
            ))}
          </div>
        ) : null}

        {!fetchingFirstPage && items.length === 0 ? (
          <div className="rounded-card border border-dashed border-rule bg-paper-2 px-6 py-14 text-center">
            <History size={36} className="mx-auto text-ink-2" strokeWidth={1.5} aria-hidden />
            <p className="mt-4 mb-1 font-display text-lg font-extrabold text-ink">
              ยังไม่มีประวัติ
            </p>
            <p className="m-0 mx-auto max-w-[40ch] text-sm leading-6 text-ink-2">
              เล่นเกมให้จบขณะล็อกอินไว้ แล้วกลับมาดูแมตช์ของคุณที่นี่
            </p>
            <Link
              to="/games"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-input bg-pear px-5 text-sm font-bold text-accent-ink no-underline"
            >
              ไปชั้นเกม
            </Link>
          </div>
        ) : null}

        {items.length > 0 ? (
          <>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {items.map((item) => (
                <li key={item.id}>
                  <MatchCard item={item} game={gamesById.get(item.game_id)} />
                </li>
              ))}
            </ul>

            <div
              ref={loadMoreRef}
              className="mt-4 flex min-h-10 items-center justify-center"
              aria-hidden={!hasMore}
            >
              {fetchingMore ? (
                <p className="m-0 text-sm text-ink-2">กำลังโหลดเพิ่ม…</p>
              ) : hasMore ? (
                <p className="m-0 text-sm text-ink-2">เลื่อนเพื่อโหลดต่อ</p>
              ) : (
                <p className="m-0 text-sm text-ink-2">ครบทุกแมตช์แล้ว</p>
              )}
            </div>
          </>
        ) : null}

        {historyError ? (
          <p className="mt-4 text-sm text-error">โหลดประวัติไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง</p>
        ) : null}

        <p className="sr-only" aria-live="polite">
          แสดง {items.length} จาก {stats.total || items.length} แมตช์
          {hasMore ? ` (หน้าละประมาณ ${MATCH_HISTORY_PAGE_SIZE})` : ''}
        </p>
      </div>
    </div>
  );
}
