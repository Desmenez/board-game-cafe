import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { normalizeFriendCode } from 'shared';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { useAuth } from '../auth/useAuth';
import {
  listMyFriendships,
  lookupProfileByFriendCode,
  removeFriendship,
  respondFriendRequest,
  sendFriendRequest,
  type FriendListItem,
} from '../auth/friendsApi';
import {
  listIncomingInvites,
  respondGameInvite,
  type IncomingInviteItem,
} from '../auth/invitesApi';
import { PlayerAvatar } from '../components/player-avatar';
import { normalizePlayerAvatar } from 'shared';

export function FriendsPage() {
  const navigate = useNavigate();
  const { configured, loading, user, profile } = useAuth();
  const [items, setItems] = useState<FriendListItem[]>([]);
  const [invites, setInvites] = useState<IncomingInviteItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const [friends, incoming] = await Promise.all([
        listMyFriendships(user.id),
        listIncomingInvites(user.id),
      ]);
      setItems(friends);
      setInvites(incoming);
      for (const inv of incoming) {
        if (inv.expired) {
          void respondGameInvite(inv.invite.id, 'expired');
        }
      }
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => void reload(), 30_000);
    return () => window.clearInterval(id);
  }, [user, reload]);

  if (!configured) return <Navigate to="/" replace />;
  if (loading) {
    return (
      <div className="page app-night-page">
        <p className="p-8">กำลังโหลด…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;

  const pendingIn = items.filter((i) => i.status === 'pending' && i.incoming);
  const pendingOut = items.filter((i) => i.status === 'pending' && !i.incoming);
  const accepted = items.filter((i) => i.status === 'accepted');

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
            เพื่อน
          </h1>
          <p className="mt-2 text-ink-2">
            รหัสของคุณ:{' '}
            <code className="font-mono font-bold tracking-wider">{profile?.handle ?? '—'}</code>
            {' · '}เพิ่มเพื่อนด้วยรหัส 6 ตัว
          </p>
        </header>

        <section className="mb-10 max-w-xl">
          <h2 className="mb-3 font-display text-lg font-extrabold text-ink">เพิ่มเพื่อน</h2>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-start"
            onSubmit={(event) => {
              event.preventDefault();
              if (!user || sending) return;
              setFormError(null);
              setSending(true);
              void lookupProfileByFriendCode(friendCodeInput)
                .then(async (found) => {
                  if (!found.ok) {
                    setFormError(found.error);
                    return;
                  }
                  if (found.profile.id === user.id) {
                    setFormError('เพิ่มตัวเองเป็นเพื่อนไม่ได้');
                    return;
                  }
                  const sent = await sendFriendRequest(user.id, found.profile.id);
                  if (!sent.ok) {
                    setFormError(sent.error);
                    return;
                  }
                  setFriendCodeInput('');
                  toast.success(`ส่งคำขอถึง ${found.profile.display_name} แล้ว`);
                  await reload();
                })
                .finally(() => setSending(false));
            }}
          >
            <Input
              value={friendCodeInput}
              onChange={(e) => setFriendCodeInput(normalizeFriendCode(e.target.value).slice(0, 6))}
              maxLength={6}
              placeholder="เช่น K7H2MP"
              aria-label="รหัสเพื่อน"
              className="font-mono tracking-wider uppercase sm:flex-1"
            />
            <Button type="submit" disabled={sending || friendCodeInput.length < 6}>
              <UserPlus size={17} aria-hidden />
              {sending ? 'กำลังส่ง…' : 'ส่งคำขอ'}
            </Button>
          </form>
          {formError ? <p className="mt-2 text-sm text-error">{formError}</p> : null}
        </section>

        {invites.filter((i) => !i.expired).length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-3 font-display text-lg font-extrabold text-ink">คำเชิญเข้าห้อง</h2>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {invites
                .filter((i) => !i.expired)
                .map((item) => (
                  <li
                    key={item.invite.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-paper px-4 py-3"
                  >
                    <div>
                      <strong>{item.from.display_name}</strong>
                      <span className="text-ink-2">
                        {' '}
                        ชวนเล่น {item.invite.game_id} · ห้อง {item.invite.room_code}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          void respondGameInvite(item.invite.id, 'accepted').then((res) => {
                            if (!res.ok) {
                              toast.error(res.error);
                              return;
                            }
                            toast.success('รับคำเชิญแล้ว — กำลังไปที่ห้อง');
                            navigate(`/room/${item.invite.room_code}`);
                          });
                        }}
                      >
                        เข้าห้อง
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void respondGameInvite(item.invite.id, 'declined').then(async (res) => {
                            if (!res.ok) toast.error(res.error);
                            else {
                              toast.success('ปฏิเสธคำเชิญแล้ว');
                              await reload();
                            }
                          });
                        }}
                      >
                        ปฏิเสธ
                      </Button>
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        {fetching ? <p className="text-ink-2">กำลังโหลดรายชื่อ…</p> : null}

        {pendingIn.length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-3 font-display text-lg font-extrabold text-ink">คำขอที่ได้รับ</h2>
            <FriendRows
              items={pendingIn}
              onAccept={(id) => {
                void respondFriendRequest(id, 'accepted').then(async (res) => {
                  if (!res.ok) toast.error(res.error);
                  else {
                    toast.success('เป็นเพื่อนกันแล้ว');
                    await reload();
                  }
                });
              }}
              onDecline={(id) => {
                void respondFriendRequest(id, 'declined').then(async (res) => {
                  if (!res.ok) toast.error(res.error);
                  else await reload();
                });
              }}
            />
          </section>
        ) : null}

        {pendingOut.length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-3 font-display text-lg font-extrabold text-ink">คำขอที่ส่งไป</h2>
            <FriendRows
              items={pendingOut}
              onCancel={(id) => {
                void removeFriendship(id).then(async (res) => {
                  if (!res.ok) toast.error(res.error);
                  else await reload();
                });
              }}
            />
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 font-display text-lg font-extrabold text-ink">เพื่อนของคุณ</h2>
          {!fetching && accepted.length === 0 ? (
            <p className="text-ink-2">ยังไม่มีเพื่อน — ใส่รหัสเพื่อนด้านบนเพื่อส่งคำขอ</p>
          ) : (
            <FriendRows
              items={accepted}
              onRemove={(id) => {
                void removeFriendship(id).then(async (res) => {
                  if (!res.ok) toast.error(res.error);
                  else {
                    toast.success('เลิกเป็นเพื่อนแล้ว');
                    await reload();
                  }
                });
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function FriendRows({
  items,
  onAccept,
  onDecline,
  onCancel,
  onRemove,
}: {
  items: FriendListItem[];
  onAccept?: (friendshipId: string) => void;
  onDecline?: (friendshipId: string) => void;
  onCancel?: (friendshipId: string) => void;
  onRemove?: (friendshipId: string) => void;
}) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {items.map((item) => (
        <li
          key={item.friendshipId}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-paper px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <PlayerAvatar
              playerId={item.other.id}
              name={item.other.display_name}
              avatar={normalizePlayerAvatar(item.other.avatar_config, item.other.id)}
              size={40}
              decorative
            />
            <div className="min-w-0">
              <strong className="block truncate">{item.other.display_name}</strong>
              <code className="text-sm text-ink-2">{item.other.handle}</code>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {onAccept ? (
              <Button type="button" size="sm" onClick={() => onAccept(item.friendshipId)}>
                ยอมรับ
              </Button>
            ) : null}
            {onDecline ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onDecline(item.friendshipId)}
              >
                ปฏิเสธ
              </Button>
            ) : null}
            {onCancel ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onCancel(item.friendshipId)}
              >
                ยกเลิก
              </Button>
            ) : null}
            {onRemove ? (
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => onRemove(item.friendshipId)}
              >
                เลิกเป็นเพื่อน
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
