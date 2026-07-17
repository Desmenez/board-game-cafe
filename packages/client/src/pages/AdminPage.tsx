import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../components/ui';
import {
  clearAdminNavFromJoin,
  getClientAdminSecret,
  hasAdminNavFromJoin,
} from '../constants/admin';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export interface AdminRoomRow {
  code: string;
  gameId: string;
  gameName: string;
  status: string;
  createdAt: number;
  cleanupAt?: number;
  playerCount: number;
  connectedCount: number;
  players: { id: string; name: string; connected: boolean }[];
}

export function AdminPage() {
  const navigate = useNavigate();
  const [allowed] = useState(() => hasAdminNavFromJoin());
  const [rooms, setRooms] = useState<AdminRoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!hasAdminNavFromJoin()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const adminHeaders = useCallback((): HeadersInit => {
    return { 'X-Admin-Secret': getClientAdminSecret() };
  }, []);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/rooms`, { headers: adminHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? res.statusText);
      }
      const data = (await res.json()) as { rooms: AdminRoomRow[] };
      setRooms(data.rooms ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'โหลดรายการไม่สำเร็จ';
      toast.error(msg);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [adminHeaders]);

  useEffect(() => {
    if (!allowed) return;
    void loadRooms();
  }, [allowed, loadRooms]);

  const handleDelete = async (code: string) => {
    if (!window.confirm(`ลบห้อง ${code} และเตะผู้เล่นทุกคนออก?`)) return;
    setDeleting(code);
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/rooms/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? res.statusText);
      }
      toast.success(`ลบห้อง ${code} แล้ว`);
      await loadRooms();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ลบไม่สำเร็จ');
    } finally {
      setDeleting(null);
    }
  };

  if (!allowed) {
    return null;
  }

  const connectedTotal = rooms.reduce((total, room) => total + room.connectedCount, 0);
  const playerTotal = rooms.reduce((total, room) => total + room.playerCount, 0);

  return (
    <div className="page app-night-page">
      <div className="mx-auto w-full max-w-shell px-4 py-10 sm:px-6 lg:px-16 lg:py-16">
        <header className="mb-10">
          <Link
            to="/"
            className="mb-6 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-ink-2 no-underline transition duration-150 ease-out hover:text-ink motion-safe:hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
            onClick={() => clearAdminNavFromJoin()}
          >
            <ArrowLeft size={18} aria-hidden />
            กลับหน้าแรก
          </Link>
          <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
                Live room control
              </span>
              <h1 className="mt-3 mb-2 max-w-[18ch] font-display text-2xl md:text-4xl leading-[1.08] font-extrabold tracking-[-0.045em] text-ink">
                ห้องที่เปิดอยู่
              </h1>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full lg:w-auto"
              disabled={loading}
              onClick={() => void loadRooms()}
            >
              <RefreshCw size={16} aria-hidden className={loading ? 'animate-spin' : undefined} />
              รีเฟรช
            </Button>
          </div>
          <p className="mt-3 max-w-[58ch] leading-7 text-ink-2">
            ข้อมูลจาก memory ของเซิร์ฟเวอร์แบบสด การลบห้องจะตัดการเชื่อมต่อผู้เล่นในห้องนั้นทันที
          </p>
        </header>

        <section
          className="mb-10 grid grid-cols-1 border-y border-rule lg:grid-cols-3"
          aria-label="ภาพรวมห้อง"
        >
          <div className="grid min-w-0 gap-2 p-6">
            <span className="font-label text-xs text-ink-2">ห้องที่เปิด</span>
            <strong className="font-display text-3xl font-extrabold text-ink">
              {rooms.length}
            </strong>
          </div>
          <div className="grid min-w-0 gap-2 border-t border-rule p-6 lg:border-t-0 lg:border-l">
            <span className="font-label text-xs text-ink-2">กำลังออนไลน์</span>
            <strong className="font-display text-3xl font-extrabold text-ink">
              {connectedTotal}
            </strong>
          </div>
          <div className="grid min-w-0 gap-2 border-t border-rule p-6 lg:border-t-0 lg:border-l">
            <span className="font-label text-xs text-ink-2">ที่นั่งทั้งหมด</span>
            <strong className="font-display text-3xl font-extrabold text-ink">{playerTotal}</strong>
          </div>
        </section>

        {loading && rooms.length === 0 ? (
          <p className="mt-10 rounded-card border border-dashed border-rule-2 bg-paper-2 p-10 text-center text-ink-2">
            กำลังโหลดข้อมูลห้อง…
          </p>
        ) : rooms.length === 0 ? (
          <p className="mt-10 rounded-card border border-dashed border-rule-2 bg-paper-2 p-10 text-center text-ink-2">
            ตอนนี้ยังไม่มีห้องเปิดอยู่
          </p>
        ) : (
          <div className="overflow-visible bg-transparent lg:overflow-hidden lg:rounded-card lg:border lg:border-rule lg:bg-paper-2">
            <table className="block w-full text-sm text-ink lg:table lg:border-collapse">
              <thead className="hidden lg:table-header-group">
                <tr>
                  {['รหัสห้อง', 'เกม', 'สถานะ', 'ผู้เล่น', 'สร้างเมื่อ'].map((label) => (
                    <th
                      key={label}
                      className="border-b border-rule bg-paper-3 p-4 text-left font-label text-xs font-bold tracking-[0.04em] text-ink-2"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="border-b border-rule bg-paper-3 p-4" aria-label="ลบห้อง" />
                </tr>
              </thead>
              <tbody className="grid gap-4 lg:table-row-group">
                {rooms.map((r) => (
                  <tr
                    className="block rounded-card border border-rule bg-paper-2 p-4 lg:table-row lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
                    key={r.code}
                  >
                    <td
                      className="block border-b border-rule py-3 font-label text-base font-bold tracking-[0.08em] text-pear before:mb-1 before:block before:text-xs before:font-normal before:tracking-normal before:text-ink-2 before:content-[attr(data-label)] lg:table-cell lg:p-4 lg:align-top lg:before:hidden"
                      data-label="รหัสห้อง"
                    >
                      {r.code}
                    </td>
                    <td
                      className="block border-b border-rule py-3 before:mb-1 before:block before:font-label before:text-xs before:text-ink-2 before:content-[attr(data-label)] lg:table-cell lg:p-4 lg:align-top lg:before:hidden"
                      data-label="เกม"
                    >
                      {r.gameName}
                    </td>
                    <td
                      className="block border-b border-rule py-3 before:mb-1 before:block before:font-label before:text-xs before:text-ink-2 before:content-[attr(data-label)] lg:table-cell lg:p-4 lg:align-top lg:before:hidden"
                      data-label="สถานะ"
                    >
                      <span className="inline-flex rounded-pill border border-rule bg-paper-3 px-2 py-1 font-label text-xs text-ink">
                        {r.status}
                      </span>
                    </td>
                    <td
                      className="block border-b border-rule py-3 before:mb-1 before:block before:font-label before:text-xs before:text-ink-2 before:content-[attr(data-label)] lg:table-cell lg:p-4 lg:align-top lg:before:hidden"
                      data-label="ผู้เล่น"
                    >
                      <span className="font-bold text-ink">
                        {r.connectedCount}/{r.playerCount} เชื่อมต่อ
                      </span>
                      <ul className="mt-2 grid list-none gap-1 p-0 text-xs text-ink-2">
                        {r.players.map((p) => (
                          <li className="flex items-center gap-2" key={p.id}>
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                p.connected ? 'bg-[var(--color-success)]' : 'bg-rule-2'
                              }`}
                              aria-hidden
                            />
                            {p.name}
                            {p.connected ? ' · ออนไลน์' : ' · ออฟไลน์'}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td
                      className="block border-b border-rule py-3 text-sm text-ink-2 before:mb-1 before:block before:font-label before:text-xs before:content-[attr(data-label)] lg:table-cell lg:whitespace-nowrap lg:p-4 lg:align-top lg:before:hidden"
                      data-label="สร้างเมื่อ"
                    >
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td
                      className="block pt-3 before:mb-1 before:block before:font-label before:text-xs before:text-ink-2 before:content-[attr(data-label)] lg:table-cell lg:p-4 lg:text-right lg:align-top lg:before:hidden"
                      data-label="จัดการ"
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full lg:w-auto"
                        disabled={deleting !== null}
                        onClick={() => void handleDelete(r.code)}
                        aria-label={`ลบห้อง ${r.code}`}
                      >
                        <Trash2 size={16} aria-hidden />
                        {deleting === r.code ? 'กำลังลบ…' : 'ลบห้อง'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
