// ============================================================
// Ticket to Ride (North America) — map aligned with official USA board
// ============================================================

export type TtrTrainColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'black'
  | 'white'
  | 'orange'
  | 'purple'
  | 'locomotive';

export type TtrRouteColor = Exclude<TtrTrainColor, 'locomotive'> | 'gray';

export interface TtrRouteDef {
  id: string;
  a: string;
  b: string;
  length: 1 | 2 | 3 | 4 | 5 | 6;
  color: TtrRouteColor;
  /** for simple board rendering on client */
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

export interface TtrDestinationTicket {
  id: string;
  a: string;
  b: string;
  points: number;
}

export const TTR_ROUTE_POINTS: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 10,
  6: 15,
};

export const TTR_TRAIN_COLORS: readonly TtrTrainColor[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'black',
  'white',
  'orange',
  'purple',
  'locomotive',
];

export const TTR_BASE_TRAINS_PER_PLAYER = 45;

/**
 * US map routes (parallel tracks are separate entries). `ax,ay,bx,by` are rough map-space
 * coordinates (0–100) for the client; parallel pairs are slightly offset.
 */
export const TTR_ROUTES: readonly TtrRouteDef[] = [
  { id: 'sea-por-1', a: 'Seattle', b: 'Portland', length: 1, color: 'gray', ax: 9, ay: 22, bx: 9, by: 34 },
  { id: 'sea-por-2', a: 'Seattle', b: 'Portland', length: 1, color: 'gray', ax: 10.3, ay: 22, bx: 10.3, by: 34 },
  { id: 'sea-van-1', a: 'Seattle', b: 'Vancouver', length: 1, color: 'gray', ax: 9, ay: 22, bx: 7.2, by: 13.5 },
  { id: 'sea-van-2', a: 'Seattle', b: 'Vancouver', length: 1, color: 'gray', ax: 8, ay: 22, bx: 6.1, by: 13.5 },
  { id: 'sea-cal', a: 'Seattle', b: 'Calgary', length: 4, color: 'gray', ax: 9, ay: 22, bx: 24, by: 10 },
  { id: 'sea-hel', a: 'Seattle', b: 'Helena', length: 6, color: 'yellow', ax: 9, ay: 22, bx: 34, by: 32 },
  { id: 'van-cal', a: 'Vancouver', b: 'Calgary', length: 3, color: 'gray', ax: 7.2, ay: 13.5, bx: 24, by: 10 },
  { id: 'por-sf-1', a: 'Portland', b: 'San Francisco', length: 5, color: 'green', ax: 9, ay: 34, bx: 12, by: 61 },
  { id: 'por-sf-2', a: 'Portland', b: 'San Francisco', length: 5, color: 'purple', ax: 9.4, ay: 34, bx: 12.4, by: 61 },
  { id: 'por-slc', a: 'Portland', b: 'Salt Lake City', length: 6, color: 'blue', ax: 9, ay: 34, bx: 23, by: 53 },
  { id: 'sf-la-1', a: 'San Francisco', b: 'Los Angeles', length: 3, color: 'yellow', ax: 12, ay: 61, bx: 10, by: 81 },
  { id: 'sf-la-2', a: 'San Francisco', b: 'Los Angeles', length: 3, color: 'purple', ax: 12.4, ay: 60.2, bx: 10.4, by: 81 },
  { id: 'slc-sf-1', a: 'Salt Lake City', b: 'San Francisco', length: 5, color: 'orange', ax: 23, ay: 53, bx: 12, by: 61 },
  { id: 'slc-sf-2', a: 'Salt Lake City', b: 'San Francisco', length: 5, color: 'black', ax: 22.2, ay: 53.2, bx: 11.4, by: 61.2 },
  { id: 'slc-den-1', a: 'Salt Lake City', b: 'Denver', length: 3, color: 'red', ax: 23, ay: 53, bx: 38, by: 55 },
  { id: 'slc-den-2', a: 'Salt Lake City', b: 'Denver', length: 3, color: 'yellow', ax: 23.6, ay: 52.2, bx: 38.6, by: 55 },
  { id: 'slc-hel', a: 'Salt Lake City', b: 'Helena', length: 3, color: 'purple', ax: 23, ay: 53, bx: 34, by: 32 },
  { id: 'lv-slc', a: 'Las Vegas', b: 'Salt Lake City', length: 3, color: 'orange', ax: 20, ay: 73, bx: 23, by: 53 },
  { id: 'la-lv', a: 'Los Angeles', b: 'Las Vegas', length: 2, color: 'gray', ax: 10, ay: 81, bx: 20, by: 73 },
  /* LA & El Paso nudged down vs Phoenix so the SW triangle is not one straight (black path vs grey). */
  { id: 'la-phx', a: 'Los Angeles', b: 'Phoenix', length: 3, color: 'gray', ax: 10, ay: 81, bx: 22.2, by: 82.4 },
  { id: 'la-elp', a: 'Los Angeles', b: 'El Paso', length: 6, color: 'black', ax: 10, ay: 81, bx: 37, by: 94 },
  { id: 'phx-sfe', a: 'Phoenix', b: 'Santa Fe', length: 3, color: 'gray', ax: 22.2, ay: 82.4, bx: 29, by: 63 },
  { id: 'phx-den', a: 'Phoenix', b: 'Denver', length: 5, color: 'white', ax: 22.2, ay: 82.4, bx: 38, by: 55 },
  { id: 'phx-elp', a: 'Phoenix', b: 'El Paso', length: 3, color: 'gray', ax: 22.2, ay: 82.4, bx: 37, by: 94 },
  { id: 'sfe-den', a: 'Santa Fe', b: 'Denver', length: 2, color: 'gray', ax: 29, ay: 63, bx: 38, by: 55 },
  { id: 'sfe-okc', a: 'Santa Fe', b: 'Oklahoma City', length: 3, color: 'blue', ax: 29, ay: 63, bx: 46, by: 69 },
  { id: 'sfe-elp', a: 'Santa Fe', b: 'El Paso', length: 2, color: 'gray', ax: 29, ay: 63, bx: 37, by: 94 },
  /* Slight Elp end spread so OKC / Dallas / Houston legs do not run on top of each other. */
  { id: 'elp-okc', a: 'El Paso', b: 'Oklahoma City', length: 5, color: 'yellow', ax: 35.1, ay: 92.6, bx: 46, by: 69 },
  { id: 'elp-hou', a: 'El Paso', b: 'Houston', length: 6, color: 'green', ax: 38.1, ay: 92, bx: 58, by: 90 },
  { id: 'elp-dal', a: 'El Paso', b: 'Dallas', length: 4, color: 'red', ax: 36.1, ay: 94, bx: 53, by: 82 },
  { id: 'cal-hel', a: 'Calgary', b: 'Helena', length: 4, color: 'gray', ax: 24, ay: 10, bx: 34, by: 32 },
  { id: 'cal-win', a: 'Calgary', b: 'Winnipeg', length: 6, color: 'white', ax: 24, ay: 10, bx: 50, by: 16 },
  { id: 'hel-win', a: 'Helena', b: 'Winnipeg', length: 4, color: 'blue', ax: 34, ay: 32, bx: 50, by: 16 },
  { id: 'hel-oma', a: 'Helena', b: 'Omaha', length: 5, color: 'red', ax: 34, ay: 32, bx: 50, by: 48 },
  { id: 'hel-den', a: 'Helena', b: 'Denver', length: 4, color: 'green', ax: 34, ay: 32, bx: 38, by: 55 },
  { id: 'hel-dul', a: 'Helena', b: 'Duluth', length: 6, color: 'orange', ax: 34, ay: 32, bx: 56, by: 28 },
  { id: 'den-oma', a: 'Denver', b: 'Omaha', length: 4, color: 'purple', ax: 38, ay: 55, bx: 50, by: 48 },
  { id: 'den-kc-1', a: 'Denver', b: 'Kansas City', length: 4, color: 'orange', ax: 38, ay: 55, bx: 55, by: 58 },
  { id: 'den-kc-2', a: 'Denver', b: 'Kansas City', length: 4, color: 'black', ax: 38.2, ay: 54, bx: 55, by: 57.2 },
  { id: 'den-okc', a: 'Denver', b: 'Oklahoma City', length: 4, color: 'red', ax: 38, ay: 55, bx: 46, by: 69 },
  { id: 'win-sau', a: 'Winnipeg', b: 'Sault Ste Marie', length: 6, color: 'gray', ax: 50, ay: 16, bx: 70, by: 26 },
  { id: 'win-dul', a: 'Winnipeg', b: 'Duluth', length: 4, color: 'black', ax: 50, ay: 16, bx: 56, by: 28 },
  { id: 'dul-sau', a: 'Duluth', b: 'Sault Ste Marie', length: 3, color: 'gray', ax: 56, ay: 28, bx: 70, by: 26 },
  { id: 'dul-oma-1', a: 'Duluth', b: 'Omaha', length: 2, color: 'gray', ax: 56, ay: 28, bx: 50, by: 48 },
  { id: 'dul-oma-2', a: 'Duluth', b: 'Omaha', length: 2, color: 'gray', ax: 55.2, ay: 28, bx: 50.2, by: 48.4 },
  { id: 'dul-tor', a: 'Duluth', b: 'Toronto', length: 6, color: 'purple', ax: 56, ay: 28, bx: 82, by: 33 },
  { id: 'dul-chi', a: 'Duluth', b: 'Chicago', length: 3, color: 'red', ax: 56, ay: 28, bx: 68, by: 44 },
  { id: 'oma-chi', a: 'Omaha', b: 'Chicago', length: 4, color: 'blue', ax: 50, ay: 48, bx: 68, by: 44 },
  { id: 'oma-kc-1', a: 'Omaha', b: 'Kansas City', length: 1, color: 'gray', ax: 50, ay: 48, bx: 55, by: 58 },
  { id: 'oma-kc-2', a: 'Omaha', b: 'Kansas City', length: 1, color: 'gray', ax: 50, ay: 48, bx: 55.2, by: 57.2 },
  { id: 'kc-stl-1', a: 'Kansas City', b: 'Saint Louis', length: 2, color: 'blue', ax: 55, ay: 58, bx: 66, by: 61 },
  { id: 'kc-stl-2', a: 'Kansas City', b: 'Saint Louis', length: 2, color: 'purple', ax: 54.8, ay: 59.2, bx: 65.8, by: 62.2 },
  { id: 'kc-okc-1', a: 'Kansas City', b: 'Oklahoma City', length: 2, color: 'gray', ax: 55, ay: 58, bx: 46, by: 69 },
  { id: 'kc-okc-2', a: 'Kansas City', b: 'Oklahoma City', length: 2, color: 'gray', ax: 55.2, ay: 58.2, bx: 46, by: 69.2 },
  { id: 'okc-dal-1', a: 'Oklahoma City', b: 'Dallas', length: 2, color: 'gray', ax: 46, ay: 69, bx: 53, by: 82 },
  { id: 'okc-dal-2', a: 'Oklahoma City', b: 'Dallas', length: 2, color: 'gray', ax: 45.2, ay: 69, bx: 52.2, by: 82.2 },
  { id: 'okc-lr', a: 'Oklahoma City', b: 'Little Rock', length: 2, color: 'white', ax: 46, ay: 69, bx: 58, by: 74 },
  { id: 'dal-lr', a: 'Dallas', b: 'Little Rock', length: 2, color: 'gray', ax: 53, ay: 82, bx: 58, by: 74 },
  { id: 'dal-hou-1', a: 'Dallas', b: 'Houston', length: 1, color: 'gray', ax: 53, ay: 82, bx: 58, by: 90 },
  { id: 'dal-hou-2', a: 'Dallas', b: 'Houston', length: 1, color: 'gray', ax: 52.2, ay: 82, bx: 57.2, by: 90.2 },
  { id: 'no-hou', a: 'New Orleans', b: 'Houston', length: 2, color: 'gray', ax: 67, ay: 89, bx: 58, by: 90 },
  { id: 'sau-tor', a: 'Sault Ste Marie', b: 'Toronto', length: 2, color: 'gray', ax: 70, ay: 26, bx: 82, by: 33 },
  { id: 'sau-mtl', a: 'Sault Ste Marie', b: 'Montreal', length: 5, color: 'black', ax: 70, ay: 26, bx: 88, by: 17 },
  { id: 'mtl-bos-1', a: 'Montreal', b: 'Boston', length: 2, color: 'gray', ax: 88, ay: 17, bx: 93, by: 29 },
  { id: 'mtl-bos-2', a: 'Montreal', b: 'Boston', length: 2, color: 'gray', ax: 88.2, ay: 16, bx: 92.2, by: 29.2 },
  { id: 'mtl-ny', a: 'Montreal', b: 'New York', length: 3, color: 'blue', ax: 88, ay: 17, bx: 92, by: 40 },
  { id: 'tor-mtl', a: 'Toronto', b: 'Montreal', length: 3, color: 'gray', ax: 82, ay: 33, bx: 88, by: 17 },
  { id: 'tor-ny', a: 'Toronto', b: 'New York', length: 2, color: 'white', ax: 82, ay: 33, bx: 92, by: 40 },
  { id: 'tor-pit', a: 'Toronto', b: 'Pittsburgh', length: 2, color: 'gray', ax: 82, ay: 33, bx: 83, by: 45 },
  { id: 'tor-chi', a: 'Toronto', b: 'Chicago', length: 4, color: 'white', ax: 82, ay: 33, bx: 68, by: 44 },
  { id: 'chi-pit-1', a: 'Chicago', b: 'Pittsburgh', length: 3, color: 'orange', ax: 68, ay: 44, bx: 83, by: 45 },
  { id: 'chi-pit-2', a: 'Chicago', b: 'Pittsburgh', length: 3, color: 'black', ax: 68.2, ay: 43.2, bx: 83, by: 45.2 },
  { id: 'stl-pit', a: 'Saint Louis', b: 'Pittsburgh', length: 5, color: 'green', ax: 66, ay: 61, bx: 83, by: 45 },
  { id: 'chi-stl-1', a: 'Chicago', b: 'Saint Louis', length: 2, color: 'white', ax: 68, ay: 44, bx: 66, by: 61 },
  { id: 'chi-stl-2', a: 'Chicago', b: 'Saint Louis', length: 2, color: 'green', ax: 69, ay: 44, bx: 67, by: 61 },
  { id: 'stl-lr', a: 'Saint Louis', b: 'Little Rock', length: 2, color: 'gray', ax: 66, ay: 61, bx: 58, by: 74 },
  { id: 'pit-ny-1', a: 'Pittsburgh', b: 'New York', length: 2, color: 'white', ax: 83, ay: 45, bx: 92, by: 40 },
  { id: 'pit-ny-2', a: 'Pittsburgh', b: 'New York', length: 2, color: 'green', ax: 83.6, ay: 46.2, bx: 92.4, by: 41.2 },
  { id: 'pit-was', a: 'Pittsburgh', b: 'Washington', length: 2, color: 'gray', ax: 83, ay: 45, bx: 91, by: 53 },
  { id: 'pit-nas', a: 'Pittsburgh', b: 'Nashville', length: 4, color: 'yellow', ax: 83, ay: 45, bx: 71, by: 66 },
  { id: 'was-ral-1', a: 'Washington', b: 'Raleigh', length: 2, color: 'gray', ax: 91, ay: 53, bx: 83, by: 67 },
  { id: 'was-ral-2', a: 'Washington', b: 'Raleigh', length: 2, color: 'gray', ax: 90.2, ay: 53.2, bx: 82.2, by: 66.2 },
  { id: 'was-ny-1', a: 'Washington', b: 'New York', length: 2, color: 'orange', ax: 91, ay: 53, bx: 92, by: 40 },
  { id: 'was-ny-2', a: 'Washington', b: 'New York', length: 2, color: 'black', ax: 91, ay: 52, bx: 91.2, by: 40.4 },
  { id: 'ny-bos-1', a: 'New York', b: 'Boston', length: 2, color: 'yellow', ax: 92, ay: 40, bx: 93, by: 29 },
  { id: 'ny-bos-2', a: 'New York', b: 'Boston', length: 2, color: 'red', ax: 93.1, ay: 40.2, bx: 94.1, by: 29.2 },
  { id: 'ral-pit', a: 'Raleigh', b: 'Pittsburgh', length: 2, color: 'gray', ax: 83, ay: 67, bx: 83, by: 45 },
  { id: 'ral-atl-1', a: 'Raleigh', b: 'Atlanta', length: 2, color: 'gray', ax: 83, ay: 67, bx: 79, by: 74 },
  { id: 'ral-atl-2', a: 'Raleigh', b: 'Atlanta', length: 2, color: 'gray', ax: 82, ay: 67.2, bx: 78, by: 74.2 },
  { id: 'ral-cha', a: 'Raleigh', b: 'Charleston', length: 2, color: 'gray', ax: 83, ay: 67, bx: 86, by: 72 },
  { id: 'miami-cha', a: 'Miami', b: 'Charleston', length: 4, color: 'purple', ax: 92, ay: 96, bx: 86, by: 72 },
  { id: 'atl-mia', a: 'Atlanta', b: 'Miami', length: 5, color: 'blue', ax: 79, ay: 74, bx: 92, by: 96 },
  { id: 'no-mia', a: 'New Orleans', b: 'Miami', length: 6, color: 'red', ax: 67, ay: 89, bx: 92, by: 96 },
  { id: 'atl-no-1', a: 'Atlanta', b: 'New Orleans', length: 4, color: 'yellow', ax: 79, ay: 74, bx: 67, by: 89 },
  { id: 'atl-no-2', a: 'Atlanta', b: 'New Orleans', length: 4, color: 'orange', ax: 79.2, ay: 74, bx: 66.2, by: 89.2 },
  { id: 'chi-nas', a: 'Chicago', b: 'Nashville', length: 4, color: 'white', ax: 68, ay: 44, bx: 71, by: 66 },
  { id: 'stl-nas', a: 'Saint Louis', b: 'Nashville', length: 2, color: 'gray', ax: 66, ay: 61, bx: 71, by: 66 },
  { id: 'nas-lr', a: 'Nashville', b: 'Little Rock', length: 3, color: 'white', ax: 71, ay: 66, bx: 58, by: 74 },
  { id: 'nas-ral', a: 'Nashville', b: 'Raleigh', length: 3, color: 'black', ax: 71, ay: 66, bx: 83, by: 67 },
  { id: 'nas-atl', a: 'Nashville', b: 'Atlanta', length: 1, color: 'gray', ax: 71, ay: 66, bx: 79, by: 74 },
  { id: 'lr-no', a: 'Little Rock', b: 'New Orleans', length: 3, color: 'green', ax: 58, ay: 74, bx: 67, by: 89 },
] as const;

