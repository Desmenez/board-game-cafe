import type {
  GameDefinition,
  GameResult,
  Player,
  TtrAction,
  TtrDestinationTicket,
  TtrFinalScoreRow,
  TtrPlayerView,
  TtrRouteDef,
  TtrTrainColor,
} from 'shared';
import {
  TTR_BASE_TRAINS_PER_PLAYER,
  TTR_DESTINATION_TICKETS,
  TTR_ROUTE_POINTS,
  TTR_ROUTES,
  TTR_TRAIN_COLORS,
} from 'shared';
import { GAME_THUMBNAIL_BY_ID } from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

interface TtrState {
  phase: 'initial_tickets' | 'playing' | 'game_over';
  playerOrder: string[];
  playerNames: Record<string, string>;
  currentTurnIndex: number;
  scores: Record<string, number>;
  trainsLeft: Record<string, number>;
  hand: Record<string, Record<TtrTrainColor, number>>;
  tickets: Record<string, TtrDestinationTicket[]>;
  pendingInitialChoices: Record<string, TtrDestinationTicket[] | null>;
  pendingTicketChoiceByPlayer: Record<string, TtrDestinationTicket[] | null>;
  completedTicketIdsByPlayer: Record<string, string[]>;
  pendingSecondTrainDrawPlayerId: string | null;
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
  ticketDeck: TtrDestinationTicket[];
  faceUpTrainCards: TtrTrainColor[];
  routeOwner: Record<string, string | null>;
  finalTurnsRemaining: number | null;
  lastEvent: string;
  result?: GameResult;
}

const ROUTE_BY_ID: Record<string, TtrRouteDef> = Object.fromEntries(
  TTR_ROUTES.map((r) => [r.id, r]),
) as Record<string, TtrRouteDef>;
const ROUTE_IDS_BY_PAIR: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const r of TTR_ROUTES) {
    const k = r.a < r.b ? `${r.a}__${r.b}` : `${r.b}__${r.a}`;
    if (!out[k]) out[k] = [];
    out[k].push(r.id);
  }
  return out;
})();

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

function refillFaceUpToFive(s: TtrState): void {
  while (s.faceUpTrainCards.length < 5) {
    const c = drawTrainCardFromDeck(s);
    if (!c) break;
    s.faceUpTrainCards.push(c);
  }
}

function clearFaceUpIfTooManyLocomotives(s: TtrState): void {
  const locoCount = (cards: TtrTrainColor[]): number => {
    let n = 0;
    for (const c of cards) {
      if (c === 'locomotive') n += 1;
    }
    return n;
  };
  while (
    locoCount(s.faceUpTrainCards) >= 3 &&
    s.trainDeck.length > 0
  ) {
    s.trainDiscard.push(...s.faceUpTrainCards);
    s.faceUpTrainCards = [];
    s.faceUpResetNoticeSeq += 1;
    refillFaceUpToFive(s);
    if (s.trainDeck.length === 0 && s.faceUpTrainCards.length === 0) break;
  }
}

function drawFromFaceUp(s: TtrState, index: number): TtrTrainColor {
  if (index < 0 || index >= s.faceUpTrainCards.length) {
    throw new GameActionRejectedError('เลือกการ์ดเปิดหน้าไม่ถูกต้อง');
  }
  const card = s.faceUpTrainCards[index]!;
  s.faceUpTrainCards.splice(index, 1);
  refillFaceUpToFive(s);
  clearFaceUpIfTooManyLocomotives(s);
  return card;
}

