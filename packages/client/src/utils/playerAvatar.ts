import {
  createDefaultPlayerAvatar,
  normalizePlayerAvatar,
  normalizePlayerAvatarSeed,
} from 'shared';
import type { PlayerAvatarConfig } from 'shared';

const GLOBAL_AVATAR_KEY = 'boardgame:playerAvatar';
const ROOM_AVATAR_KEY_PREFIX = 'boardgame:playerAvatar:';

function normalizeAvatarRoomCode(code: string): string {
  return code.toUpperCase().trim();
}

export function createPlayerAvatarSeed(): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `avatar_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  return normalizePlayerAvatarSeed(random);
}

export function createRandomPlayerAvatar(): PlayerAvatarConfig {
  return createDefaultPlayerAvatar(createPlayerAvatarSeed());
}

function parseStoredAvatar(raw: string | null, fallbackSeed: string): PlayerAvatarConfig | null {
  if (!raw) return null;
  try {
    return normalizePlayerAvatar(JSON.parse(raw), fallbackSeed);
  } catch {
    return null;
  }
}

export function readGlobalPlayerAvatarFromStorage(): PlayerAvatarConfig {
  const fallback = createRandomPlayerAvatar();
  if (typeof localStorage === 'undefined') return fallback;
  const stored = parseStoredAvatar(localStorage.getItem(GLOBAL_AVATAR_KEY), fallback.seed);
  const avatar = stored ?? fallback;
  writeGlobalPlayerAvatarToStorage(avatar);
  return avatar;
}

export function writeGlobalPlayerAvatarToStorage(avatar: PlayerAvatarConfig): void {
  try {
    localStorage.setItem(GLOBAL_AVATAR_KEY, JSON.stringify(avatar));
  } catch {
    // Storage is a convenience; the room still keeps the avatar in memory.
  }
}

export function getStoredPlayerAvatar(roomCode: string): PlayerAvatarConfig | null {
  try {
    const code = normalizeAvatarRoomCode(roomCode);
    return parseStoredAvatar(localStorage.getItem(`${ROOM_AVATAR_KEY_PREFIX}${code}`), code);
  } catch {
    return null;
  }
}

export function setStoredPlayerAvatar(roomCode: string, avatar: PlayerAvatarConfig): void {
  try {
    const code = normalizeAvatarRoomCode(roomCode);
    localStorage.setItem(`${ROOM_AVATAR_KEY_PREFIX}${code}`, JSON.stringify(avatar));
  } catch {
    // Ignore unavailable or full storage.
  }
}

export function clearStoredPlayerAvatar(roomCode: string): void {
  try {
    localStorage.removeItem(`${ROOM_AVATAR_KEY_PREFIX}${normalizeAvatarRoomCode(roomCode)}`);
  } catch {
    // Ignore unavailable storage.
  }
}