export const TTR_DESTINATION_TICKETS: readonly TtrDestinationTicket[] = [
  { id: 'sea-ny', a: 'Seattle', b: 'New York', points: 22 },
  { id: 'la-chi', a: 'Los Angeles', b: 'Chicago', points: 16 },
  { id: 'la-ny', a: 'Los Angeles', b: 'New York', points: 21 },
  { id: 'cal-phx', a: 'Calgary', b: 'Phoenix', points: 13 },
  { id: 'den-pit', a: 'Denver', b: 'Pittsburgh', points: 11 },
  { id: 'slc-no', a: 'Salt Lake City', b: 'New Orleans', points: 8 },
  { id: 'hel-la', a: 'Helena', b: 'Los Angeles', points: 8 },
  { id: 'tor-mia', a: 'Toronto', b: 'Miami', points: 10 },
  { id: 'chi-no', a: 'Chicago', b: 'New Orleans', points: 7 },
  { id: 'mtl-atl', a: 'Montreal', b: 'Atlanta', points: 9 },
  { id: 'van-atl', a: 'Vancouver', b: 'Atlanta', points: 20 },
  { id: 'win-mia', a: 'Winnipeg', b: 'Miami', points: 18 },
  { id: 'win-phx', a: 'Winnipeg', b: 'Phoenix', points: 15 },
  { id: 'nas-ny', a: 'Nashville', b: 'New York', points: 11 },
  { id: 'lr-bos', a: 'Little Rock', b: 'Boston', points: 13 },
  { id: 'sau-hou', a: 'Sault Ste Marie', b: 'Houston', points: 12 },
  { id: 'cha-tor', a: 'Charleston', b: 'Toronto', points: 10 },
  { id: 'nas-mtl', a: 'Nashville', b: 'Montreal', points: 10 },
  { id: 'elp-tor', a: 'El Paso', b: 'Toronto', points: 14 },
  { id: 'van-dal', a: 'Vancouver', b: 'Dallas', points: 17 },
  { id: 'hel-mia', a: 'Helena', b: 'Miami', points: 15 },
  { id: 'por-atl', a: 'Portland', b: 'Atlanta', points: 14 },
] as const;

