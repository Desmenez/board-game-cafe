import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import { PlayerAvatar, PlayerNameplate, nameplateFrameProps } from '../player-avatar';
import { cn } from '../../utils/cn';

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
 * Lobby-style seat preview: art on the seat frame, text name/title on top.
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
  const frame = nameplateFrameProps(nameplateId);

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 overflow-hidden rounded-card border border-rule px-3 py-3',
        !frame.hasArt && 'bg-paper-3',
        frame.className,
      )}
      style={frame.style}
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
        className="relative z-1 size-11 shrink-0"
      />
      <div className="relative z-1 flex min-w-0 flex-1 items-center gap-2">
        <PlayerNameplate
          name={label}
          nameplateId={nameplateId}
          titleId={titleId}
          surface="text"
          className="min-w-0"
          nameClassName="font-bold"
        />
        {showYouLabel ? (
          <span className="player-seat-frame__you shrink-0 text-sm">(คุณ)</span>
        ) : null}
      </div>
    </div>
  );
}