function ensureTurnAndNoPendingChoice(s: TtrState, playerId: string): void {
  if (s.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ถึงช่วงเล่น');
  if (currentPlayerId(s) !== playerId) throw new GameActionRejectedError('ยังไม่ถึงตาคุณ');
  const cur = currentPlayerId(s);
  // Recover stale state: turn advanced while someone still owed a 2nd draw (should not happen after rules below).
  if (
    s.pendingSecondTrainDrawPlayerId != null &&
    s.pendingSecondTrainDrawPlayerId !== cur
  ) {
    s.pendingSecondTrainDrawPlayerId = null;
  }
  if (s.pendingTicketChoiceByPlayer[playerId]) {
    throw new GameActionRejectedError('ต้องเลือกตั๋วปลายทางที่จั่วก่อน');
  }
  if (s.pendingSecondTrainDrawPlayerId && s.pendingSecondTrainDrawPlayerId !== playerId) {
    throw new GameActionRejectedError('ต้องรอผู้เล่นที่กำลังจั่วการ์ดรถไฟให้จบก่อน');
  }
}

/** Cannot claim / draw tickets until the 2-step train draw is finished. */
function assertNotMidTrainDraw(s: TtrState, playerId: string): void {
  if (s.pendingSecondTrainDrawPlayerId === playerId) {
    throw new GameActionRejectedError('ต้องจั่วการ์ดรถไฟใบที่ 2 ให้จบก่อน');
  }
}

function routeById(routeId: string): TtrRouteDef {
  const r = ROUTE_BY_ID[routeId];
  if (!r) throw new GameActionRejectedError('ไม่พบเส้นทาง');
  return r;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

function routeIdsBySamePair(route: TtrRouteDef): string[] {
  const k = pairKey(route.a, route.b);
  return ROUTE_IDS_BY_PAIR[k] ?? [];
}

function ownedRoutesOfPlayer(s: TtrState, pid: string): TtrRouteDef[] {
  return TTR_ROUTES.filter((r) => s.routeOwner[r.id] === pid);
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

function consumeTurnAndMaybeAdvance(s: TtrState): void {
  const active = currentPlayerId(s);
  if (s.finalTurnsRemaining == null && s.trainsLeft[active]! <= 2) {
    s.finalTurnsRemaining = s.playerOrder.length + 1;
    s.lastEvent = `${s.playerNames[active]} เหลือรถไฟไม่เกิน 2 ขบวน — เข้าช่วงตาสุดท้าย`;
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

function graphForPlayer(s: TtrState, pid: string): Map<string, string[]> {
  const g = new Map<string, string[]>();
  for (const r of ownedRoutesOfPlayer(s, pid)) {
    if (!g.has(r.a)) g.set(r.a, []);
    if (!g.has(r.b)) g.set(r.b, []);
    g.get(r.a)!.push(r.b);
    g.get(r.b)!.push(r.a);
  }
  return g;
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

function finishGame(s: TtrState): void {
  const routeScoreBase: Record<string, number> = Object.fromEntries(
    s.playerOrder.map((pid) => [pid, s.scores[pid] ?? 0]),
  );
  const completedTicketPoints: Record<string, number> = Object.fromEntries(
    s.playerOrder.map((pid) => [pid, 0]),
  );
  const failedTicketPenalty: Record<string, number> = Object.fromEntries(
    s.playerOrder.map((pid) => [pid, 0]),
  );
  for (const pid of s.playerOrder) {
    const completedSet = refreshCompletedTicketIdsForPlayer(s, pid);
    for (const t of s.tickets[pid] ?? []) {
      if (completedSet.has(t.id)) {
        completedTicketPoints[pid] = (completedTicketPoints[pid] ?? 0) + t.points;
        s.scores[pid] = (s.scores[pid] ?? 0) + t.points;
      } else {
        failedTicketPenalty[pid] = (failedTicketPenalty[pid] ?? 0) - t.points;
        s.scores[pid] = (s.scores[pid] ?? 0) - t.points;
      }
    }
  }

  const longestByPlayer: Record<string, number> = {};
  for (const pid of s.playerOrder) {
    longestByPlayer[pid] = longestPathLengthForPlayer(s, pid);
  }
  let longest = 0;
  for (const pid of s.playerOrder) {
    longest = Math.max(longest, longestByPlayer[pid] ?? 0);
  }
  const longestPathBonus: Record<string, number> = Object.fromEntries(
    s.playerOrder.map((pid) => [pid, 0]),
  );
  if (longest > 0) {
    for (const pid of s.playerOrder) {
      if (longestByPlayer[pid] === longest) {
        longestPathBonus[pid] = 10;
        s.scores[pid] = (s.scores[pid] ?? 0) + 10;
      }
    }
  }

  let best = -Infinity;
  for (const pid of s.playerOrder) best = Math.max(best, s.scores[pid] ?? 0);
  const winners = s.playerOrder.filter((pid) => (s.scores[pid] ?? 0) === best);
  s.phase = 'game_over';
  s.result = {
    winners,
    reason:
      winners.length === 1
        ? `${s.playerNames[winners[0]!]} ชนะที่ ${best} คะแนน (Longest Path: ${longest})`
        : `เสมอที่ ${best} คะแนน (Longest Path: ${longest})`,
  };
  s.finalScoreSummary = s.playerOrder
    .map((pid) => ({
      playerId: pid,
      playerName: s.playerNames[pid] ?? pid,
      routePoints: routeScoreBase[pid] ?? 0,
      completedTicketPoints: completedTicketPoints[pid] ?? 0,
      failedTicketPenalty: failedTicketPenalty[pid] ?? 0,
      longestPathBonus: longestPathBonus[pid] ?? 0,
      total: s.scores[pid] ?? 0,
    }))
    .sort((a, b) => b.total - a.total);
  s.lastEvent = 'เกมจบแล้ว';
}

function toView(s: TtrState, viewerId: string): TtrPlayerView {
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
    trainsLeft: s.trainsLeft[id] ?? TTR_BASE_TRAINS_PER_PLAYER,
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
  return {
    phase: s.phase,
    myId: viewerId,
    currentPlayerId: currentPlayerId(s),
    players,
    myHand: { ...s.hand[viewerId] },
    myTickets: [...(s.tickets[viewerId] ?? [])],
    myCompletedTicketIds: [...(s.completedTicketIdsByPlayer[viewerId] ?? [])],
    faceUpTrainCards: [...s.faceUpTrainCards],
    deckTrainRemaining: s.trainDeck.length,
    deckTicketsRemaining: s.ticketDeck.length,
    routes: TTR_ROUTES.map((r) => ({ id: r.id, ownerId: s.routeOwner[r.id] ?? null, def: r })),
    pendingTicketChoice: s.pendingTicketChoiceByPlayer[viewerId]
      ? [...(s.pendingTicketChoiceByPlayer[viewerId] ?? [])]
      : s.pendingInitialChoices[viewerId]
        ? [...(s.pendingInitialChoices[viewerId] ?? [])]
        : null,
    mustDrawSecondTrainCard: s.pendingSecondTrainDrawPlayerId === viewerId,
    faceUpResetNoticeSeq: s.faceUpResetNoticeSeq,
    destinationCompleteNoticeSeq: s.destinationCompleteNoticeSeq,
    destinationCompleteNotice: s.destinationCompleteNotice ? { ...s.destinationCompleteNotice } : null,
    initialTicketConfirmProgress,
    finalTurnsRemaining: s.finalTurnsRemaining,
    finalScoreSummary: s.finalScoreSummary ? [...s.finalScoreSummary] : undefined,
    canAct:
      s.phase === 'playing' &&
      currentPlayerId(s) === viewerId &&
      s.pendingTicketChoiceByPlayer[viewerId] == null,
    lastEvent: s.lastEvent,
    gameResult: s.result ? { ...s.result } : undefined,
  };
}

function buildTrainDeck(): TtrTrainColor[] {
  const d: TtrTrainColor[] = [];
  const normal = TTR_TRAIN_COLORS.filter((c) => c !== 'locomotive') as Exclude<
    TtrTrainColor,
    'locomotive'
  >[];
  for (const c of normal) {
    for (let i = 0; i < 12; i += 1) d.push(c);
  }
  for (let i = 0; i < 14; i += 1) d.push('locomotive');
  return shuffle(d);
}

function buildTicketDeck(): TtrDestinationTicket[] {
  return shuffle(TTR_DESTINATION_TICKETS);
}

type KeepInitialTicketsAction = Extract<TtrAction, { type: 'keep_initial_tickets' }>;
type DrawTrainCardsAction = Extract<TtrAction, { type: 'draw_train_cards' }>;
type ClaimRouteAction = Extract<TtrAction, { type: 'claim_route' }>;
type KeepDrawnTicketsAction = Extract<TtrAction, { type: 'keep_drawn_tickets' }>;

function cloneStateForDrawDestination(state: TtrState): TtrState {
  return {
    ...state,
    pendingTicketChoiceByPlayer: { ...state.pendingTicketChoiceByPlayer },
    ticketDeck: [...state.ticketDeck],
  };
}

function cloneStateForKeepInitial(state: TtrState, playerId: string): TtrState {
  return {
    ...state,
    tickets: {
      ...state.tickets,
      [playerId]: [...(state.tickets[playerId] ?? [])],
    },
    pendingInitialChoices: { ...state.pendingInitialChoices },
    completedTicketIdsByPlayer: { ...state.completedTicketIdsByPlayer },
    ticketDeck: [...state.ticketDeck],
  };
}

function cloneStateForDrawTrain(state: TtrState, playerId: string): TtrState {
  return {
    ...state,
    hand: {
      ...state.hand,
      [playerId]: { ...(state.hand[playerId] ?? emptyTrainHand()) },
    },
    trainDeck: [...state.trainDeck],
    trainDiscard: [...state.trainDiscard],
    faceUpTrainCards: [...state.faceUpTrainCards],
  };
}

function cloneStateForKeepDrawn(state: TtrState, playerId: string): TtrState {
  return {
    ...state,
    tickets: {
      ...state.tickets,
      [playerId]: [...(state.tickets[playerId] ?? [])],
    },
    pendingTicketChoiceByPlayer: { ...state.pendingTicketChoiceByPlayer },
    completedTicketIdsByPlayer: { ...state.completedTicketIdsByPlayer },
    ticketDeck: [...state.ticketDeck],
  };
}

function cloneStateForClaimRoute(state: TtrState, playerId: string): TtrState {
  return {
    ...state,
    scores: { ...state.scores },
    trainsLeft: { ...state.trainsLeft },
    hand: {
      ...state.hand,
      [playerId]: { ...(state.hand[playerId] ?? emptyTrainHand()) },
    },
    completedTicketIdsByPlayer: { ...state.completedTicketIdsByPlayer },
    trainDiscard: [...state.trainDiscard],
    routeOwner: { ...state.routeOwner },
    destinationCompleteNotice: state.destinationCompleteNotice
      ? { ...state.destinationCompleteNotice }
      : null,
  };
}

function cloneState(state: TtrState): TtrState {
  const hand = {} as TtrState['hand'];
  for (const id in state.hand) {
    hand[id] = { ...state.hand[id] };
  }
  const tickets = {} as TtrState['tickets'];
  for (const id in state.tickets) {
    tickets[id] = [...state.tickets[id]];
  }
  const pendingInitialChoices = {} as TtrState['pendingInitialChoices'];
  for (const id in state.pendingInitialChoices) {
    const ts = state.pendingInitialChoices[id];
    pendingInitialChoices[id] = ts ? [...ts] : null;
  }
  const pendingTicketChoiceByPlayer = {} as TtrState['pendingTicketChoiceByPlayer'];
  for (const id in state.pendingTicketChoiceByPlayer) {
    const ts = state.pendingTicketChoiceByPlayer[id];
    pendingTicketChoiceByPlayer[id] = ts ? [...ts] : null;
  }
  const completedTicketIdsByPlayer = {} as TtrState['completedTicketIdsByPlayer'];
  for (const id in state.completedTicketIdsByPlayer) {
    completedTicketIdsByPlayer[id] = [...state.completedTicketIdsByPlayer[id]];
  }
  return {
    ...state,
    playerOrder: [...state.playerOrder],
    playerNames: { ...state.playerNames },
    scores: { ...state.scores },
    trainsLeft: { ...state.trainsLeft },
    hand,
    tickets,
    pendingInitialChoices,
    pendingTicketChoiceByPlayer,
    completedTicketIdsByPlayer,
    pendingSecondTrainDrawPlayerId: state.pendingSecondTrainDrawPlayerId ?? null,
    faceUpResetNoticeSeq: state.faceUpResetNoticeSeq ?? 0,
    destinationCompleteNoticeSeq: state.destinationCompleteNoticeSeq ?? 0,
    destinationCompleteNotice: state.destinationCompleteNotice
      ? { ...state.destinationCompleteNotice }
      : null,
    trainDeck: [...state.trainDeck],
    trainDiscard: [...state.trainDiscard],
    ticketDeck: [...state.ticketDeck],
    faceUpTrainCards: [...state.faceUpTrainCards],
    routeOwner: { ...state.routeOwner },
    result: state.result ? { ...state.result } : undefined,
  };
}

function handleKeepInitialTickets(
  s: TtrState,
  playerId: string,
  action: KeepInitialTicketsAction,
): TtrState {
  if (s.phase !== 'initial_tickets') throw new GameActionRejectedError('เลยช่วงเลือกตั๋วเริ่มต้นแล้ว');
  const pending = s.pendingInitialChoices[playerId];
  if (!pending) throw new GameActionRejectedError('คุณเลือกตั๋วเริ่มต้นแล้ว');
  const keepIdSet = new Set(action.keepIds);
  const keep = pending.filter((t) => keepIdSet.has(t.id));
  if (keep.length < 2) throw new GameActionRejectedError('ต้องเก็บอย่างน้อย 2 ใบ');
  s.tickets[playerId].push(...keep);
  refreshCompletedTicketIdsForPlayer(s, playerId);
  const putBack = pending.filter((t) => !keepIdSet.has(t.id));
  s.ticketDeck.unshift(...putBack);
  s.pendingInitialChoices[playerId] = null;
  s.lastEvent = `${s.playerNames[playerId]} เลือกตั๋วเริ่มต้นแล้ว`;
  const everyoneDone = s.playerOrder.every((id) => s.pendingInitialChoices[id] == null);
  if (everyoneDone) {
    s.phase = 'playing';
    s.currentTurnIndex = 0;
    s.lastEvent = `เริ่มเกม — ตาแรก ${s.playerNames[currentPlayerId(s)]}`;
  }
  return s;
}

function handleDrawTrainCards(
  s: TtrState,
  playerId: string,
  action: DrawTrainCardsAction,
): TtrState {
  ensureTurnAndNoPendingChoice(s, playerId);
  const drawOne = (pick: { source: 'face_up'; index: number } | { source: 'deck' }): TtrTrainColor => {
    return pick.source === 'face_up'
      ? drawFromFaceUp(s, pick.index)
      : (drawTrainCardFromDeck(s) ??
          (() => {
            throw new GameActionRejectedError('กองจั่วการ์ดรถไฟหมด');
          })());
  };

  if (s.pendingSecondTrainDrawPlayerId === playerId) {
    if (action.first.source === 'face_up') {
      const c = s.faceUpTrainCards[action.first.index];
      if (c === 'locomotive')
        throw new GameActionRejectedError('ใบที่สองห้ามหยิบ locomotive แบบเปิดหน้า');
    }
    const second = drawOne(action.first);
    s.hand[playerId][second] += 1;
    s.pendingSecondTrainDrawPlayerId = null;
    s.lastEvent = `${s.playerNames[playerId]} จั่วการ์ดรถไฟใบที่ 2`;
    consumeTurnAndMaybeAdvance(s);
    return s;
  }

  const drawn: TtrTrainColor[] = [];
  const first = drawOne(action.first);
  s.hand[playerId][first] += 1;
  drawn.push(first);

  const firstWasFaceUpLoco = action.first.source === 'face_up' && first === 'locomotive';
  if (!firstWasFaceUpLoco && action.second) {
    if (action.second.source === 'face_up') {
      const c = s.faceUpTrainCards[action.second.index];
      if (c === 'locomotive')
        throw new GameActionRejectedError('ใบที่สองห้ามหยิบ locomotive แบบเปิดหน้า');
    }
    const second = drawOne(action.second);
    s.hand[playerId][second] += 1;
    drawn.push(second);
  }

  if (!firstWasFaceUpLoco && !action.second) {
    s.pendingSecondTrainDrawPlayerId = playerId;
    s.lastEvent = `${s.playerNames[playerId]} จั่วการ์ดรถไฟใบที่ 1`;
    return s;
  }

  s.lastEvent = `${s.playerNames[playerId]} จั่วการ์ดรถไฟ ${drawn.length} ใบ`;
  consumeTurnAndMaybeAdvance(s);
  return s;
}

function handleClaimRoute(s: TtrState, playerId: string, action: ClaimRouteAction): TtrState {
  ensureTurnAndNoPendingChoice(s, playerId);
  assertNotMidTrainDraw(s, playerId);
  const r = routeById(action.routeId);
  if (s.routeOwner[r.id]) throw new GameActionRejectedError('เส้นทางนี้ถูกยึดแล้ว');
  const samePairRouteIds = routeIdsBySamePair(r);
  if (samePairRouteIds.some((rid) => s.routeOwner[rid] === playerId)) {
    throw new GameActionRejectedError('ผู้เล่นเดียวกันยึดทั้งสองเส้นระหว่างเมืองคู่เดิมไม่ได้');
  }
  if (s.playerOrder.length <= 3 && samePairRouteIds.some((rid) => s.routeOwner[rid] != null)) {
    throw new GameActionRejectedError('เกม 2-3 คน: เมื่อมีคนยึดหนึ่งเส้น อีกเส้นของคู่เมืองนี้จะปิดทันที');
  }
  if (r.color !== 'gray' && action.color !== r.color) {
    throw new GameActionRejectedError('สีการ์ดไม่ตรงสีเส้นทาง');
  }
  if (s.trainsLeft[playerId]! < r.length) throw new GameActionRejectedError('รถไฟไม่พอลงเส้นนี้');
  const locoUsed = action.locomotivesUsed;
  if (locoUsed < 0 || locoUsed > r.length)
    throw new GameActionRejectedError('จำนวน locomotive ไม่ถูกต้อง');
  const colorNeed = r.length - locoUsed;
  if (s.hand[playerId].locomotive < locoUsed) throw new GameActionRejectedError('locomotive ไม่พอ');
  if (s.hand[playerId][action.color] < colorNeed)
    throw new GameActionRejectedError('การ์ดสีหลักไม่พอ');
  const completedBefore = new Set(s.completedTicketIdsByPlayer[playerId] ?? []);

  s.hand[playerId][action.color] -= colorNeed;
  s.hand[playerId].locomotive -= locoUsed;
  for (let i = 0; i < colorNeed; i += 1) s.trainDiscard.push(action.color);
  for (let i = 0; i < locoUsed; i += 1) s.trainDiscard.push('locomotive');

  s.routeOwner[r.id] = playerId;
  s.trainsLeft[playerId] -= r.length;
  s.scores[playerId] += TTR_ROUTE_POINTS[r.length];
  const completedAfter = refreshCompletedTicketIdsForPlayer(s, playerId);
  const newlyCompleted = (s.tickets[playerId] ?? []).find(
    (t) => !completedBefore.has(t.id) && completedAfter.has(t.id),
  );
  if (newlyCompleted) {
    s.destinationCompleteNoticeSeq += 1;
    s.destinationCompleteNotice = {
      playerId,
      playerName: s.playerNames[playerId] ?? playerId,
      a: newlyCompleted.a,
      b: newlyCompleted.b,
      points: newlyCompleted.points,
    };
  }
  s.lastEvent = `${s.playerNames[playerId]} ยึดเส้นทาง ${r.a} - ${r.b}`;
  consumeTurnAndMaybeAdvance(s);
  return s;
}

function handleDrawDestinationTickets(s: TtrState, playerId: string): TtrState {
  ensureTurnAndNoPendingChoice(s, playerId);
  assertNotMidTrainDraw(s, playerId);
  const drawn: TtrDestinationTicket[] = [];
  for (let i = 0; i < 3; i += 1) {
    const t = s.ticketDeck.pop();
    if (t) drawn.push(t);
  }
  if (drawn.length === 0) throw new GameActionRejectedError('กองตั๋วปลายทางหมด');
  s.pendingTicketChoiceByPlayer[playerId] = drawn;
  s.lastEvent = `${s.playerNames[playerId]} จั่วตั๋วปลายทาง ${drawn.length} ใบ`;
  return s;
}

function handleKeepDrawnTickets(
  s: TtrState,
  playerId: string,
  action: KeepDrawnTicketsAction,
): TtrState {
  if (s.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ถึงช่วงเล่น');
  if (currentPlayerId(s) !== playerId) throw new GameActionRejectedError('ยังไม่ถึงตาคุณ');
  assertNotMidTrainDraw(s, playerId);
  const pending = s.pendingTicketChoiceByPlayer[playerId];
  if (!pending) throw new GameActionRejectedError('ไม่มีตั๋วที่กำลังรอเลือก');
  const keepIdSet = new Set(action.keepIds);
  const keep = pending.filter((t) => keepIdSet.has(t.id));
  if (keep.length < 1) throw new GameActionRejectedError('ต้องเก็บอย่างน้อย 1 ใบ');
  s.tickets[playerId].push(...keep);
  refreshCompletedTicketIdsForPlayer(s, playerId);
  const putBack = pending.filter((t) => !keepIdSet.has(t.id));
  s.ticketDeck.unshift(...putBack);
  s.pendingTicketChoiceByPlayer[playerId] = null;
  s.lastEvent = `${s.playerNames[playerId]} เลือกเก็บตั๋ว ${keep.length} ใบ`;
  consumeTurnAndMaybeAdvance(s);
  return s;
}

export const ticketToRideGame: GameDefinition<TtrState, TtrAction> = {
  id: 'ticket-to-ride',
  name: 'Ticket to Ride',
  description: 'จั่วการ์ดรถไฟ ลงเส้นทาง และทำตั๋วปลายทางให้สำเร็จ',
  minPlayers: 2,
  maxPlayers: 5,
  thumbnail:
    GAME_THUMBNAIL_BY_ID['ticket-to-ride'] ??
    'https://upload.wikimedia.org/wikipedia/commons/5/5b/Ticket_to_Ride_Board_Game.jpg',

  setup(players: Player[]): TtrState {
    const playerOrder = shuffle(players.map((p) => p.id));
    const playerNames: Record<string, string> = {};
    const scores: Record<string, number> = {};
    const trainsLeft: Record<string, number> = {};
    const hand: Record<string, Record<TtrTrainColor, number>> = {};
    const tickets: Record<string, TtrDestinationTicket[]> = {};
    const pendingInitialChoices: Record<string, TtrDestinationTicket[] | null> = {};
    const pendingTicketChoiceByPlayer: Record<string, TtrDestinationTicket[] | null> = {};
    const completedTicketIdsByPlayer: Record<string, string[]> = {};
    const ticketDeck = buildTicketDeck();
    const trainDeck = buildTrainDeck();

    for (const p of players) {
      playerNames[p.id] = p.name;
      scores[p.id] = 0;
      trainsLeft[p.id] = TTR_BASE_TRAINS_PER_PLAYER;
      hand[p.id] = emptyTrainHand();
      tickets[p.id] = [];
      pendingTicketChoiceByPlayer[p.id] = null;
      completedTicketIdsByPlayer[p.id] = [];
      const init: TtrDestinationTicket[] = [];
      for (let i = 0; i < 3; i += 1) {
        const t = ticketDeck.pop();
        if (t) init.push(t);
      }
      pendingInitialChoices[p.id] = init;
      for (let i = 0; i < 4; i += 1) {
        const c = trainDeck.pop();
        if (c) hand[p.id][c] += 1;
      }
    }

    const s: TtrState = {
      phase: 'initial_tickets',
      playerOrder,
      playerNames,
      currentTurnIndex: 0,
      scores,
      trainsLeft,
      hand,
      tickets,
      pendingInitialChoices,
      pendingTicketChoiceByPlayer,
      completedTicketIdsByPlayer,
      pendingSecondTrainDrawPlayerId: null,
      faceUpResetNoticeSeq: 0,
      destinationCompleteNoticeSeq: 0,
      destinationCompleteNotice: null,
      trainDeck,
      trainDiscard: [],
      ticketDeck,
      faceUpTrainCards: [],
      routeOwner: Object.fromEntries(TTR_ROUTES.map((r) => [r.id, null])),
      finalTurnsRemaining: null,
      lastEvent: 'เลือกตั๋วเริ่มต้น: ต้องเก็บอย่างน้อย 2 ใบ',
    };
    refillFaceUpToFive(s);
    clearFaceUpIfTooManyLocomotives(s);
    return s;
  },

  onAction(state: TtrState, playerId: string, action: TtrAction): TtrState {
    if (state.phase === 'game_over') throw new GameActionRejectedError('เกมจบแล้ว');

    if (action.type === 'keep_initial_tickets') {
      if (state.phase !== 'initial_tickets') {
        throw new GameActionRejectedError('เลยช่วงเลือกตั๋วเริ่มต้นแล้ว');
      }
      const s = cloneStateForKeepInitial(state, playerId);
      return handleKeepInitialTickets(s, playerId, action);
    }

    if (state.phase === 'initial_tickets') {
      throw new GameActionRejectedError('ผู้เล่นทุกคนต้องเลือกตั๋วเริ่มต้นก่อน');
    }

    switch (action.type) {
      case 'draw_train_cards': {
        const s =
          state.finalTurnsRemaining === 1
            ? cloneState(state)
            : cloneStateForDrawTrain(state, playerId);
        return handleDrawTrainCards(s, playerId, action);
      }
      case 'claim_route': {
        const s =
          state.finalTurnsRemaining === 1
            ? cloneState(state)
            : cloneStateForClaimRoute(state, playerId);
        return handleClaimRoute(s, playerId, action);
      }
      case 'draw_destination_tickets': {
        const s = cloneStateForDrawDestination(state);
        return handleDrawDestinationTickets(s, playerId);
      }
      case 'keep_drawn_tickets': {
        const s =
          state.finalTurnsRemaining === 1
            ? cloneState(state)
            : cloneStateForKeepDrawn(state, playerId);
        return handleKeepDrawnTickets(s, playerId, action);
      }
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
