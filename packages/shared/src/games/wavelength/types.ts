import type { GameResult } from '../../platform/game.js';
import type { WavelengthLeftRight, WavelengthTarget } from './scoring.js';

export const WAVELENGTH_ID = 'wavelength';

export const WAVELENGTH_TEAMS = ['orange', 'purple'] as const;
export type WavelengthTeam = (typeof WAVELENGTH_TEAMS)[number];

export type WavelengthPhase =
  | 'psychic_setup'
  | 'clue'
  | 'team_dial'
  | 'left_right'
  | 'reveal'
  | 'game_over';

export type WavelengthSetupStep = 'choose_side';

export type WavelengthCardSide = 'a' | 'b';

export interface WavelengthSpectrum {
  id: string;
  left: string;
  right: string;
}

/** Two randomly drawn spectra offered as card faces this round. */
export interface WavelengthCard {
  a: WavelengthSpectrum;
  b: WavelengthSpectrum;
}

export type WavelengthAction =
  | { type: 'choose-card-side'; side: WavelengthCardSide }
  | { type: 'submit-clue'; text: string }
  | { type: 'set-dial'; position: number }
  | { type: 'confirm-dial' }
  | { type: 'guess-left-right'; guess: WavelengthLeftRight }
  | { type: 'ack-reveal' };

export interface WavelengthRevealBreakdown {
  dial: number;
  target: WavelengthTarget;
  activeScore: 0 | 2 | 3 | 4;
  opposingScore: 0 | 1;
  leftRightGuess: WavelengthLeftRight;
  centerSide: WavelengthLeftRight | null;
  bonusTurn: boolean;
}

export interface WavelengthPlayerSeat {
  id: string;
  name: string;
  team: WavelengthTeam;
}

export interface WavelengthPlayerView {
  phase: WavelengthPhase;
  setupStep: WavelengthSetupStep | null;
  myId: string;
  playerOrder: string[];
  players: WavelengthPlayerSeat[];
  playerNames: Record<string, string>;
  teamByPlayer: Record<string, WavelengthTeam>;
  myTeam: WavelengthTeam;
  amPsychic: boolean;
  psychicId: string;
  activeTeam: WavelengthTeam;
  scores: Record<WavelengthTeam, number>;
  /** Public after the Psychic picks a side. */
  leftLabel: string | null;
  rightLabel: string | null;
  /** Psychic-only while choosing a side. */
  cardSides: { a: WavelengthSpectrum; b: WavelengthSpectrum } | null;
  clue: string | null;
  /** Null until a teammate moves the dial (and during setup). */
  dial: number | null;
  dialLocked: boolean;
  /** Psychic always, once the target exists. Everyone on reveal / game over. */
  target: WavelengthTarget | null;
  /** True when this viewer may see the 2/3/4 wedges. */
  screenOpen: boolean;
  leftRightGuess: WavelengthLeftRight | null;
  revealBreakdown: WavelengthRevealBreakdown | null;
  suddenDeath: boolean;
  lastEvent: string;
  canAct: boolean;
  gameResult?: GameResult & { scores: Record<WavelengthTeam, number> };
}

export interface WavelengthState {
  phase: WavelengthPhase;
  setupStep: WavelengthSetupStep | null;
  playerOrder: string[];
  playerNames: Record<string, string>;
  teamByPlayer: Record<string, WavelengthTeam>;
  teamMembers: Record<WavelengthTeam, string[]>;
  psychicIndex: Record<WavelengthTeam, number>;
  psychicId: string;
  activeTeam: WavelengthTeam;
  scores: Record<WavelengthTeam, number>;
  deck: WavelengthSpectrum[];
  currentCard: WavelengthCard | null;
  chosenSide: WavelengthCardSide | null;
  clue: string | null;
  dial: number;
  dialMoved: boolean;
  target: WavelengthTarget | null;
  leftRightGuess: WavelengthLeftRight | null;
  revealBreakdown: WavelengthRevealBreakdown | null;
  suddenDeath: boolean;
  suddenDeathRoundsLeft: number;
  lastEvent: string;
  gameResult?: GameResult & { scores: Record<WavelengthTeam, number> };
}
