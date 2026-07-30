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
  TtrPlayerView,
  TtrRouteDef,
  TtrTrainDrawNotice,
  TtrTrainDrawNoticeCard,
  TtrTrainColor,
} from 'shared';
import { TTR_CARD_COLORS, TTR_TRAIN_COLORS, getTtrMap, ttrCityName, ttrMapIndex } from 'shared';
import { GAME_THUMBNAIL_BY_ID } from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

export interface TtrState {
  mapId: TtrMapId;
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
  ticketDeck: TtrDestinationTicket[];
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

function ensureTurnAndNoPendingChoice(s: TtrState, playerId: string): void {
  if (s.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ถึงช่วงเล่น');
  if (currentPlayerId(s) !== playerId) throw new GameActionRejectedError('ยังไม่ถึงตาคุณ');
  const cur = currentPlayerId(s);
  // Recover stale state: turn advanced while someone still owed a 2nd draw (should not happen after rules below).
  if (s.pendingSecondTrainDrawPlayerId != null && s.pendingSecondTrainDrawPlayerId !== cur) {
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

/** Every legal payment for one route, cheapest in locomotives first. */
function claimOptionsForRoute(s: TtrState, pid: string, route: TtrRouteDef): TtrClaimOption[] {
  if (routeBlockReason(s, pid, route) != null) return [];
  const hand = s.hand[pid] ?? emptyTrainHand();
  const loco = hand.locomotive ?? 0;
  const minLocoForRoute = route.ferryLocomotives ?? 0;
  const colors: readonly TtrCardColor[] = route.color === 'gray' ? TTR_CARD_COLORS : [route.color];

  const out: TtrClaimOption[] = [];
  for (const color of colors) {
    const have = hand[color] ?? 0;
    if (have + loco < route.length) continue;
    const minLoco = Math.max(minLocoForRoute, route.length - have);
    for (let l = minLoco; l <= Math.min(route.length, loco); l += 1) {
      out.push({ color, colorCards: route.length - l, locomotives: l });
    }
  }
  return out;
}

function claimOptionsForPlayer(s: TtrState, pid: string): Record<string, TtrClaimOption[]> {
  const out: Record<string, TtrClaimOption[]> = {};
  if (s.phase !== 'playing') return out;
  if (currentPlayerId(s) !== pid) return out;
  if (s.pendingTicketChoiceByPlayer[pid] != null) return out;
  if (s.pendingSecondTrainDrawPlayerId != null) return out;
  for (const route of mapOf(s).routes) {
    const options = claimOptionsForRoute(s, pid, route);
    if (options.length > 0) out[route.id] = options;
  }
  return out;
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
  const bonus = mapOf(s).rules.longestPathBonus;
  const longestPathBonus: Record<string, number> = Object.fromEntries(
    s.playerOrder.map((pid) => [pid, 0]),
  );
  if (longest > 0) {
    for (const pid of s.playerOrder) {
      if (longestByPlayer[pid] === longest) {
        longestPathBonus[pid] = bonus;
        s.scores[pid] = (s.scores[pid] ?? 0) + bonus;
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
    deckTicketsRemaining: s.ticketDeck.length,
    routes: map.routes.map((r) => ({ id: r.id, ownerId: s.routeOwner[r.id] ?? null, def: r })),
    claimOptions: claimOptionsForPlayer(s, viewerId),
    pendingTicketChoice: s.pendingTicketChoiceByPlayer[viewerId]
      ? [...(s.pendingTicketChoiceByPlayer[viewerId] ?? [])]
      : s.pendingInitialChoices[viewerId]
        ? [...(s.pendingInitialChoices[viewerId] ?? [])]
        : null,
    mustDrawSecondTrainCard: s.pendingSecondTrainDrawPlayerId === viewerId,
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
    finalScoreSummary: s.finalScoreSummary ? [...s.finalScoreSummary] : undefined,
    canAct:
      s.phase === 'playing' &&
      currentPlayerId(s) === viewerId &&
      s.pendingTicketChoiceByPlayer[viewerId] == null,
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
type KeepDrawnTicketsAction = Extract<TtrAction, { type: 'keep_drawn_tickets' }>;

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
    ticketDeck: [...state.ticketDeck],
    faceUpTrainCards: [...state.faceUpTrainCards],
    routeOwner: { ...state.routeOwner },
    finalScoreSummary: state.finalScoreSummary ? [...state.finalScoreSummary] : undefined,
    result: state.result ? { ...state.result } : undefined,
  };
}

function handleKeepInitialTickets(
  s: TtrState,
  playerId: string,
  action: KeepInitialTicketsAction,
): TtrState {
  if (s.phase !== 'initial_tickets')
    throw new GameActionRejectedError('เลยช่วงเลือกตั๋วเริ่มต้นแล้ว');
  const pending = s.pendingInitialChoices[playerId];
  if (!pending) throw new GameActionRejectedError('คุณเลือกตั๋วเริ่มต้นแล้ว');
  const minKeep = mapOf(s).setup.minInitialKeep;
  const keepIdSet = new Set(action.keepIds);
  const keep = pending.filter((t) => keepIdSet.has(t.id));
  if (keep.length < minKeep) throw new GameActionRejectedError(`ต้องเก็บอย่างน้อย ${minKeep} ใบ`);
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

  if (s.pendingSecondTrainDrawPlayerId === playerId) {
    if (action.first.source === 'face_up') {
      const c = s.faceUpTrainCards[action.first.index];
      if (c === 'locomotive')
        throw new GameActionRejectedError('ใบที่สองห้ามหยิบ locomotive แบบเปิดหน้า');
    }
    const second = drawOne(action.first);
    s.hand[playerId][second] += 1;
    publishDrawNotice([noticeCard(action.first, second)]);
    s.pendingSecondTrainDrawPlayerId = null;
    s.lastEvent = `${s.playerNames[playerId]} จั่วการ์ดรถไฟใบที่ 2`;
    consumeTurnAndMaybeAdvance(s);
    return s;
  }

  const drawn: TtrTrainColor[] = [];
  const first = drawOne(action.first);
  s.hand[playerId][first] += 1;
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
    s.hand[playerId][second] += 1;
    drawn.push(second);
    noticeCards.push(noticeCard(action.second, second));
  }
  publishDrawNotice(noticeCards);

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
  const map = mapOf(s);
  const r = routeById(s, action.routeId);
  const blocked = routeBlockReason(s, playerId, r);
  if (blocked) throw new GameActionRejectedError(blocked);

  const locoUsed = action.locomotivesUsed;
  const legal = claimOptionsForRoute(s, playerId, r).some(
    (o) => o.color === action.color && o.locomotives === locoUsed,
  );
  if (!legal) throw new GameActionRejectedError('จ่ายการ์ดแบบนี้ไม่ได้');

  const colorNeed = r.length - locoUsed;
  const completedBefore = new Set(s.completedTicketIdsByPlayer[playerId] ?? []);

  s.hand[playerId][action.color] -= colorNeed;
  s.hand[playerId].locomotive -= locoUsed;
  for (let i = 0; i < colorNeed; i += 1) s.trainDiscard.push(action.color);
  for (let i = 0; i < locoUsed; i += 1) s.trainDiscard.push('locomotive');

  s.routeOwner[r.id] = playerId;
  s.trainsLeft[playerId] -= r.length;
  s.scores[playerId] += map.routePoints[r.length] ?? 0;
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
  s.lastEvent = `${s.playerNames[playerId]} ยึดเส้นทาง ${ttrCityName(map, r.a)} - ${ttrCityName(map, r.b)}`;
  consumeTurnAndMaybeAdvance(s);
  return s;
}

function handleDrawDestinationTickets(s: TtrState, playerId: string): TtrState {
  ensureTurnAndNoPendingChoice(s, playerId);
  assertNotMidTrainDraw(s, playerId);
  const drawn: TtrDestinationTicket[] = [];
  for (let i = 0; i < mapOf(s).setup.ticketDraw; i += 1) {
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
  const minKeep = mapOf(s).setup.minTicketKeep;
  const keepIdSet = new Set(action.keepIds);
  const keep = pending.filter((t) => keepIdSet.has(t.id));
  if (keep.length < minKeep) throw new GameActionRejectedError(`ต้องเก็บอย่างน้อย ${minKeep} ใบ`);
  s.tickets[playerId].push(...keep);
  refreshCompletedTicketIdsForPlayer(s, playerId);
  const putBack = pending.filter((t) => !keepIdSet.has(t.id));
  s.ticketDeck.unshift(...putBack);
  s.pendingTicketChoiceByPlayer[playerId] = null;
  s.lastEvent = `${s.playerNames[playerId]} เลือกเก็บตั๋ว ${keep.length} ใบ`;
  consumeTurnAndMaybeAdvance(s);
  return s;
}

const DEFAULT_MAP = getTtrMap(undefined);

export const ticketToRideGame: GameDefinition<TtrState, TtrAction> = {
  id: 'ticket-to-ride',
  name: 'Ticket to Ride',
  description: 'จั่วการ์ดรถไฟ ลงเส้นทาง และทำตั๋วปลายทางให้สำเร็จ',
  minPlayers: DEFAULT_MAP.minPlayers,
  maxPlayers: DEFAULT_MAP.maxPlayers,
  thumbnail:
    GAME_THUMBNAIL_BY_ID['ticket-to-ride'] ??
    'https://upload.wikimedia.org/wikipedia/commons/5/5b/Ticket_to_Ride_Board_Game.jpg',

  setup(players: Player[]): TtrState {
    const map = DEFAULT_MAP;
    const playerOrder = shuffle(players.map((p) => p.id));
    const playerNames: Record<string, string> = {};
    const scores: Record<string, number> = {};
    const trainsLeft: Record<string, number> = {};
    const hand: Record<string, Record<TtrTrainColor, number>> = {};
    const tickets: Record<string, TtrDestinationTicket[]> = {};
    const pendingInitialChoices: Record<string, TtrDestinationTicket[] | null> = {};
    const pendingTicketChoiceByPlayer: Record<string, TtrDestinationTicket[] | null> = {};
    const completedTicketIdsByPlayer: Record<string, string[]> = {};
    const ticketDeck = shuffle(map.destinationTickets);
    const trainDeck = buildTrainDeck(map);

    for (const p of players) {
      playerNames[p.id] = p.name;
      scores[p.id] = 0;
      trainsLeft[p.id] = map.trainsPerPlayer;
      hand[p.id] = emptyTrainHand();
      tickets[p.id] = [];
      pendingTicketChoiceByPlayer[p.id] = null;
      completedTicketIdsByPlayer[p.id] = [];
      const init: TtrDestinationTicket[] = [];
      for (let i = 0; i < map.setup.initialTickets; i += 1) {
        const t = ticketDeck.pop();
        if (t) init.push(t);
      }
      pendingInitialChoices[p.id] = init;
      for (let i = 0; i < map.setup.trainCards; i += 1) {
        const c = trainDeck.pop();
        if (c) hand[p.id][c] += 1;
      }
    }

    const s: TtrState = {
      mapId: map.id,
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
      trainDrawNoticeSeq: 0,
      trainDrawNotice: null,
      faceUpResetNoticeSeq: 0,
      destinationCompleteNoticeSeq: 0,
      destinationCompleteNotice: null,
      trainDeck,
      trainDiscard: [],
      ticketDeck,
      faceUpTrainCards: [],
      routeOwner: Object.fromEntries(map.routes.map((r) => [r.id, null])),
      finalTurnsRemaining: null,
      lastEvent: `เลือกตั๋วเริ่มต้น: ต้องเก็บอย่างน้อย ${map.setup.minInitialKeep} ใบ`,
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
