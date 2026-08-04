/**
 * Friend code helpers — immutable 6-char codes for add-friend (Phase 3).
 * Full A–Z / 0–9 (includes I/O/0/1). Display name stays separate/editable.
 * Room codes keep the ambiguous-safe alphabet separately.
 */

export const FRIEND_CODE_LENGTH = 6;
/** Matches server `generate_friend_code` (full alphanumeric). */
export const FRIEND_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export const FRIEND_CODE_PATTERN = /^[ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789]{6}$/;

export const PROFILE_DISPLAY_NAME_MAX = 48;

export function normalizeFriendCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function getFriendCodeValidationError(raw: string): string | null {
  const code = normalizeFriendCode(raw);
  if (!FRIEND_CODE_PATTERN.test(code)) {
    return `รหัสเพื่อนต้องเป็น ${FRIEND_CODE_LENGTH} ตัว (A–Z / 0–9)`;
  }
  return null;
}

/** @deprecated Use getFriendCodeValidationError — handle is now an immutable friend code. */
export function getProfileHandleValidationError(raw: string): string | null {
  return getFriendCodeValidationError(raw);
}

export function normalizeProfileHandle(raw: string): string {
  return normalizeFriendCode(raw);
}

export const PROFILE_HANDLE_MIN = FRIEND_CODE_LENGTH;
export const PROFILE_HANDLE_MAX = FRIEND_CODE_LENGTH;

export function getProfileDisplayNameValidationError(raw: string): string | null {
  const name = raw.trim();
  if (!name) return 'กรุณาใส่ชื่อที่แสดง';
  if (name.length > PROFILE_DISPLAY_NAME_MAX) {
    return `ชื่อยาวได้ไม่เกิน ${PROFILE_DISPLAY_NAME_MAX} ตัวอักษร`;
  }
  return null;
}

export interface UserProfile {
  id: string;
  googleSub: string;
  /** Immutable friend code (6 chars). */
  handle: string;
  displayName: string;
  avatarConfig: unknown;
  /** Uploaded profile photo URL, or null/undefined when using DiceBear only. */
  avatarUrl?: string | null;
  /** character = Micah; photo = avatarUrl when present. */
  avatarDisplay?: 'character' | 'photo';
  /** Catalog nameplate id; null/undefined = default. */
  equippedNameplateId?: string | null;
  /** Catalog title id; null/undefined/none = no title. */
  equippedTitleId?: string | null;
  showOnLeaderboard: boolean;
  createdAt: string;
  updatedAt: string;
}
