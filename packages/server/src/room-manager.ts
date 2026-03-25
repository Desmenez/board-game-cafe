import type { Player, GameMeta } from 'shared';

// ============================================================
// Room Manager — in-memory room storage
// ============================================================

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface ServerRoom {
  code: string;
  gameId: string;
  gameMeta: GameMeta;
  hostId: string;
  players: Player[];
  status: RoomStatus;
  createdAt: number;
  gameState: unknown;
  /**
   * When all players are disconnected, keep room alive for this long (for reconnect)
   * then auto-clean it.
   */
  cleanupAt?: number;
}

const MAX_ROOMS = 10;
const CODE_LENGTH = 6;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
const RECONNECT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const rooms = new Map<string, ServerRoom>();

function generateCode(): string {
  let code: string;
  do {
    code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

export function createRoom(
  gameId: string,
  gameMeta: GameMeta,
  hostPlayer: Player,
): ServerRoom | null {
  if (rooms.size >= MAX_ROOMS) return null;

  const code = generateCode();
  const normalizedHost: Player = {
    ...hostPlayer,
    connected: true,
    disconnectedAt: undefined,
  };
  const room: ServerRoom = {
    code,
    gameId,
    gameMeta,
    hostId: normalizedHost.id,
    players: [normalizedHost],
    status: 'waiting',
    createdAt: Date.now(),
    gameState: null,
  };
  rooms.set(code, room);
  console.log(`🏠 Room created: ${code} (game: ${gameId}, host: ${normalizedHost.name})`);
  return room;
}

export function getRoom(code: string): ServerRoom | undefined {
  return rooms.get(code);
}

export function joinRoom(code: string, player: Player): ServerRoom | null {
  const room = rooms.get(code);
  if (!room) return null;

  // Don't allow joining a finished room.
  if (room.status === 'finished') return null;

  const existing = room.players.find((p) => p.id === player.id);

  // Reconnect path.
  if (existing) {
    if (!existing.connected) {
      const disconnectedAt = existing.disconnectedAt ?? 0;
      const stillInWindow = Date.now() - disconnectedAt <= RECONNECT_WINDOW_MS;
      if (!stillInWindow) return null;
    }

    existing.name = player.name;
    existing.connected = true;
    existing.disconnectedAt = undefined;
    room.cleanupAt = undefined; // cancel cleanup since someone is back

    console.log(`🔁 ${player.name} reconnected to room ${code}`);
    return room;
  }

  // New join path: only allowed during waiting.
  if (room.status !== 'waiting') return null;
  if (room.players.length >= room.gameMeta.maxPlayers) return null;

  room.players.push({
    ...player,
    connected: true,
    disconnectedAt: undefined,
  });
  console.log(`👤 ${player.name} joined room ${code}`);
  return room;
}

/**
 * Tab close / network drop — keep the player in the room (waiting or in-game) so they can reconnect with the same token.
 */
export function markPlayerDisconnected(code: string, playerId: string): ServerRoom | null {
  const room = rooms.get(code);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;

  player.connected = false;
  player.disconnectedAt = Date.now();

  if (room.players.length > 0 && room.players.every((p) => !p.connected)) {
    if (!room.cleanupAt) room.cleanupAt = Date.now() + RECONNECT_WINDOW_MS;
  } else {
    room.cleanupAt = undefined;
  }

  return room;
}

/** Explicit "leave room" from the client — removes from lobby; during a match, same as disconnect (soft). */
export function leaveRoom(code: string, playerId: string): ServerRoom | null {
  const room = rooms.get(code);
  if (!room) return null;

  if (room.status === 'waiting') {
    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === 0) {
      rooms.delete(code);
      console.log(`🗑️ Room ${code} deleted (empty)`);
      return null;
    }

    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
      console.log(`👑 New host in room ${code}: ${room.players[0].name}`);
    }

    if (room.players.length > 0 && room.players.every((p) => !p.connected)) {
      if (!room.cleanupAt) room.cleanupAt = Date.now() + RECONNECT_WINDOW_MS;
    } else {
      room.cleanupAt = undefined;
    }

    return room;
  }

  return markPlayerDisconnected(code, playerId);
}

export function removeRoom(code: string): void {
  rooms.delete(code);
  console.log(`🗑️ Room ${code} removed`);
}

export function listRooms(): ServerRoom[] {
  return Array.from(rooms.values());
}

export function getRoomByPlayerId(playerId: string): ServerRoom | undefined {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.id === playerId)) {
      return room;
    }
  }
  return undefined;
}

export function setPlayerConnected(playerId: string, connected: boolean): void {
  const room = getRoomByPlayerId(playerId);
  if (!room) return;
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return;

  player.connected = connected;

  if (connected) {
    player.disconnectedAt = undefined;
    room.cleanupAt = undefined; // cancel pending cleanup
  } else {
    player.disconnectedAt = Date.now();
    if (room.players.length > 0 && room.players.every((p) => !p.connected)) {
      if (!room.cleanupAt) room.cleanupAt = Date.now() + RECONNECT_WINDOW_MS;
    }
  }
}

// Periodic cleanup for rooms where everyone disconnected.
const CLEANUP_SWEEP_INTERVAL_MS = 60 * 1000;

type GlobalWithCleanup = typeof globalThis & {
  __boardgameRoomCleanupStarted?: boolean;
};

const globalWithCleanup = globalThis as GlobalWithCleanup;
if (!globalWithCleanup.__boardgameRoomCleanupStarted) {
  globalWithCleanup.__boardgameRoomCleanupStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
      if (!room.cleanupAt) continue;
      if (now < room.cleanupAt) continue;
      if (room.players.length > 0 && room.players.every((p) => !p.connected)) {
        rooms.delete(code);
        console.log(`🧹 Room ${code} cleaned up after reconnect window`);
      } else {
        room.cleanupAt = undefined;
      }
    }
  }, CLEANUP_SWEEP_INTERVAL_MS).unref?.();
}
