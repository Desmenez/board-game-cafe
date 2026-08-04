import type {
  GameDefinition,
  GameResult,
  Player,
  TtrAction,
  TtrCardColor,
  TtrClaimOption,
  TtrDestinationTicket,
  TtrFinalScoreRow,
  TtrMapDefinition,
  TtrMapId,
  TtrPendingTunnel,
  TtrPlayerView,
  TtrRouteDef,
  TtrStationAssignment,
  TtrTrainDrawNotice,
  TtrTrainDrawNoticeCard,
  TtrTrainColor,
} from 'shared';
import {
  TTR_CARD_COLORS,
  TTR_TRAIN_COLORS,
  getTtrMap,
  parseTtrLobbyOptions,
  ttrCityName,
  ttrIsLongTicket,
  ttrMandalaBonusPoints,
  ttrMapIndex,
  ttrPartitionDestinationTickets,
} from 'shared';
import { GAME_THUMBNAIL_BY_ID } from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

/** Cards flipped off the train deck when a tunnel claim is attempted. */
const TUNNEL_REVEAL_COUNT = 3;

/**
 * The one thing the table is waiting for. Every pending step belongs to the
 * active player, so guards only ever need the turn holder plus this tag.
 */
export type TtrPendingTurn =
  | { kind: 'ready' }
  | { kind: 'second_train_draw'; playerId: string }
  | { kind: 'destination_choice'; playerId: string; offered: TtrDestinationTicket[] }
  | { kind: 'tunnel_response'; attempt: TtrPendingTunnel };

export interface TtrState {
  mapId: TtrMapId;
  phase: 'initial_tickets' | 'playing' | 'game_over';
  playerOrder: string[];
  playerNames: Record<string, string>;
  currentTurnIndex: number;
  scores: Record<string, number>;
  trainsLeft: Record<string, number>;
  stationsLeft: Record<string, number>;
  /** City id → player id for placed stations. */
  stationsByCity: Record<string, string>;
  hand: Record<string, Record<TtrTrainColor, number>>;
  tickets: Record<string, TtrDestinationTicket[]>;
  pendingInitialChoices: Record<string, TtrDestinationTicket[] | null>;
  completedTicketIdsByPlayer: Record<string, string[]>;
  pendingTurn: TtrPendingTurn;
  trainDrawNoticeSeq: number;
  trainDrawNotice: TtrTrainDrawNotice | null;
  faceUpResetNoticeSeq: number;
  destinationCompleteNoticeSeq: number;
  destinationCompleteNotice: {
    playerId: string;
    playerName: string;
    a: string;
    b: string;
    points: number;
  } | null;
  finalScoreSummary?: TtrFinalScoreRow[];
  trainDeck: TtrTrainColor[];
  trainDiscard: TtrTrainColor[];
  /** Drawable Regular destination tickets only. Long tickets never enter this deck. */
  regularTicketDeck: TtrDestinationTicket[];
  faceUpTrainCards: TtrTrainColor[];
  routeOwner: Record<string, string | null>;
  finalTurnsRemaining: number | null;
  lastEvent: string;
  result?: GameResult;
}