export interface TtrPublicPlayer {
  id: string;
  name: string;
  score: number;
  trainsLeft: number;
  handCount: number;
  ticketCount: number;
}

export interface TtrFinalScoreRow {
  playerId: string;
  playerName: string;
  routePoints: number;
  completedTicketPoints: number;
  failedTicketPenalty: number;
  longestPathBonus: number;
  total: number;
}

export interface TtrPlayerView {
  phase: 'initial_tickets' | 'playing' | 'game_over';
  myId: string;
  currentPlayerId: string;
  players: TtrPublicPlayer[];
  myHand: Record<TtrTrainColor, number>;
  myTickets: TtrDestinationTicket[];
  myCompletedTicketIds: string[];
  faceUpTrainCards: TtrTrainColor[];
  deckTrainRemaining: number;
  deckTicketsRemaining: number;
  routes: {
    id: string;
    ownerId: string | null;
    def: TtrRouteDef;
  }[];
  /**
   * During "draw destination tickets" action, player must choose which to keep
   * before next action.
   */
  pendingTicketChoice: TtrDestinationTicket[] | null;
  /** True when this player has drawn first train card and must draw second card. */
  mustDrawSecondTrainCard: boolean;
  /** Increments whenever face-up train cards are refreshed due to 3 locomotives. */
  faceUpResetNoticeSeq: number;
  /** Increments whenever any player completes at least one destination ticket. */
  destinationCompleteNoticeSeq: number;
  destinationCompleteNotice: {
    playerId: string;
    playerName: string;
    a: string;
    b: string;
    points: number;
  } | null;
  /** Initial setup progress: how many players have confirmed starting tickets. */
  initialTicketConfirmProgress: { done: number; total: number };
  /**
   * Endgame countdown: set when a player reaches ≤2 trains; decrements after each turn until the game ends.
   * The client shows a “ตาสุดท้าย” badge on every seat when this equals `1` (final action round).
   */
  finalTurnsRemaining: number | null;
  finalScoreSummary?: TtrFinalScoreRow[];
  canAct: boolean;
  lastEvent: string;
  gameResult?: { winners: string[]; reason: string };
}

export type TtrAction =
  | { type: 'keep_initial_tickets'; keepIds: string[] }
  | {
      type: 'draw_train_cards';
      first: { source: 'face_up'; index: number } | { source: 'deck' };
      second?: { source: 'face_up'; index: number } | { source: 'deck' };
    }
  | {
      type: 'claim_route';
      routeId: string;
      color: Exclude<TtrTrainColor, 'locomotive'>;
      locomotivesUsed: number;
    }
  | { type: 'draw_destination_tickets' }
  | { type: 'keep_drawn_tickets'; keepIds: string[] };
