import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { History, LogIn, LogOut } from 'lucide-react';
import { normalizePlayerAvatar, normalizePlayerAvatarDisplay } from 'shared';
import { Button } from '../components/ui';
import { PlayerAvatar } from './player-avatar';
import { useAuth } from '../auth/useAuth';
import { listMyFriendships } from '../auth/friendsApi';
import { listIncomingInvites } from '../auth/invitesApi';
import { cn } from '../utils/cn';

interface Props {
  className?: string;
}

export function AuthNavControls({ className }: Props) {
  const { configured, loading, user, profile, signInWithGoogle, signOut } = useAuth();
  const [badgeCount, setBadgeCount] = useState(0);

  const refreshBadge = useCallback(async () => {
    if (!user) {
      setBadgeCount(0);
      return;
    }
    const [friends, invites] = await Promise.all([
      listMyFriendships(user.id),
      listIncomingInvites(user.id),
    ]);
    const pendingFriends = friends.filter((f) => f.status === 'pending' && f.incoming).length;
    const pendingInvites = invites.filter((i) => !i.expired).length;
    setBadgeCount(pendingFriends + pendingInvites);
  }, [user]);

  useEffect(() => {
    void refreshBadge();
    if (!user) return;
    const id = window.setInterval(() => void refreshBadge(), 30_000);
    return () => window.clearInterval(id);
  }, [user, refreshBadge]);

  if (!configured) return null;

  if (loading) {
    return (
      <span className={className} aria-busy="true">
        …
      </span>
    );
  }

  if (!user) {
    return (
      <Button
        type="button"
        variant="secondary"
        className={className}
        onClick={() => {
          void signInWithGoogle().catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
          });
        }}
      >
        <LogIn size={17} className="hidden md:inline" aria-hidden />
        <span className="hidden md:inline">เข้าสู่ระบบด้วย</span>
        <img src="/google-icon.svg" alt="" width={17} height={17} aria-hidden />
      </Button>
    );
  }

  const label = profile?.display_name?.trim() || profile?.handle || 'โปรไฟล์';
  const profileTo = badgeCount > 0 ? '/profile#friends' : '/profile';
  const profileAria =
    badgeCount > 0
      ? `โปรไฟล์ (${badgeCount} รายการรอดำเนินการ — คำขอเพื่อนหรือคำเชิญเข้าห้อง)`
      : 'โปรไฟล์';

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      {/* `.home-nav-link` sets `display: inline-flex` unlayered, which beats layered
          Tailwind utilities — so hide via a wrapper instead of on the link itself. */}
      <span className="hidden sm:contents">
        <Link to="/history" className="home-nav-link" aria-label="ประวัติการเล่น">
          <History size={17} aria-hidden />
          ประวัติ
        </Link>
      </span>
      <Link
        to={profileTo}
        className="home-nav-link max-w-48 overflow-hidden"
        aria-label={profileAria}
      >
        <span className="relative shrink-0">
          <PlayerAvatar
            playerId={user.id}
            name={label}
            avatar={profile ? normalizePlayerAvatar(profile.avatar_config, profile.id) : undefined}
            avatarUrl={profile?.avatar_url}
            avatarDisplay={normalizePlayerAvatarDisplay(profile?.avatar_display)}
            size={22}
            decorative
            className="size-5.5 rounded-[0.35rem]"
          />
        </span>
        <span className="min-w-0 overflow-hidden text-ellipsis">{label}</span>
        {badgeCount > 0 ? (
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pear px-[0.35rem] text-[0.7rem] leading-none font-extrabold text-accent-ink"
            aria-hidden
          >
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        ) : null}
      </Link>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          void signOut().catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'ออกจากระบบไม่สำเร็จ');
          });
        }}
        aria-label="ออกจากระบบ"
      >
        <LogOut size={17} aria-hidden />
      </Button>
    </div>
  );
}
