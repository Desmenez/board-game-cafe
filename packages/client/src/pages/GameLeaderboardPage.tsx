import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { GameMeta } from 'shared';
import { normalizePlayerAvatar, normalizePlayerAvatarDisplay } from 'shared';
import { ArrowLeft, Pencil, Trophy } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { fetchGameLeaderboard, type LeaderboardEntry } from '../auth/leaderboardApi';
import {
  CosmeticSeat,
  PlayerAvatar,
  PlayerAvatarIconBadge,
  PlayerNameplate,
  NameplateFrameVideo,
  nameplateFrameProps,
} from '../components/player-avatar';
import {
  PlayerPublicProfileDialog,
  type PlayerPublicProfileIdentity,
  type ProfileAnchorRect,
} from '../components/profile/PlayerPublicProfileDialog';
import { Button } from '../components/ui';
import { cn } from '../utils/cn';
import { startLeaderboardPodiumCelebrationLoop } from '../utils/winCelebration';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

type PodiumRank = 1 | 2 | 3;

type RankedEntry = LeaderboardEntry & { rank: number };

/** Classic podium column order: silver · gold · bronze */
const PODIUM_ORDER: PodiumRank[] = [2, 1, 3];

function formatWinRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function sameStanding(a: LeaderboardEntry, b: LeaderboardEntry): boolean {
  return a.wins === b.wins && a.winRate === b.winRate && a.gamesPlayed === b.gamesPlayed;
}

/** Olympic / competition ranking: ties share a place; next place skips (1, 1, 3…). */
function withCompetitionRanks(entries: LeaderboardEntry[]): RankedEntry[] {
  const ranked: RankedEntry[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    if (i === 0) {
      ranked.push({ ...entry, rank: 1 });
      continue;
    }
    const prev = ranked[i - 1]!;
    if (sameStanding(prev, entry)) {
      ranked.push({ ...entry, rank: prev.rank });
    } else {
      ranked.push({ ...entry, rank: i + 1 });
    }
  }
  return ranked;
}

function entryToIdentity(entry: LeaderboardEntry): PlayerPublicProfileIdentity {
  return {
    playerId: entry.userId,
    userId: entry.userId,
    name: entry.displayName,
    handle: entry.handle,
    avatar: normalizePlayerAvatar(entry.avatarConfig, entry.userId),
    avatarUrl: entry.avatarUrl,
    avatarDisplay: normalizePlayerAvatarDisplay(entry.avatarDisplay),
    nameplateId: entry.equippedNameplateId,
    titleId: entry.equippedTitleId,
    iconId: entry.equippedIconId,
    chipId: entry.equippedChipId,
  };
}

function PodiumCard({
  entry,
  rank,
  tied,
  onSelect,
}: {
  entry: RankedEntry;
  rank: PodiumRank;
  tied: boolean;
  onSelect: (entry: RankedEntry, anchor: ProfileAnchorRect) => void;
}) {
  const avatarSize = rank === 1 && !tied ? 64 : 48;
  const frame = nameplateFrameProps(entry.equippedNameplateId);

  return (
    <button
      type="button"
      className={cn(
        'lb-podium__card relative overflow-hidden cursor-pointer text-left transition duration-150 ease-out motion-safe:hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        frame.className,
        frame.hasArt && 'lb-podium__card--has-plate',
      )}
      style={frame.style}
      aria-label={`ดูโปรไฟล์ ${entry.displayName}`}
      onClick={(e) => onSelect(entry, e.currentTarget.getBoundingClientRect())}
    >
      <NameplateFrameVideo nameplateId={entry.equippedNameplateId} />
      <Trophy
        className="lb-podium__trophy relative z-1"
        size={rank === 1 && !tied ? 28 : 20}
        aria-hidden
        strokeWidth={1.75}
      />
      <span className="lb-podium__rank relative z-1">
        {rank}
        {tied ? <span className="lb-podium__tie"> ร่วม</span> : null}
      </span>
      <span className="relative z-1 shrink-0">
        <PlayerAvatar
          playerId={entry.userId}
          name={entry.displayName}
          avatar={normalizePlayerAvatar(entry.avatarConfig, entry.userId)}
          avatarUrl={entry.avatarUrl}
          avatarDisplay={normalizePlayerAvatarDisplay(entry.avatarDisplay)}
          size={avatarSize}
          decorative
        />
        <PlayerAvatarIconBadge iconId={entry.equippedIconId} avatarSize={avatarSize} />
      </span>
      <div className="lb-podium__identity relative z-1">
        <PlayerNameplate
          name={entry.displayName}
          nameplateId={entry.equippedNameplateId}
          titleId={entry.equippedTitleId}
          chipId={entry.equippedChipId}
          surface="text"
          className="lb-podium__name mx-auto min-w-0"
          nameClassName="font-extrabold"
        />
      </div>
      <dl className="lb-podium__stats relative z-1">
        <div>
          <dt>ชนะ</dt>
          <dd>{entry.wins}</dd>
        </div>
        <div>
          <dt>แมตช์</dt>
          <dd>{entry.gamesPlayed}</dd>
        </div>
        <div>
          <dt>อัตรา</dt>
          <dd>{formatWinRate(entry.winRate)}</dd>
        </div>
      </dl>
    </button>
  );
}

