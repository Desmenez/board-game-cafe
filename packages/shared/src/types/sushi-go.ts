import type { GameResult } from './game.js';

// ============================================================
// Sushi Go! — simultaneous pick-and-pass drafting (2–5 players)
// ============================================================

export type SushiGoCardKind =
  | 'tempura'
  | 'sashimi'
  | 'dumpling'
  | 'maki_1'
  | 'maki_2'
  | 'maki_3'
  | 'nigiri_squid'
  | 'nigiri_salmon'
  | 'nigiri_egg'
  | 'pudding'
  | 'wasabi'
  | 'chopsticks';

export interface SushiGoCard {
  id: string;
  kind: SushiGoCardKind;
}

export type SushiGoPhase = 'picking' | 'round_end' | 'game_over';

export type SushiGoPassDirection = 'left' | 'right';

export interface SushiGoLobbyOptions {
  passBothWays: boolean;
}

export function defaultSushiGoLobbyOptions(): SushiGoLobbyOptions {
  return { passBothWays: false };
}

export function parseSushiGoLobbyOptions(raw: unknown): SushiGoLobbyOptions {
  const defaults = defaultSushiGoLobbyOptions();
  if (!raw || typeof raw !== 'object') return defaults;
  const o = raw as Record<string, unknown>;
  const passBothWays = o.passBothWays === true;
  return { passBothWays };
}

export type SushiGoAction =
  | { type: 'pick_cards'; cardIds: string[] }
  | { type: 'ack_round_summary' };

export interface SushiGoWasabiSlot {
  wasabiId: string;
  nigiriId?: string;
}

export interface SushiGoPlayedCards {
  tempura: string[];
  sashimi: string[];
  dumpling: string[];
  maki: string[];
  nigiri: string[];
  pudding: string[];
  /** Chopsticks currently on the table (usable) */
  chopsticks: string[];
}

export interface SushiGoPublicPlayed {
  tempura: number;
  sashimi: number;
  dumpling: number;
  makiIcons: number;
  nigiri: number;
  pudding: number;
  chopsticksAvailable: number;
  wasabiPaired: number;
  wasabiOpen: number;
}

export interface SushiGoRoundScoreBreakdown {
  maki: number;
  tempura: number;
  sashimi: number;
  dumpling: number;
  nigiri: number;
  total: number;
}

export interface SushiGoRoundSummary {
  roundNo: number;
  roundPoints: Record<string, number>;
  breakdownByPlayer: Record<string, SushiGoRoundScoreBreakdown>;
  reason: string;
}

export interface SushiGoPuddingSummary {
  points: Record<string, number>;
  puddingCounts: Record<string, number>;
}

export interface SushiGoPublicPlayer {
  id: string;
  name: string;
  score: number;
  hasPicked: boolean;
  played: SushiGoPublicPlayed;
}

export interface SushiGoRevealedPick {
  playerId: string;
  playerName: string;
  cards: SushiGoCard[];
}

export interface SushiGoPlayerView {
  phase: SushiGoPhase;
  roundNo: number;
  totalRounds: number;
  pickNo: number;
  picksPerRound: number;
  passDirection: SushiGoPassDirection;
  passBothWays: boolean;
  drawPileCount: number;
  discardPileCount: number;
  scores: Record<string, number>;
  players: SushiGoPublicPlayer[];
  myHand: SushiGoCard[];
  myPlayed: SushiGoPublicPlayed;
  myWasabiSlots: SushiGoWasabiSlot[];
  pickProgress: { done: number; total: number };
  hasPicked: boolean;
  canPick: boolean;
  canUseChopsticks: boolean;
  mustPairNigiriWithWasabi: boolean;
  chopsticksPickCount: number;
  lastRevealedPicks: SushiGoRevealedPick[];
  lastRoundSummary: SushiGoRoundSummary | null;
  puddingSummary: SushiGoPuddingSummary | null;
  gameResult: GameResult | null;
  lastEvent: string;
}

export interface SushiGoState {
  phase: SushiGoPhase;
  roundNo: number;
  totalRounds: number;
  pickNo: number;
  picksPerRound: number;
  passBothWays: boolean;
  passDirection: SushiGoPassDirection;
  playerOrder: string[];
  playerNames: Record<string, string>;
  hands: Record<string, SushiGoCard[]>;
  picks: Record<string, string[] | null>;
  playedByPlayer: Record<string, SushiGoPlayedCards>;
  wasabiSlots: Record<string, SushiGoWasabiSlot[]>;
  /** Cards placed this round (for scoring) — cleared each round */
  roundPlaced: Record<string, SushiGoCard[]>;
  drawPile: SushiGoCard[];
  discardPile: SushiGoCard[];
  scores: Record<string, number>;
  lastRevealedPicks: SushiGoRevealedPick[];
  lastRoundSummary: SushiGoRoundSummary | null;
  puddingSummary: SushiGoPuddingSummary | null;
  lastEvent: string;
  result: GameResult | null;
}
