import type {
  GameDefinition,
  GameResult,
  Player,
  TtrAction,
  TtrDestinationTicket,
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
  trainDeck: TtrTrainColor[];
  trainDiscard: TtrTrainColor[];
  ticketDeck: TtrDestinationTicket[];
  faceUpTrainCards: TtrTrainColor[];
  routeOwner: Record<string, string | null>;
  finalTurnsRemaining: number | null;
  lastEvent: string;
  result?: GameResult;
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

function refillFaceUpToFive(s: TtrState): void {
  while (s.faceUpTrainCards.length < 5) {
    const c = drawTrainCardFromDeck(s);
    if (!c) break;
    s.faceUpTrainCards.push(c);
  }
}

function clearFaceUpIfTooManyLocomotives(s: TtrState): void {
  while (
    s.faceUpTrainCards.filter((c) => c === 'locomotive').length >= 3 &&
    s.trainDeck.length > 0
  ) {
    s.trainDiscard.push(...s.faceUpTrainCards);
    s.faceUpTrainCards = [];
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
  if (s.pendingTicketChoiceByPlayer[playerId]) {
    throw new GameActionRejectedError('ต้องเลือกตั๋วปลายทางที่จั่วก่อน');
  }
}

function routeById(routeId: string): TtrRouteDef {
  const r = TTR_ROUTES.find((x) => x.id === routeId);
  if (!r) throw new GameActionRejectedError('ไม่พบเส้นทาง');
  return r;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

function routeIdsBySamePair(route: TtrRouteDef): string[] {
  const k = pairKey(route.a, route.b);
  return TTR_ROUTES.filter((r) => pairKey(r.a, r.b) === k).map((r) => r.id);
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
  for (const r of TTR_ROUTES) {
    if (s.routeOwner[r.id] !== pid) continue;
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
  while (q.length > 0) {
    const cur = q.shift()!;
    for (const nx of g.get(cur) ?? []) {
      if (seen.has(nx)) continue;
      if (nx === b) return true;
      seen.add(nx);
      q.push(nx);
    }
  }
  return false;
}

function finishGame(s: TtrState): void {
  for (const pid of s.playerOrder) {
    const g = graphForPlayer(s, pid);
    for (const t of s.tickets[pid] ?? []) {
      s.scores[pid] = (s.scores[pid] ?? 0) + (connected(g, t.a, t.b) ? t.points : -t.points);
    }
  }

  const longestByPlayer: Record<string, number> = {};
  for (const pid of s.playerOrder) {
    const owned = TTR_ROUTES.filter((r) => s.routeOwner[r.id] === pid);
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
    longestByPlayer[pid] = best;
  }
  const longest = Math.max(0, ...Object.values(longestByPlayer));
  if (longest > 0) {
    for (const pid of s.playerOrder) {
      if (longestByPlayer[pid] === longest) s.scores[pid] = (s.scores[pid] ?? 0) + 10;
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
  s.lastEvent = 'เกมจบแล้ว';
}

function toView(s: TtrState, viewerId: string): TtrPlayerView {
  const players = s.playerOrder.map((id) => ({
    id,
    name: s.playerNames[id] ?? id,
    score: s.scores[id] ?? 0,
    trainsLeft: s.trainsLeft[id] ?? TTR_BASE_TRAINS_PER_PLAYER,
    handCount: Object.values(s.hand[id] ?? emptyTrainHand()).reduce((a, b) => a + b, 0),
    ticketCount: (s.tickets[id] ?? []).length,
  }));
  return {
    phase: s.phase,
    myId: viewerId,
    currentPlayerId: currentPlayerId(s),
    players,
    myHand: { ...s.hand[viewerId] },
    myTickets: [...(s.tickets[viewerId] ?? [])],
    faceUpTrainCards: [...s.faceUpTrainCards],
    deckTrainRemaining: s.trainDeck.length,
    deckTicketsRemaining: s.ticketDeck.length,
    routes: TTR_ROUTES.map((r) => ({ id: r.id, ownerId: s.routeOwner[r.id] ?? null, def: r })),
    pendingTicketChoice: s.pendingTicketChoiceByPlayer[viewerId]
      ? [...(s.pendingTicketChoiceByPlayer[viewerId] ?? [])]
      : s.pendingInitialChoices[viewerId]
        ? [...(s.pendingInitialChoices[viewerId] ?? [])]
        : null,
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
    const ticketDeck = buildTicketDeck();
    const trainDeck = buildTrainDeck();

    for (const p of players) {
      playerNames[p.id] = p.name;
      scores[p.id] = 0;
      trainsLeft[p.id] = TTR_BASE_TRAINS_PER_PLAYER;
      hand[p.id] = emptyTrainHand();
      tickets[p.id] = [];
      pendingTicketChoiceByPlayer[p.id] = null;
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
    const s: TtrState = {
      ...state,
      playerOrder: [...state.playerOrder],
      playerNames: { ...state.playerNames },
      scores: { ...state.scores },
      trainsLeft: { ...state.trainsLeft },
      hand: Object.fromEntries(
        Object.entries(state.hand).map(([id, h]) => [id, { ...h }]),
      ) as TtrState['hand'],
      tickets: Object.fromEntries(
        Object.entries(state.tickets).map(([id, ts]) => [id, [...ts]]),
      ) as TtrState['tickets'],
      pendingInitialChoices: Object.fromEntries(
        Object.entries(state.pendingInitialChoices).map(([id, ts]) => [id, ts ? [...ts] : null]),
      ) as TtrState['pendingInitialChoices'],
      pendingTicketChoiceByPlayer: Object.fromEntries(
        Object.entries(state.pendingTicketChoiceByPlayer).map(([id, ts]) => [
          id,
          ts ? [...ts] : null,
        ]),
      ) as TtrState['pendingTicketChoiceByPlayer'],
      trainDeck: [...state.trainDeck],
      trainDiscard: [...state.trainDiscard],
      ticketDeck: [...state.ticketDeck],
      faceUpTrainCards: [...state.faceUpTrainCards],
      routeOwner: { ...state.routeOwner },
      result: state.result ? { ...state.result } : undefined,
    };

    if (s.phase === 'game_over') throw new GameActionRejectedError('เกมจบแล้ว');

    if (action.type === 'keep_initial_tickets') {
      if (s.phase !== 'initial_tickets')
        throw new GameActionRejectedError('เลยช่วงเลือกตั๋วเริ่มต้นแล้ว');
      const pending = s.pendingInitialChoices[playerId];
      if (!pending) throw new GameActionRejectedError('คุณเลือกตั๋วเริ่มต้นแล้ว');
      const keep = pending.filter((t) => action.keepIds.includes(t.id));
      if (keep.length < 2) throw new GameActionRejectedError('ต้องเก็บอย่างน้อย 2 ใบ');
      s.tickets[playerId].push(...keep);
      const putBack = pending.filter((t) => !action.keepIds.includes(t.id));
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

    if (s.phase === 'initial_tickets') {
      throw new GameActionRejectedError('ผู้เล่นทุกคนต้องเลือกตั๋วเริ่มต้นก่อน');
    }

    if (action.type === 'draw_train_cards') {
      ensureTurnAndNoPendingChoice(s, playerId);
      const drawn: TtrTrainColor[] = [];
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

      s.lastEvent = `${s.playerNames[playerId]} จั่วการ์ดรถไฟ ${drawn.length} ใบ`;
      consumeTurnAndMaybeAdvance(s);
      return s;
    }

    if (action.type === 'claim_route') {
      ensureTurnAndNoPendingChoice(s, playerId);
      const r = routeById(action.routeId);
      if (s.routeOwner[r.id]) throw new GameActionRejectedError('เส้นทางนี้ถูกยึดแล้ว');
      const samePairRouteIds = routeIdsBySamePair(r);
      if (samePairRouteIds.some((rid) => s.routeOwner[rid] === playerId)) {
        throw new GameActionRejectedError('ผู้เล่นเดียวกันยึดทั้งสองเส้นระหว่างเมืองคู่เดิมไม่ได้');
      }
      if (s.playerOrder.length <= 3 && samePairRouteIds.some((rid) => s.routeOwner[rid] != null)) {
        throw new GameActionRejectedError(
          'เกม 2-3 คน: เมื่อมีคนยึดหนึ่งเส้น อีกเส้นของคู่เมืองนี้จะปิดทันที',
        );
      }
      if (r.color !== 'gray' && action.color !== r.color) {
        throw new GameActionRejectedError('สีการ์ดไม่ตรงสีเส้นทาง');
      }
      if (s.trainsLeft[playerId]! < r.length)
        throw new GameActionRejectedError('รถไฟไม่พอลงเส้นนี้');
      const locoUsed = action.locomotivesUsed;
      if (locoUsed < 0 || locoUsed > r.length)
        throw new GameActionRejectedError('จำนวน locomotive ไม่ถูกต้อง');
      const colorNeed = r.length - locoUsed;
      if (s.hand[playerId].locomotive < locoUsed)
        throw new GameActionRejectedError('locomotive ไม่พอ');
      if (s.hand[playerId][action.color] < colorNeed)
        throw new GameActionRejectedError('การ์ดสีหลักไม่พอ');

      s.hand[playerId][action.color] -= colorNeed;
      s.hand[playerId].locomotive -= locoUsed;
      for (let i = 0; i < colorNeed; i += 1) s.trainDiscard.push(action.color);
      for (let i = 0; i < locoUsed; i += 1) s.trainDiscard.push('locomotive');

      s.routeOwner[r.id] = playerId;
      s.trainsLeft[playerId] -= r.length;
      s.scores[playerId] += TTR_ROUTE_POINTS[r.length];
      s.lastEvent = `${s.playerNames[playerId]} ยึดเส้นทาง ${r.a} - ${r.b}`;
      consumeTurnAndMaybeAdvance(s);
      return s;
    }

    if (action.type === 'draw_destination_tickets') {
      ensureTurnAndNoPendingChoice(s, playerId);
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

    if (action.type === 'keep_drawn_tickets') {
      if (s.phase !== 'playing') throw new GameActionRejectedError('ยังไม่ถึงช่วงเล่น');
      if (currentPlayerId(s) !== playerId) throw new GameActionRejectedError('ยังไม่ถึงตาคุณ');
      const pending = s.pendingTicketChoiceByPlayer[playerId];
      if (!pending) throw new GameActionRejectedError('ไม่มีตั๋วที่กำลังรอเลือก');
      const keep = pending.filter((t) => action.keepIds.includes(t.id));
      if (keep.length < 1) throw new GameActionRejectedError('ต้องเก็บอย่างน้อย 1 ใบ');
      s.tickets[playerId].push(...keep);
      const putBack = pending.filter((t) => !action.keepIds.includes(t.id));
      s.ticketDeck.unshift(...putBack);
      s.pendingTicketChoiceByPlayer[playerId] = null;
      s.lastEvent = `${s.playerNames[playerId]} เลือกเก็บตั๋ว ${keep.length} ใบ`;
      consumeTurnAndMaybeAdvance(s);
      return s;
    }

    return s;
  },

  getPlayerView(state: TtrState, playerId: string): TtrPlayerView {
    return toView(state, playerId);
  },

  isGameOver(state: TtrState): GameResult | null {
    if (state.phase !== 'game_over' || !state.result) return null;
    return state.result;
  },
};
