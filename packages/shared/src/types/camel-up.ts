import type { GameResult } from './game.js';

/** Cloudinary folder version prefix for Camel Up card assets */
export const CAMEL_UP_CLOUD_VERSION = 'v1780117774';

export const CAMEL_UP_TRACK_LENGTH = 16;
export const CAMEL_UP_STARTING_EP = 3;
export const CAMEL_UP_COLORS = ['blue', 'green', 'yellow', 'orange', 'white'] as const;

export type CamelUpColor = (typeof CAMEL_UP_COLORS)[number];
export type CamelUpPyramidDieValue = 1 | 2 | 3;
export const CAMEL_UP_PYRAMID_DIE_VALUES = [
  1, 2, 3,
] as const satisfies readonly CamelUpPyramidDieValue[];

export interface CamelUpPyramidDie {
  color: CamelUpColor;
  value: CamelUpPyramidDieValue;
}

/** @deprecated Use CamelUpPyramidDie.color */
export type CamelUpDieFace = CamelUpColor;
export type CamelUpPhase = 'leg_play' | 'leg_scoring' | 'game_over';
export type CamelUpDesertEffect = 'oasis' | 'mirage';

/** Leg betting tile values per color stack (index 0 = top / next taken). Always 3 tiles × 5 colors. */
export const CAMEL_UP_LEG_BET_STACK = [5, 3, 2] as const;

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
  | { type: 'bet-overall-loser'; color: CamelUpColor }
  | { type: 'continue-after-leg' };

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

export interface CamelUpMyOverallBet {
  kind: 'winner' | 'loser';
  color: CamelUpColor;
  /** 1-based order within that color pile */
  orderInPile: number;
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
  color: CamelUpColor;
  value: CamelUpPyramidDieValue;
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

export interface CamelUpLegScoringRow {
  playerId: string;
  legPayout: number;
  legFirstBonus: number;
  totalLegGain: number;
  legBetColor?: CamelUpColor;
  legBetValue?: number;
}

export interface CamelUpLegScoringSummary {
  endedLeg: number;
  winningColor: CamelUpColor;
  rows: CamelUpLegScoringRow[];
}

export interface CamelUpPlayerView {
  phase: CamelUpPhase;
  leg: number;
  playerOrder: string[];
  players: CamelUpPublicPlayer[];
  /** Track spaces 1–16; space 1 is start/finish */
  track: Record<number, CamelUpCamelStack>;
  desertTiles: CamelUpDesertTileOnTrack[];
  legBetStacks: CamelUpLegBetStack[];
  overallWinnerPiles: CamelUpOverallBetPile[];
  overallLoserPiles: CamelUpOverallBetPile[];
  pyramidDiceRemaining: number;
  /** Dice still in the pyramid this leg (one per color, each value 1–3) */
  pyramidDiceInBag: CamelUpPyramidDie[];
  lastRoll: CamelUpLastRoll | null;
  rolledDice: CamelUpPyramidDie[];
  activePlayerId: string | null;
  canAct: boolean;
  legalActions: CamelUpAction[];
  /** Only for requesting player */
  raceCardsInHand: CamelUpColor[];
  lastEvent: string;
  result: GameResult | null;
  /** Set at game over */
  overallBetsRevealed?: boolean;
  /** Requesting player only — own face-down overall bets while game is in progress */
  myOverallBets?: CamelUpMyOverallBet[];
  /** Total face-down cards on table (hidden from color/player mapping until game over) */
  overallWinnerFaceDownCount?: number;
  overallLoserFaceDownCount?: number;
  scoringBreakdown?: CamelUpScoringBreakdown[];
  /** Set while phase is leg_scoring — summary for the leg that just ended */
  legScoringSummary?: CamelUpLegScoringSummary;
  raceWinnerColor?: CamelUpColor;
  raceLoserColor?: CamelUpColor;
}

export function camelUpLegBetStack(): readonly number[] {
  return CAMEL_UP_LEG_BET_STACK;
}

export function camelUpPyramidTilesPerPlayer(playerCount: number): number {
  return CAMEL_UP_PYRAMID_TILES_PER_PLAYER[playerCount] ?? 4;
}

export function camelUpOverallPayout(order: number): number {
  if (order <= 0) return 0;
  return CAMEL_UP_OVERALL_PAYOUT_BY_ORDER[order - 1] ?? 1;
}
