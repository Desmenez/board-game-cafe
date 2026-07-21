/**
 * Friend code helpers — immutable 6-char codes for add-friend (Phase 3).
 * Same alphabet as room codes (no 0/O/1/I). Display name stays separate/editable.
 */

export const FRIEND_CODE_LENGTH = 6;
/** Matches server `generate_friend_code` / room code alphabet. */
export const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const FRIEND_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export const PROFILE_DISPLAY_NAME_MAX = 48;

export function normalizeFriendCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function getFriendCodeValidationError(raw: string): string | null {
  const code = normalizeFriendCode(raw);
  if (!FRIEND_CODE_PATTERN.test(code)) {
    return `รหัสเพื่อนต้องเป็น ${FRIEND_CODE_LENGTH} ตัว (A–Z / 2–9 ไม่มี 0 O 1 I)`;
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
  showOnLeaderboard: boolean;
  createdAt: string;
  updatedAt: string;
}
