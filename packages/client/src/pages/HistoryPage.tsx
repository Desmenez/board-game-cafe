import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { fetchMyMatchHistory, type MatchHistoryItem } from '../auth/matchHistoryApi';

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

export function HistoryPage() {
  const { configured, loading, user } = useAuth();
  const [items, setItems] = useState<MatchHistoryItem[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    void fetchMyMatchHistory(user.id)
      .then(setItems)
      .finally(() => setFetching(false));
  }, [user]);

  if (!configured) return <Navigate to="/" replace />;
  if (loading) {
    return (
      <div className="page app-night-page">
        <p className="p-8">กำลังโหลด…</p>
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
          <h1 className="m-0 font-display text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-tight text-ink">
            ประวัติการเล่น
          </h1>
          <p className="mt-2 text-ink-2">แมตช์ที่บันทึกไว้เมื่อคุณเข้าสู่ระบบตอนจบเกม</p>
        </header>

        {fetching ? <p className="text-ink-2">กำลังโหลดประวัติ…</p> : null}

        {!fetching && items.length === 0 ? (
          <p className="text-ink-2">
            ยังไม่มีประวัติ — เล่นเกมให้จบขณะล็อกอินไว้แล้วกลับมาดูที่นี่
          </p>
        ) : null}

        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-ink/10 bg-paper px-4 py-4 text-ink"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong className="font-display text-lg">{item.game_id}</strong>
                <span className="text-sm text-ink-2">{formatWhen(item.ended_at)}</span>
              </div>
              <p className="mt-1 mb-2 text-sm text-ink-2">
                ห้อง {item.room_code}
                {item.iWon ? ' · คุณชนะ' : ''}
                {item.result_reason ? ` · ${item.result_reason}` : ''}
              </p>
              <p className="m-0 text-sm">
                ผู้เล่น:{' '}
                {item.players
                  .map((p) => `${p.display_name}${p.is_winner ? ' (ชนะ)' : ''}`)
                  .join(', ')}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
