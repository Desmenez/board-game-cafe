import type { GameResult } from './game.js';

// ============================================================
// Love Letter — Classic 2–4 players (16 cards)
// ============================================================

export type LoveLetterEdition = 'classic' | 'premium';

export interface LoveLetterLobbyOptions {
  edition: LoveLetterEdition;
}

export function defaultLoveLetterLobbyOptions(): LoveLetterLobbyOptions {
  return { edition: 'classic' };
}

export function parseLoveLetterLobbyOptions(raw: unknown): LoveLetterLobbyOptions {
  const defaults = defaultLoveLetterLobbyOptions();
  if (!raw || typeof raw !== 'object') return defaults;
  const o = raw as Record<string, unknown>;
  const edition = o.edition === 'premium' ? 'premium' : 'classic';
  return { edition };
}

export function loveLetterEditionPlayerBounds(edition: LoveLetterEdition): {
  min: number;
  max: number;
} {
  if (edition === 'premium') return { min: 5, max: 8 };
  return { min: 2, max: 4 };
}

export function loveLetterEditionLabel(edition: LoveLetterEdition): string {
  return edition === 'premium' ? 'Premium' : 'Classic';
}

export type LoveLetterRole =
  | 'guard'
  | 'priest'
  | 'baron'
  | 'handmaid'
  | 'prince'
  | 'king'
  | 'countess'
  | 'princess';

/** Premium expansion roles (5–8 players) — stub for future use */
export type LoveLetterPremiumRole =
  | 'bishop'
  | 'dowager_queen'
  | 'constable'
  | 'count'
  | 'sycophant'
  | 'baroness'
  | 'cardinal'
  | 'guard_dougual'
  | 'jester'
  | 'assassin';

export interface LoveLetterCard {
  id: string;
  role: LoveLetterRole;
  rank: number;
}

export type LoveLetterPhase = 'playing' | 'round_end' | 'game_over';

export interface LoveLetterPlayerState {
  id: string;
  name: string;
  hand: LoveLetterCard[];
  discardPile: LoveLetterCard[];
  inRound: boolean;
  affectionTokens: number;
  /** Immune to other players' card effects until the start of this player's next turn */
  handmaidProtected: boolean;
}

export interface LoveLetterRoundSummary {
  roundNo: number;
  winnerIds: string[];
  winnerNames: string[];
  reason: 'highest_hand' | 'last_standing' | 'deck_empty';
  revealedHands: { playerId: string; playerName: string; card: LoveLetterCard | null }[];
}

export type LoveLetterPendingAction =
  | {
      mode: 'choose_discard';
      actorId: string;
      legalCardIds: string[];
    }
  | {
      mode: 'target_player';
      actorId: string;
      effectRole: LoveLetterRole;
      targets: { id: string; name: string }[];
    }
  | {
      mode: 'guard_guess';
      actorId: string;
      targetPlayerId: string;
      targetName: string;
    }
  | {
      mode: 'priest_peek';
      actorId: string;
      targetPlayerId: string;
      targetName: string;
      card: LoveLetterCard;
    };

export interface LoveLetterState {
  phase: LoveLetterPhase;
  edition: LoveLetterEdition;
  roundNo: number;
  currentPlayerId: string;
  playerOrder: string[];
  drawPile: LoveLetterCard[];
  burnedCard: LoveLetterCard | null;
  setAsideCards: LoveLetterCard[];
  players: LoveLetterPlayerState[];
  lastRoundSummary: LoveLetterRoundSummary | null;
  pendingAction: LoveLetterPendingAction | null;
  roundStarterId: string;
  tokensToWin: number;
  lastEvent: string;
  result: GameResult | null;
}

export type LoveLetterAction =
  | { type: 'choose_discard'; cardId: string }
  | { type: 'resolve_target'; targetPlayerId: string }
  | { type: 'resolve_guard_guess'; rank: number }
  | { type: 'ack_peek' }
  | { type: 'ack_round_summary' };

export interface LoveLetterPublicPlayer {
  id: string;
  name: string;
  handCount: number;
  discardPile: LoveLetterCard[];
  inRound: boolean;
  affectionTokens: number;
  handmaidProtected: boolean;
  isCurrent: boolean;
}

export interface LoveLetterPlayerView {
  phase: LoveLetterPhase;
  edition: LoveLetterEdition;
  roundNo: number;
  myHand: LoveLetterCard[];
  currentPlayerId: string;
  drawPileCount: number;
  setAsideCards: LoveLetterCard[];
  players: LoveLetterPublicPlayer[];
  lastRoundSummary: LoveLetterRoundSummary | null;
  pendingAction: LoveLetterPendingAction | null;
  tokensToWin: number;
  lastEvent: string;
  gameResult: GameResult | null;
}

export function loveLetterTokensToWin(playerCount: number): number {
  if (playerCount <= 2) return 7;
  if (playerCount === 3) return 5;
  return 4;
}
