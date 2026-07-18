import { normalizePlayerAvatar } from 'shared';
import type { PlayerAvatarConfig } from 'shared';
import { cn } from '../../utils/cn';
import { renderPlayerAvatarDataUri } from './dicebear';
import { usePlayerAvatar } from './playerAvatarContext';

export interface PlayerAvatarProps {
  playerId: string;
  name: string;
  avatar?: PlayerAvatarConfig;
  size?: number;
  className?: string;
  decorative?: boolean;
}

export function PlayerAvatar({
  playerId,
  name,
  avatar,
  size = 40,
  className,
  decorative = false,
}: PlayerAvatarProps) {
  const roomAvatar = usePlayerAvatar(playerId);
  const resolved = normalizePlayerAvatar(avatar ?? roomAvatar, playerId || name);
  const src = renderPlayerAvatarDataUri(resolved);

  return (
    <img
      className={cn(
        'block shrink-0 rounded-input border border-rule bg-paper-3 object-cover',
        className,
      )}
      src={src}
      width={size}
      height={size}
      alt={decorative ? '' : `Avatar ของ ${name}`}
      aria-hidden={decorative || undefined}
      draggable={false}
    />
  );
}
