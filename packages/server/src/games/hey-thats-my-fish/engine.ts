import {
  GAME_THUMBNAIL_BY_ID,
  HEY_THATS_MY_FISH_COLORS,
  HEY_THATS_MY_FISH_ID,
  createHeyThatsMyFishDeck,
  heyThatsMyFishLegalDestinations,
  heyThatsMyFishLegalPlaceHexIds,
  heyThatsMyFishPenguinsPerPlayer,
  heyThatsMyFishWinners,
  type GameDefinition,
  type GameResult,
  type HeyThatsMyFishAction,
  type HeyThatsMyFishPenguin,
  type HeyThatsMyFishPlayer,
  type HeyThatsMyFishPlayerView,
  type HeyThatsMyFishState,
  type Player,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

const reject = (message: string): never => {
  throw new GameActionRejectedError(message);
};

function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function cloneState(state: HeyThatsMyFishState): HeyThatsMyFishState {
  return structuredClone(state);
}

function playerList(state: HeyThatsMyFishState): HeyThatsMyFishPlayer[] {
  return state.playerOrder.map((id) => state.players[id]!);
}

function penguinsOf(state: HeyThatsMyFishState, playerId: string): HeyThatsMyFishPenguin[] {
  return Object.values(state.penguins).filter((penguin) => penguin.playerId === playerId);
}

function unplacedPenguin(
  state: HeyThatsMyFishState,
  playerId: string,
): HeyThatsMyFishPenguin | undefined {
  return penguinsOf(state, playerId).find((penguin) => penguin.hexId == null);
}

function legalMovesForPlayer(
  state: HeyThatsMyFishState,
  playerId: string,
): Record<string, number[]> {
  const moves: Record<string, number[]> = {};
  for (const penguin of penguinsOf(state, playerId)) {
    if (penguin.hexId == null) continue;
    const dest = heyThatsMyFishLegalDestinations(penguin.hexId, state.hexes);
    if (dest.length > 0) moves[penguin.id] = dest;
  }
  return moves;
}

function hasLegalMove(state: HeyThatsMyFishState, playerId: string): boolean {
  return Object.keys(legalMovesForPlayer(state, playerId)).length > 0;
}

function collectHex(state: HeyThatsMyFishState, player: HeyThatsMyFishPlayer, hexId: number): void {
  const hex = state.hexes[hexId];
  if (!hex || hex.fish === 0) return;
  player.fishScore += hex.fish;
  player.tileScore += 1;
  hex.fish = 0;
  hex.artKey = null;
  hex.penguinId = null;
}

function eliminatePlayer(state: HeyThatsMyFishState, player: HeyThatsMyFishPlayer): void {
  for (const penguin of penguinsOf(state, player.id)) {
    if (penguin.hexId == null) continue;
    collectHex(state, player, penguin.hexId);
    penguin.hexId = null;
  }
  player.eliminated = true;
  player.penguinsToPlace = 0;
}

function finishGame(state: HeyThatsMyFishState): void {
  state.phase = 'game_over';
  state.result = heyThatsMyFishWinners(playerList(state));
  state.lastEvent = state.result.reason;
}

function livingPlayerIds(state: HeyThatsMyFishState): string[] {
  return state.playerOrder.filter((id) => !state.players[id]?.eliminated);
}

/** Advance to the next player who can act. Eliminate anyone with no legal move on their turn. */
function passTurn(state: HeyThatsMyFishState): void {
  if (state.phase === 'game_over') return;
  const living = livingPlayerIds(state);
  if (living.length === 0) {
    finishGame(state);
    return;
  }

  const start = state.playerOrder.indexOf(state.activePlayerId);
  const count = state.playerOrder.length;
  for (let step = 1; step <= count; step += 1) {
    const id = state.playerOrder[(start + step) % count]!;
    const player = state.players[id]!;
    if (player.eliminated) continue;
    if (state.phase === 'placement') {
      if (player.penguinsToPlace > 0) {
        state.activePlayerId = id;
        return;
      }
      continue;
    }
    if (hasLegalMove(state, id)) {
      state.activePlayerId = id;
      return;
    }
    eliminatePlayer(state, player);
    state.lastEvent = `${player.name} เดินต่อไม่ได้ — เก็บแผ่นที่เหลือแล้วออกจากเกม`;
  }

  finishGame(state);
}

function setup(players: Player[]): HeyThatsMyFishState {
  const n = players.length;
  if (n < 2 || n > 4) throw new Error("Hey, That's My Fish! ต้องมีผู้เล่น 2–4 คน");

  const playerOrder = shuffle(players.map((player) => player.id));
  const colors = shuffle([...HEY_THATS_MY_FISH_COLORS]).slice(0, n);
  const penguinsEach = heyThatsMyFishPenguinsPerPlayer(n);
  const seats: Record<string, HeyThatsMyFishPlayer> = {};
  const penguins: Record<string, HeyThatsMyFishPenguin> = {};

  playerOrder.forEach((id, index) => {
    const player = players.find((seat) => seat.id === id)!;
    const color = colors[index]!;
    seats[id] = {
      id,
      name: player.name,
      color,
      fishScore: 0,
      tileScore: 0,
      penguinsToPlace: penguinsEach,
      eliminated: false,
    };
    for (let penguinIndex = 0; penguinIndex < penguinsEach; penguinIndex += 1) {
      const penguinId = `${id}:${penguinIndex}`;
      penguins[penguinId] = { id: penguinId, playerId: id, color, hexId: null };
    }
  });

  return {
    phase: 'placement',
    playerOrder,
    activePlayerId: playerOrder[0]!,
    players: seats,
    hexes: createHeyThatsMyFishDeck(),
    penguins,
    lastEvent: 'วางเพนกวินบนแผ่นปลา 1 ตัวที่ว่าง',
    result: null,
  };
}

function handlePlace(
  state: HeyThatsMyFishState,
  playerId: string,
  hexId: number,
): HeyThatsMyFishState {
  if (state.phase !== 'placement') return reject('ตอนนี้ไม่ใช่ช่วงวางเพนกวิน');
  if (state.activePlayerId !== playerId) return reject('ยังไม่ถึงตาคุณ');
  const player = state.players[playerId];
  if (!player || player.eliminated) return reject('คุณออกจากเกมแล้ว');
  if (player.penguinsToPlace <= 0) return reject('คุณวางเพนกวินครบแล้ว');
  if (!heyThatsMyFishLegalPlaceHexIds(state.hexes).includes(hexId)) {
    return reject('วางได้เฉพาะแผ่นปลา 1 ตัวที่ยังว่าง');
  }
  const penguin = unplacedPenguin(state, playerId);
  if (!penguin) return reject('ไม่มีเพนกวินให้วาง');

  const hex = state.hexes[hexId]!;
  penguin.hexId = hexId;
  hex.penguinId = penguin.id;
  player.penguinsToPlace -= 1;
  state.lastEvent = `${player.name} วางเพนกวิน`;

  const stillPlacing = playerList(state).some((seat) => seat.penguinsToPlace > 0);
  if (!stillPlacing) {
    state.phase = 'move';
    state.lastEvent = `${player.name} วางเพนกวินตัวสุดท้าย — เริ่มเดิน`;
  }
  passTurn(state);
  return state;
}

function handleMove(
  state: HeyThatsMyFishState,
  playerId: string,
  penguinId: string,
  hexId: number,
): HeyThatsMyFishState {
  if (state.phase !== 'move') return reject('ตอนนี้ยังเดินเพนกวินไม่ได้');
  if (state.activePlayerId !== playerId) return reject('ยังไม่ถึงตาคุณ');
  const player = state.players[playerId];
  if (!player || player.eliminated) return reject('คุณออกจากเกมแล้ว');
  const penguin = state.penguins[penguinId];
  if (!penguin || penguin.playerId !== playerId) return reject('นั่นไม่ใช่เพนกวินของคุณ');
  if (penguin.hexId == null) return reject('เพนกวินตัวนี้ไม่อยู่บนน้ำแข็ง');
  const originId = penguin.hexId;
  const legal = heyThatsMyFishLegalDestinations(originId, state.hexes);
  if (!legal.includes(hexId)) {
    return reject('เดินตรงไปแผ่นน้ำแข็งว่างเท่านั้น — ข้ามเพนกวินหรือน้ำไม่ได้');
  }

  const caught = state.hexes[originId]?.fish ?? 0;
  const dest = state.hexes[hexId]!;
  collectHex(state, player, originId);
  penguin.hexId = hexId;
  dest.penguinId = penguin.id;
  state.lastEvent = `${player.name} เก็บแผ่น ${caught} ปลา`;
  passTurn(state);
  return state;
}

function onAction(
  state: HeyThatsMyFishState,
  playerId: string,
  action: HeyThatsMyFishAction,
): HeyThatsMyFishState {
  if (state.phase === 'game_over') return reject('เกมจบแล้ว');
  const next = cloneState(state);
  switch (action.type) {
    case 'place-penguin':
      return handlePlace(next, playerId, action.hexId);
    case 'move-penguin':
      return handleMove(next, playerId, action.penguinId, action.hexId);
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return reject('action ไม่รู้จัก');
    }
  }
}

