import type { PlayerAvatarConfig } from 'shared';
import { normalizePlayerAvatar } from 'shared';
import {
  readGlobalPlayerNameFromStorage,
  writeGlobalPlayerNameToStorage,
} from './playerDisplayName';
import {
  readGlobalPlayerAvatarFromStorage,
  writeGlobalPlayerAvatarToStorage,
} from './playerAvatar';

const GUEST_PROFILE_SNAPSHOT_KEY = 'boardgame:guestProfileSnapshot';

interface GuestProfileSnapshot {
  name: string;
  avatar: PlayerAvatarConfig;
}

function parseSnapshot(raw: string | null): GuestProfileSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { name?: unknown; avatar?: unknown };
    const name = typeof parsed.name === 'string' ? parsed.name : '';
    const avatar = normalizePlayerAvatar(parsed.avatar, 'guest-snapshot');
    return { name, avatar };
  } catch {
    return null;
  }
}

/** Capture current local guest name/avatar once before account profile overwrites it. */
export function ensureGuestProfileSnapshot(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (localStorage.getItem(GUEST_PROFILE_SNAPSHOT_KEY)) return;
    const snapshot: GuestProfileSnapshot = {
      name: readGlobalPlayerNameFromStorage(),
      avatar: readGlobalPlayerAvatarFromStorage(),
    };
    localStorage.setItem(GUEST_PROFILE_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore unavailable storage.
  }
}

/** Restore guest locals after logout. No-op if no snapshot. */
export function restoreGuestProfileSnapshot(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const snapshot = parseSnapshot(localStorage.getItem(GUEST_PROFILE_SNAPSHOT_KEY));
    localStorage.removeItem(GUEST_PROFILE_SNAPSHOT_KEY);
    if (!snapshot) return false;
    writeGlobalPlayerNameToStorage(snapshot.name);
    writeGlobalPlayerAvatarToStorage(snapshot.avatar);
    return true;
  } catch {
    return false;
  }
}

export function clearGuestProfileSnapshot(): void {
  try {
    localStorage.removeItem(GUEST_PROFILE_SNAPSHOT_KEY);
  } catch {
    // Ignore.
  }
}
