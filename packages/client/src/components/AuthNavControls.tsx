import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { History, LogIn, LogOut, UserRound } from 'lucide-react';
import { Button } from '../components/ui';
import { useAuth } from '../auth/useAuth';

interface Props {
  className?: string;
}

export function AuthNavControls({ className }: Props) {
  const { configured, loading, user, profile, signInWithGoogle, signOut } = useAuth();

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
        <LogIn size={17} aria-hidden />
        เข้าสู่ระบบด้วย Google
      </Button>
    );
  }

  const label = profile?.handle ? `@${profile.handle}` : (profile?.display_name ?? 'โปรไฟล์');

  return (
    <div className={className ? `${className} auth-nav-controls` : 'auth-nav-controls'}>
      <Link to="/history" className="home-nav-link" aria-label="ประวัติการเล่น">
        <History size={17} aria-hidden />
        ประวัติ
      </Link>
      <Link to="/profile" className="home-nav-link auth-nav-profile">
        <UserRound size={17} aria-hidden />
        {label}
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
