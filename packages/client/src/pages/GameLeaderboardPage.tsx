import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { GameMeta } from 'shared';
import { normalizePlayerAvatar } from 'shared';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { fetchGameLeaderboard, type LeaderboardEntry } from '../auth/leaderboardApi';
import { PlayerAvatar } from '../components/player-avatar';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function formatWinRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function GameLeaderboardPage() {
  const { gameId = '' } = useParams<{ gameId: string }>();
  const { configured } = useAuth();
  const [games, setGames] = useState<GameMeta[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [fetching, setFetching] = useState(false);

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

  return (
    <div className="page app-night-page">
      <div className="mx-auto w-full max-w-shell px-4 pt-10 pb-24 sm:px-6 lg:px-16 lg:pt-16">
        <Link
          to="/games"
          className="mb-6 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-ink-2 no-underline hover:text-ink"
        >
          <ArrowLeft size={20} aria-hidden />
          กลับชั้นเกม
        </Link>

        <header className="mb-8">
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
                {entries.map((entry, index) => (
                  <tr key={entry.userId} className="border-b border-rule/60 last:border-0">
                    <td className="px-4 py-3 font-label tabular-nums text-ink-2">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <PlayerAvatar
                          playerId={entry.userId}
                          name={entry.displayName}
                          avatar={normalizePlayerAvatar(entry.avatarConfig, entry.userId)}
                          size={36}
                          decorative
                        />
                        <div className="min-w-0">
                          <strong className="block truncate text-ink">{entry.displayName}</strong>
                          <code className="text-xs text-ink-2">{entry.handle}</code>
                        </div>
                      </div>
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
    </div>
  );
}
