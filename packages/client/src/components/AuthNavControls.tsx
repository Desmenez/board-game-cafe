import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { History, LogIn, LogOut, UserRound } from 'lucide-react';
import { Button } from '../components/ui';
import { useAuth } from '../auth/useAuth';
import { listMyFriendships } from '../auth/friendsApi';
import { listIncomingInvites } from '../auth/invitesApi';

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
    <div className={className ? `${className} auth-nav-controls` : 'auth-nav-controls'}>
      <Link to="/history" className="home-nav-link" aria-label="ประวัติการเล่น">
        <History size={17} aria-hidden />
        ประวัติ
      </Link>
      <Link to={profileTo} className="home-nav-link auth-nav-profile" aria-label={profileAria}>
        <UserRound size={17} aria-hidden />
        {label}
        {badgeCount > 0 ? (
          <span className="auth-nav-badge" aria-hidden>
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
