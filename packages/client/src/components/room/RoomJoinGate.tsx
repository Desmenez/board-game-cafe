import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import {
  MAX_PLAYER_DISPLAY_NAME_LENGTH,
  PLAYER_DISPLAY_NAME_HINT,
  getPlayerDisplayNameValidationError,
  normalizePlayerAvatar,
  sanitizePlayerDisplayNameInput,
} from 'shared';
import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AvatarEditor } from '../player-avatar';
import { Alert, Button, Input } from '../ui';
import { normalizeRoomCode } from '../../utils/playerToken';

/** Minimal profile shape needed for join auto-retry. */
type JoinProfile = {
  id: string;
  display_name: string;
  avatar_config: PlayerAvatarConfig | unknown;
} | null;

interface RoomJoinGateProps {
  code: string;
  playerName: string;
  playerAvatar: PlayerAvatarConfig;
  joinError: string | null;
  authConfigured: boolean;
  authLoading: boolean;
  userId: string | null;
  profile: JoinProfile;
  avatarUrlDraft: string | null;
  avatarDisplayDraft: PlayerAvatarDisplay;
  onPlayerNameChange: (name: string) => void;
  onPlayerAvatarChange: (avatar: PlayerAvatarConfig) => void;
  onAvatarUrlChange: (url: string | null) => void;
  onAvatarDisplayChange: (display: PlayerAvatarDisplay) => void;
  onJoinErrorClear: () => void;
  onJoin: (nameOverride?: string, avatarOverride?: PlayerAvatarConfig) => void;
  onRetryAutoJoin: () => void;
  onSignInWithGoogle: (redirectTo?: string) => Promise<void>;
  onRefreshProfile: () => void;
}

export function RoomJoinGate({
  code,
  playerName,
  playerAvatar,
  joinError,
  authConfigured,
  authLoading,
  userId,
  profile,
  avatarUrlDraft,
  avatarDisplayDraft,
  onPlayerNameChange,
  onPlayerAvatarChange,
  onAvatarUrlChange,
  onAvatarDisplayChange,
  onJoinErrorClear,
  onJoin,
  onRetryAutoJoin,
  onSignInWithGoogle,
  onRefreshProfile,
}: RoomJoinGateProps) {
  const navigate = useNavigate();
  const waitingForAuth = authConfigured && (authLoading || (Boolean(userId) && profile == null));
  const hasProfileToAutoJoin = Boolean(profile?.display_name?.trim());

  if (waitingForAuth || hasProfileToAutoJoin) {
    return (
      <div className="page app-night-page room-state-page grid min-h-svh place-items-center p-6 text-center">
        <p className="m-0 text-ink-2">
          {hasProfileToAutoJoin ? 'กำลังเข้าห้อง…' : 'กำลังโหลดโปรไฟล์…'}
        </p>
        {joinError ? (
          <div className="mt-6 max-w-md">
            <Alert variant="destructive" className="mb-4">
              {joinError}
            </Alert>
            <Button
              block
              type="button"
              onClick={() => {
                onRetryAutoJoin();
                if (profile?.display_name?.trim()) {
                  const avatar = normalizePlayerAvatar(profile.avatar_config, profile.id);
                  onJoin(profile.display_name.trim(), avatar);
                }
              }}
            >
              ลองอีกครั้ง
            </Button>
            <Button
              variant="secondary"
              block
              type="button"
              className="mt-3"
              onClick={() => navigate('/')}
            >
              กลับหน้าหลัก
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  const joinNameValidationError = getPlayerDisplayNameValidationError(playerName);
  const canJoin = joinNameValidationError === null;
  const joinInputError =
    joinError ?? (playerName.trim() ? joinNameValidationError : null) ?? undefined;

  return (
    <div className="page app-night-page room-state-page grid min-h-svh place-items-center p-6 text-center">
      <div className="modal-overlay">
        <div className="modal max-h-[calc(100svh-2rem)] max-w-2xl overflow-y-auto p-4! sm:p-8!">
          <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
            คำเชิญเข้าร่วมโต๊ะ
          </span>
          <h2>
            เข้าร่วมห้อง <span className="font-label tracking-[0.08em] text-pear">{code}</span>
          </h2>
          <p>ใส่ชื่อของคุณเพื่อเข้าร่วมเกม</p>
          <div className="form-group">
            <Input
              label="ชื่อที่แสดงในเกม"
              type="text"
              placeholder="ชื่อของคุณ"
              value={playerName}
              maxLength={MAX_PLAYER_DISPLAY_NAME_LENGTH}
              hint={PLAYER_DISPLAY_NAME_HINT}
              onChange={(e) => {
                onPlayerNameChange(sanitizePlayerDisplayNameInput(e.target.value));
                onJoinErrorClear();
              }}
              onKeyDown={(e) => e.key === 'Enter' && canJoin && onJoin()}
              error={joinInputError}
              autoFocus
            />
          </div>
          <AvatarEditor
            value={playerAvatar}
            onChange={(avatar) => {
              onPlayerAvatarChange(avatar);
              onJoinErrorClear();
            }}
            previewName={playerName.trim() || 'คุณ'}
            className="my-6 border-y border-rule py-5"
            photoUpload={
              userId
                ? {
                    userId,
                    avatarUrl: avatarUrlDraft,
                    avatarDisplay: avatarDisplayDraft,
                    onAvatarUrlChange: (url) => {
                      onAvatarUrlChange(url);
                      onRefreshProfile();
                    },
                    onAvatarDisplayChange: onAvatarDisplayChange,
                  }
                : null
            }
          />
          <Button block onClick={() => onJoin()} disabled={!canJoin}>
            เข้าร่วม
          </Button>
          {authConfigured && !userId ? (
            <>
              <p className="my-3 font-label text-xs text-ink-2">หรือเข้าร่วมแบบ google</p>
              <Button
                block
                type="button"
                variant="secondary"
                onClick={() => {
                  const roomPath = `${window.location.origin}/room/${normalizeRoomCode(code)}`;
                  void onSignInWithGoogle(roomPath).catch((err: unknown) => {
                    toast.error(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
                  });
                }}
              >
                <LogIn size={17} aria-hidden />
                เข้าสู่ระบบด้วย
                <img src="/google-icon.svg" alt="" width={17} height={17} aria-hidden />
              </Button>
            </>
          ) : null}
          {joinError?.includes('ไม่พบห้อง') && (
            <Button variant="secondary" block onClick={() => navigate('/')} className="mt-3">
              กลับหน้าหลัก
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
