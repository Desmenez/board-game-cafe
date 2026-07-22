/* Hallmark · macrostructure: Workbench (split identity / friends)
 * tone: warm social · theme: Midnight (design.md) · enrichment: none
 * nav: route-local back + utility History · footer: none
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getProfileDisplayNameValidationError,
  normalizeFriendCode,
  normalizePlayerAvatar,
  type PlayerAvatarConfig,
} from 'shared';
import { ArrowLeft, Check, Copy, History, UserPlus } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { AvatarEditor } from '../components/player-avatar/AvatarEditor';
import { PlayerAvatar } from '../components/player-avatar';
import { useAuth } from '../auth/useAuth';
import { updateOwnProfile } from '../auth/profileApi';
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
import { writeGlobalPlayerNameToStorage } from '../utils/playerDisplayName';
import { writeGlobalPlayerAvatarToStorage } from '../utils/playerAvatar';

export function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { configured, loading, user, profile, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState<PlayerAvatarConfig | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [friendItems, setFriendItems] = useState<FriendListItem[]>([]);
  const [invites, setInvites] = useState<IncomingInviteItem[]>([]);
  const [fetchingFriends, setFetchingFriends] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [sendingFriend, setSendingFriend] = useState(false);
  const [friendFormError, setFriendFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setAvatar(normalizePlayerAvatar(profile.avatar_config, profile.id));
    setAvatarUrl(profile.avatar_url ?? null);
    setShowOnLeaderboard(profile.show_on_leaderboard);
  }, [profile]);

  const reloadFriends = useCallback(async () => {
    if (!user) return;
    setFetchingFriends(true);
    try {
      const [friends, incoming] = await Promise.all([
        listMyFriendships(user.id),
        listIncomingInvites(user.id),
      ]);
      setFriendItems(friends);
      setInvites(incoming);
      for (const inv of incoming) {
        if (inv.expired) {
          void respondGameInvite(inv.invite.id, 'expired');
        }
      }
    } finally {
      setFetchingFriends(false);
    }
  }, [user]);

  useEffect(() => {
    void reloadFriends();
  }, [reloadFriends]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => void reloadFriends(), 30_000);
    return () => window.clearInterval(id);
  }, [user, reloadFriends]);

  useEffect(() => {
    if (loading || location.hash !== '#friends') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('friends')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, location.hash, friendItems.length, invites.length]);

  if (!configured) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="page app-night-page">
        <p className="p-8 text-ink-2">กำลังโหลด…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const friendCode = profile?.handle ?? '';
  const pendingIn = friendItems.filter((i) => i.status === 'pending' && i.incoming);
  const pendingOut = friendItems.filter((i) => i.status === 'pending' && !i.incoming);
  const accepted = friendItems.filter((i) => i.status === 'accepted');
  const activeInvites = invites.filter((i) => !i.expired);

  const copyFriendCode = () => {
    if (!friendCode) return;
    void navigator.clipboard.writeText(friendCode).then(
      () => {
        setCopiedCode(true);
        toast.success('คัดลอกรหัสเพื่อนแล้ว');
        window.setTimeout(() => setCopiedCode(false), 1600);
      },
      () => toast.error('คัดลอกไม่สำเร็จ'),
    );
  };

  return (
    <div className="page app-night-page">
      <div className="mx-auto w-full max-w-shell px-4 pt-10 pb-32 sm:px-6 lg:px-16 lg:pt-16">
        <header className="mb-10">
          <Link
            to="/"
            className="mb-6 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-ink-2 no-underline transition duration-150 ease-out hover:text-ink motion-safe:hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
          >
            <ArrowLeft size={20} aria-hidden />
            กลับหน้าแรก
          </Link>

          <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
                บัญชีของคุณ
              </span>
              <h1 className="mt-3 mb-2 max-w-[18ch] [overflow-wrap:anywhere] font-display text-[clamp(1.953rem,4vw,2.441rem)] leading-[1.08] font-extrabold tracking-[-0.045em] text-ink">
                โปรไฟล์
              </h1>
              <p className="m-0 max-w-[58ch] leading-7 text-ink-2">
                ตั้งชื่อกับหน้าตัวละคร แชร์รหัสเพื่อน แล้วจัดการเพื่อนจากโต๊ะเดียวกัน
              </p>
              {user.email ? (
                <p className="mt-2 mb-0 font-label text-xs text-ink-2">Google · {user.email}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => navigate('/history')}
              >
                <History size={17} aria-hidden />
                ประวัติการเล่น
              </Button>
              {friendCode ? (
                <button
                  type="button"
                  className="inline-flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-pill border border-pear bg-pear px-4 py-2 font-label text-lg font-bold tracking-[0.16em] text-accent-ink transition duration-150 ease-out motion-safe:hover:-translate-y-px motion-safe:active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-inverse)] sm:w-auto"
                  onClick={copyFriendCode}
                  title="คลิกเพื่อคัดลอกรหัสเพื่อน"
                  aria-label={`คัดลอกรหัสเพื่อน ${friendCode}`}
                >
                  <span>{friendCode}</span>
                  {copiedCode ? (
                    <Check size={17} strokeWidth={2.25} aria-hidden />
                  ) : (
                    <Copy size={17} strokeWidth={2.25} aria-hidden />
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(19rem,5fr)]">
          <main className="grid min-w-0 gap-6">
            <section
              className="min-w-0 rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
              aria-labelledby="profile-identity-heading"
            >
              <div className="mb-6">
                <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
                  ตัวตนบนโต๊ะ
                </span>
                <h2
                  className="mt-2 mb-0 font-display text-lg md:text-2xl font-extrabold tracking-[-0.035em] text-ink"
                  id="profile-identity-heading"
                >
                  ชื่อและหน้าตัวละคร
                </h2>
                <p className="mt-2 mb-0 max-w-[48ch] text-sm leading-6 text-ink-2">
                  รหัสเพื่อนสุ่มตอนสมัครและแก้ไม่ได้ — แจ้งให้เพื่อนใส่ในคอลัมน์ขวา
                </p>
              </div>

              <form
                className="flex flex-col gap-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!avatar || !user) return;
                  const nameErr = getProfileDisplayNameValidationError(displayName);
                  if (nameErr) {
                    setFormError(nameErr);
                    return;
                  }
                  setFormError(null);
                  setSaving(true);
                  void updateOwnProfile(user.id, {
                    display_name: displayName.trim(),
                    avatar_config: avatar,
                    avatar_url: avatarUrl,
                    show_on_leaderboard: showOnLeaderboard,
                  })
                    .then(async (result) => {
                      if (!result.ok) {
                        setFormError(result.error);
                        return;
                      }
                      writeGlobalPlayerNameToStorage(result.profile.display_name);
                      writeGlobalPlayerAvatarToStorage(
                        normalizePlayerAvatar(result.profile.avatar_config, result.profile.id),
                      );
                      setAvatarUrl(result.profile.avatar_url ?? null);
                      await refreshProfile();
                      toast.success('บันทึกโปรไฟล์แล้ว');
                    })
                    .finally(() => setSaving(false));
                }}
              >
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-ink">ชื่อที่แสดงในเกม</span>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={48}
                    required
                    autoComplete="nickname"
                  />
                </label>

                <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-pear)]"
                    checked={showOnLeaderboard}
                    onChange={(e) => setShowOnLeaderboard(e.target.checked)}
                  />
                  แสดงบน leaderboard
                </label>

                {avatar ? (
                  <div>
                    <p className="mb-3 text-sm font-bold text-ink">Avatar</p>
                    <AvatarEditor
                      value={avatar}
                      onChange={setAvatar}
                      photoUpload={
                        user
                          ? {
                              userId: user.id,
                              avatarUrl,
                              onAvatarUrlChange: setAvatarUrl,
                            }
                          : null
                      }
                    />
                  </div>
                ) : null}

                {formError ? <p className="m-0 text-sm text-error">{formError}</p> : null}

                <div className="flex flex-wrap gap-3 border-t border-rule pt-5">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'กำลังบันทึก…' : 'บันทึก'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      void signOut().then(() => toast.success('ออกจากระบบแล้ว'));
                    }}
                  >
                    ออกจากระบบ
                  </Button>
                </div>
              </form>
            </section>
          </main>

          <aside className="grid min-w-0 scroll-mt-24 gap-6" id="friends">
            <section
              className="min-w-0 rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
              aria-labelledby="profile-add-friend-heading"
            >
              <div className="mb-5">
                <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
                  วงเพื่อน
                </span>
                <h2
                  className="mt-2 mb-0 font-display text-lg md:text-2xl font-extrabold tracking-[-0.035em] text-ink"
                  id="profile-add-friend-heading"
                >
                  เพิ่มเพื่อน
                </h2>
                <p className="mt-2 mb-0 text-sm leading-6 text-ink-2">ใส่รหัส 6 ตัวของเพื่อน</p>
              </div>

              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!user || sendingFriend) return;
                  setFriendFormError(null);
                  setSendingFriend(true);
                  void lookupProfileByFriendCode(friendCodeInput)
                    .then(async (found) => {
                      if (!found.ok) {
                        setFriendFormError(found.error);
                        return;
                      }
                      if (found.profile.id === user.id) {
                        setFriendFormError('เพิ่มตัวเองเป็นเพื่อนไม่ได้');
                        return;
                      }
                      const sent = await sendFriendRequest(user.id, found.profile.id);
                      if (!sent.ok) {
                        setFriendFormError(sent.error);
                        return;
                      }
                      setFriendCodeInput('');
                      toast.success(`ส่งคำขอถึง ${found.profile.display_name} แล้ว`);
                      await reloadFriends();
                    })
                    .finally(() => setSendingFriend(false));
                }}
              >
                <Input
                  value={friendCodeInput}
                  onChange={(e) =>
                    setFriendCodeInput(normalizeFriendCode(e.target.value).slice(0, 6))
                  }
                  maxLength={6}
                  placeholder="เช่น K7H2MP"
                  aria-label="รหัสเพื่อน"
                  className="font-mono tracking-wider uppercase"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button type="submit" disabled={sendingFriend || friendCodeInput.length < 6}>
                  <UserPlus size={17} aria-hidden />
                  {sendingFriend ? 'กำลังส่ง…' : 'ส่งคำขอ'}
                </Button>
              </form>
              {friendFormError ? (
                <p className="mt-3 mb-0 text-sm text-error">{friendFormError}</p>
              ) : null}
            </section>

            {activeInvites.length > 0 ? (
              <section
                className="min-w-0 rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
                aria-labelledby="profile-invites-heading"
              >
                <h2
                  className="mt-0 mb-4 font-display text-lg font-extrabold tracking-[-0.03em] text-ink"
                  id="profile-invites-heading"
                >
                  คำเชิญเข้าห้อง
                </h2>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {activeInvites.map((item) => (
                    <li
                      key={item.invite.id}
                      className="rounded-input border border-rule bg-paper-3 px-3 py-3"
                    >
                      <p className="m-0 text-sm leading-6 text-ink">
                        <strong>{item.from.display_name}</strong>
                        <span className="text-ink-2">
                          {' '}
                          ชวนเล่น {item.invite.game_id} · ห้อง {item.invite.room_code}
                        </span>
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
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
                                await reloadFriends();
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

            {pendingIn.length > 0 ? (
              <section
                className="min-w-0 rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
                aria-labelledby="profile-pending-in-heading"
              >
                <h2
                  className="mt-0 mb-4 font-display text-lg font-extrabold tracking-[-0.03em] text-ink"
                  id="profile-pending-in-heading"
                >
                  คำขอที่ได้รับ
                </h2>
                <FriendRows
                  items={pendingIn}
                  onAccept={(id) => {
                    void respondFriendRequest(id, 'accepted').then(async (res) => {
                      if (!res.ok) toast.error(res.error);
                      else {
                        toast.success('เป็นเพื่อนกันแล้ว');
                        await reloadFriends();
                      }
                    });
                  }}
                  onDecline={(id) => {
                    void respondFriendRequest(id, 'declined').then(async (res) => {
                      if (!res.ok) toast.error(res.error);
                      else await reloadFriends();
                    });
                  }}
                />
              </section>
            ) : null}

            {pendingOut.length > 0 ? (
              <section
                className="min-w-0 rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
                aria-labelledby="profile-pending-out-heading"
              >
                <h2
                  className="mt-0 mb-4 font-display text-lg font-extrabold tracking-[-0.03em] text-ink"
                  id="profile-pending-out-heading"
                >
                  คำขอที่ส่งไป
                </h2>
                <FriendRows
                  items={pendingOut}
                  onCancel={(id) => {
                    void removeFriendship(id).then(async (res) => {
                      if (!res.ok) toast.error(res.error);
                      else await reloadFriends();
                    });
                  }}
                />
              </section>
            ) : null}

            <section
              className="min-w-0 rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
              aria-labelledby="profile-friends-list-heading"
            >
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2
                  className="m-0 font-display text-lg font-extrabold tracking-[-0.03em] text-ink"
                  id="profile-friends-list-heading"
                >
                  เพื่อนของคุณ
                </h2>
                {fetchingFriends ? (
                  <span className="font-label text-xs text-ink-2">กำลังโหลด…</span>
                ) : (
                  <span className="font-label text-xs text-ink-2">{accepted.length} คน</span>
                )}
              </div>
              {!fetchingFriends && accepted.length === 0 ? (
                <p className="m-0 text-sm leading-6 text-ink-2">
                  ยังไม่มีเพื่อน — ใส่รหัสด้านบนเพื่อส่งคำขอ
                </p>
              ) : (
                <FriendRows
                  items={accepted}
                  onRemove={(id) => {
                    void removeFriendship(id).then(async (res) => {
                      if (!res.ok) toast.error(res.error);
                      else {
                        toast.success('เลิกเป็นเพื่อนแล้ว');
                        await reloadFriends();
                      }
                    });
                  }}
                />
              )}
            </section>
          </aside>
        </div>
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
          className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-rule bg-paper-3 px-3 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <PlayerAvatar
              playerId={item.other.id}
              name={item.other.display_name}
              avatar={normalizePlayerAvatar(item.other.avatar_config, item.other.id)}
              avatarUrl={item.other.avatar_url}
              size={40}
              decorative
            />
            <div className="min-w-0">
              <strong className="block truncate text-ink">{item.other.display_name}</strong>
              <code className="font-label text-xs tracking-wider text-ink-2">
                {item.other.handle}
              </code>
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
