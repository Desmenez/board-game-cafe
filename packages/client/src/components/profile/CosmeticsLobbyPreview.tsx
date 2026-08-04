import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import { PlayerAvatar, PlayerNameplate } from '../player-avatar';

export interface CosmeticsLobbyPreviewProps {
  playerId: string;
  name: string;
  avatar?: PlayerAvatarConfig | null;
  avatarUrl?: string | null;
  avatarDisplay?: PlayerAvatarDisplay | null;
  nameplateId?: string | null;
  titleId?: string | null;
  /** Show “(คุณ)” like the lobby seat row. */
  showYouLabel?: boolean;
}

/**
 * Lobby-style seat preview: avatar + nameplate (+ optional title).
 */
export function CosmeticsLobbyPreview({
  playerId,
  name,
  avatar,
  avatarUrl,
  avatarDisplay,
  nameplateId,
  titleId,
  showYouLabel = true,
}: CosmeticsLobbyPreviewProps) {
  const label = name.trim() || 'ชื่อของคุณ';

  return (
    <div
      className="flex items-center gap-3 rounded-card border border-rule bg-paper-3 px-3 py-3"
      aria-label={`พรีวิวในล็อบบี้: ${label}`}
    >
      <PlayerAvatar
        playerId={playerId}
        name={label}
        avatar={avatar ?? undefined}
        avatarUrl={avatarUrl}
        avatarDisplay={avatarDisplay}
        size={44}
        decorative
        className="size-11 shrink-0"
      />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <PlayerNameplate
          name={label}
          nameplateId={nameplateId}
          titleId={titleId}
          className="min-w-0"
          nameClassName="font-bold"
        />
        {showYouLabel ? <span className="shrink-0 text-sm text-ink-2">(คุณ)</span> : null}
      </div>
    </div>
  );
}
