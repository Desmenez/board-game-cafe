/** Max uploaded profile photo size (bytes) — matches Storage bucket limit. */
export const PROFILE_AVATAR_MAX_BYTES = 512_000;

/** Storage object path relative to the `avatars` bucket. */
export function profileAvatarObjectPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

/**
 * Public object path prefix inside a Supabase project origin.
 * Full URL: `{origin}/storage/v1/object/public/avatars/{userId}/avatar.jpg`
 */
export const PROFILE_AVATAR_PUBLIC_PATH_PREFIX = '/storage/v1/object/public/avatars/';

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

/** Normalize optional wire value: valid URL string, or undefined to omit/clear. */
export function normalizeOptionalAvatarUrl(
  value: unknown,
  supabaseOrigin: string | null | undefined,
): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string') return undefined;
  if (!supabaseOrigin) return undefined;
  return isAllowedAvatarUrl(value, supabaseOrigin) ? value : undefined;
}
