import type {
  CupTheCrabAction,
  CupTheCrabCard,
  CupTheCrabCardKind,
  CupTheCrabCupValue,
  CupTheCrabPlayTarget,
  CupTheCrabPlayerView,
  CupTheCrabStack,
  GameDefinition,
  GameResult,
  Player,
} from 'shared';
import { GAME_THUMBNAIL_BY_ID } from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

const MAX_ROUNDS = 7;
const CUP_CARDS_PER_PLAYER = 14;
const ROUND_HAND_SIZE = 3;

const CUP_DISTRIBUTION: ReadonlyArray<[CupTheCrabCupValue, number]> = [
  [1, 10],
  [2, 10],
  [3, 10],
  [4, 10],
  [5, 10],
  [6, 10],
  [8, 5],
  [10, 5],
];

const ACTION_COUNTS: ReadonlyArray<[CupTheCrabCardKind, number]> = [
  ['crab', 3],
  ['bottle', 2],
  ['octopus', 2],
];

interface CupTheCrabPlayerState {
  reserve: CupTheCrabCard[];
  roundHand: CupTheCrabCard[] | null;
  scorePile: CupTheCrabCard[];
  cardsPlayedThisRound: number;
  hasConfirmedSelection: boolean;
}

interface CupTheCrabState {
  phase: 'card_selection' | 'play' | 'game_over';
  round: number;
  playerOrder: string[];
  playerNames: Record<string, string>;
  startPlayerIndex: number;
  currentTurnIndex: number;
  maxStacks: number;
  stacks: CupTheCrabStack[];
  players: Record<string, CupTheCrabPlayerState>;
  discard: CupTheCrabCard[];
  lastEvent: string;
  result: GameResult | null;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function buildCupPool(): CupTheCrabCard[] {
  const pool: CupTheCrabCard[] = [];
  let seq = 0;
  for (const [value, count] of CUP_DISTRIBUTION) {
    for (let i = 0; i < count; i += 1) {
      pool.push({ id: `cup-${value}-${seq}`, kind: 'cup', value });
      seq += 1;
    }
  }
  return pool;
}

function buildActionCardsForPlayer(playerId: string): CupTheCrabCard[] {
  const cards: CupTheCrabCard[] = [];
  let seq = 0;
  for (const [kind, count] of ACTION_COUNTS) {
    for (let i = 0; i < count; i += 1) {
      cards.push({ id: `${kind}-${playerId}-${seq}`, kind });
      seq += 1;
    }
  }
  return cards;
}

function newStackId(state: CupTheCrabState): string {
  return `stack-${state.round}-${state.stacks.length}-${Date.now()}`;
}

function activePlayerId(state: CupTheCrabState): string | null {
  if (state.phase !== 'play') return null;
  return state.playerOrder[state.currentTurnIndex] ?? null;
}

function allSelectionsConfirmed(state: CupTheCrabState): boolean {
  return state.playerOrder.every((pid) => state.players[pid]?.hasConfirmedSelection);
}

function allPlayersFinishedRound(state: CupTheCrabState): boolean {
  return state.playerOrder.every(
    (pid) => (state.players[pid]?.cardsPlayedThisRound ?? 0) >= ROUND_HAND_SIZE,
  );
}

function stackHasBottle(stack: CupTheCrabStack): boolean {
  return stack.hasBottle || stack.cards.some((c) => c.kind === 'bottle');
}

function canCreateStack(state: CupTheCrabState): boolean {
  return state.stacks.length < state.maxStacks;
}

function canPlayOnStack(card: CupTheCrabCard, stack: CupTheCrabStack): boolean {
  const bottled = stackHasBottle(stack);
  switch (card.kind) {
    case 'cup':
      return !bottled;
    case 'bottle':
      return !bottled;
    case 'crab':
      return !bottled;
    case 'octopus':
      return bottled;
    default:
      return false;
  }
}

function legalTargetsForCard(state: CupTheCrabState, card: CupTheCrabCard): CupTheCrabPlayTarget[] {
  const targets: CupTheCrabPlayTarget[] = [];
  const canNew =
    card.kind === 'cup' || card.kind === 'bottle'
      ? canCreateStack(state)
      : false;
  if (canNew && (card.kind === 'cup' || card.kind === 'bottle')) {
    targets.push({ kind: 'new_stack' });
  }
  for (const stack of state.stacks) {
    if (canPlayOnStack(card, stack)) {
      targets.push({ kind: 'stack', stackId: stack.id });
    }
  }
  return targets;
}

function playerHasLegalMove(state: CupTheCrabState, playerId: string): boolean {
  const ps = state.players[playerId];
  if (!ps?.roundHand?.length) return false;
  return ps.roundHand.some((card) => legalTargetsForCard(state, card).length > 0);
}

function claimStack(
  state: CupTheCrabState,
  stackId: string,
  playerId: string,
): void {
  const idx = state.stacks.findIndex((s) => s.id === stackId);
  if (idx < 0) return;
  const [stack] = state.stacks.splice(idx, 1);
  if (!stack) return;
  const ps = state.players[playerId];
  if (!ps) return;
  ps.scorePile.push(...stack.cards);
}

function advanceTurn(state: CupTheCrabState): void {
  const n = state.playerOrder.length;
  if (n === 0) return;
  state.currentTurnIndex = (state.currentTurnIndex + 1) % n;
}

function skipPlayersWithoutMoves(state: CupTheCrabState): void {
  const n = state.playerOrder.length;
  if (n === 0) return;
  let guard = 0;
  while (guard < n) {
    const pid = state.playerOrder[state.currentTurnIndex];
    if (!pid) break;
    const ps = state.players[pid];
    if ((ps?.roundHand?.length ?? 0) === 0) {
      advanceTurn(state);
      guard += 1;
      continue;
    }
    if (playerHasLegalMove(state, pid)) break;
    // No legal move — auto-discard first card in round hand
    const card = ps!.roundHand!.shift();
    if (card) {
      state.discard.push(card);
      ps!.cardsPlayedThisRound += 1;
      state.lastEvent = `${state.playerNames[pid]} ทิ้ง ${cardLabel(card)} (ไม่มีทางเล่น)`;
    }
    if (allPlayersFinishedRound(state)) {
      endRound(state);
      return;
    }
    advanceTurn(state);
    guard += 1;
  }
}

function cardLabel(card: CupTheCrabCard): string {
  if (card.kind === 'cup') return `ถ้วย ${card.value}`;
  if (card.kind === 'crab') return 'ปู';
  if (card.kind === 'bottle') return 'ขวด';
  return 'หมึก';
}

function endRound(state: CupTheCrabState): void {
  if (state.round >= MAX_ROUNDS) {
    state.phase = 'game_over';
    state.result = computeFinalResult(state);
    state.lastEvent = 'จบเกม — นับคะแนนถ้วยกองคะแนน';
    return;
  }
  state.round += 1;
  state.phase = 'card_selection';
  state.startPlayerIndex = (state.startPlayerIndex + 1) % state.playerOrder.length;
  state.currentTurnIndex = state.startPlayerIndex;
  for (const pid of state.playerOrder) {
    const ps = state.players[pid];
    if (!ps) continue;
    ps.roundHand = null;
    ps.cardsPlayedThisRound = 0;
    ps.hasConfirmedSelection = false;
  }
  state.lastEvent = `เริ่มรอบที่ ${state.round}`;
}

function computeFinalResult(state: CupTheCrabState): GameResult {
  const scores = state.playerOrder.map((pid) => ({
    pid,
    score: (state.players[pid]?.scorePile ?? [])
      .filter((c) => c.kind === 'cup')
      .reduce((sum, c) => sum + (c.value ?? 0), 0),
  }));
  const max = Math.max(...scores.map((s) => s.score));
  const winners = scores.filter((s) => s.score === max).map((s) => s.pid);
  const reason =
    winners.length === 1
      ? `${state.playerNames[winners[0]!]} ชนะด้วย ${max} แต้ม`
      : `เสมอที่ ${max} แต้ม`;
  return { winners, reason };
}

function beginPlayPhase(state: CupTheCrabState): void {
  state.phase = 'play';
  state.currentTurnIndex = state.startPlayerIndex;
  state.lastEvent = 'เริ่มเล่นการ์ด — เลือกการ์ดจากมือรอบนี้';
  skipPlayersWithoutMoves(state);
}

function applyPlay(
  state: CupTheCrabState,
  playerId: string,
  card: CupTheCrabCard,
  target: CupTheCrabPlayTarget,
): void {
  const ps = state.players[playerId]!;
  const handIdx = ps.roundHand!.findIndex((c) => c.id === card.id);
  if (handIdx < 0) throw new GameActionRejectedError('ไม่พบการ์ดในมือ');
  ps.roundHand!.splice(handIdx, 1);
  ps.cardsPlayedThisRound += 1;

  const name = state.playerNames[playerId] ?? playerId;

  if (target.kind === 'new_stack') {
    if (!canCreateStack(state)) throw new GameActionRejectedError('สร้างกองใหม่ไม่ได้');
    if (card.kind !== 'cup' && card.kind !== 'bottle') {
      throw new GameActionRejectedError('การ์ดนี้สร้างกองใหม่ไม่ได้');
    }
    const stack: CupTheCrabStack = {
      id: newStackId(state),
      cards: [card],
      hasBottle: card.kind === 'bottle',
    };
    state.stacks.push(stack);
    state.lastEvent = `${name} เปิดกองใหม่ด้วย ${cardLabel(card)}`;
    return;
  }

  const stack = state.stacks.find((s) => s.id === target.stackId);
  if (!stack) throw new GameActionRejectedError('ไม่พบกองบนโต๊ะ');
  if (!canPlayOnStack(card, stack)) {
    throw new GameActionRejectedError('วางการ์ดบนกองนี้ไม่ได้');
  }

  if (card.kind === 'crab' || card.kind === 'octopus') {
    stack.cards.push(card);
    claimStack(state, stack.id, playerId);
    state.lastEvent = `${name} ใช้ ${cardLabel(card)} เก็บกอง`;
    return;
  }

  stack.cards.push(card);
  if (card.kind === 'bottle') stack.hasBottle = true;
  state.lastEvent = `${name} เล่น ${cardLabel(card)}`;
}

function handleConfirmSelection(
  state: CupTheCrabState,
  playerId: string,
  cardIds: [string, string, string],
): void {
  if (state.phase !== 'card_selection') {
    throw new GameActionRejectedError('ไม่ใช่ช่วงเลือกการ์ด');
  }
  const unique = new Set(cardIds);
  if (unique.size !== ROUND_HAND_SIZE) {
    throw new GameActionRejectedError('ต้องเลือกการ์ด 3 ใบที่ไม่ซ้ำกัน');
  }

  const ps = state.players[playerId];
  if (!ps) throw new GameActionRejectedError('ไม่พบผู้เล่น');
  if (ps.hasConfirmedSelection) {
    throw new GameActionRejectedError('ยืนยันการเลือกแล้ว');
  }

  const picked: CupTheCrabCard[] = [];
  for (const id of cardIds) {
    const card = ps.reserve.find((c) => c.id === id);
    if (!card) throw new GameActionRejectedError('การ์ดไม่อยู่ในมือ');
    picked.push(card);
  }

  ps.reserve = ps.reserve.filter((c) => !cardIds.includes(c.id));
  ps.roundHand = picked;
  ps.hasConfirmedSelection = true;
  state.lastEvent = `${state.playerNames[playerId]} เลือกการ์ดครบแล้ว`;

  if (allSelectionsConfirmed(state)) {
    beginPlayPhase(state);
  }
}

function handlePlayCard(
  state: CupTheCrabState,
  playerId: string,
  cardId: string,
  target: CupTheCrabPlayTarget,
): void {
  if (state.phase !== 'play') throw new GameActionRejectedError('ไม่ใช่ช่วงเล่นการ์ด');
  const active = activePlayerId(state);
  if (active !== playerId) throw new GameActionRejectedError('ยังไม่ถึงตาคุณ');

  const ps = state.players[playerId];
  if (!ps?.roundHand?.length) throw new GameActionRejectedError('ไม่มีการ์ดให้เล่น');
  if (ps.cardsPlayedThisRound >= ROUND_HAND_SIZE) {
    throw new GameActionRejectedError('เล่นครบ 3 ใบในรอบนี้แล้ว');
  }

  const card = ps.roundHand.find((c) => c.id === cardId);
  if (!card) throw new GameActionRejectedError('ไม่พบการ์ดในมือรอบนี้');

  const legal = legalTargetsForCard(state, card);
  const ok = legal.some((t) => {
    if (t.kind !== target.kind) return false;
    if (t.kind === 'new_stack') return true;
    return target.kind === 'stack' && t.stackId === target.stackId;
  });
  if (!ok) throw new GameActionRejectedError('การวางการ์ดไม่ถูกต้อง');

  if (!playerHasLegalMove(state, playerId)) {
    throw new GameActionRejectedError('ไม่มีทางเล่นที่ถูกต้อง');
  }

  applyPlay(state, playerId, card, target);

  if (allPlayersFinishedRound(state)) {
    endRound(state);
    return;
  }

  advanceTurn(state);
  skipPlayersWithoutMoves(state);
}

function buildPlayerView(state: CupTheCrabState, playerId: string): CupTheCrabPlayerView {
  const me = state.players[playerId];
  const active = activePlayerId(state);

  const players = state.playerOrder.map((pid) => ({
    id: pid,
    name: state.playerNames[pid] ?? pid,
    hasConfirmedSelection: state.players[pid]?.hasConfirmedSelection ?? false,
    cardsPlayedThisRound: state.players[pid]?.cardsPlayedThisRound ?? 0,
    scorePileCount: state.players[pid]?.scorePile.length ?? 0,
    isStartPlayer:
      state.phase !== 'game_over' &&
      pid === state.playerOrder[state.startPlayerIndex],
  }));

  const allScorePiles =
    state.phase === 'game_over'
      ? Object.fromEntries(
          state.playerOrder.map((pid) => [pid, [...(state.players[pid]?.scorePile ?? [])]]),
        )
      : undefined;

  return {
    phase: state.phase,
    round: state.round,
    maxRounds: MAX_ROUNDS,
    playerOrder: [...state.playerOrder],
    players,
    stacks: state.stacks.map((s) => ({
      id: s.id,
      cards: [...s.cards],
      hasBottle: stackHasBottle(s),
    })),
    maxStacks: state.maxStacks,
    reserve: [...(me?.reserve ?? [])],
    roundHand: me?.roundHand ? [...me.roundHand] : null,
    myScorePile: [...(me?.scorePile ?? [])],
    allScorePiles,
    activePlayerId: active,
    canAct:
      state.phase === 'card_selection'
        ? !(me?.hasConfirmedSelection ?? true)
        : active === playerId && (me?.roundHand?.length ?? 0) > 0,
    lastEvent: state.lastEvent,
    result: state.result,
  };
}

export const cupTheCrabGame: GameDefinition<CupTheCrabState, CupTheCrabAction> = {
  id: 'cup-the-crab',
  name: 'Cup the Crab!',
  description: 'เกมไพ่กลยุทธ์ 7 รอบ — สะสมถ้วยในกองคะแนนด้วยปู ขวด และหมึก',
  minPlayers: 3,
  maxPlayers: 5,
  thumbnail:
    GAME_THUMBNAIL_BY_ID['cup-the-crab'] ??
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1778991655/cover_cvy1xh',

  setup(players: Player[]): CupTheCrabState {
    if (players.length < 3 || players.length > 5) {
      throw new Error('Cup the Crab ต้องมีผู้เล่น 3–5 คน');
    }

    const playerOrder = shuffle(players.map((p) => p.id));
    const playerNames = Object.fromEntries(players.map((p) => [p.id, p.name]));
    const cupDeck = shuffle(buildCupPool());

    const playerStates: Record<string, CupTheCrabPlayerState> = {};
    let cupIdx = 0;
    for (const pid of playerOrder) {
      const cups = cupDeck.slice(cupIdx, cupIdx + CUP_CARDS_PER_PLAYER);
      cupIdx += CUP_CARDS_PER_PLAYER;
      const actions = buildActionCardsForPlayer(pid);
      playerStates[pid] = {
        reserve: shuffle([...cups, ...actions]),
        roundHand: null,
        scorePile: [],
        cardsPlayedThisRound: 0,
        hasConfirmedSelection: false,
      };
    }

    const startPlayerIndex = Math.floor(Math.random() * playerOrder.length);

    return {
      phase: 'card_selection',
      round: 1,
      playerOrder,
      playerNames,
      startPlayerIndex,
      currentTurnIndex: startPlayerIndex,
      maxStacks: playerOrder.length,
      stacks: [],
      players: playerStates,
      discard: [],
      lastEvent: 'เลือกการ์ด 3 ใบลับสำหรับรอบนี้',
      result: null,
    };
  },

  onAction(state: CupTheCrabState, playerId: string, action: CupTheCrabAction): CupTheCrabState {
    const next: CupTheCrabState = {
      ...state,
      playerOrder: [...state.playerOrder],
      playerNames: { ...state.playerNames },
      stacks: state.stacks.map((s) => ({
        id: s.id,
        cards: [...s.cards],
        hasBottle: s.hasBottle,
      })),
      players: Object.fromEntries(
        Object.entries(state.players).map(([pid, ps]) => [
          pid,
          {
            reserve: [...ps.reserve],
            roundHand: ps.roundHand ? [...ps.roundHand] : null,
            scorePile: [...ps.scorePile],
            cardsPlayedThisRound: ps.cardsPlayedThisRound,
            hasConfirmedSelection: ps.hasConfirmedSelection,
          },
        ]),
      ),
      discard: [...state.discard],
      result: state.result,
    };

    switch (action.type) {
      case 'confirm_selection':
        handleConfirmSelection(next, playerId, action.cardIds);
        break;
      case 'play_card':
        handlePlayCard(next, playerId, action.cardId, action.target);
        break;
      default:
        throw new GameActionRejectedError('การกระทำไม่รู้จัก');
    }

    return next;
  },

  getPlayerView(state: CupTheCrabState, playerId: string): CupTheCrabPlayerView {
    return buildPlayerView(state, playerId);
  },

  isGameOver(state: CupTheCrabState): GameResult | null {
    return state.phase === 'game_over' ? state.result : null;
  },
};

// Exported for unit tests
export { buildCupPool, canPlayOnStack, legalTargetsForCard, computeFinalResult };
