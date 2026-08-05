// ============================================================
// Ticket to Ride — map-agnostic domain model
// ============================================================
// Route/ticket data lives in a `TtrMapDefinition` (see ./maps). Nothing here may
// assume the United States board: expansions plug in by adding a map + rules policy.

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

/** A train card colour that can be a route's printed colour. */
export type TtrCardColor = Exclude<TtrTrainColor, 'locomotive'>;

export type TtrRouteColor = TtrCardColor | 'gray';

export type TtrMapId = 'united-states' | 'europe' | 'india';

export interface TtrLobbyOptions {
  mapId: TtrMapId;
}

export function defaultTtrLobbyOptions(): TtrLobbyOptions {
  return { mapId: 'united-states' };
}

export function parseTtrLobbyOptions(raw: unknown): TtrLobbyOptions {
  const defaults = defaultTtrLobbyOptions();
  if (!raw || typeof raw !== 'object') return defaults;
  const o = raw as Record<string, unknown>;
  if (o.mapId === 'europe' || o.mapId === 'united-states' || o.mapId === 'india') {
    return { mapId: o.mapId };
  }
  return defaults;
}

export interface TtrCityDef {
  /** Stable slug used by routes, tickets and board layout. */
  id: string;
  name: string;
}

export interface TtrRouteDef {
  id: string;
  /** City id, not display name. */
  a: string;
  b: string;
  length: number;
  color: TtrRouteColor;
  /** Parallel tracks between the same two cities share one group id. */
  groupId: string;
  /** Europe-style tunnel. */
  tunnel?: boolean;
  /** Ferries force this many locomotives into the payment. */
  ferryLocomotives?: number;
}

export interface TtrDestinationTicket {
  id: string;
  /** City id, not display name. */
  a: string;
  b: string;
  points: number;
}

export interface TtrTrainDeckSpec {
  cardsPerColor: number;
  locomotives: number;
}

export interface TtrSetupSpec {
  /** Train cards dealt to each player. */
  trainCards: number;
  /**
   * Destination tickets at or above this point value are Long tickets.
   * Long tickets are dealt only at setup and may never be drawn mid-game.
   */
  longTicketThreshold: number;
  /** Long tickets dealt at setup. */
  initialLongTickets: number;
  /** Regular tickets offered at setup. */
  initialRegularTickets: number;
  /** Minimum total tickets (Long + Regular) that must be kept at setup. */
  minInitialKeep: number;
  /**
   * When true, dealt Long tickets must be kept (USA custom rule).
   * When false, Long may be discarded like Regular (Europe official).
   */
  longTicketsMandatory: boolean;
  /** Regular tickets offered by the mid-game draw action. */
  ticketDraw: number;
  minTicketKeep: number;
}

export type TtrTiebreakPolicy = 'longest-path' | 'europe';

export interface TtrRulesPolicy {
  /** At or below this player count, claiming one route of a group closes the whole group. */
  doubleRouteLockMaxPlayers: number;
  /** One player may never own two routes of the same group. */
  oneRoutePerGroupPerPlayer: boolean;
  faceUpCount: number;
  /** Discard and redeal the face-up row once it holds this many locomotives. */
  faceUpLocomotiveReset: number;
  /** Final round triggers when a player is left with at most this many trains. */
  endgameTrainThreshold: number;
  longestPathBonus: number;
  /**
   * India Mandala / Grand Tour: completed tickets with ≥2 edge-disjoint paths of the
   * owner's trains score a tiered bonus (max 40). Off by default.
   */
  mandalaBonus?: boolean;
  /** Winner comparator after raw score. Default: longest continuous path (USA). */
  tiebreak?: TtrTiebreakPolicy;
}

export interface TtrMapDefinition {
  id: TtrMapId;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  trainsPerPlayer: number;
  /** Train stations each player starts with (0 = no station action). */
  stationsPerPlayer: number;
  /** Points awarded per unused station at final scoring. */
  unplacedStationBonus: number;
  /** Route length → points. */
  routePoints: Readonly<Record<number, number>>;
  deck: TtrTrainDeckSpec;
  setup: TtrSetupSpec;
  rules: TtrRulesPolicy;
  cities: readonly TtrCityDef[];
  routes: readonly TtrRouteDef[];
  destinationTickets: readonly TtrDestinationTicket[];
}

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

export const TTR_CARD_COLORS: readonly TtrCardColor[] = TTR_TRAIN_COLORS.filter(
  (c): c is TtrCardColor => c !== 'locomotive',
);

/** Scoring table shared by the classic maps. */
export const TTR_ROUTE_POINTS: Readonly<Record<number, number>> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 10,
  6: 15,
  8: 21,
};

