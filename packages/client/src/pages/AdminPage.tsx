import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../components/ui';
import { getClientAdminSecret } from '../constants/admin';

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
  const [rooms, setRooms] = useState<AdminRoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

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
    void loadRooms();
  }, [loadRooms]);

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

  return (
    <div className="admin-page page">
      <header className="admin-header">
        <Link to="/" className="admin-back">
          <ArrowLeft size={18} aria-hidden />
          กลับหน้าแรก
        </Link>
        <div className="admin-header-main">
          <h1>แอดมิน — ห้องที่เปิดอยู่</h1>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => void loadRooms()}
          >
            <RefreshCw size={16} aria-hidden className={loading ? 'spin' : undefined} />
            รีเฟรช
          </Button>
        </div>
        <p className="admin-hint">
          แสดงห้องใน memory ของเซิร์ฟเวอร์ตอนนี้ — ผู้เล่นที่ยังต่ออยู่จะถูกเตะเมื่อกดลบห้อง
        </p>
      </header>

      {loading && rooms.length === 0 ? (
        <p className="admin-loading">กำลังโหลด…</p>
      ) : rooms.length === 0 ? (
        <p className="admin-empty">ไม่มีห้องเปิดอยู่</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>รหัสห้อง</th>
                <th>เกม</th>
                <th>สถานะ</th>
                <th>ผู้เล่น</th>
                <th>สร้างเมื่อ</th>
                <th aria-label="ลบห้อง" />
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.code}>
                  <td className="admin-mono">{r.code}</td>
                  <td>{r.gameName}</td>
                  <td>
                    <span className="admin-status">{r.status}</span>
                  </td>
                  <td>
                    {r.connectedCount}/{r.playerCount} เชื่อมต่อ
                    <ul className="admin-players">
                      {r.players.map((p) => (
                        <li key={p.id}>
                          {p.name}
                          {p.connected ? ' · ออนไลน์' : ' · ออฟไลน์'}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="admin-muted">{new Date(r.createdAt).toLocaleString()}</td>
                  <td>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="admin-delete-btn"
                      disabled={deleting !== null}
                      onClick={() => void handleDelete(r.code)}
                      aria-label={`ลบห้อง ${r.code}`}
                    >
                      <Trash2 size={16} aria-hidden />
                      {deleting === r.code ? '…' : 'ลบห้อง'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