export function GameLeaderboardPage() {
  const { gameId = '' } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { configured, user } = useAuth();
  const [games, setGames] = useState<GameMeta[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [fetching, setFetching] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<LeaderboardEntry | null>(null);
  const [viewingAnchor, setViewingAnchor] = useState<ProfileAnchorRect | null>(null);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/games`)
      .then((r) => r.json())
      .then((list: GameMeta[]) => setGames(Array.isArray(list) ? list : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!gameId || !configured) {
      setEntries([]);
      return;
    }
    setFetching(true);
    void fetchGameLeaderboard(gameId)
      .then(setEntries)
      .finally(() => setFetching(false));
  }, [gameId, configured]);

  const game = useMemo(() => games.find((g) => g.id === gameId), [games, gameId]);
  const title = game?.name ?? gameId;
  const coverUrl = game?.thumbnail?.trim() || '';

  const ranked = useMemo(() => withCompetitionRanks(entries), [entries]);
  const podiumGroups = useMemo(() => {
    const byRank = new Map<PodiumRank, RankedEntry[]>();
    for (const entry of ranked) {
      if (entry.rank !== 1 && entry.rank !== 2 && entry.rank !== 3) continue;
      const medal = entry.rank as PodiumRank;
      const list = byRank.get(medal) ?? [];
      list.push(entry);
      byRank.set(medal, list);
    }
    return PODIUM_ORDER.flatMap((rank) => {
      const group = byRank.get(rank);
      return group?.length ? [{ rank, entries: group }] : [];
    });
  }, [ranked]);
  const rest = useMemo(() => ranked.filter((e) => e.rank > 3), [ranked]);
  const tiedRankNumbers = useMemo(() => {
    const counts = new Map<number, number>();
    for (const entry of ranked) {
      counts.set(entry.rank, (counts.get(entry.rank) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([r]) => r));
  }, [ranked]);

  useEffect(() => {
    if (entries.length === 0) return undefined;
    return startLeaderboardPodiumCelebrationLoop();
  }, [entries.length]);

  const openProfile = (entry: LeaderboardEntry, anchor: ProfileAnchorRect) => {
    setViewingEntry(entry);
    setViewingAnchor(anchor);
  };

  const closeProfile = () => {
    setViewingEntry(null);
    setViewingAnchor(null);
  };

  const viewingIsMe = Boolean(user && viewingEntry && user.id === viewingEntry.userId);

  return (
    <div className={`page app-night-page lb-page${coverUrl ? ' lb-page--has-cover' : ''}`}>
      {coverUrl ? (
        <div className="lb-page__backdrop" aria-hidden>
          <img className="lb-page__cover" src={coverUrl} alt="" decoding="async" />
          <div className="lb-page__scrim" />
        </div>
      ) : null}

      <div className="lb-shell relative z-10 mx-auto w-full max-w-shell px-4 pt-10 pb-24 sm:px-6 lg:px-16 lg:pt-16">
        <Link
          to="/games"
          className="mb-6 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-ink-2 no-underline hover:text-ink"
        >
          <ArrowLeft size={20} aria-hidden />
          กลับชั้นเกม
        </Link>

        <header className="lb-hero mb-8">
          <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
            อันดับผู้เล่น
          </span>
          <h1 className="mt-3 mb-2 flex flex-wrap items-center gap-3 font-display text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-tight text-ink">
            <Trophy size={28} className="text-pear" aria-hidden />
            {title}
          </h1>
          <p className="m-0 max-w-[58ch] text-ink-2">
            นับเฉพาะบัญชีที่ล็อกอินตอนจบเกม และเปิดแสดงบน leaderboard ในโปรไฟล์ — guest
            ไม่ขึ้นกระดาน
          </p>
        </header>

        {!configured ? (
          <p className="text-ink-2">
            ยังไม่ได้ตั้งค่า Supabase — leaderboard ใช้ไม่ได้ในโหมด guest-only
          </p>
        ) : null}

        {configured && fetching ? <p className="text-ink-2">กำลังโหลดอันดับ…</p> : null}

        {configured && !fetching && entries.length === 0 ? (
          <p className="text-ink-2">ยังไม่มีสถิติสำหรับเกมนี้ — เล่นให้จบขณะล็อกอินแล้วกลับมาดู</p>
        ) : null}

        {entries.length > 0 ? (
          <div className="lb-board">
            <div className="lb-podium" role="list" aria-label="อันดับ 1 ถึง 3">
              {podiumGroups.map(({ rank, entries: group }) => {
                const tied = group.length > 1;
                return (
                  <div
                    key={rank}
                    className={`lb-podium__slot lb-podium__slot--${rank}${tied ? ' lb-podium__slot--tied' : ''}`}
                    role="listitem"
                    aria-label={
                      tied
                        ? `อันดับ ${rank} ร่วม ${group.map((e) => e.displayName).join(', ')}`
                        : `อันดับ ${rank} ${group[0]!.displayName}`
                    }
                  >
                    <div className="lb-podium__stack">
                      {group.map((entry) => (
                        <PodiumCard
                          key={entry.userId}
                          entry={entry}
                          rank={rank}
                          tied={tied}
                          onSelect={openProfile}
                        />
                      ))}
                    </div>
                    <div className="lb-podium__pedestal" aria-hidden />
                  </div>
                );
              })}
            </div>

            {rest.length > 0 ? (
              <div className="overflow-x-auto rounded-card border border-rule bg-paper-2">
                <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-rule font-label text-xs tracking-wide text-ink-2">
                      <th className="px-4 py-3 font-bold">#</th>
                      <th className="px-4 py-3 font-bold">ผู้เล่น</th>
                      <th className="px-4 py-3 font-bold tabular-nums">ชนะ</th>
                      <th className="px-4 py-3 font-bold tabular-nums">แมตช์</th>
                      <th className="px-4 py-3 font-bold tabular-nums">อัตราชนะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((entry) => (
                      <tr key={entry.userId} className="border-b border-rule/60 last:border-0">
                        <td className="px-4 py-3 font-label tabular-nums text-ink-2">
                          {entry.rank}
                          {tiedRankNumbers.has(entry.rank) ? (
                            <span className="ml-1 text-[0.65rem] font-bold tracking-wide text-ink-2">
                              ร่วม
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <CosmeticSeat
                            playerId={entry.userId}
                            name={entry.displayName}
                            avatar={normalizePlayerAvatar(entry.avatarConfig, entry.userId)}
                            avatarUrl={entry.avatarUrl}
                            avatarDisplay={normalizePlayerAvatarDisplay(entry.avatarDisplay)}
                            nameplateId={entry.equippedNameplateId}
                            titleId={entry.equippedTitleId}
                            iconId={entry.equippedIconId}
                            chipId={entry.equippedChipId}
                            avatarSize={36}
                            emptyBg="transparent"
                            className="cursor-pointer border-0 px-2 py-1.5 transition hover:border-pear/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                            role="button"
                            tabIndex={0}
                            aria-label={`ดูโปรไฟล์ ${entry.displayName}`}
                            onClick={(e) =>
                              openProfile(entry, e.currentTarget.getBoundingClientRect())
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openProfile(entry, e.currentTarget.getBoundingClientRect());
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 tabular-nums font-bold text-ink">{entry.wins}</td>
                        <td className="px-4 py-3 tabular-nums text-ink-2">{entry.gamesPlayed}</td>
                        <td className="px-4 py-3 tabular-nums text-ink-2">
                          {formatWinRate(entry.winRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <PlayerPublicProfileDialog
        open={viewingEntry != null}
        onOpenChange={(next) => {
          if (!next) closeProfile();
        }}
        anchorRect={viewingAnchor}
        identity={viewingEntry ? entryToIdentity(viewingEntry) : null}
        footer={
          viewingEntry ? (
            <>
              {viewingIsMe ? (
                <Button
                  type="button"
                  block
                  onClick={() => {
                    closeProfile();
                    navigate('/profile');
                  }}
                >
                  <Pencil size={16} aria-hidden />
                  แก้ไขโปรไฟล์
                </Button>
              ) : null}
              <Button type="button" variant="secondary" block onClick={closeProfile}>
                ปิด
              </Button>
            </>
          ) : null
        }
      />
    </div>
  );
}
