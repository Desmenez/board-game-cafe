import type { Player, GameMeta } from './game.js';

// ============================================================
// Room Types
// ============================================================

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Room {
  code: string;
  gameId: string;
  gameMeta: GameMeta;
  hostId: string;
  players: Player[];
  status: RoomStatus;
  createdAt: number;
}

// ============================================================
// Socket.IO Event Maps
// ============================================================

/** Events sent from Client → Server */
export interface ClientToServerEvents {
  'create-room': (
    data: { gameId: string; playerName: string; playerToken?: string },
    callback: (res: {
      success: boolean;
      code?: string;
      error?: string;
      playerToken?: string;
    }) => void,
  ) => void;
  'join-room': (
    data: { code: string; playerName: string; playerToken?: string },
    callback: (res: { success: boolean; error?: string; reconnected?: boolean }) => void,
  ) => void;
  'leave-room': () => void;
  'start-game': (options?: unknown) => void;
  /**
   * Restart the current game round (e.g. when game is finished) without removing the room.
   * Typically host-only.
   */
  'restart-game': () => void;
  'game-action': (action: unknown) => void;
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
}
