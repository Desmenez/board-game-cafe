// ============================================================
// Game Plugin Interface
// ============================================================
// Every game must implement this interface.
// To add a new game, create a new module that exports a GameDefinition.

export interface Player {
  id: string;
  name: string;
  connected: boolean;
  /**
   * Timestamp (ms) when the player disconnected.
   * Used to allow reconnect within a grace window.
   */
  disconnectedAt?: number;
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
