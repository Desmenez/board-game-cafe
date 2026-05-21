import type { GameResult } from './game.js';

/** Cloudinary folder version for Cup the Crab assets */
export const CUP_THE_CRAB_CLOUD_VERSION = 'v1778991655';

/** Maximum table stacks (columns) for cup / bottle plays — not one per player. */
export const CUP_THE_CRAB_MAX_TABLE_STACKS = 3;

export type CupTheCrabCupValue = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10;

export type CupTheCrabCardKind = 'cup' | 'crab' | 'bottle' | 'octopus';

export interface CupTheCrabCard {
  id: string;
  kind: CupTheCrabCardKind;
  /** Present when `kind === 'cup'` */
  value?: CupTheCrabCupValue;
}

export interface CupTheCrabStack {
  id: string;
  cards: CupTheCrabCard[];
  hasBottle: boolean;
}

export type CupTheCrabPhase = 'card_selection' | 'play' | 'game_over';

export type CupTheCrabPlayTarget = { kind: 'new_stack' } | { kind: 'stack'; stackId: string };

export type CupTheCrabAction =
  | { type: 'confirm_selection'; cardIds: [string, string, string] }
  | { type: 'play_card'; cardId: string; target: CupTheCrabPlayTarget }
  | { type: 'skip_play' };

export interface CupTheCrabPublicPlayer {
  id: string;
  name: string;
  hasConfirmedSelection: boolean;
  cardsPlayedThisRound: number;
  /** Count only — card faces hidden until game over */
  scorePileCount: number;
  isStartPlayer: boolean;
}

export interface CupTheCrabPlayerView {
  phase: CupTheCrabPhase;
  round: number;
  maxRounds: number;
  playerOrder: string[];
  players: CupTheCrabPublicPlayer[];
  stacks: CupTheCrabStack[];
  maxStacks: number;
  /** Cards locked until next round (not selectable mid-round) */
  reserve: CupTheCrabCard[];
  /** This round's 3-card hand after selection; during play, cards leave as played */
  roundHand: CupTheCrabCard[] | null;
  /** Full score pile — only your own during play; everyone's at game over */
  myScorePile: CupTheCrabCard[];
  allScorePiles?: Record<string, CupTheCrabCard[]>;
  activePlayerId: string | null;
  canAct: boolean;
  lastEvent: string;
  result: GameResult | null;
}