function getPlayerView(state: HeyThatsMyFishState, playerId: string): HeyThatsMyFishPlayerView {
  const canAct =
    state.phase !== 'game_over' &&
    state.activePlayerId === playerId &&
    !state.players[playerId]?.eliminated;
  const legalPlaceHexIds =
    canAct && state.phase === 'placement' ? heyThatsMyFishLegalPlaceHexIds(state.hexes) : [];
  const legalMoves = canAct && state.phase === 'move' ? legalMovesForPlayer(state, playerId) : {};

  return {
    phase: state.phase,
    playerOrder: state.playerOrder,
    activePlayerId: state.activePlayerId,
    canAct,
    players: playerList(state),
    hexes: state.hexes,
    penguins: Object.values(state.penguins),
    lastEvent: state.lastEvent,
    legalPlaceHexIds,
    legalMoves,
    result: state.result,
  };
}

export const heyThatsMyFish: GameDefinition<HeyThatsMyFishState, HeyThatsMyFishAction> = {
  id: HEY_THATS_MY_FISH_ID,
  name: "Hey, That's My Fish!",
  description: 'เพนกวินแย่งปลาน้ำแข็ง — เดินเป็นเส้นตรง เก็บแผ่นที่เดินออก ใครได้ปลามากสุดชนะ',
  minPlayers: 2,
  maxPlayers: 4,
  thumbnail: GAME_THUMBNAIL_BY_ID[HEY_THATS_MY_FISH_ID] ?? '',
  setup,
  onAction,
  getPlayerView,
  isGameOver: (state): GameResult | null => state.result,
};
