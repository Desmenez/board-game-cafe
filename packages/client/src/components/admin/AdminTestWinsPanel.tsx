import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FRIEND_CODE_LENGTH, getFriendCodeValidationError, normalizeFriendCode } from 'shared';
import { Trophy, Eraser, Search } from 'lucide-react';
import { Button, Input } from '../ui';
import { ADMIN_TEST_DEFAULT_HANDLE, getClientAdminSecret } from '../../constants/admin';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface AdminTestTrackStep {
  achievementId: string;
  title: string;
  count: number;
  unlocked: boolean;
}

interface AdminTestGameSummary {
  gameId: string;
  gameName: string;
  wins: number;
  testWins: number;
  track: AdminTestTrackStep[];
}

interface AdminTestWinSummary {
  profile: { id: string; handle: string; displayName: string };
  totalWins: number;
  unlockedAchievementIds: string[];
  games: AdminTestGameSummary[];
}

function adminHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Secret': getClientAdminSecret(),
  };
}

async function readError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({}));
  return (err as { error?: string }).error ?? res.statusText;
}

export function AdminTestWinsPanel() {
  const [handleInput, setHandleInput] = useState(ADMIN_TEST_DEFAULT_HANDLE);
  const [summary, setSummary] = useState<AdminTestWinSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyGameId, setBusyGameId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const loadSummary = useCallback(async (rawHandle: string) => {
    const validationError = getFriendCodeValidationError(rawHandle);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const handle = normalizeFriendCode(rawHandle);
    setLoading(true);
    try {
      const res = await fetch(
        `${SERVER_URL}/api/admin/test-wins?handle=${encodeURIComponent(handle)}`,
        { headers: adminHeaders() },
      );
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as AdminTestWinSummary;
      setSummary(data);
      setHandleInput(data.profile.handle);
    } catch (e) {
      setSummary(null);
      toast.error(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary(ADMIN_TEST_DEFAULT_HANDLE);
  }, [loadSummary]);

  const handleAddWin = async (gameId: string, gameName: string) => {
    if (!summary) return;
    setBusyGameId(gameId);
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/test-wins`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ handle: summary.profile.handle, gameId }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as {
        summary: AdminTestWinSummary;
        newlyGranted: { id: string; title: string }[];
      };
      setSummary(data.summary);
      if (data.newlyGranted.length > 0) {
        toast.success(
          `+1 ชนะ ${gameName} — ปลดล็อก: ${data.newlyGranted.map((a) => a.title).join(', ')}`,
        );
      } else {
        const wins = data.summary.games.find((g) => g.gameId === gameId)?.wins ?? '?';
        toast.success(`+1 ชนะ ${gameName} (ชนะรวม ${wins})`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'เพิ่มชนะไม่สำเร็จ');
    } finally {
      setBusyGameId(null);
    }
  };

  const handleReset = async () => {
    if (!summary) return;
    if (
      !window.confirm(
        `ล้างแมตช์ทดสอบและ unlocks ที่หมดสิทธิ์ของ ${summary.profile.handle} (${summary.profile.displayName})?`,
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(
        `${SERVER_URL}/api/admin/test-wins?handle=${encodeURIComponent(summary.profile.handle)}`,
        { method: 'DELETE', headers: adminHeaders() },
      );
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as {
        removedMatches: number;
        revokedAchievements: string[];
        summary: AdminTestWinSummary;
      };
      setSummary(data.summary);
      toast.success(
        `ล้างแล้ว — ลบ ${data.removedMatches} แมตช์, ถอน ${data.revokedAchievements.length} unlock`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ล้างไม่สำเร็จ');
    } finally {
      setResetting(false);
    }
  };

  const busy = loading || busyGameId !== null || resetting;
  const totalTestWins = summary?.games.reduce((n, g) => n + g.testWins, 0) ?? 0;

  return (
    <section className="mt-14" aria-labelledby="admin-test-wins-heading">
      <header className="mb-6">
        <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
          Achievement QA
        </span>
        <h2
          id="admin-test-wins-heading"
          className="mt-3 mb-2 font-display text-xl font-extrabold tracking-[-0.04em] text-ink md:text-2xl"
        >
          เพิ่มชนะทดสอบ
        </h2>
        <p className="max-w-[58ch] leading-7 text-ink-2">
          ใส่รหัสเพื่อนแล้วกด +1 ชนะทีละเกมที่มี achievement track — จะสร้างแมตช์สังเคราะห์
          (room <span className="font-label">ADMIN-TEST</span>) และรัน grant จริงทันที
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            label="รหัสเพื่อน"
            size="md"
            value={handleInput}
            maxLength={FRIEND_CODE_LENGTH}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy}
            onChange={(e) => setHandleInput(normalizeFriendCode(e.target.value).slice(0, FRIEND_CODE_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void loadSummary(handleInput);
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={() => void loadSummary(handleInput)}
        >
          <Search size={16} aria-hidden />
          {loading ? 'กำลังโหลด…' : 'ค้นหา'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
          disabled={busy || !summary || totalTestWins === 0}
          onClick={() => void handleReset()}
        >
          <Eraser size={16} aria-hidden />
          {resetting ? 'กำลังล้าง…' : 'ล้างข้อมูลทดสอบ'}
        </Button>
      </div>

      {summary ? (
        <div className="mb-6 rounded-card border border-rule bg-paper-2 p-4 sm:p-6">
          <p className="text-sm text-ink-2">
            <span className="font-label font-bold tracking-[0.08em] text-pear">
              {summary.profile.handle}
            </span>
            <span className="mx-2 text-rule-2">·</span>
            <span className="font-bold text-ink">{summary.profile.displayName}</span>
            <span className="mx-2 text-rule-2">·</span>
            ชนะรวม {summary.totalWins} · ทดสอบ {totalTestWins} · unlocks{' '}
            {summary.unlockedAchievementIds.length}
          </p>
        </div>
      ) : loading ? (
        <p className="mb-6 rounded-card border border-dashed border-rule-2 bg-paper-2 p-6 text-center text-ink-2">
          กำลังโหลดโปรไฟล์…
        </p>
      ) : null}

      {summary ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {summary.games.map((game) => (
            <article
              key={game.gameId}
              className="rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-display text-lg font-extrabold text-ink">{game.gameName}</h3>
                  <p className="mt-1 text-sm text-ink-2">
                    ชนะ {game.wins}
                    {game.testWins > 0 ? ` (ทดสอบ ${game.testWins})` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={busy}
                  onClick={() => void handleAddWin(game.gameId, game.gameName)}
                >
                  <Trophy size={16} aria-hidden />
                  {busyGameId === game.gameId ? 'กำลังเพิ่ม…' : '+1 ชนะ'}
                </Button>
              </div>
              <ul className="m-0 grid list-none gap-2 p-0">
                {game.track.map((step) => (
                  <li
                    key={step.achievementId}
                    className={`flex items-center justify-between gap-3 rounded-pill border px-3 py-2 text-xs ${
                      step.unlocked
                        ? 'border-pear/40 bg-paper-3 text-ink'
                        : 'border-rule bg-transparent text-ink-2'
                    }`}
                  >
                    <span className="min-w-0 truncate font-bold">{step.title}</span>
                    <span className="shrink-0 font-label">
                      {step.unlocked ? 'ปลดล็อก' : `${step.count} ชนะ`}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