export function ttrRouteGroupId(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

/** True when a ticket meets or exceeds the map's Long threshold. */
export function ttrIsLongTicket(ticket: TtrDestinationTicket, threshold: number): boolean {
  return ticket.points >= threshold;
}

/**
 * Mandala ("Grand Tour of India") bonus by number of qualifying tickets.
 * First two: +5 each; next three: +10 each; beyond five: no further points (cap 40).
 */
export function ttrMandalaBonusPoints(qualifyingTicketCount: number): number {
  const n = Math.max(0, Math.min(5, Math.floor(qualifyingTicketCount)));
  const tiers = [5, 5, 10, 10, 10] as const;
  let total = 0;
  for (let i = 0; i < n; i += 1) total += tiers[i]!;
  return total;
}

/** Split a flat ticket list into Long and Regular piles by threshold. */
export function ttrPartitionDestinationTickets(
  tickets: readonly TtrDestinationTicket[],
  threshold: number,
): { long: TtrDestinationTicket[]; regular: TtrDestinationTicket[] } {
  const long: TtrDestinationTicket[] = [];
  const regular: TtrDestinationTicket[] = [];
  for (const t of tickets) {
    if (ttrIsLongTicket(t, threshold)) long.push(t);
    else regular.push(t);
  }
  return { long, regular };
}

/** One legal way to pay for a route, computed by the server. */
export interface TtrClaimOption {
  color: TtrCardColor;
  colorCards: number;
  locomotives: number;
}

export interface TtrPublicPlayer {
  id: string;
  name: string;
  score: number;
  trainsLeft: number;
  handCount: number;
  ticketCount: number;
  /** Stations remaining to place (Europe). */
  stationsLeft: number;
}

export interface TtrStationAssignment {
  cityId: string;
  /** Opponent route borrowed via this station, or null when unused. */
  routeId: string | null;
}

export interface TtrFinalScoreRow {
  playerId: string;
  playerName: string;
  routePoints: number;
  completedTicketPoints: number;
  failedTicketPenalty: number;
  longestPathBonus: number;
  /** India Mandala / Grand Tour bonus (0 when the map does not use it). */
  mandalaBonus: number;
  /** How many completed tickets qualified for Mandala. */
  mandalaTicketCount: number;
  stationBonus: number;
  completedTicketCount: number;
  stationsUsed: number;
  stationAssignments: TtrStationAssignment[];
  total: number;
}

/** Authoritative pending tunnel attempt shown to all players. */
export interface TtrPendingTunnel {
  playerId: string;
  routeId: string;
  color: TtrCardColor;
  colorCards: number;
  locomotivesUsed: number;
  revealed: TtrTrainColor[];
  extraRequired: number;
  /** Legal ways to pay the extra cost from the current hand. */
  extraOptions: TtrClaimOption[];
}

export interface TtrRouteView {
  id: string;
  ownerId: string | null;
  def: TtrRouteDef;
}

export type TtrTrainDrawNoticeCard =
  | { source: 'face_up'; color: TtrTrainColor }
  | { source: 'deck' };

export interface TtrTrainDrawNotice {
  playerId: string;
  playerName: string;
  cards: TtrTrainDrawNoticeCard[];
}

export interface TtrPlayerView {
  mapId: TtrMapId;
  phase: 'initial_tickets' | 'playing' | 'game_over';
  myId: string;
  currentPlayerId: string;
  players: TtrPublicPlayer[];
  myHand: Record<TtrTrainColor, number>;
  myTickets: TtrDestinationTicket[];
  myCompletedTicketIds: string[];
  faceUpTrainCards: TtrTrainColor[];
  deckTrainRemaining: number;
  /** Remaining Regular destination tickets available to draw mid-game. */
  deckRegularTicketsRemaining: number;
  routes: TtrRouteView[];
  /** City id → owning player id for placed stations. */
  stationsByCity: Record<string, string>;
  /**
   * Server-authoritative payments this viewer could make right now, keyed by route id.
   * Empty while it is not their turn — the client must not recompute legality.
   */
  claimOptions: Record<string, TtrClaimOption[]>;
  /**
   * Server-authoritative station build payments for eligible empty cities.
   * Empty when stations are unavailable or it is not their turn.
   */
  stationOptions: Record<string, TtrClaimOption[]>;
  /**
   * During "draw destination tickets" action, player must choose which to keep
   * before next action. During setup this also includes any mandatory Long ticket.
   */
  pendingTicketChoice: TtrDestinationTicket[] | null;
  /**
   * Ticket ids in `pendingTicketChoice` that must be kept (setup Long when mandatory).
   * Empty during mid-game draws or when Long is optional.
   */
  mandatoryTicketIds: string[];
  /** True when this player has drawn first train card and must draw second card. */
  mustDrawSecondTrainCard: boolean;
  /** Authoritative tunnel reveal awaiting accept/refuse. */
  pendingTunnel: TtrPendingTunnel | null;
  /** Increments whenever a player draws train cards. Deck card colours stay private. */
  trainDrawNoticeSeq: number;
  trainDrawNotice: TtrTrainDrawNotice | null;
  /** Increments whenever face-up train cards are refreshed due to too many locomotives. */
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
   * Endgame countdown: set when a player hits the train threshold; decrements after each turn.
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
      color: TtrCardColor;
      locomotivesUsed: number;
    }
  | {
      type: 'resolve_tunnel_claim';
      accept: boolean;
      /** Required when accept is true and extra cost > 0. */
      color?: TtrCardColor;
      locomotivesUsed?: number;
    }
  | {
      type: 'build_station';
      cityId: string;
      color: TtrCardColor;
      locomotivesUsed: number;
    }
  | { type: 'draw_destination_tickets' }
  | { type: 'keep_drawn_tickets'; keepIds: string[] };
