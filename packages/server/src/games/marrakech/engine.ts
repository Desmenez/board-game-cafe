import {
  GAME_THUMBNAIL_BY_ID,
  MARRAKECH_COLORS,
  MARRAKECH_RUGS_PER_PLAYER,
  MARRAKECH_START_CELL,
  MARRAKECH_STARTING_DIRHAMS,
  parseMarrakechLobbyOptions,
  rollMarrakechDie,
  type GameDefinition,
  type GameResult,
  type MarrakechAction,
  type MarrakechColor,
  type MarrakechPlayerSeat,
  type MarrakechPlayerView,
  type MarrakechState,
  type Player,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';
import {
  activeNonEliminated,
  anyRugsLeft,
  applyDirection,
  applyMove,
  applyPayment,
  computePayment,
  consumeNextColor,
  finishGame,
  isLegalPlacement,
  nextActivePlayerId,
  placeRugOnBoard,
} from './rules.js';
import { toPlayerView } from './view.js';

function reject(message: string): never {
  throw new GameActionRejectedError(message);
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function cloneState(state: MarrakechState): MarrakechState {
  return structuredClone(state);
}

function setup(players: Player[], options?: unknown): MarrakechState {
  const n = players.length;
  if (n < 2 || n > 4) {
    throw new Error('Marrakech ต้องมีผู้เล่น 2–4 คน');
  }

  const lobby = parseMarrakechLobbyOptions(options);
  const playerOrder = shuffle(players.map((p) => p.id));
  const colors = [...MARRAKECH_COLORS];
  const rugsEach = MARRAKECH_RUGS_PER_PLAYER[n] ?? 12;

  const seats: Record<string, MarrakechPlayerSeat> = {};

  if (n === 2) {
    // Each player gets 2 colors, 12 rugs of each, shuffled into one pile of 24.
    const colorPairs: [MarrakechColor, MarrakechColor][] = [
      [colors[0]!, colors[1]!],
      [colors[2]!, colors[3]!],
    ];
    playerOrder.forEach((id, i) => {
      const p = players.find((x) => x.id === id)!;
      const pair = colorPairs[i]!;
      const pile: MarrakechColor[] = shuffle([
        ...Array.from({ length: 12 }, () => pair[0]),
        ...Array.from({ length: 12 }, () => pair[1]),
      ]);
      seats[id] = {
        id,
        name: p.name,
        dirhams: MARRAKECH_STARTING_DIRHAMS,
        colors: [...pair],
        rugsRemaining: 24,
        rugPile: pile,
        eliminated: false,
      };
    });
  } else {
    // 3–4 players: one color each, rugsEach rugs.
    const assigned = shuffle(colors).slice(0, n);
    playerOrder.forEach((id, i) => {
      const p = players.find((x) => x.id === id)!;
      const color = assigned[i]!;
      seats[id] = {
        id,
        name: p.name,
        dirhams: MARRAKECH_STARTING_DIRHAMS,
        colors: [color],
        rugsRemaining: rugsEach,
        rugPile: [],
        eliminated: false,
      };
    });
  }

  return {
    phase: 'choose_direction',
    directionMode: lobby.directionMode,
    playerOrder,
    players: seats,
    activePlayerId: playerOrder[0]!,
    assam: { cell: MARRAKECH_START_CELL, facing: 'up' },
    rugs: [],
    nextRugId: 1,
    lastRoll: null,
    lastPayment: null,
    lastEvent: 'เกมเริ่ม — เลือกทิศทาง Assam',
    result: null,
    pendingAdvanceAfterDirection: false,
    dieQueue: [],
  };
}

function onAction(
  state: MarrakechState,
  playerId: string,
  action: MarrakechAction,
): MarrakechState {
  if (state.phase === 'game_over') reject('เกมจบแล้ว');

  const next = cloneState(state);

  switch (action.type) {
    case 'set-direction':
      return handleSetDirection(next, playerId, action.turn);
    case 'roll-die':
      return handleRollDie(next, playerId);
    case 'place-rug':
      return handlePlaceRug(next, playerId, action.cells);
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      reject('action ไม่รู้จัก');
    }
  }
}

function handleSetDirection(
  state: MarrakechState,
  playerId: string,
  turn: 'straight' | 'left' | 'right',
): MarrakechState {
  if (state.phase !== 'choose_direction') reject('ยังไม่ถึงขั้นเลือกทิศทาง');
  if (state.activePlayerId !== playerId) reject('ยังไม่ถึงตาคุณ');

  if (turn !== 'straight' && turn !== 'left' && turn !== 'right') {
    reject('ทิศทางไม่ถูกต้อง');
  }

  state.assam = applyDirection(state.assam, turn);

  // previous-player mode: the player who just finished places sets direction
  // for the next player, then we advance and go straight to roll.
  if (state.directionMode === 'previous-player' && state.pendingAdvanceAfterDirection) {
    const nextId = nextActivePlayerId(state, playerId);
    state.pendingAdvanceAfterDirection = false;
    if (!nextId || !anyRugsLeft(state)) {
      finishGame(state, 'พรมหมดแล้ว');
      return state;
    }
    state.activePlayerId = nextId;
    state.phase = 'roll';
    state.lastRoll = null;
    state.lastPayment = null;
    state.lastEvent = `${state.players[playerId]!.name} ตั้งทิศทางให้คนถัดไป — ${state.players[nextId]!.name} ทอยลูกเต๋า`;
    return state;
  }

  state.phase = 'roll';
  state.lastEvent =
    turn === 'straight'
      ? `${state.players[playerId]!.name} คงทิศทาง Assam — ทอยลูกเต๋า`
      : `${state.players[playerId]!.name} หัน Assam ${turn === 'left' ? 'ซ้าย' : 'ขวา'} — ทอยลูกเต๋า`;
  return state;
}

function handleRollDie(state: MarrakechState, playerId: string): MarrakechState {
  if (state.phase !== 'roll') reject('ยังไม่ถึงขั้นทอยลูกเต๋า');
  if (state.activePlayerId !== playerId) reject('ยังไม่ถึงตาคุณ');

  let steps: number;
  if (state.dieQueue.length > 0) {
    steps = state.dieQueue.shift()!;
  } else {
    steps = rollMarrakechDie();
  }
  if (steps < 1 || steps > 4) reject('ค่าลูกเต๋าไม่ถูกต้อง');

  state.assam = applyMove(state.assam, steps);
  state.lastRoll = steps;

  const payment = computePayment(state.rugs, state.assam.cell, playerId);
  state.lastPayment = null;

  if (payment) {
    const { eliminated, paid } = applyPayment(state.players, state.rugs, payment);
    state.lastPayment = { ...payment, amount: paid };
    const payee = state.players[payment.toId]!;
    if (eliminated) {
      state.lastEvent = `${state.players[playerId]!.name} ทอยได้ ${steps} เดินลงพรม ต้องจ่าย ${payment.amount} แต่มีไม่พอ — ตกรอบ (จ่าย ${paid} ให้ ${payee.name})`;
    } else {
      state.lastEvent = `${state.players[playerId]!.name} ทอยได้ ${steps} — จ่าย ${paid} Dirham ให้ ${payee.name}`;
    }
  } else {
    state.lastEvent = `${state.players[playerId]!.name} ทอยได้ ${steps}`;
  }

  // Check last-player-standing after possible elimination.
  const alive = activeNonEliminated(state);
  if (alive.length <= 1) {
    finishGame(state, '');
    return state;
  }

  // If the active player was eliminated, skip to next and let them choose direction.
  if (state.players[playerId]?.eliminated) {
    const nextId = nextActivePlayerId(state, playerId);
    if (!nextId || !anyRugsLeft(state)) {
      finishGame(state, 'พรมหมดแล้ว');
      return state;
    }
    state.activePlayerId = nextId;
    state.phase = 'choose_direction';
    state.lastRoll = null;
    return state;
  }

  state.phase = 'place_rug';
  return state;
}

function handlePlaceRug(
  state: MarrakechState,
  playerId: string,
  cells: [number, number],
): MarrakechState {
  if (state.phase !== 'place_rug') reject('ยังไม่ถึงขั้นวางพรม');
  if (state.activePlayerId !== playerId) reject('ยังไม่ถึงตาคุณ');

  const player = state.players[playerId];
  if (!player || player.eliminated) reject('คุณตกรอบแล้ว');
  if (player.rugsRemaining <= 0) reject('พรมหมดแล้ว');

  if (!Array.isArray(cells) || cells.length !== 2) reject('ตำแหน่งพรมไม่ถูกต้อง');
  if (!isLegalPlacement(state.rugs, state.assam.cell, cells)) {
    reject('วางพรมตรงนี้ไม่ได้');
  }

  const color = consumeNextColor(player);
  placeRugOnBoard(state, cells, color, playerId);
  state.lastEvent = `${player.name} วางพรม ${color}`;

  // End if no rugs left among alive players.
  if (!anyRugsLeft(state)) {
    finishGame(state, 'วางพรมใบสุดท้ายแล้ว');
    return state;
  }

  if (state.directionMode === 'previous-player') {
    state.pendingAdvanceAfterDirection = true;
    state.phase = 'choose_direction';
    state.lastRoll = null;
    state.lastPayment = null;
    state.lastEvent = `${player.name} วางพรมแล้ว — ตั้งทิศทางให้คนถัดไป`;
    return state;
  }

  const nextId = nextActivePlayerId(state, playerId);
  if (!nextId) {
    finishGame(state, '');
    return state;
  }

  state.activePlayerId = nextId;
  state.phase = 'choose_direction';
  state.lastRoll = null;
  state.lastPayment = null;
  return state;
}

function getPlayerView(state: MarrakechState, playerId: string): MarrakechPlayerView {
  return toPlayerView(state, playerId);
}

function isGameOver(state: MarrakechState): GameResult | null {
  return state.phase === 'game_over' ? state.result : null;
}

export const marrakechGame: GameDefinition<MarrakechState, MarrakechAction> = {
  id: 'marrakech',
  name: 'Marrakech',
  description: 'แข่งขายพรมในตลาดมาร์ราเกช — บังคับ Assam วางพรม และเก็บ Dirham ให้ได้มากที่สุด',
  minPlayers: 2,
  maxPlayers: 4,
  thumbnail:
    GAME_THUMBNAIL_BY_ID['marrakech'] ??
    'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1785316733/cover_jyoobs.webp',
  setup,
  onAction,
  getPlayerView,
  isGameOver,
};

/** Test helper: push exact die faces onto the queue. */
export function enqueueDieRolls(state: MarrakechState, faces: number[]): void {
  state.dieQueue.push(...faces);
}
