import { isAllowedAvatarUrl, normalizePlayerAvatar } from 'shared';
import type { PlayerAvatarConfig } from 'shared';
import { isAuthConfigured } from '../../auth';
import { cn } from '../../utils/cn';
import { renderPlayerAvatarDataUri } from './dicebear';
import { usePlayerAvatar } from './playerAvatarContext';

export interface PlayerAvatarProps {
  playerId: string;
  name: string;
  avatar?: PlayerAvatarConfig;
  /** Uploaded photo URL — preferred over DiceBear when allowlisted. */
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  decorative?: boolean;
}

function resolvePhotoUrl(
  explicit: string | null | undefined,
  fromSeat: string | undefined,
): string | undefined {
  const candidate = explicit || fromSeat;
  if (!candidate) return undefined;
  if (!isAuthConfigured()) return undefined;
  const origin = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!origin) return undefined;
  return isAllowedAvatarUrl(candidate, origin) ? candidate : undefined;
}

export function PlayerAvatar({
  playerId,
  name,
  avatar,
  avatarUrl,
  size = 40,
  className,
  decorative = false,
}: PlayerAvatarProps) {
  const roomSeat = usePlayerAvatar(playerId);
  const photoSrc = resolvePhotoUrl(avatarUrl, roomSeat?.avatarUrl);
  const resolved = normalizePlayerAvatar(avatar ?? roomSeat?.avatar, playerId || name);
  const src = photoSrc ?? renderPlayerAvatarDataUri(resolved);

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
