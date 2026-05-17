/** Max characters for a lobby display name (after trim). */
export const MAX_PLAYER_DISPLAY_NAME_LENGTH = 20;

export function normalizePlayerDisplayName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return null;
  if (name.length > MAX_PLAYER_DISPLAY_NAME_LENGTH) return null;
  return name;
}

export function playerDisplayNameKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}
