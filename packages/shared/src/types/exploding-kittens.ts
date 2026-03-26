// ============================================================
// Exploding Kittens Types (Original-first, mode-ready)
// ============================================================

export type ExplodingKittensMode = 'original';

export type ExplodingKittensPhase =
  | 'turn'
  | 'reaction'
  | 'favor_target'
  | 'favor_give'
  | 'defuse_reinsert'
  | 'game_over';

export type ExplodingKittensCardType =
  | 'exploding_kitten'
  | 'defuse'
  | 'attack'
  | 'skip'
  | 'shuffle'
  | 'see_future'
  | 'favor'
  | 'nope'
  | 'cat_taco'
  | 'cat_melon'
  | 'cat_beard'
  | 'cat_rainbow'
  | 'cat_potato';

export interface ExplodingKittensCard {
  id: string;
  type: ExplodingKittensCardType;
}

export interface ExplodingKittensPlayerState {
  id: string;
  name: string;
  alive: boolean;
  hand: ExplodingKittensCard[];
  pendingTurns: number;
}

export interface PendingAction {
  id: string;
  actorId: string;
  type: 'attack' | 'skip' | 'shuffle' | 'see_future' | 'favor';
  nopeCount: number;
  passedBy: string[];
}

export interface ExplodingKittensState {
  mode: ExplodingKittensMode;
  phase: ExplodingKittensPhase;
  players: ExplodingKittensPlayerState[];
  drawPile: ExplodingKittensCard[];
  discardPile: ExplodingKittensCard[];
  currentPlayerIndex: number;
  pendingAction?: PendingAction;
  favorFromId?: string;
  favorTargetId?: string;
  defusingPlayerId?: string;
  defusingKitten?: ExplodingKittensCard;
  seenTopByPlayer: Record<string, ExplodingKittensCardType[]>;
  winnerId?: string;
  lastEvent?: string;
}

export interface ExplodingKittensPlayerView {
  mode: ExplodingKittensMode;
  phase: ExplodingKittensPhase;
  me: { id: string; name: string; alive: boolean; pendingTurns: number };
  players: { id: string; name: string; alive: boolean; handCount: number; pendingTurns: number }[];
  myHand: ExplodingKittensCard[];
  drawPileCount: number;
  discardTop?: ExplodingKittensCardType;
  discardCount: number;
  /** Newest -> oldest discarded card types */
  discardHistory: ExplodingKittensCardType[];
  currentPlayerId: string;
  currentPlayerName: string;
  pendingTurnsForCurrent: number;
  pendingAction?: {
    actorId: string;
    actorName: string;
    type: PendingAction['type'];
    nopeCount: number;
    passedBy: string[];
  };
  favorPrompt?: { fromId: string; targetId?: string };
  defusePrompt?: { playerId: string; drawPileCount: number };
  seenTopCards?: ExplodingKittensCardType[];
  winnerId?: string;
  winnerName?: string;
  lastEvent?: string;
}

export type ExplodingKittensAction =
  | { type: 'draw_card' }
  | { type: 'play_card'; cardId: string; targetId?: string }
  | { type: 'play_pair'; cardIdA: string; cardIdB: string; targetId: string }
  | { type: 'react_nope'; cardId: string }
  | { type: 'react_pass' }
  | { type: 'favor_choose_target'; targetId: string }
  | { type: 'favor_choose_give'; cardId: string }
  | { type: 'defuse_reinsert'; index: number };
