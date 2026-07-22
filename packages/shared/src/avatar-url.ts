/** Max uploaded profile photo size (bytes) — matches Storage bucket limit. */
export const PROFILE_AVATAR_MAX_BYTES = 512_000;

/** How the seat/profile prefers to render the avatar. */
export type PlayerAvatarDisplay = 'character' | 'photo';

export const PLAYER_AVATAR_DISPLAYS = ['character', 'photo'] as const;

/** Storage object path relative to the `avatars` bucket. */
export function profileAvatarObjectPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

/**
 * Public object path prefix inside a Supabase project origin.
 * Full URL: `{origin}/storage/v1/object/public/avatars/{userId}/avatar.jpg`
 */
export const PROFILE_AVATAR_PUBLIC_PATH_PREFIX = '/storage/v1/object/public/avatars/';

export function normalizePlayerAvatarDisplay(value: unknown): PlayerAvatarDisplay {
  return value === 'photo' ? 'photo' : 'character';
}

/**
 * Accept only HTTPS URLs under this project's public avatars bucket.
 * Blocks arbitrary remote images on the socket wire.
 */
export function isAllowedAvatarUrl(url: string, supabaseOrigin: string): boolean {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) return false;
  let parsed: URL;
  let origin: URL;
  try {
    parsed = new URL(url);
    origin = new URL(supabaseOrigin);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  if (parsed.origin !== origin.origin) return false;
  if (!parsed.pathname.startsWith(PROFILE_AVATAR_PUBLIC_PATH_PREFIX)) return false;
  if (parsed.pathname.includes('..')) return false;
  // Expect `{prefix}{uuid}/avatar.jpg` (or .jpeg / .webp / .png)
  const rest = parsed.pathname.slice(PROFILE_AVATAR_PUBLIC_PATH_PREFIX.length);
  if (!/^[0-9a-f-]{36}\/avatar\.(jpe?g|png|webp)$/i.test(rest)) return false;
  return true;
}

/**
 * Looser check for URLs already on a room seat (server-validated).
 * Trusts path shape without requiring a matching Vite env origin.
 */
export function isPlausibleAvatarStorageUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (!parsed.pathname.startsWith(PROFILE_AVATAR_PUBLIC_PATH_PREFIX)) return false;
    if (parsed.pathname.includes('..')) return false;
    const rest = parsed.pathname.slice(PROFILE_AVATAR_PUBLIC_PATH_PREFIX.length);
    return /^[0-9a-f-]{36}\/avatar\.(jpe?g|png|webp)$/i.test(rest);
  } catch {
    return false;
  }
}

/** Normalize optional wire value: valid URL string, or undefined to omit/clear. */
export function normalizeOptionalAvatarUrl(
  value: unknown,
  supabaseOrigin: string | null | undefined,
): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string') return undefined;
  if (!supabaseOrigin) {
    // Still accept plausible storage URLs so seats can carry photos when
    // SUPABASE_URL is briefly unset but the client already uploaded.
    return isPlausibleAvatarStorageUrl(value) ? value : undefined;
  }
  return isAllowedAvatarUrl(value, supabaseOrigin) ? value : undefined;
}

/**
 * Decide whether to show the uploaded photo for this seat/profile.
 * Photo mode without a usable URL falls back to character.
 */
export function shouldShowAvatarPhoto(
  display: PlayerAvatarDisplay | undefined,
  avatarUrl: string | null | undefined,
): avatarUrl is string {
  if (normalizePlayerAvatarDisplay(display) !== 'photo') return false;
  return typeof avatarUrl === 'string' && avatarUrl.length > 0;
}
