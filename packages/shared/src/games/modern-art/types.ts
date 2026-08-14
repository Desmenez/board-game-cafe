import type { GameResult } from '../../platform/game.js';
import type {
  ModernArtArtistId,
  ModernArtAuctionKind,
  ModernArtValueAmount,
} from './assets.js';

export {
  MODERN_ART_ARTISTS,
  MODERN_ART_ARTIST_COLOR,
  MODERN_ART_BOARD,
  MODERN_ART_CARD_BACK,
  MODERN_ART_COLOR_ARTIST,
  MODERN_ART_COVER,
  MODERN_ART_PAINTINGS,
  MODERN_ART_VALUE_TILES,
  modernArtArtistLabel,
  modernArtAuctionLabelTh,
  modernArtBoardUrl,
  modernArtCardBackUrl,
  modernArtCoverUrl,
  modernArtImageUrl,
  modernArtValueTileUrl,
  type ModernArtArtistId,
  type ModernArtAuctionKind,
  type ModernArtColor,
  type ModernArtPaintingArt,
  type ModernArtValueAmount,
} from './assets.js';

export const MODERN_ART_MIN_PLAYERS = 3;
export const MODERN_ART_MAX_PLAYERS = 5;
export const MODERN_ART_STARTING_MONEY = 100;
export const MODERN_ART_ROUNDS = 4;
export const MODERN_ART_ROUND_END_COUNT = 5;

/** Cards dealt at the start of each round, keyed by player count. Round 4 deals 0. */
export const MODERN_ART_DEAL_BY_PLAYERS: Record<number, readonly [number, number, number, number]> =
  {
    3: [10, 6, 6, 0],
    4: [9, 4, 4, 0],
    5: [8, 3, 3, 0],
  };

export interface ModernArtCard {
  id: string;
  artist: ModernArtArtistId;
  auction: ModernArtAuctionKind;
  copy: number;
}

export type ModernArtPhase =
  | 'offer'
  | 'double_wait'
  | 'set_price'
  | 'auction'
  | 'round_scoring'
  | 'game_over';

export type ModernArtLiveAuctionKind = Exclude<ModernArtAuctionKind, 'double'>;

export interface ModernArtAuction {
  kind: ModernArtLiveAuctionKind;
  auctioneerId: string;
  paintings: ModernArtCard[];
  currentBid: number;
  highestBidderId: string | null;
  /** Open: player ids who passed since the last bid. */
  passedSinceBid: string[];
  /** Once-around: whose turn to bid/pass. */
  nextBidderId: string | null;
  /** Once-around: already acted this auction. */
  actedIds: string[];
  /** Sealed: submitted amounts (0 = no bid). Missing key = not submitted. */
  sealedBids: Record<string, number>;
  /** Fixed price chosen by the auctioneer. */
  fixedPrice: number | null;
  /** Fixed: next player clockwise who may buy. */
  nextBuyerId: string | null;
}

export interface ModernArtDoubleWait {
  originalAuctioneerId: string;
  firstCard: ModernArtCard;
  currentChooserId: string;
}

export interface ModernArtSeat {
  id: string;
  name: string;
  money: number;
  hand: ModernArtCard[];
  gallery: ModernArtCard[];
}

export type ModernArtValueBoard = Record<
  ModernArtArtistId,
  Array<ModernArtValueAmount | null>
>;

export interface ModernArtRoundPayout {
  playerId: string;
  name: string;
  amount: number;
  paintingCount: number;
}

export interface ModernArtArtistRank {
  artist: ModernArtArtistId;
  count: number;
  place: 1 | 2 | 3 | null;
  roundValue: ModernArtValueAmount | null;
  saleValue: number;
}

export interface ModernArtState {
  phase: ModernArtPhase;
  round: number;
  playerOrder: string[];
  seats: Record<string, ModernArtSeat>;
  drawPile: ModernArtCard[];
  /** Hammer / current offerer when phase is offer. */
  auctioneerId: string;
  /** Player who offered the painting that ended the round (5th / last card). */
  lastOffererId: string | null;
  playedThisRound: Record<ModernArtArtistId, number>;
  valueBoard: ModernArtValueBoard;
  auction: ModernArtAuction | null;
  doubleWait: ModernArtDoubleWait | null;
  roundRanks: ModernArtArtistRank[] | null;
  roundPayouts: ModernArtRoundPayout[] | null;
  lastEvent: string;
  result: GameResult | null;
}

export type ModernArtAction =
  | { type: 'offer_painting'; cardId: string }
  | { type: 'play_double_second'; cardId: string }
  | { type: 'skip_double_second' }
  | { type: 'set_fixed_price'; amount: number }
  | { type: 'bid'; amount: number }
  | { type: 'pass' }
  | { type: 'buy_fixed' }
  | { type: 'submit_sealed'; amount: number }
  | { type: 'close_open_auction' }
  | { type: 'ack_round' };

export interface ModernArtPublicSeat {
  id: string;
  name: string;
  handCount: number;
  gallery: ModernArtCard[];
  isAuctioneer: boolean;
  submittedSealed: boolean;
  /** Present only after the game ends. Hidden during play. */
  money: number | null;
}

export interface ModernArtPlayerView {
  phase: ModernArtPhase;
  round: number;
  playerOrder: string[];
  seats: ModernArtPublicSeat[];
  auctioneerId: string;
  drawCount: number;
  playedThisRound: Record<ModernArtArtistId, number>;
  valueBoard: ModernArtValueBoard;
  auction: ModernArtAuction | null;
  doubleWait: ModernArtDoubleWait | null;
  roundRanks: ModernArtArtistRank[] | null;
  roundPayouts: ModernArtRoundPayout[] | null;
  lastEvent: string;
  result: GameResult | null;
  you: {
    money: number;
    hand: ModernArtCard[];
    canOffer: boolean;
    canPlayDoubleSecond: boolean;
    canSkipDouble: boolean;
    canSetPrice: boolean;
    canBid: boolean;
    canPass: boolean;
    canBuyFixed: boolean;
    canSubmitSealed: boolean;
    canCloseOpen: boolean;
    canAckRound: boolean;
    legalDoubleSeconds: string[];
    minBid: number;
    maxBid: number;
    sealedSubmitted: boolean;
  };
}

export function modernArtPhaseLabelTh(phase: ModernArtPhase): string {
  switch (phase) {
    case 'offer':
      return 'เลือกภาพประมูล';
    case 'double_wait':
      return 'รอใบที่สอง';
    case 'set_price':
      return 'ตั้งราคาคงที่';
    case 'auction':
      return 'กำลังประมูล';
    case 'round_scoring':
      return 'ขายภาพท้ายรอบ';
    case 'game_over':
      return 'จบเกม';
  }
}

export function emptyModernArtPlayed(): Record<ModernArtArtistId, number> {
  return { carvalho: 0, thaler: 0, melim: 0, martins: 0, silveira: 0 };
}

export function emptyModernArtValueBoard(): ModernArtValueBoard {
  return {
    carvalho: [null, null, null, null],
    thaler: [null, null, null, null],
    melim: [null, null, null, null],
    martins: [null, null, null, null],
    silveira: [null, null, null, null],
  };
}

/** Sale price this round: sum of column tiles only if the artist placed top-3 this round. */
export function modernArtSaleValue(
  board: ModernArtValueBoard,
  artist: ModernArtArtistId,
  placedThisRound: boolean,
): number {
  if (!placedThisRound) return 0;
  return board[artist].reduce<number>((sum, tile) => sum + (tile ?? 0), 0);
}
