/** Max characters for a lobby display name (after trim). */
export const MAX_PLAYER_DISPLAY_NAME_LENGTH = 20;

/** Letters (any language), combining marks (e.g. Thai vowels/tone marks), digits, and spaces. */
const PLAYER_DISPLAY_NAME_CHAR = /[\p{L}\p{M}\p{N} ]/u;
const PLAYER_DISPLAY_NAME_FULL = /^[\p{L}\p{M}\p{N} ]+$/u;

export const PLAYER_DISPLAY_NAME_HINT = `(สูงสุด ${MAX_PLAYER_DISPLAY_NAME_LENGTH} อักขระ)`;

/** Strip invalid characters and cap length while the user types. */
export function sanitizePlayerDisplayNameInput(raw: string): string {
  const chars = [...raw].filter((ch) => PLAYER_DISPLAY_NAME_CHAR.test(ch));
  return chars.join('').slice(0, MAX_PLAYER_DISPLAY_NAME_LENGTH);
}

export function getPlayerDisplayNameValidationError(raw: string): string | null {
  const name = raw.trim();
  if (!name) return 'กรุณาใส่ชื่อ';
  if (name.length > MAX_PLAYER_DISPLAY_NAME_LENGTH) {
    return `ชื่อต้องไม่เกิน ${MAX_PLAYER_DISPLAY_NAME_LENGTH} อักขระ`;
  }
  if (!PLAYER_DISPLAY_NAME_FULL.test(name)) {
    return 'ใช้ได้เฉพาะตัวอักษร ตัวเลข และช่องว่าง';
  }
  return null;
}

export function isValidPlayerDisplayName(raw: string): boolean {
  return getPlayerDisplayNameValidationError(raw) === null;
}

export function normalizePlayerDisplayName(raw: string): string | null {
  const name = raw.trim();
  if (getPlayerDisplayNameValidationError(name) !== null) return null;
  return name;
}

export function playerDisplayNameKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}
