import { normalizeRoomCode } from '../utils/playerToken';

/**
 * One-tab session flag: set only when navigating to `/admin` from the home join field.
 * Blocks opening `/admin` directly in the address bar without typing the secret first.
 */
const ADMIN_NAV_FROM_JOIN_KEY = 'boardgame-admin-from-join';

export function grantAdminNavFromJoin(): void {
  try {
    sessionStorage.setItem(ADMIN_NAV_FROM_JOIN_KEY, '1');
  } catch {
    // private mode / disabled storage
  }
}

export function clearAdminNavFromJoin(): void {
  try {
    sessionStorage.removeItem(ADMIN_NAV_FROM_JOIN_KEY);
  } catch {
    // ignore
  }
}

export function hasAdminNavFromJoin(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_NAV_FROM_JOIN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Value of `VITE_ADMIN_SECRET` — sent as `X-Admin-Secret` for admin API calls. */
export function getClientAdminSecret(): string {
  const v = import.meta.env.VITE_ADMIN_SECRET;
  if (typeof v !== 'string') return '';
  return v.trim();
}

/** Typed in full in the join field to open `/admin` — must match `VITE_ADMIN_SECRET` (and server `ADMIN_SECRET`). */
export function isAdminJoinCode(input: string): boolean {
  const secret = getClientAdminSecret();
  if (!secret) return false;
  return normalizeRoomCode(input) === normalizeRoomCode(secret);
}

/** Join input allows 6-char room codes, or longer when admin secret is longer than 6. */
export function adminJoinInputMaxLength(): number {
  const s = getClientAdminSecret();
  return s.length > 0 ? Math.max(6, s.length) : 6;
}
