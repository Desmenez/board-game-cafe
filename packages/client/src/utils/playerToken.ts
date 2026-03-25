const TOKEN_KEY_PREFIX = 'boardgame:playerToken:';
const NAME_KEY_PREFIX = 'boardgame:playerName:';

export function normalizeRoomCode(code: string): string {
  return code.toUpperCase().trim();
}

export function createPlayerToken(): string {
  // Browser environment (crypto.randomUUID should exist in modern browsers).
  type CryptoWithRandomUUID = { randomUUID: () => string };
  const cryptoMaybe = typeof crypto !== 'undefined' ? crypto : undefined;
  const randomUUIDFn = (cryptoMaybe as Partial<CryptoWithRandomUUID> | undefined)?.randomUUID;
  if (typeof randomUUIDFn === 'function') return randomUUIDFn();

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
