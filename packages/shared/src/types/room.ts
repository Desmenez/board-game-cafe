import type { PlayerAvatarConfig } from '../player-avatar.js';
import type { Player, GameMeta } from './game.js';

// ============================================================
// Room Types
// ============================================================

export type RoomStatus = 'waiting' | 'playing' | 'finished';

/** Grace period for reconnect after disconnect (client recovery + server room cleanup). */
export const RECONNECT_WINDOW_MS = 10 * 60 * 1000;

export interface Room {
  code: string;
  gameId: string;
  gameMeta: GameMeta;
  hostId: string;
  players: Player[];
  status: RoomStatus;
  createdAt: number;
  /** ตั้งค่าล็อบบี้ที่หัวห้องเลือก — sync ให้ทุกคนเห็น (รอบ start-game ใช้ค่านี้ถ้ามี) */
  lobbyOptions?: unknown;
}

/** Returns a Thai error when player count is outside game bounds, else null. */
export function getRoomPlayerCountError(
  playerCount: number,
  minPlayers: number,
  maxPlayers: number,
): string | null {
  if (playerCount < minPlayers) {
    return `ต้องมีผู้เล่นอย่างน้อย ${minPlayers} คน`;
  }
  if (playerCount > maxPlayers) {
    return `เกมนี้รองรับได้สูงสุด ${maxPlayers} คน`;
  }
  return null;
}

// ============================================================
// Socket.IO Event Maps
// ============================================================

/** Events sent from Client → Server */
export interface ClientToServerEvents {
  'create-room': (
    data: {
      gameId: string;
      playerName: string;
      playerAvatar: PlayerAvatarConfig;
      playerToken?: string;
    },
    callback: (res: {
      success: boolean;
      code?: string;
      error?: string;
      playerToken?: string;
    }) => void,
  ) => void;
  'join-room': (
    data: {
      code: string;
      playerName: string;
      playerAvatar: PlayerAvatarConfig;
      playerToken?: string;
    },
    callback: (res: { success: boolean; error?: string; reconnected?: boolean }) => void,
  ) => void;
  'leave-room': () => void;
  /** Lobby only — host removes another player from the room. */
  'kick-player': (
    data: { targetPlayerId: string },
    callback: (res: { success: boolean; error?: string }) => void,
  ) => void;
  /** ล็อบบี้เท่านั้น — เฉพาะหัวห้อง; อัปเดตให้ทุกคนใน room เห็นผ่าน room-updated */
  'update-lobby-options': (options: unknown) => void;
  /** ล็อบบี้เท่านั้น — เฉพาะหัวห้อง; เปลี่ยนเกมในห้อง (รหัสห้องเดิม) */
  'update-room-game': (
    data: { gameId: string },
    callback: (res: { success: boolean; error?: string }) => void,
  ) => void;
  /** ล็อบบี้เท่านั้น — เปลี่ยนชื่อที่แสดงของตัวเอง (ห้ามซ้ำกับคนอื่น) */
  'update-player-name': (
    data: { name: string },
    callback: (res: { success: boolean; error?: string }) => void,
  ) => void;
  /** ล็อบบี้เท่านั้น — เปลี่ยน avatar ของตัวเองจากค่าที่ server ตรวจสอบแล้ว */
  'update-player-avatar': (
    data: { avatar: PlayerAvatarConfig },
    callback: (res: { success: boolean; error?: string }) => void,
  ) => void;
  'start-game': (options?: unknown) => void;
  /**
   * Host-only: end the current round and return all players to the lobby (same room code).
   * Clears game state; host can start a new round from the waiting room.
   */
  'restart-game': () => void;
  'game-action': (action: unknown) => void;
  /** Re-fetch filtered game-state while a match is in progress (reconnect / refresh). */
  'sync-game-state': (callback?: (res: { ok: boolean }) => void) => void;
}

/** Events sent from Server → Client */
export interface ServerToClientEvents {
  'room-updated': (room: Room) => void;
  'game-started': () => void;
  'game-state': (state: unknown) => void;
  'game-over': (result: { winners: string[]; reason: string }) => void;
  error: (message: string) => void;
  'player-disconnected': (playerId: string) => void;
  'player-reconnected': (playerId: string) => void;
  /** You were removed from the room by the host (lobby kick). `code` lets the client clear stored session so it does not auto-rejoin. */
  'kicked-from-room': (payload: { code: string }) => void;
}
