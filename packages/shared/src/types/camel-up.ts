import type { GameResult } from './game.js';

/** Cloudinary folder version prefix for Camel Up card assets */
export const CAMEL_UP_CLOUD_VERSION = 'v1780117774';

export const CAMEL_UP_TRACK_LENGTH = 16;
export const CAMEL_UP_STARTING_EP = 3;
export const CAMEL_UP_COLORS = ['blue', 'green', 'yellow', 'orange', 'white'] as const;

export type CamelUpColor = (typeof CAMEL_UP_COLORS)[number];
export type CamelUpDieFace = CamelUpColor | 'grey';
export type CamelUpPhase = 'leg_play' | 'leg_scoring' | 'game_over';
export type CamelUpDesertEffect = 'oasis' | 'mirage';

/** Leg betting tile values per stack (top = first taken) by seated player count */
export const CAMEL_UP_LEG_BET_VALUES: Record<number, readonly number[]> = {
  3: [6, 4, 2],
  4: [5, 3, 2, 1],
  5: [4, 3, 2, 1],
  6: [3, 2, 1, 1, 1],
  7: [3, 2, 1, 1, 1, 1],
  8: [2, 2, 1, 1, 1, 1, 1],
};

/** Pyramid tiles dealt to each player at setup / returned after each leg */
export const CAMEL_UP_PYRAMID_TILES_PER_PLAYER: Record<number, number> = {
  3: 6,
  4: 5,
  5: 4,
  6: 4,
  7: 3,
  8: 3,
};

/** Payout by order (1-based) when overall winner/loser bet matches */
export const CAMEL_UP_OVERALL_PAYOUT_BY_ORDER = [8, 5, 3, 2, 1] as const;

export type CamelUpAction =
  | { type: 'take-leg-bet-tile'; color: CamelUpColor }
  | { type: 'place-desert-tile'; space: number; effect: CamelUpDesertEffect }
  | { type: 'take-pyramid-tile' }
  | { type: 'bet-overall-winner'; color: CamelUpColor }
  | { type: 'bet-overall-loser'; color: CamelUpColor };

export interface CamelUpCamelStack {
  /** Bottom to top */
  colors: CamelUpColor[];
}

export interface CamelUpDesertTileOnTrack {
  playerId: string;
  space: number;
  effect: CamelUpDesertEffect;
}

export interface CamelUpLegBetStack {
  color: CamelUpColor;
  /** Remaining tile values; index 0 = top (next taken) */
  values: number[];
}

export interface CamelUpFaceDownBet {
  playerId: string;
  /** Hidden until game over */
  color?: CamelUpColor;
}

export interface CamelUpOverallBetPile {
  color: CamelUpColor;
  bets: CamelUpFaceDownBet[];
}

export interface CamelUpPublicPlayer {
  id: string;
  name: string;
  ep: number;
  pyramidTiles: number;
  /** Leg bet taken this leg, if any */
  legBet: { color: CamelUpColor; value: number } | null;
  /** Whether desert tile is on track */
  desertOnTrack: boolean;
  overallWinnerBetsPlaced: number;
  overallLoserBetsPlaced: number;
  raceCardsRemaining: number;
}

export interface CamelUpLastRoll {
  face: CamelUpDieFace;
  movedColor?: CamelUpColor;
  legEnded: boolean;
}

export interface CamelUpScoringBreakdown {
  playerId: string;
  legPayout: number;
  legFirstBonus: number;
  overallWinnerPayout: number;
  overallLoserPayout: number;
  totalEp: number;
}

export interface CamelUpPlayerView {
  phase: CamelUpPhase;
  leg: number;
  playerOrder: string[];
  players: CamelUpPublicPlayer[];
  /** Space index 0 = start; 1–16 = track; stacks keyed by space */
  track: Record<number, CamelUpCamelStack>;
  desertTiles: CamelUpDesertTileOnTrack[];
  legBetStacks: CamelUpLegBetStack[];
  overallWinnerPiles: CamelUpOverallBetPile[];
  overallLoserPiles: CamelUpOverallBetPile[];
  pyramidDiceRemaining: number;
  lastRoll: CamelUpLastRoll | null;
  rolledDice: CamelUpDieFace[];
  activePlayerId: string | null;
  canAct: boolean;
  legalActions: CamelUpAction[];
  /** Only for requesting player */
  raceCardsInHand: CamelUpColor[];
  lastEvent: string;
  result: GameResult | null;
  /** Set at game over */
  overallBetsRevealed?: boolean;
  scoringBreakdown?: CamelUpScoringBreakdown[];
  raceWinnerColor?: CamelUpColor;
  raceLoserColor?: CamelUpColor;
}

export function camelUpLegBetValues(playerCount: number): readonly number[] {
  return CAMEL_UP_LEG_BET_VALUES[playerCount] ?? CAMEL_UP_LEG_BET_VALUES[5]!;
}

export function camelUpPyramidTilesPerPlayer(playerCount: number): number {
  return CAMEL_UP_PYRAMID_TILES_PER_PLAYER[playerCount] ?? 4;
}

export function camelUpOverallPayout(order: number): number {
  if (order <= 0) return 0;
  return CAMEL_UP_OVERALL_PAYOUT_BY_ORDER[order - 1] ?? 1;
}
