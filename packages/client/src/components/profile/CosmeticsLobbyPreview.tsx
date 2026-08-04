import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import { CosmeticSeat } from '../player-avatar';

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

  return (
    <CosmeticSeat
      playerId={playerId}
      name={label}
      avatar={avatar}
      avatarUrl={avatarUrl}
      avatarDisplay={avatarDisplay}
      nameplateId={nameplateId}
      titleId={titleId}
      avatarSize={44}
      showYouLabel={showYouLabel}
      rounded="card"
      aria-label={`พรีวิวในล็อบบี้: ${label}`}
    />
  );
}