function mapOf(s: TtrState): TtrMapDefinition {
  return getTtrMap(s.mapId);
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function emptyTrainHand(): Record<TtrTrainColor, number> {
  return Object.fromEntries(TTR_TRAIN_COLORS.map((c) => [c, 0])) as Record<TtrTrainColor, number>;
}

function currentPlayerId(s: TtrState): string {
  return s.playerOrder[s.currentTurnIndex]!;
}

function drawTrainCardFromDeck(s: TtrState): TtrTrainColor | null {
  if (s.trainDeck.length === 0 && s.trainDiscard.length > 0) {
    s.trainDeck = shuffle(s.trainDiscard);
    s.trainDiscard = [];
  }
  if (s.trainDeck.length === 0) return null;
  return s.trainDeck.pop() ?? null;
}

function refillFaceUp(s: TtrState): void {
  const target = mapOf(s).rules.faceUpCount;
  while (s.faceUpTrainCards.length < target) {
    const c = drawTrainCardFromDeck(s);
    if (!c) break;
    s.faceUpTrainCards.push(c);
  }
}

function clearFaceUpIfTooManyLocomotives(s: TtrState): void {
  const threshold = mapOf(s).rules.faceUpLocomotiveReset;
  const locoCount = (cards: TtrTrainColor[]): number => {
    let n = 0;
    for (const c of cards) {
      if (c === 'locomotive') n += 1;
    }
    return n;
  };
  while (locoCount(s.faceUpTrainCards) >= threshold && s.trainDeck.length > 0) {
    s.trainDiscard.push(...s.faceUpTrainCards);
    s.faceUpTrainCards = [];
    s.faceUpResetNoticeSeq += 1;
    refillFaceUp(s);
    if (s.trainDeck.length === 0 && s.faceUpTrainCards.length === 0) break;
  }
}

function drawFromFaceUp(s: TtrState, index: number): TtrTrainColor {
  if (index < 0 || index >= s.faceUpTrainCards.length) {
    throw new GameActionRejectedError('เลือกการ์ดเปิดหน้าไม่ถูกต้อง');
  }
  const card = s.faceUpTrainCards[index]!;
  s.faceUpTrainCards.splice(index, 1);
  refillFaceUp(s);
  clearFaceUpIfTooManyLocomotives(s);
  return card;
}

// ============================================================
// Turn / pending guards
// ============================================================

function pendingBlockReason(pending: TtrPendingTurn): string | null {
  switch (pending.kind) {
    case 'ready':
      return null;
    case 'second_train_draw':
      return 'ต้องจั่วการ์ดรถไฟใบที่ 2 ให้จบก่อน';
    case 'destination_choice':
      return 'ต้องเลือกตั๋วปลายทางที่จั่วก่อน';
    case 'tunnel_response':
      return 'ต้องตอบรับหรือยกเลิกการลงอุโมงค์ก่อน';
  }
}

function ensureTurn(s: TtrState, playerId: string): void {
  if (s.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ถึงช่วงเล่น');
  if (currentPlayerId(s) !== playerId) throw new GameActionRejectedError('ยังไม่ถึงตาคุณ');
}

/** The active player may only start a fresh action when nothing is pending. */
function ensureReady(s: TtrState, playerId: string): void {
  ensureTurn(s, playerId);
  const reason = pendingBlockReason(s.pendingTurn);
  if (reason) throw new GameActionRejectedError(reason);
}

function pendingSecondDrawPlayerId(s: TtrState): string | null {
  return s.pendingTurn.kind === 'second_train_draw' ? s.pendingTurn.playerId : null;
}

function pendingDestinationOffer(s: TtrState, playerId: string): TtrDestinationTicket[] | null {
  const p = s.pendingTurn;
  return p.kind === 'destination_choice' && p.playerId === playerId ? p.offered : null;
}

function pendingTunnelFor(s: TtrState, playerId: string): TtrPendingTunnel | null {
  const p = s.pendingTurn;
  return p.kind === 'tunnel_response' && p.attempt.playerId === playerId ? p.attempt : null;
}

// ============================================================
// Map lookups and payment maths
// ============================================================

function routeById(s: TtrState, routeId: string): TtrRouteDef {
  const r = ttrMapIndex(mapOf(s)).routeById[routeId];
  if (!r) throw new GameActionRejectedError('ไม่พบเส้นทาง');
  return r;
}

function routeIdsInSameGroup(s: TtrState, route: TtrRouteDef): string[] {
  return ttrMapIndex(mapOf(s)).routeIdsByGroup[route.groupId] ?? [];
}

function ownedRoutesOfPlayer(s: TtrState, pid: string): TtrRouteDef[] {
  return mapOf(s).routes.filter((r) => s.routeOwner[r.id] === pid);
}

/**
 * Why this route cannot be claimed by `pid` right now, ignoring the cards in hand.
 * Returns null when the route is open to them.
 */
function routeBlockReason(s: TtrState, pid: string, route: TtrRouteDef): string | null {
  if (s.routeOwner[route.id]) return 'เส้นทางนี้ถูกยึดแล้ว';
  const rules = mapOf(s).rules;
  const groupRouteIds = routeIdsInSameGroup(s, route);
  if (rules.oneRoutePerGroupPerPlayer && groupRouteIds.some((rid) => s.routeOwner[rid] === pid)) {
    return 'ผู้เล่นเดียวกันยึดทั้งสองเส้นระหว่างเมืองคู่เดิมไม่ได้';
  }
  if (
    s.playerOrder.length <= rules.doubleRouteLockMaxPlayers &&
    groupRouteIds.some((rid) => s.routeOwner[rid] != null)
  ) {
    return 'เกม 2-3 คน: เมื่อมีคนยึดหนึ่งเส้น อีกเส้นของคู่เมืองนี้จะปิดทันที';
  }
  if ((s.trainsLeft[pid] ?? 0) < route.length) return 'รถไฟไม่พอลงเส้นนี้';
  return null;
}

/**
 * Every way to pay `count` cards from `hand`, cheapest in locomotives first.
 * `fixedColor` null means any single colour (gray routes and stations).
 */
function paymentOptions(
  hand: Record<TtrTrainColor, number>,
  count: number,
  fixedColor: TtrCardColor | null,
  minLocomotives: number,
): TtrClaimOption[] {
  if (count <= 0) return [];
  const loco = hand.locomotive ?? 0;
  const colors: readonly TtrCardColor[] = fixedColor ? [fixedColor] : TTR_CARD_COLORS;
  const out: TtrClaimOption[] = [];
  for (const color of colors) {
    const have = hand[color] ?? 0;
    if (have + loco < count) continue;
    const minLoco = Math.max(minLocomotives, count - have);
    for (let l = minLoco; l <= Math.min(count, loco); l += 1) {
      out.push({ color, colorCards: count - l, locomotives: l });
    }
  }
  return out;
}

/** Every legal payment for one route, cheapest in locomotives first. */
function claimOptionsForRoute(s: TtrState, pid: string, route: TtrRouteDef): TtrClaimOption[] {
  if (routeBlockReason(s, pid, route) != null) return [];
  const hand = s.hand[pid] ?? emptyTrainHand();
  return paymentOptions(
    hand,
    route.length,
    route.color === 'gray' ? null : route.color,
    route.ferryLocomotives ?? 0,
  );
}

function claimOptionsForPlayer(s: TtrState, pid: string): Record<string, TtrClaimOption[]> {
  const out: Record<string, TtrClaimOption[]> = {};
  if (s.phase !== 'playing') return out;
  if (currentPlayerId(s) !== pid) return out;
  if (s.pendingTurn.kind !== 'ready') return out;
  for (const route of mapOf(s).routes) {
    const options = claimOptionsForRoute(s, pid, route);
    if (options.length > 0) out[route.id] = options;
  }
  return out;
}

/** Stations get progressively more expensive: 1 card, then 2, then 3. */
function stationCostFor(s: TtrState, pid: string): number {
  const map = mapOf(s);
  return map.stationsPerPlayer - (s.stationsLeft[pid] ?? 0) + 1;
}

function stationOptionsForPlayer(s: TtrState, pid: string): Record<string, TtrClaimOption[]> {
  const out: Record<string, TtrClaimOption[]> = {};
  const map = mapOf(s);
  if (map.stationsPerPlayer <= 0) return out;
  if (s.phase !== 'playing') return out;
  if (currentPlayerId(s) !== pid) return out;
  if (s.pendingTurn.kind !== 'ready') return out;
  if ((s.stationsLeft[pid] ?? 0) <= 0) return out;

  const options = paymentOptions(s.hand[pid] ?? emptyTrainHand(), stationCostFor(s, pid), null, 0);
  if (options.length === 0) return out;
  for (const city of map.cities) {
    if (s.stationsByCity[city.id]) continue;
    out[city.id] = options.map((o) => ({ ...o }));
  }
  return out;
}

// ============================================================
// Connectivity
// ============================================================

function buildGraph(routes: readonly TtrRouteDef[]): Map<string, string[]> {
  const g = new Map<string, string[]>();
  for (const r of routes) {
    if (!g.has(r.a)) g.set(r.a, []);
    if (!g.has(r.b)) g.set(r.b, []);
    g.get(r.a)!.push(r.b);
    g.get(r.b)!.push(r.a);
  }
  return g;
}

function graphForPlayer(s: TtrState, pid: string): Map<string, string[]> {
  return buildGraph(ownedRoutesOfPlayer(s, pid));
}

function connected(g: Map<string, string[]>, a: string, b: string): boolean {
  if (a === b) return true;
  const q = [a];
  const seen = new Set<string>([a]);
  let qi = 0;
  while (qi < q.length) {
    const cur = q[qi++]!;
    for (const nx of g.get(cur) ?? []) {
      if (seen.has(nx)) continue;
      if (nx === b) return true;
      seen.add(nx);
      q.push(nx);
    }
  }
  return false;
}

/** Live completion ignores stations: only the player's own track counts during play. */
function completedTicketIds(s: TtrState, pid: string): Set<string> {
  const g = graphForPlayer(s, pid);
  const out = new Set<string>();
  for (const t of s.tickets[pid] ?? []) {
    if (connected(g, t.a, t.b)) out.add(t.id);
  }
  return out;
}

function refreshCompletedTicketIdsForPlayer(s: TtrState, pid: string): Set<string> {
  const ids = [...completedTicketIds(s, pid)];
  s.completedTicketIdsByPlayer[pid] = ids;
  return new Set(ids);
}

function longestPathLengthForPlayer(s: TtrState, pid: string): number {
  const owned = ownedRoutesOfPlayer(s, pid);
  const adjacency = new Map<string, { to: string; eid: string; len: number }[]>();
  for (const r of owned) {
    if (!adjacency.has(r.a)) adjacency.set(r.a, []);
    if (!adjacency.has(r.b)) adjacency.set(r.b, []);
    adjacency.get(r.a)!.push({ to: r.b, eid: r.id, len: r.length });
    adjacency.get(r.b)!.push({ to: r.a, eid: r.id, len: r.length });
  }
  let best = 0;
  const dfs = (node: string, used: Set<string>, sum: number): void => {
    if (sum > best) best = sum;
    for (const e of adjacency.get(node) ?? []) {
      if (used.has(e.eid)) continue;
      used.add(e.eid);
      dfs(e.to, used, sum + e.len);
      used.delete(e.eid);
    }
  };
  for (const n of adjacency.keys()) dfs(n, new Set<string>(), 0);
  return best;
}

/**
 * India Mandala: ≥2 continuous paths of the owner's trains that may share cities
 * but not trains (edge-disjoint). Find any path, drop its edges, check again.
 */
function findPathEdges(
  adjacency: Map<string, { to: string; eid: string }[]>,
  start: string,
  goal: string,
  blocked: ReadonlySet<string>,
): string[] | null {
  if (start === goal) return [];
  const q = [start];
  const prev = new Map<string, { from: string; eid: string }>();
  const seen = new Set<string>([start]);
  let qi = 0;
  while (qi < q.length) {
    const cur = q[qi++]!;
    for (const e of adjacency.get(cur) ?? []) {
      if (blocked.has(e.eid) || seen.has(e.to)) continue;
      seen.add(e.to);
      prev.set(e.to, { from: cur, eid: e.eid });
      if (e.to === goal) {
        const edges: string[] = [];
        let node = goal;
        while (node !== start) {
          const step = prev.get(node)!;
          edges.push(step.eid);
          node = step.from;
        }
        return edges;
      }
      q.push(e.to);
    }
  }
  return null;
}

function hasTwoEdgeDisjointPaths(owned: readonly TtrRouteDef[], a: string, b: string): boolean {
  if (a === b) return false;
  const adjacency = new Map<string, { to: string; eid: string }[]>();
  for (const r of owned) {
    if (!adjacency.has(r.a)) adjacency.set(r.a, []);
    if (!adjacency.has(r.b)) adjacency.set(r.b, []);
    adjacency.get(r.a)!.push({ to: r.b, eid: r.id });
    adjacency.get(r.b)!.push({ to: r.a, eid: r.id });
  }
  const first = findPathEdges(adjacency, a, b, new Set());
  if (!first) return false;
  const blocked = new Set(first);
  return findPathEdges(adjacency, a, b, blocked) != null;
}

function mandalaStatsForPlayer(
  s: TtrState,
  pid: string,
  completedIds: ReadonlySet<string>,
): { count: number; bonus: number } {
  if (!mapOf(s).rules.mandalaBonus) return { count: 0, bonus: 0 };
  const owned = ownedRoutesOfPlayer(s, pid);
  let count = 0;
  for (const t of s.tickets[pid] ?? []) {
    if (!completedIds.has(t.id)) continue;
    if (hasTwoEdgeDisjointPaths(owned, t.a, t.b)) count += 1;
  }
  return { count, bonus: ttrMandalaBonusPoints(count) };
}

// ============================================================
// Turn flow
// ============================================================

function consumeTurnAndMaybeAdvance(s: TtrState): void {
  s.pendingTurn = { kind: 'ready' };
  const active = currentPlayerId(s);
  if (
    s.finalTurnsRemaining == null &&
    s.trainsLeft[active]! <= mapOf(s).rules.endgameTrainThreshold
  ) {
    s.finalTurnsRemaining = s.playerOrder.length + 1;
    s.lastEvent = `${s.playerNames[active]} เหลือรถไฟไม่เกิน ${mapOf(s).rules.endgameTrainThreshold} ขบวน — เข้าช่วงตาสุดท้าย`;
  }

  if (s.finalTurnsRemaining != null) {
    s.finalTurnsRemaining -= 1;
    if (s.finalTurnsRemaining <= 0) {
      finishGame(s);
      return;
    }
  }

  s.currentTurnIndex = (s.currentTurnIndex + 1) % s.playerOrder.length;
}

function spendCards(
  s: TtrState,
  pid: string,
  color: TtrCardColor,
  colorCards: number,
  locomotives: number,
): void {
  s.hand[pid]![color] -= colorCards;
  s.hand[pid]!.locomotive -= locomotives;
  for (let i = 0; i < colorCards; i += 1) s.trainDiscard.push(color);
  for (let i = 0; i < locomotives; i += 1) s.trainDiscard.push('locomotive');
}

/** Places the trains, scores the route and raises the "ticket done" notice. */
function applyRouteClaim(s: TtrState, pid: string, route: TtrRouteDef): void {
  const map = mapOf(s);
  const completedBefore = new Set(s.completedTicketIdsByPlayer[pid] ?? []);
  s.routeOwner[route.id] = pid;
  s.trainsLeft[pid] = (s.trainsLeft[pid] ?? 0) - route.length;
  s.scores[pid] = (s.scores[pid] ?? 0) + (map.routePoints[route.length] ?? 0);
  const completedAfter = refreshCompletedTicketIdsForPlayer(s, pid);
  const newlyCompleted = (s.tickets[pid] ?? []).find(
    (t) => !completedBefore.has(t.id) && completedAfter.has(t.id),
  );
  if (newlyCompleted) {
    s.destinationCompleteNoticeSeq += 1;
    s.destinationCompleteNotice = {
      playerId: pid,
      playerName: s.playerNames[pid] ?? pid,
      a: newlyCompleted.a,
      b: newlyCompleted.b,
      points: newlyCompleted.points,
    };
  }
  s.lastEvent = `${s.playerNames[pid]} ยึดเส้นทาง ${ttrCityName(map, route.a)} - ${ttrCityName(map, route.b)}`;
}

// ============================================================
// Final scoring
// ============================================================

interface TicketOutcome {
  completedIds: string[];
  completedPoints: number;
  /** Zero or negative. */
  failedPenalty: number;
}

function scoreTickets(
  tickets: readonly TtrDestinationTicket[],
  g: Map<string, string[]>,
): TicketOutcome {
  const completedIds: string[] = [];
  let completedPoints = 0;
  let failedPenalty = 0;
  for (const t of tickets) {
    if (connected(g, t.a, t.b)) {
      completedIds.push(t.id);
      completedPoints += t.points;
    } else {
      failedPenalty -= t.points;
    }
  }
  return { completedIds, completedPoints, failedPenalty };
}

function cartesian<T>(choices: T[][]): T[][] {
  let acc: T[][] = [[]];
  for (const opts of choices) {
    const next: T[][] = [];
    for (const partial of acc) {
      for (const o of opts) next.push([...partial, o]);
    }
    acc = next;
  }
  return acc;
}

/**
 * Europe stations let a player borrow one opponent route per station, but only
 * for destination connectivity. We brute-force every assignment and keep the
 * best one; at most 3 stations makes the search space tiny.
 */
function bestTicketOutcome(
  s: TtrState,
  pid: string,
): { outcome: TicketOutcome; assignments: TtrStationAssignment[] } {
  const map = mapOf(s);
  const owned = ownedRoutesOfPlayer(s, pid);
  const tickets = s.tickets[pid] ?? [];
  const placedCities = map.cities.map((c) => c.id).filter((cid) => s.stationsByCity[cid] === pid);
  if (placedCities.length === 0) {
    return { outcome: scoreTickets(tickets, buildGraph(owned)), assignments: [] };
  }

  const { routeById: byId } = ttrMapIndex(map);
  const choices = placedCities.map((city) => {
    const opts: (string | null)[] = [null];
    for (const r of map.routes) {
      const owner = s.routeOwner[r.id];
      if (!owner || owner === pid) continue;
      if (r.a === city || r.b === city) opts.push(r.id);
    }
    return opts;
  });

  let best: { net: number; key: string; outcome: TicketOutcome; combo: (string | null)[] } | null =
    null;
  for (const combo of cartesian(choices)) {
    const borrowed = combo
      .filter((id): id is string => id != null)
      .map((id) => byId[id])
      .filter((r): r is TtrRouteDef => r != null);
    const outcome = scoreTickets(tickets, buildGraph([...owned, ...borrowed]));
    const candidate = {
      net: outcome.completedPoints + outcome.failedPenalty,
      key: combo.map((id) => id ?? '').join('|'),
      outcome,
      combo,
    };
    if (best == null || isBetterOutcome(candidate, best)) best = candidate;
  }

  const chosen = best!;
  return {
    outcome: chosen.outcome,
    assignments: placedCities.map((cityId, i) => ({ cityId, routeId: chosen.combo[i] ?? null })),
  };
}

function isBetterOutcome(
  a: { net: number; key: string; outcome: TicketOutcome },
  b: { net: number; key: string; outcome: TicketOutcome },
): boolean {
  if (a.net !== b.net) return a.net > b.net;
  const ac = a.outcome.completedIds.length;
  const bc = b.outcome.completedIds.length;
  if (ac !== bc) return ac > bc;
  return a.key < b.key;
}

function compareEuropeRows(a: TtrFinalScoreRow, b: TtrFinalScoreRow): number {
  if (a.total !== b.total) return b.total - a.total;
  if (a.completedTicketCount !== b.completedTicketCount) {
    return b.completedTicketCount - a.completedTicketCount;
  }
  if (a.stationsUsed !== b.stationsUsed) return a.stationsUsed - b.stationsUsed;
  return b.longestPathBonus - a.longestPathBonus;
}

function finishGame(s: TtrState): void {
  const map = mapOf(s);
  const routeScoreBase: Record<string, number> = Object.fromEntries(
    s.playerOrder.map((pid) => [pid, s.scores[pid] ?? 0]),
  );

  const outcomes: Record<string, { outcome: TicketOutcome; assignments: TtrStationAssignment[] }> =
    {};
  for (const pid of s.playerOrder) {
    const result = bestTicketOutcome(s, pid);
    outcomes[pid] = result;
    s.completedTicketIdsByPlayer[pid] = [...result.outcome.completedIds];
    s.scores[pid] =
      (s.scores[pid] ?? 0) + result.outcome.completedPoints + result.outcome.failedPenalty;
  }

  const stationBonusByPlayer: Record<string, number> = {};
  for (const pid of s.playerOrder) {
    const bonus = map.unplacedStationBonus * (s.stationsLeft[pid] ?? 0);
    stationBonusByPlayer[pid] = bonus;
    s.scores[pid] = (s.scores[pid] ?? 0) + bonus;
  }

  // European Express / Longest Path counts a player's own trains only.
  const longestByPlayer: Record<string, number> = {};
  let longest = 0;
  for (const pid of s.playerOrder) {
    const len = longestPathLengthForPlayer(s, pid);
    longestByPlayer[pid] = len;
    longest = Math.max(longest, len);
  }
  const longestPathBonus: Record<string, number> = Object.fromEntries(
    s.playerOrder.map((pid) => [pid, 0]),
  );
  if (longest > 0) {
    for (const pid of s.playerOrder) {
      if (longestByPlayer[pid] === longest) {
        longestPathBonus[pid] = map.rules.longestPathBonus;
        s.scores[pid] = (s.scores[pid] ?? 0) + map.rules.longestPathBonus;
      }
    }
  }

  const mandalaByPlayer: Record<string, { count: number; bonus: number }> = {};
  for (const pid of s.playerOrder) {
    const completed = new Set(outcomes[pid]!.outcome.completedIds);
    const stats = mandalaStatsForPlayer(s, pid, completed);
    mandalaByPlayer[pid] = stats;
    if (stats.bonus > 0) {
      s.scores[pid] = (s.scores[pid] ?? 0) + stats.bonus;
    }
  }

  const rows: TtrFinalScoreRow[] = s.playerOrder.map((pid) => {
    const { outcome, assignments } = outcomes[pid]!;
    const mandala = mandalaByPlayer[pid] ?? { count: 0, bonus: 0 };
    return {
      playerId: pid,
      playerName: s.playerNames[pid] ?? pid,
      routePoints: routeScoreBase[pid] ?? 0,
      completedTicketPoints: outcome.completedPoints,
      failedTicketPenalty: outcome.failedPenalty,
      longestPathBonus: longestPathBonus[pid] ?? 0,
      mandalaBonus: mandala.bonus,
      mandalaTicketCount: mandala.count,
      stationBonus: stationBonusByPlayer[pid] ?? 0,
      completedTicketCount: outcome.completedIds.length,
      stationsUsed: map.stationsPerPlayer - (s.stationsLeft[pid] ?? 0),
      stationAssignments: assignments,
      total: s.scores[pid] ?? 0,
    };
  });

  const europeTiebreak = map.rules.tiebreak === 'europe';
  rows.sort(europeTiebreak ? compareEuropeRows : (a, b) => b.total - a.total);

  let winners: string[];
  let best = -Infinity;
  for (const pid of s.playerOrder) best = Math.max(best, s.scores[pid] ?? 0);
  if (europeTiebreak) {
    const top = rows[0]!;
    winners = rows.filter((r) => compareEuropeRows(r, top) === 0).map((r) => r.playerId);
  } else {
    winners = s.playerOrder.filter((pid) => (s.scores[pid] ?? 0) === best);
  }

  const bonusLabel =
    map.id === 'india' ? 'Indian Express' : europeTiebreak ? 'European Express' : 'Longest Path';
  s.phase = 'game_over';
  s.result = {
    winners,
    reason:
      winners.length === 1
        ? `${s.playerNames[winners[0]!]} ชนะที่ ${best} คะแนน (${bonusLabel}: ${longest})`
        : `เสมอที่ ${best} คะแนน (${bonusLabel}: ${longest})`,
  };
  s.finalScoreSummary = rows;
  s.lastEvent = 'เกมจบแล้ว';
}

// ============================================================
// View
// ============================================================

function toView(s: TtrState, viewerId: string): TtrPlayerView {
  const map = mapOf(s);
  const handCountOf = (id: string): number => {
    const h = s.hand[id] ?? emptyTrainHand();
    let total = 0;
    for (const c of TTR_TRAIN_COLORS) total += h[c] ?? 0;
    return total;
  };
  const players = s.playerOrder.map((id) => ({
    id,
    name: s.playerNames[id] ?? id,
    score: s.scores[id] ?? 0,
    trainsLeft: s.trainsLeft[id] ?? map.trainsPerPlayer,
    stationsLeft: s.stationsLeft[id] ?? map.stationsPerPlayer,
    handCount: handCountOf(id),
    ticketCount: (s.tickets[id] ?? []).length,
  }));
  let done = 0;
  for (const id of s.playerOrder) {
    if (s.pendingInitialChoices[id] == null) done += 1;
  }
  const initialTicketConfirmProgress = {
    done,
    total: s.playerOrder.length,
  };
  const drawnOffer = pendingDestinationOffer(s, viewerId);
  const initialOffer = s.pendingInitialChoices[viewerId] ?? null;
  const tunnel = pendingTunnelFor(s, viewerId);
  return {
    mapId: s.mapId,
    phase: s.phase,
    myId: viewerId,
    currentPlayerId: currentPlayerId(s),
    players,
    myHand: { ...s.hand[viewerId] },
    myTickets: [...(s.tickets[viewerId] ?? [])],
    myCompletedTicketIds: [...(s.completedTicketIdsByPlayer[viewerId] ?? [])],
    faceUpTrainCards: [...s.faceUpTrainCards],
    deckTrainRemaining: s.trainDeck.length,
    deckRegularTicketsRemaining: s.regularTicketDeck.length,
    routes: map.routes.map((r) => ({ id: r.id, ownerId: s.routeOwner[r.id] ?? null, def: r })),
    stationsByCity: { ...s.stationsByCity },
    claimOptions: claimOptionsForPlayer(s, viewerId),
    stationOptions: stationOptionsForPlayer(s, viewerId),
    pendingTicketChoice: drawnOffer ? [...drawnOffer] : initialOffer ? [...initialOffer] : null,
    mandatoryTicketIds:
      s.phase === 'initial_tickets' && map.setup.longTicketsMandatory && initialOffer
        ? initialOffer
            .filter((t) => ttrIsLongTicket(t, map.setup.longTicketThreshold))
            .map((t) => t.id)
        : [],
    mustDrawSecondTrainCard: pendingSecondDrawPlayerId(s) === viewerId,
    pendingTunnel: tunnel
      ? {
          ...tunnel,
          revealed: [...tunnel.revealed],
          extraOptions: tunnel.extraOptions.map((o) => ({ ...o })),
        }
      : null,
    trainDrawNoticeSeq: s.trainDrawNoticeSeq,
    trainDrawNotice: s.trainDrawNotice
      ? { ...s.trainDrawNotice, cards: s.trainDrawNotice.cards.map((card) => ({ ...card })) }
      : null,
    faceUpResetNoticeSeq: s.faceUpResetNoticeSeq,
    destinationCompleteNoticeSeq: s.destinationCompleteNoticeSeq,
    destinationCompleteNotice: s.destinationCompleteNotice
      ? { ...s.destinationCompleteNotice }
      : null,
    initialTicketConfirmProgress,
    finalTurnsRemaining: s.finalTurnsRemaining,
    finalScoreSummary: s.finalScoreSummary
      ? s.finalScoreSummary.map((r) => ({
          ...r,
          stationAssignments: r.stationAssignments.map((a) => ({ ...a })),
        }))
      : undefined,
    canAct: s.phase === 'playing' && currentPlayerId(s) === viewerId,
    lastEvent: s.lastEvent,
    gameResult: s.result ? { ...s.result } : undefined,
  };
}

function buildTrainDeck(map: TtrMapDefinition): TtrTrainColor[] {
  const d: TtrTrainColor[] = [];
  for (const c of TTR_CARD_COLORS) {
    for (let i = 0; i < map.deck.cardsPerColor; i += 1) d.push(c);
  }
  for (let i = 0; i < map.deck.locomotives; i += 1) d.push('locomotive');
  return shuffle(d);
}

type KeepInitialTicketsAction = Extract<TtrAction, { type: 'keep_initial_tickets' }>;
type DrawTrainCardsAction = Extract<TtrAction, { type: 'draw_train_cards' }>;
type ClaimRouteAction = Extract<TtrAction, { type: 'claim_route' }>;
type ResolveTunnelClaimAction = Extract<TtrAction, { type: 'resolve_tunnel_claim' }>;
type BuildStationAction = Extract<TtrAction, { type: 'build_station' }>;
type KeepDrawnTicketsAction = Extract<TtrAction, { type: 'keep_drawn_tickets' }>;

function clonePendingTurn(pending: TtrPendingTurn): TtrPendingTurn {
  switch (pending.kind) {
    case 'ready':
      return { kind: 'ready' };
    case 'second_train_draw':
      return { kind: 'second_train_draw', playerId: pending.playerId };
    case 'destination_choice':
      return {
        kind: 'destination_choice',
        playerId: pending.playerId,
        offered: [...pending.offered],
      };
    case 'tunnel_response':
      return {
        kind: 'tunnel_response',
        attempt: {
          ...pending.attempt,
          revealed: [...pending.attempt.revealed],
          extraOptions: pending.attempt.extraOptions.map((o) => ({ ...o })),
        },
      };
  }
}

function cloneState(state: TtrState): TtrState {
  const hand = {} as TtrState['hand'];
  for (const id in state.hand) {
    hand[id] = { ...state.hand[id] };
  }
  const tickets = {} as TtrState['tickets'];
  for (const id in state.tickets) {
    tickets[id] = [...state.tickets[id]!];
  }
  const pendingInitialChoices = {} as TtrState['pendingInitialChoices'];
  for (const id in state.pendingInitialChoices) {
    const ts = state.pendingInitialChoices[id];
    pendingInitialChoices[id] = ts ? [...ts] : null;
  }
  const completedTicketIdsByPlayer = {} as TtrState['completedTicketIdsByPlayer'];
  for (const id in state.completedTicketIdsByPlayer) {
    completedTicketIdsByPlayer[id] = [...state.completedTicketIdsByPlayer[id]!];
  }
  return {
    ...state,
    playerOrder: [...state.playerOrder],
    playerNames: { ...state.playerNames },
    scores: { ...state.scores },
    trainsLeft: { ...state.trainsLeft },
    stationsLeft: { ...state.stationsLeft },
    stationsByCity: { ...state.stationsByCity },
    hand,
    tickets,
    pendingInitialChoices,
    completedTicketIdsByPlayer,
    pendingTurn: clonePendingTurn(state.pendingTurn ?? { kind: 'ready' }),
    trainDrawNoticeSeq: state.trainDrawNoticeSeq ?? 0,
    trainDrawNotice: state.trainDrawNotice
      ? {
          ...state.trainDrawNotice,
          cards: state.trainDrawNotice.cards.map((card) => ({ ...card })),
        }
      : null,
    faceUpResetNoticeSeq: state.faceUpResetNoticeSeq ?? 0,
    destinationCompleteNoticeSeq: state.destinationCompleteNoticeSeq ?? 0,
    destinationCompleteNotice: state.destinationCompleteNotice
      ? { ...state.destinationCompleteNotice }
      : null,
    trainDeck: [...state.trainDeck],
    trainDiscard: [...state.trainDiscard],
    regularTicketDeck: [...state.regularTicketDeck],
    faceUpTrainCards: [...state.faceUpTrainCards],
    routeOwner: { ...state.routeOwner },
    finalScoreSummary: state.finalScoreSummary
      ? state.finalScoreSummary.map((r) => ({
          ...r,
          stationAssignments: (r.stationAssignments ?? []).map((a) => ({ ...a })),
        }))
      : undefined,
    result: state.result ? { ...state.result } : undefined,
  };
}

// ============================================================
// Action handlers
// ============================================================

function handleKeepInitialTickets(
  s: TtrState,
  playerId: string,
  action: KeepInitialTicketsAction,
): TtrState {
  if (s.phase !== 'initial_tickets')
    throw new GameActionRejectedError('เลยช่วงเลือกตั๋วเริ่มต้นแล้ว');
  const pending = s.pendingInitialChoices[playerId];
  if (!pending) throw new GameActionRejectedError('คุณเลือกตั๋วเริ่มต้นแล้ว');

  const map = mapOf(s);
  const threshold = map.setup.longTicketThreshold;
  const offeredIds = new Set(pending.map((t) => t.id));
  for (const id of action.keepIds) {
    if (!offeredIds.has(id)) throw new GameActionRejectedError('ตั๋วที่เลือกไม่ได้อยู่ในชุดที่แจก');
  }
  const keepIdSet = new Set(action.keepIds);

  if (map.setup.longTicketsMandatory) {
    for (const t of pending) {
      if (ttrIsLongTicket(t, threshold) && !keepIdSet.has(t.id)) {
        throw new GameActionRejectedError('ต้องเก็บตั๋ว Long ที่ได้รับ');
      }
    }
  }

  const keep = pending.filter((t) => keepIdSet.has(t.id));
  const minKeep = map.setup.minInitialKeep;
  if (keep.length < minKeep) {
    throw new GameActionRejectedError(`ต้องเก็บตั๋วอย่างน้อย ${minKeep} ใบ`);
  }

  s.tickets[playerId]!.push(...keep);
  refreshCompletedTicketIdsForPlayer(s, playerId);
  // Rejected Long tickets go back in the box, never into the drawable deck.
  const putBack = pending.filter((t) => !keepIdSet.has(t.id) && !ttrIsLongTicket(t, threshold));
  s.regularTicketDeck.unshift(...putBack);
  s.pendingInitialChoices[playerId] = null;
  s.lastEvent = `${s.playerNames[playerId]} เลือกตั๋วเริ่มต้นแล้ว`;
  const everyoneDone = s.playerOrder.every((id) => s.pendingInitialChoices[id] == null);
  if (everyoneDone) {
    s.phase = 'playing';
    s.currentTurnIndex = 0;
    s.pendingTurn = { kind: 'ready' };
    s.lastEvent = `เริ่มเกม — ตาแรก ${s.playerNames[currentPlayerId(s)]}`;
  }
  return s;
}

function handleDrawTrainCards(
  s: TtrState,
  playerId: string,
  action: DrawTrainCardsAction,
): TtrState {
  ensureTurn(s, playerId);
  const pending = s.pendingTurn;
  const owesSecondDraw = pending.kind === 'second_train_draw' && pending.playerId === playerId;
  if (pending.kind !== 'ready' && !owesSecondDraw) {
    throw new GameActionRejectedError(pendingBlockReason(pending) ?? 'ตอนนี้ทำรายการนี้ไม่ได้');
  }

  const noticeCard = (
    pick: DrawTrainCardsAction['first'],
    color: TtrTrainColor,
  ): TtrTrainDrawNoticeCard =>
    pick.source === 'face_up' ? { source: 'face_up', color } : { source: 'deck' };
  const publishDrawNotice = (cards: TtrTrainDrawNoticeCard[]) => {
    s.trainDrawNoticeSeq += 1;
    s.trainDrawNotice = {
      playerId,
      playerName: s.playerNames[playerId] ?? playerId,
      cards,
    };
  };
  const drawOne = (
    pick: { source: 'face_up'; index: number } | { source: 'deck' },
  ): TtrTrainColor => {
    return pick.source === 'face_up'
      ? drawFromFaceUp(s, pick.index)
      : (drawTrainCardFromDeck(s) ??
          (() => {
            throw new GameActionRejectedError('กองจั่วการ์ดรถไฟหมด');
          })());
  };

  if (owesSecondDraw) {
    if (action.first.source === 'face_up') {
      const c = s.faceUpTrainCards[action.first.index];
      if (c === 'locomotive')
        throw new GameActionRejectedError('ใบที่สองห้ามหยิบ locomotive แบบเปิดหน้า');
    }
    const second = drawOne(action.first);
    s.hand[playerId]![second] += 1;
    publishDrawNotice([noticeCard(action.first, second)]);
    s.lastEvent = `${s.playerNames[playerId]} จั่วการ์ดรถไฟใบที่ 2`;
    consumeTurnAndMaybeAdvance(s);
    return s;
  }

  const drawn: TtrTrainColor[] = [];
  const first = drawOne(action.first);
  s.hand[playerId]![first] += 1;
  drawn.push(first);
  const noticeCards: TtrTrainDrawNoticeCard[] = [noticeCard(action.first, first)];

  const firstWasFaceUpLoco = action.first.source === 'face_up' && first === 'locomotive';
  if (!firstWasFaceUpLoco && action.second) {
    if (action.second.source === 'face_up') {
      const c = s.faceUpTrainCards[action.second.index];
      if (c === 'locomotive')
        throw new GameActionRejectedError('ใบที่สองห้ามหยิบ locomotive แบบเปิดหน้า');
    }
    const second = drawOne(action.second);
    s.hand[playerId]![second] += 1;
    drawn.push(second);
    noticeCards.push(noticeCard(action.second, second));
  }
  publishDrawNotice(noticeCards);

  if (!firstWasFaceUpLoco && !action.second) {
    s.pendingTurn = { kind: 'second_train_draw', playerId };
    s.lastEvent = `${s.playerNames[playerId]} จั่วการ์ดรถไฟใบที่ 1`;
    return s;
  }

  s.lastEvent = `${s.playerNames[playerId]} จั่วการ์ดรถไฟ ${drawn.length} ใบ`;
  consumeTurnAndMaybeAdvance(s);
  return s;
}

/**
 * Extra tunnel cost must be paid in the same currency as the attempt: the
 * attempt colour or locomotives, unless the attempt was all locomotives.
 */
function tunnelExtraOptions(
  remainingHand: Record<TtrTrainColor, number>,
  color: TtrCardColor,
  colorCardsInAttempt: number,
  extraRequired: number,
): TtrClaimOption[] {
  if (extraRequired <= 0) return [];
  if (colorCardsInAttempt === 0) {
    return (remainingHand.locomotive ?? 0) >= extraRequired
      ? [{ color, colorCards: 0, locomotives: extraRequired }]
      : [];
  }
  return paymentOptions(remainingHand, extraRequired, color, 0);
}

function countTunnelMatches(
  revealed: readonly TtrTrainColor[],
  color: TtrCardColor,
  colorCardsInAttempt: number,
): number {
  let n = 0;
  for (const c of revealed) {
    if (colorCardsInAttempt === 0 ? c === 'locomotive' : c === color || c === 'locomotive') n += 1;
  }
  return n;
}

function handleClaimRoute(s: TtrState, playerId: string, action: ClaimRouteAction): TtrState {
  ensureReady(s, playerId);
  const r = routeById(s, action.routeId);
  const blocked = routeBlockReason(s, playerId, r);
  if (blocked) throw new GameActionRejectedError(blocked);

  const locoUsed = action.locomotivesUsed;
  const legal = claimOptionsForRoute(s, playerId, r).some(
    (o) => o.color === action.color && o.locomotives === locoUsed,
  );
  if (!legal) throw new GameActionRejectedError('จ่ายการ์ดแบบนี้ไม่ได้');

  const colorNeed = r.length - locoUsed;

  if (!r.tunnel) {
    spendCards(s, playerId, action.color, colorNeed, locoUsed);
    applyRouteClaim(s, playerId, r);
    consumeTurnAndMaybeAdvance(s);
    return s;
  }

  // Tunnels: nothing is spent until the reveal is resolved.
  const revealed: TtrTrainColor[] = [];
  for (let i = 0; i < TUNNEL_REVEAL_COUNT; i += 1) {
    const c = drawTrainCardFromDeck(s);
    if (!c) break;
    revealed.push(c);
  }
  s.trainDiscard.push(...revealed);

  const extraRequired = countTunnelMatches(revealed, action.color, colorNeed);
  const mapName = `${ttrCityName(mapOf(s), r.a)} - ${ttrCityName(mapOf(s), r.b)}`;

  if (extraRequired === 0) {
    spendCards(s, playerId, action.color, colorNeed, locoUsed);
    applyRouteClaim(s, playerId, r);
    s.lastEvent = `${s.playerNames[playerId]} ผ่านอุโมงค์ ${mapName} โดยไม่ต้องจ่ายเพิ่ม`;
    consumeTurnAndMaybeAdvance(s);
    return s;
  }

  const hand = s.hand[playerId] ?? emptyTrainHand();
  const remaining: Record<TtrTrainColor, number> = { ...hand };
  remaining[action.color] -= colorNeed;
  remaining.locomotive -= locoUsed;

  s.pendingTurn = {
    kind: 'tunnel_response',
    attempt: {
      playerId,
      routeId: r.id,
      color: action.color,
      colorCards: colorNeed,
      locomotivesUsed: locoUsed,
      revealed,
      extraRequired,
      extraOptions: tunnelExtraOptions(remaining, action.color, colorNeed, extraRequired),
    },
  };
  s.lastEvent = `${s.playerNames[playerId]} ลงอุโมงค์ ${mapName} — เปิดได้ตรง ${extraRequired} ใบ ต้องจ่ายเพิ่ม`;
  return s;
}

function handleResolveTunnelClaim(
  s: TtrState,
  playerId: string,
  action: ResolveTunnelClaimAction,
): TtrState {
  ensureTurn(s, playerId);
  const pending = s.pendingTurn;
  if (pending.kind !== 'tunnel_response') {
    throw new GameActionRejectedError('ไม่มีอุโมงค์ที่รอผลอยู่');
  }
  const attempt = pending.attempt;
  if (attempt.playerId !== playerId) throw new GameActionRejectedError('ไม่ใช่อุโมงค์ของคุณ');

  const route = routeById(s, attempt.routeId);
  const mapName = `${ttrCityName(mapOf(s), route.a)} - ${ttrCityName(mapOf(s), route.b)}`;

  if (!action.accept) {
    s.lastEvent = `${s.playerNames[playerId]} ยกเลิกการลงอุโมงค์ ${mapName}`;
    consumeTurnAndMaybeAdvance(s);
    return s;
  }

  let extraColor: TtrCardColor = attempt.color;
  let extraColorCards = 0;
  let extraLocomotives = 0;
  if (attempt.extraRequired > 0) {
    if (action.color == null || action.locomotivesUsed == null) {
      throw new GameActionRejectedError('ต้องเลือกวิธีจ่ายการ์ดเพิ่ม');
    }
    const chosen = attempt.extraOptions.find(
      (o) => o.color === action.color && o.locomotives === action.locomotivesUsed,
    );
    if (!chosen) throw new GameActionRejectedError('จ่ายการ์ดเพิ่มแบบนี้ไม่ได้');
    extraColor = chosen.color;
    extraColorCards = chosen.colorCards;
    extraLocomotives = chosen.locomotives;
  }

  const blocked = routeBlockReason(s, playerId, route);
  if (blocked) throw new GameActionRejectedError(blocked);

  spendCards(s, playerId, attempt.color, attempt.colorCards, attempt.locomotivesUsed);
  if (attempt.extraRequired > 0) {
    spendCards(s, playerId, extraColor, extraColorCards, extraLocomotives);
  }
  applyRouteClaim(s, playerId, route);
  s.lastEvent = `${s.playerNames[playerId]} จ่ายเพิ่ม ${attempt.extraRequired} ใบ และลงอุโมงค์ ${mapName}`;
  consumeTurnAndMaybeAdvance(s);
  return s;
}

function handleBuildStation(s: TtrState, playerId: string, action: BuildStationAction): TtrState {
  const map = mapOf(s);
  if (map.stationsPerPlayer <= 0) throw new GameActionRejectedError('แผนที่นี้ไม่มีสถานี');
  ensureReady(s, playerId);

  const city = map.cities.find((c) => c.id === action.cityId);
  if (!city) throw new GameActionRejectedError('ไม่พบเมืองนี้');
  if (s.stationsByCity[city.id]) throw new GameActionRejectedError('เมืองนี้มีสถานีแล้ว');
  if ((s.stationsLeft[playerId] ?? 0) <= 0) throw new GameActionRejectedError('สถานีของคุณหมดแล้ว');

  const cost = stationCostFor(s, playerId);
  const options = paymentOptions(s.hand[playerId] ?? emptyTrainHand(), cost, null, 0);
  const chosen = options.find(
    (o) => o.color === action.color && o.locomotives === action.locomotivesUsed,
  );
  if (!chosen) throw new GameActionRejectedError('จ่ายการ์ดแบบนี้ไม่ได้');

  spendCards(s, playerId, chosen.color, chosen.colorCards, chosen.locomotives);
  s.stationsLeft[playerId] = (s.stationsLeft[playerId] ?? 0) - 1;
  s.stationsByCity[city.id] = playerId;
  s.lastEvent = `${s.playerNames[playerId]} สร้างสถานีที่ ${city.name} (${cost} ใบ)`;
  consumeTurnAndMaybeAdvance(s);
  return s;
}

function handleDrawDestinationTickets(s: TtrState, playerId: string): TtrState {
  ensureReady(s, playerId);
  const drawn: TtrDestinationTicket[] = [];
  for (let i = 0; i < mapOf(s).setup.ticketDraw; i += 1) {
    const t = s.regularTicketDeck.pop();
    if (t) drawn.push(t);
  }
  if (drawn.length === 0) throw new GameActionRejectedError('กองตั๋วปลายทางหมด');
  s.pendingTurn = { kind: 'destination_choice', playerId, offered: drawn };
  s.lastEvent = `${s.playerNames[playerId]} จั่วตั๋วปลายทาง ${drawn.length} ใบ`;
  return s;
}

function handleKeepDrawnTickets(
  s: TtrState,
  playerId: string,
  action: KeepDrawnTicketsAction,
): TtrState {
  ensureTurn(s, playerId);
  const pending = s.pendingTurn;
  if (pending.kind !== 'destination_choice' || pending.playerId !== playerId) {
    throw new GameActionRejectedError('ไม่มีตั๋วที่กำลังรอเลือก');
  }
  const offered = pending.offered;
  const offeredIds = new Set(offered.map((t) => t.id));
  for (const id of action.keepIds) {
    if (!offeredIds.has(id))
      throw new GameActionRejectedError('ตั๋วที่เลือกไม่ได้อยู่ในชุดที่จั่ว');
  }
  const minKeep = mapOf(s).setup.minTicketKeep;
  const keepIdSet = new Set(action.keepIds);
  const keep = offered.filter((t) => keepIdSet.has(t.id));
  if (keep.length < minKeep) throw new GameActionRejectedError(`ต้องเก็บอย่างน้อย ${minKeep} ใบ`);
  s.tickets[playerId]!.push(...keep);
  refreshCompletedTicketIdsForPlayer(s, playerId);
  const putBack = offered.filter((t) => !keepIdSet.has(t.id));
  s.regularTicketDeck.unshift(...putBack);
  s.lastEvent = `${s.playerNames[playerId]} เลือกเก็บตั๋ว ${keep.length} ใบ`;
  consumeTurnAndMaybeAdvance(s);
  return s;
}

// ============================================================
// Game definition
// ============================================================

const DEFAULT_MAP = getTtrMap(undefined);

function setupLastEvent(map: TtrMapDefinition): string {
  if (map.setup.longTicketsMandatory) {
    return `เลือกตั๋วเริ่มต้น: ตั๋ว Long บังคับเก็บ · เก็บรวมอย่างน้อย ${map.setup.minInitialKeep} ใบ`;
  }
  return `เลือกตั๋วเริ่มต้น: เก็บอย่างน้อย ${map.setup.minInitialKeep} ใบ (ตั๋ว Long ไม่บังคับ)`;
}

export const ticketToRideGame: GameDefinition<TtrState, TtrAction> = {
  id: 'ticket-to-ride',
  name: 'Ticket to Ride',
  description: 'จั่วการ์ดรถไฟ ลงเส้นทาง และทำตั๋วปลายทางให้สำเร็จ',
  minPlayers: DEFAULT_MAP.minPlayers,
  maxPlayers: DEFAULT_MAP.maxPlayers,
  thumbnail:
    GAME_THUMBNAIL_BY_ID['ticket-to-ride'] ??
    'https://upload.wikimedia.org/wikipedia/commons/5/5b/Ticket_to_Ride_Board_Game.jpg',

  setup(players: Player[], options?: unknown): TtrState {
    const opts = parseTtrLobbyOptions(options);
    const map = getTtrMap(opts.mapId);
    const playerOrder = shuffle(players.map((p) => p.id));
    const playerNames: Record<string, string> = {};
    const scores: Record<string, number> = {};
    const trainsLeft: Record<string, number> = {};
    const stationsLeft: Record<string, number> = {};
    const hand: Record<string, Record<TtrTrainColor, number>> = {};
    const tickets: Record<string, TtrDestinationTicket[]> = {};
    const pendingInitialChoices: Record<string, TtrDestinationTicket[] | null> = {};
    const completedTicketIdsByPlayer: Record<string, string[]> = {};
    const partitioned = ttrPartitionDestinationTickets(
      map.destinationTickets,
      map.setup.longTicketThreshold,
    );
    const longTicketDeck = shuffle(partitioned.long);
    const regularTicketDeck = shuffle(partitioned.regular);
    const trainDeck = buildTrainDeck(map);

    for (const p of players) {
      playerNames[p.id] = p.name;
      scores[p.id] = 0;
      trainsLeft[p.id] = map.trainsPerPlayer;
      stationsLeft[p.id] = map.stationsPerPlayer;
      hand[p.id] = emptyTrainHand();
      tickets[p.id] = [];
      completedTicketIdsByPlayer[p.id] = [];
      const init: TtrDestinationTicket[] = [];
      for (let i = 0; i < map.setup.initialLongTickets; i += 1) {
        const t = longTicketDeck.pop();
        if (t) init.push(t);
      }
      for (let i = 0; i < map.setup.initialRegularTickets; i += 1) {
        const t = regularTicketDeck.pop();
        if (t) init.push(t);
      }
      pendingInitialChoices[p.id] = init;
      for (let i = 0; i < map.setup.trainCards; i += 1) {
        const c = trainDeck.pop();
        if (c) hand[p.id]![c] += 1;
      }
    }

    const needsInitialTickets = players.some(
      (p) => (pendingInitialChoices[p.id]?.length ?? 0) > 0,
    );

    const s: TtrState = {
      mapId: map.id,
      phase: needsInitialTickets ? 'initial_tickets' : 'playing',
      playerOrder,
      playerNames,
      currentTurnIndex: 0,
      scores,
      trainsLeft,
      stationsLeft,
      stationsByCity: {},
      hand,
      tickets,
      pendingInitialChoices: needsInitialTickets
        ? pendingInitialChoices
        : Object.fromEntries(players.map((p) => [p.id, null])),
      completedTicketIdsByPlayer,
      pendingTurn: { kind: 'ready' },
      trainDrawNoticeSeq: 0,
      trainDrawNotice: null,
      faceUpResetNoticeSeq: 0,
      destinationCompleteNoticeSeq: 0,
      destinationCompleteNotice: null,
      trainDeck,
      trainDiscard: [],
      regularTicketDeck,
      faceUpTrainCards: [],
      routeOwner: Object.fromEntries(map.routes.map((r) => [r.id, null])),
      finalTurnsRemaining: null,
      lastEvent: needsInitialTickets
        ? setupLastEvent(map)
        : `เริ่มเกม — ตาแรก ${playerNames[playerOrder[0]!]}`,
    };
    refillFaceUp(s);
    clearFaceUpIfTooManyLocomotives(s);
    return s;
  },

  onAction(state: TtrState, playerId: string, action: TtrAction): TtrState {
    if (state.phase === 'game_over') throw new GameActionRejectedError('เกมจบแล้ว');

    if (action.type === 'keep_initial_tickets') {
      if (state.phase !== 'initial_tickets') {
        throw new GameActionRejectedError('เลยช่วงเลือกตั๋วเริ่มต้นแล้ว');
      }
      return handleKeepInitialTickets(cloneState(state), playerId, action);
    }

    if (state.phase === 'initial_tickets') {
      throw new GameActionRejectedError('ผู้เล่นทุกคนต้องเลือกตั๋วเริ่มต้นก่อน');
    }

    switch (action.type) {
      case 'draw_train_cards':
        return handleDrawTrainCards(cloneState(state), playerId, action);
      case 'claim_route':
        return handleClaimRoute(cloneState(state), playerId, action);
      case 'resolve_tunnel_claim':
        return handleResolveTunnelClaim(cloneState(state), playerId, action);
      case 'build_station':
        return handleBuildStation(cloneState(state), playerId, action);
      case 'draw_destination_tickets':
        return handleDrawDestinationTickets(cloneState(state), playerId);
      case 'keep_drawn_tickets':
        return handleKeepDrawnTickets(cloneState(state), playerId, action);
      default:
        return state;
    }
  },

  getPlayerView(state: TtrState, playerId: string): TtrPlayerView {
    return toView(state, playerId);
  },

  isGameOver(state: TtrState): GameResult | null {
    if (state.phase !== 'game_over' || !state.result) return null;
    return state.result;
  },
};
