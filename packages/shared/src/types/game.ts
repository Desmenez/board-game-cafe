// ============================================================
// Game Plugin Interface
// ============================================================
// Every game must implement this interface.
// To add a new game, create a new module that exports a GameDefinition.

import type { PlayerAvatarConfig } from '../player-avatar.js';
import type { PlayerAvatarDisplay } from '../avatar-url.js';

export interface Player {
  id: string;
  name: string;
  avatar: PlayerAvatarConfig;
  /**
   * Optional uploaded profile photo (Supabase Storage public URL).
   * Shown only when `avatarDisplay` is `photo`.
   */
  avatarUrl?: string;
  /** Prefer DiceBear (`character`) or uploaded photo (`photo`). Defaults to character. */
  avatarDisplay?: PlayerAvatarDisplay;
  connected: boolean;
  /**
   * Timestamp (ms) when the player disconnected.
   * Used to allow reconnect within a grace window.
   */
  disconnectedAt?: number;
  /**
   * Optional linked account id (`profiles.id` / auth user id).
   * Seat identity remains `id` (playerToken); guests omit this.
   */
  userId?: string;
}

export interface GameResult {
  winners: string[]; // player IDs
  reason: string;
}

export interface GameDefinition<TState = unknown, TAction = unknown> {
  /** Unique game identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Min players required */
  minPlayers: number;
  /** Max players allowed */
  maxPlayers: number;
  /** Thumbnail path (relative to game assets) */
  thumbnail: string;

  /** Initialize game state for the given players */
  setup(players: Player[], options?: unknown): TState;

  /** Process a player action, returns the new state */
  onAction(state: TState, playerId: string, action: TAction): TState;

  /**
   * Returns the view of the game state for a specific player.
   * Use this to hide secret information (e.g., other players' roles).
   */
  getPlayerView(state: TState, playerId: string): unknown;

  /** Check if the game is over. Returns null if still in progress. */
  isGameOver(state: TState): GameResult | null;
}

// ============================================================
// Game Metadata (for catalog display)
// ============================================================

export interface GameMeta {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  thumbnail: string;
}
