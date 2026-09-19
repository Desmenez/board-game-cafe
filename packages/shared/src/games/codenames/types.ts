import type { GameResult } from '../../platform/game.js';

export type CodenamesTeam = 'red' | 'blue';
export type CodenamesRole = 'spymaster' | 'operative';
export type CodenamesCardRole = CodenamesTeam | 'neutral' | 'assassin';
export type CodenamesTurnStage = 'clue' | 'guess';
export type CodenamesBoardVariant = 'words' | 'pictures';

export interface CodenamesLobbyOptions {
  boardVariant: CodenamesBoardVariant;
}

export function defaultCodenamesLobbyOptions(): CodenamesLobbyOptions {
  return { boardVariant: 'words' };
}

export function parseCodenamesLobbyOptions(raw: unknown): CodenamesLobbyOptions {
  if (!raw || typeof raw !== 'object') return defaultCodenamesLobbyOptions();
  const o = raw as Record<string, unknown>;
  return {
    boardVariant: o.boardVariant === 'pictures' ? 'pictures' : 'words',
  };
}

export interface CodenamesPlayerSeat {
  id: string;
  name: string;
  team: CodenamesTeam;
  role: CodenamesRole;
}

export interface CodenamesCardView {
  index: number;
  /** Thai word on the card. Empty in Pictures mode. */
  word: string;
  /** Cloudinary public id for Pictures mode. */
  imageKey?: string;
  /** CDN URL for Pictures mode. */
  imageUrl?: string;
  revealed: boolean;
  /** Visible to everyone once opened, otherwise only to spymasters. */
  revealedRole?: CodenamesCardRole;
  /** Spymaster-only hidden role of unopened cards. */
  roleHint?: CodenamesCardRole;
  revealedByTeam?: CodenamesTeam;
}

export interface CodenamesClueView {
  team: CodenamesTeam;
  byPlayerId: string;
  clueWord: string;
  clueCount: number;
}

export interface CodenamesPlayerView {
  phase: 'role_reveal' | 'playing' | 'game_over';
  myId: string;
  players: CodenamesPlayerSeat[];
  cards: CodenamesCardView[];
  boardVariant: CodenamesBoardVariant;
  startingTeam: CodenamesTeam;
  turnTeam: CodenamesTeam;
  turnStage: CodenamesTurnStage;
  redRemaining: number;
  blueRemaining: number;
  currentClue?: CodenamesClueView;
  guessesUsedThisTurn: number;
  guessesRemainingThisTurn: number;
  canAct: boolean;
  myTeam: CodenamesTeam;
  myRole: CodenamesRole;
  pendingGuessByPlayer: Record<string, number | undefined>;
  consensusGuessCardIndex?: number;
  hasAcknowledgedRole?: boolean;
  roleAcknowledgeProgress?: { current: number; total: number };
  lastEvent: string;
  gameResult?: GameResult;
}

export type CodenamesAction =
  | { type: 'acknowledge_role' }
  | { type: 'give_clue'; clueWord: string; clueCount: number }
  | { type: 'select_guess'; cardIndex: number }
  | { type: 'confirm_guess' }
  | { type: 'end_guesses' };
