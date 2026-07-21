import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getProfileDisplayNameValidationError,
  getProfileHandleValidationError,
  normalizePlayerAvatar,
  type PlayerAvatarConfig,
} from 'shared';
import { ArrowLeft } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { AvatarEditor } from '../components/player-avatar/AvatarEditor';
import { useAuth } from '../auth/useAuth';
import { updateOwnProfile } from '../auth/profileApi';
import { writeGlobalPlayerNameToStorage } from '../utils/playerDisplayName';
import { writeGlobalPlayerAvatarToStorage } from '../utils/playerAvatar';

export function ProfilePage() {
  const { configured, loading, user, profile, refreshProfile, signOut } = useAuth();
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState<PlayerAvatarConfig | null>(null);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setHandle(profile.handle);
    setDisplayName(profile.display_name);
    setAvatar(normalizePlayerAvatar(profile.avatar_config, profile.id));
    setShowOnLeaderboard(profile.show_on_leaderboard);
  }, [profile]);

  if (!configured) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="page app-night-page">
        <p className="p-8">กำลังโหลด…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page app-night-page">
      <div className="mx-auto w-full max-w-shell px-4 pt-10 pb-24 sm:px-6 lg:px-16 lg:pt-16">
        <Link
          to="/"
          className="mb-6 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-ink-2 no-underline transition duration-150 ease-out hover:text-ink"
        >
          <ArrowLeft size={20} aria-hidden />
          กลับหน้าแรก
        </Link>

        <header className="mb-8">
          <h1 className="m-0 font-display text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-tight text-ink">
            โปรไฟล์
          </h1>
          <p className="mt-2 text-ink-2">
            บัญชี Google: {user.email ?? '—'}
            {profile?.handle ? ` · @${profile.handle}` : null}
          </p>
        </header>

        <form
          className="flex max-w-xl flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!avatar || !user) return;
            const handleErr = getProfileHandleValidationError(handle);
            if (handleErr) {
              setFormError(handleErr);
              return;
            }
            const nameErr = getProfileDisplayNameValidationError(displayName);
            if (nameErr) {
              setFormError(nameErr);
              return;
            }
            setFormError(null);
            setSaving(true);
            void updateOwnProfile(user.id, {
              handle: handle.trim(),
              display_name: displayName.trim(),
              avatar_config: avatar,
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
                await refreshProfile();
                toast.success('บันทึกโปรไฟล์แล้ว');
              })
              .finally(() => setSaving(false));
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-ink">แฮนเดิล (ค้นหาเพื่อนได้ รวมภาษาไทย)</span>
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              maxLength={32}
              autoComplete="username"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-ink">ชื่อที่แสดงในเกม</span>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={48}
              required
            />
          </label>

          <label className="flex items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={showOnLeaderboard}
              onChange={(e) => setShowOnLeaderboard(e.target.checked)}
            />
            แสดงบน leaderboard
          </label>

          {avatar ? (
            <div>
              <p className="mb-3 text-sm font-bold text-ink">Avatar</p>
              <AvatarEditor value={avatar} onChange={setAvatar} />
            </div>
          ) : null}

          {formError ? <p className="m-0 text-sm text-error">{formError}</p> : null}

          <div className="flex flex-wrap gap-3">
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
      </div>
    </div>
  );
}
