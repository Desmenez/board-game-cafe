const TOKEN_KEY_PREFIX = 'boardgame:playerToken:';
const NAME_KEY_PREFIX = 'boardgame:playerName:';

export function normalizeRoomCode(code: string): string {
  return code.toUpperCase().trim();
}

export function createPlayerToken(): string {
  // Browser: must call randomUUID on the crypto object — detached calls throw Illegal invocation.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `p_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function getStoredPlayerToken(roomCode: string): string | null {
  try {
    return localStorage.getItem(`${TOKEN_KEY_PREFIX}${roomCode}`);
  } catch {
    return null;
  }
}

export function setStoredPlayerToken(roomCode: string, token: string): void {
  try {
    localStorage.setItem(`${TOKEN_KEY_PREFIX}${roomCode}`, token);
  } catch {
    // ignore
  }
}

export function getStoredPlayerName(roomCode: string): string | null {
  try {
    return localStorage.getItem(`${NAME_KEY_PREFIX}${roomCode}`);
  } catch {
    return null;
  }
}

export function setStoredPlayerName(roomCode: string, name: string): void {
  try {
    localStorage.setItem(`${NAME_KEY_PREFIX}${roomCode}`, name);
  } catch {
    // ignore
  }
}

export interface StoredRoomSession {
  code: string;
  /** Name shown in that room (from local storage). */
  displayName: string;
}

/** Rooms where this browser still has a player token (can rejoin via /room/:code). */
export function listStoredRoomSessions(): StoredRoomSession[] {
  if (typeof localStorage === 'undefined') return [];

  const out: StoredRoomSession[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(TOKEN_KEY_PREFIX)) continue;
      const rawCode = key.slice(TOKEN_KEY_PREFIX.length);
      if (!rawCode) continue;
      const token = localStorage.getItem(key);
      if (!token) continue;
      const code = normalizeRoomCode(rawCode);
      const displayName = getStoredPlayerName(code)?.trim() || 'ผู้เล่น';
      out.push({ code, displayName });
    }
  } catch {
    return [];
  }

  out.sort((a, b) => a.code.localeCompare(b.code));
  return out;
}

/** Remove stored token + name for this room (this browser will no longer auto-rejoin as that player). */
export function clearStoredRoomSession(roomCode: string): void {
  const code = normalizeRoomCode(roomCode);
  try {
    localStorage.removeItem(`${TOKEN_KEY_PREFIX}${code}`);
    localStorage.removeItem(`${NAME_KEY_PREFIX}${code}`);
  } catch {
    // ignore
  }
}
