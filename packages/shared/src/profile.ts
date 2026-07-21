/**
 * Profile / handle helpers shared by client validation and docs.
 * Handles may include Thai and other Unicode letters; see ADR 0002.
 */

export const PROFILE_HANDLE_MIN = 2;
export const PROFILE_HANDLE_MAX = 32;
export const PROFILE_DISPLAY_NAME_MAX = 48;

/** Forbidden in handles: whitespace and @ / # */
const HANDLE_FORBIDDEN = /[\s@/#]/;

export function normalizeProfileHandle(raw: string): string {
  return raw.trim();
}

export function getProfileHandleValidationError(raw: string): string | null {
  const handle = normalizeProfileHandle(raw);
  if (handle.length < PROFILE_HANDLE_MIN) {
    return `แฮนเดิลต้องมีอย่างน้อย ${PROFILE_HANDLE_MIN} ตัวอักษร`;
  }
  if (handle.length > PROFILE_HANDLE_MAX) {
    return `แฮนเดิลยาวได้ไม่เกิน ${PROFILE_HANDLE_MAX} ตัวอักษร`;
  }
  if (HANDLE_FORBIDDEN.test(handle)) {
    return 'แฮนเดิลห้ามมีช่องว่าง หรืออักขระ @ / #';
  }
  return null;
}

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
  handle: string;
  displayName: string;
  avatarConfig: unknown;
  showOnLeaderboard: boolean;
  createdAt: string;
  updatedAt: string;
}
