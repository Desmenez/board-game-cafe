import {
  isAllowedAvatarUrl,
  isPlausibleAvatarStorageUrl,
  normalizePlayerAvatar,
  normalizePlayerAvatarDisplay,
  shouldShowAvatarPhoto,
} from 'shared';
import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import { isAuthConfigured } from '../../auth';
import { cn } from '../../utils/cn';
import { renderPlayerAvatarDataUri } from './dicebear';
import { usePlayerAvatar } from './playerAvatarContext';

export interface PlayerAvatarProps {
  playerId: string;
  name: string;
  avatar?: PlayerAvatarConfig;
  /** Uploaded photo URL — used when display mode is `photo`. */
  avatarUrl?: string | null;
  /** Prefer character (Micah) or photo. Defaults from room seat, else character. */
  avatarDisplay?: PlayerAvatarDisplay | null;
  size?: number;
  className?: string;
  decorative?: boolean;
}

function resolvePhotoUrl(
  explicit: string | null | undefined,
  fromSeat: string | undefined,
  fromSeatTrusted: boolean,
): string | undefined {
  const candidate = explicit || fromSeat;
  if (!candidate) return undefined;

  // Seat URLs were allowlisted on the server — trust path shape for peers/guests.
  if (fromSeatTrusted && fromSeat && candidate === fromSeat) {
    return isPlausibleAvatarStorageUrl(candidate) ? candidate : undefined;
  }

  if (!isAuthConfigured()) return undefined;
  const origin = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!origin) {
    return isPlausibleAvatarStorageUrl(candidate) ? candidate : undefined;
  }
  return isAllowedAvatarUrl(candidate, origin) ? candidate : undefined;
}

export function PlayerAvatar({
  playerId,
  name,
  avatar,
  avatarUrl,
  avatarDisplay,
  size = 40,
  className,
  decorative = false,
}: PlayerAvatarProps) {
  const roomSeat = usePlayerAvatar(playerId);
  const display = normalizePlayerAvatarDisplay(
    avatarDisplay ?? roomSeat?.avatarDisplay ?? 'character',
  );
  const seatUrl = roomSeat?.avatarUrl;
  const rawUrl = avatarUrl || seatUrl;
  const photoSrc = shouldShowAvatarPhoto(display, rawUrl)
    ? resolvePhotoUrl(avatarUrl, seatUrl, Boolean(seatUrl && rawUrl === seatUrl))
    : undefined;
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
