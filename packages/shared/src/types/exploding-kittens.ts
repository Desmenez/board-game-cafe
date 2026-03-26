// ============================================================
// Exploding Kittens Types (Original-first, mode-ready)
// ============================================================

export type ExplodingKittensMode = 'original';

export type ExplodingKittensPhase =
  | 'turn'
  | 'reaction'
  | 'explosion_reveal'
  | 'defuse_prompt'
  | 'favor_target'
  | 'favor_give'
  | 'five_cats_pick_discard'
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
  type:
    | 'attack'
    | 'skip'
    | 'shuffle'
    | 'see_future'
    | 'favor'
    | 'five_cats'
    | 'pair_steal'
    | 'three_claim';
  targetId?: string;
  requestedType?: ExplodingKittensCardType;
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
  fiveCatsPickerId?: string;
  explosionPlayerId?: string;
  explosionHasDefuse?: boolean;
  defusingPlayerId?: string;
  defusingKitten?: ExplodingKittensCard;
  seenTopByPlayer: Record<string, ExplodingKittensCardType[]>;
  lastStealEvent?: {
    id: number;
    actorId: string;
    targetId: string;
    cardType: ExplodingKittensCardType;
  };
  lastThreeClaimEvent?: {
    id: number;
    actorId: string;
    targetId: string;
    requestedType: ExplodingKittensCardType;
    success: boolean;
  };
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
  /** Newest -> oldest discarded cards (with IDs for pick-from-discard combo) */
  discardCards: ExplodingKittensCard[];
  currentPlayerId: string;
  currentPlayerName: string;
  pendingTurnsForCurrent: number;
  pendingAction?: {
    actorId: string;
    actorName: string;
    type: PendingAction['type'];
    targetId?: string;
    requestedType?: ExplodingKittensCardType;
    nopeCount: number;
    passedBy: string[];
  };
  explosionReveal?: {
    playerId: string;
    playerName: string;
    hasDefuse: boolean;
  };
  stealNotice?: {
    id: number;
    actorId: string;
    actorName: string;
    targetId: string;
    targetName: string;
    cardType?: ExplodingKittensCardType;
  };
  threeClaimNotice?: {
    id: number;
    actorId: string;
    actorName: string;
    targetId: string;
    targetName: string;
    requestedType: ExplodingKittensCardType;
    success: boolean;
  };
  favorPrompt?: { fromId: string; targetId?: string };
  fiveCatsPrompt?: { pickerId: string };
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
  | {
      type: 'play_three_claim';
      cardIdA: string;
      cardIdB: string;
      cardIdC: string;
      targetId: string;
      requestedType: ExplodingKittensCardType;
    }
  | { type: 'play_five_cats'; cardIds: [string, string, string, string, string] }
  | { type: 'five_cats_pick_discard'; discardCardId: string }
  | { type: 'use_defuse' }
  | { type: 'react_nope'; cardId: string }
  | { type: 'react_pass' }
  | { type: 'favor_choose_target'; targetId: string }
  | { type: 'favor_choose_give'; cardId: string }
  | { type: 'defuse_reinsert'; index: number };
