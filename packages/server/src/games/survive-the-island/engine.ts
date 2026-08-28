import {
  GAME_THUMBNAIL_BY_ID,
  SURVIVE_THE_ISLAND_COLORS,
  createSurviveTheIslandDeck,
  isSurviveTheIslandWaterSpace,
  surviveTheIslandAdjacentIslandTiles,
  surviveTheIslandAdjacentWaterSpaces,
  surviveTheIslandWaterNeighboursForTile,
  type GameDefinition,
  type GameResult,
  type Player,
  type SurviveTheIslandAction,
  type SurviveTheIslandAdventurer,
  type SurviveTheIslandPlayer,
  type SurviveTheIslandPlayerView,
  type SurviveTheIslandRaft,
  type SurviveTheIslandState,
} from 'shared';
import { GameActionRejectedError } from '../../game-action-rejected.js';

const reject = (message: string): never => {
  throw new GameActionRejectedError(message);
};

function advance(state: SurviveTheIslandState): void {
  const index = state.playerOrder.indexOf(state.activePlayerId);
  state.activePlayerId = state.playerOrder[(index + 1) % state.playerOrder.length]!;
  state.movesRemaining = 3;
  Object.values(state.adventurers).forEach((adventurer) => {
    adventurer.swamThisTurn = false;
  });
  state.phase = 'action';
}

function remainingAdventurers(
  state: SurviveTheIslandState,
  playerId: string,
): SurviveTheIslandAdventurer[] {
  const player = state.players[playerId]!;
  return player.adventurerIds
    .map((id) => state.adventurers[id]!)
    .filter((adventurer) => !adventurer.rescued && !adventurer.eliminated);
}

function legalSinkTileIds(state: SurviveTheIslandState): number[] {
  const remaining = state.tiles.filter((tile) => tile.state === 'island');
  const priority = ['beach', 'forest', 'mountain'] as const;
  const terrain = priority.find((kind) => remaining.some((tile) => tile.terrain === kind));
  return terrain ? remaining.filter((tile) => tile.terrain === terrain).map((tile) => tile.id) : [];
}

function playerControlsRaft(
  state: SurviveTheIslandState,
  raft: SurviveTheIslandRaft,
  playerId: string,
): boolean {
  if (raft.waterSpaceId == null) return true;
  const aboard = Object.values(state.adventurers).filter(
    (adventurer) => !adventurer.eliminated && !adventurer.rescued && adventurer.waterSpaceId === raft.waterSpaceId,
  );
  const own = aboard.filter((adventurer) => adventurer.playerId === playerId).length;
  return Object.keys(state.players)
    .filter((id) => id !== playerId)
    .every((opponentId) => own >= aboard.filter((adventurer) => adventurer.playerId === opponentId).length);
}

function finish(state: SurviveTheIslandState, reason: string): void {
  const ranked = Object.values(state.players)
    .map((player) => ({ player, score: player.rescuedTreasure }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]?.score ?? 0;
  state.phase = 'game_over';
  state.result = {
    winners: ranked.filter((entry) => entry.score === best).map((entry) => entry.player.id),
    reason,
  };
}

function setup(players: Player[]): SurviveTheIslandState {
  if (players.length < 2 || players.length > 5)
    throw new Error('Survive the Island ต้องมีผู้เล่น 2–5 คน');
  const playerOrder = players.map((player) => player.id);
  const seats: Record<string, SurviveTheIslandPlayer> = {};
  const adventurers: Record<string, SurviveTheIslandAdventurer> = {};
  const rafts: Record<string, SurviveTheIslandRaft> = {};
  players.forEach((player, playerIndex) => {
    const colors =
      players.length === 2
        ? SURVIVE_THE_ISLAND_COLORS.slice(playerIndex * 2, playerIndex * 2 + 2)
        : [SURVIVE_THE_ISLAND_COLORS[playerIndex]!];
    const color = colors[0]!;
    const ids: string[] = [];
    const raftIds = [`${player.id}:raft:0`, `${player.id}:raft:1`];
    for (const id of raftIds) rafts[id] = { id, playerId: player.id, waterSpaceId: null };
    const adventurerCount = players.length === 2 ? 20 : 10;
    for (let index = 0; index < adventurerCount; index += 1) {
      const id = `${player.id}:${index}`;
      ids.push(id);
      adventurers[id] = {
        id,
        playerId: player.id,
        color: colors[index % colors.length]!,
        treasure: (index % 5) + 1,
        tileId: null,
        waterSpaceId: null,
        swamThisTurn: false,
        rescued: false,
        eliminated: false,
      };
    }
    seats[player.id] = {
      id: player.id,
      name: player.name,
      color,
      adventurerIds: ids,
      raftIds,
      abilities: [],
      rescuedTreasure: 0,
    };
  });
  return {
    phase: 'setup_adventurers',
    playerOrder,
    activePlayerId: playerOrder[0]!,
    players: seats,
    tiles: createSurviveTheIslandDeck(),
    adventurers,
    rafts,
    setupRemaining: players.length === 2 ? 40 : players.length * 10,
    setupRaftsRemaining: players.length * 2,
    movesRemaining: 0,
    volcanoesRevealed: 0,
    lastEvent: 'วาง Adventurer คนละ 1 ตัวสลับตามเข็มนาฬิกา',
    result: null,
  };
}

function onAction(
  state: SurviveTheIslandState,
  playerId: string,
  action: SurviveTheIslandAction,
): SurviveTheIslandState {
  const next = structuredClone(state);
  if (next.phase === 'game_over') reject('เกมจบแล้ว');
  if (next.activePlayerId !== playerId) reject('ยังไม่ถึงตาคุณ');

  if (action.type === 'place-adventurer') {
    if (next.phase !== 'setup_adventurers') reject('ยังไม่ใช่ช่วงวาง Adventurer');
    const adventurer = next.adventurers[action.adventurerId];
    const tile = next.tiles[action.tileId];
    if (!adventurer || adventurer.playerId !== playerId || adventurer.tileId != null)
      reject('เลือก Adventurer ไม่ถูกต้อง');
    if (!tile || tile.state !== 'island' || tile.adventurerIds.length > 0)
      reject('ต้องวางบน Island tile ที่ว่าง');
    adventurer.tileId = tile.id;
    tile.adventurerIds.push(adventurer.id);
    next.setupRemaining -= 1;
    if (next.setupRemaining === 0) {
      next.phase = 'setup_rafts';
      next.lastEvent = 'วาง Raft คนละ 2 ลำบน Water space ที่ว่าง';
    } else {
      advance(next);
      next.phase = 'setup_adventurers';
      next.movesRemaining = 0;
      next.lastEvent = 'วาง Adventurer คนต่อไป';
    }
    return next;
  }

  if (action.type === 'place-raft') {
    if (next.phase !== 'setup_rafts') reject('ยังไม่ใช่ช่วงวาง Raft');
    const raft = next.rafts[action.raftId];
    if (!raft || raft.playerId !== playerId || raft.waterSpaceId != null)
      reject('เลือก Raft ไม่ถูกต้อง');
    if (!isSurviveTheIslandWaterSpace(action.waterSpaceId)) reject('Water space ไม่ถูกต้อง');
    if (Object.values(next.rafts).some((item) => item.waterSpaceId === action.waterSpaceId))
      reject('Water space นี้มี Raft แล้ว');
    raft.waterSpaceId = action.waterSpaceId;
    next.setupRaftsRemaining -= 1;
    if (next.setupRaftsRemaining === 0) {
      next.phase = 'action';
      next.movesRemaining = 3;
      next.lastEvent = 'เริ่มเกม — ทำได้สูงสุด 3 movement แล้วเลือก tile ที่จะจม';
    } else {
      advance(next);
      next.phase = 'setup_rafts';
      next.movesRemaining = 0;
      next.lastEvent = 'วาง Raft คนต่อไป';
    }
    return next;
  }

  if (action.type === 'move-adventurer') {
    if (next.phase !== 'action' || next.movesRemaining <= 0) reject('ไม่มี movement เหลือ');
    const adventurer = next.adventurers[action.adventurerId];
    if (!adventurer || adventurer.playerId !== playerId) reject('เลือก Adventurer ไม่ถูกต้อง');
    const originTileId = adventurer.tileId;
    if (action.waterSpaceId != null) {
      const islandOrigin = originTileId ?? reject('Adventurer ที่อยู่บนน้ำต้องว่ายกลับขึ้น Island tile');
      if (!isSurviveTheIslandWaterSpace(action.waterSpaceId)) reject('Water space ไม่ถูกต้อง');
      if (adventurer.swamThisTurn) reject('Adventurer ตัวนี้ว่ายน้ำได้เพียงครั้งเดียวในเทิร์นนี้');
      if (!surviveTheIslandWaterNeighboursForTile(islandOrigin).includes(action.waterSpaceId))
        reject('ต้องว่ายไป Water space ที่ติดกับ Island tile');
      next.tiles[islandOrigin]!.adventurerIds = next.tiles[islandOrigin]!.adventurerIds.filter(
        (id) => id !== adventurer.id,
      );
      adventurer.tileId = null;
      adventurer.waterSpaceId = action.waterSpaceId;
      adventurer.swamThisTurn = true;
      next.movesRemaining -= 1;
      next.lastEvent = `${next.players[playerId]!.name} ว่ายน้ำด้วย Adventurer`;
      return next;
    }
    const destination =
      (action.tileId == null ? undefined : next.tiles[action.tileId]) ??
      reject('ต้องเลือก Island tile ปลายทาง');
    if (destination.state !== 'island') reject('ต้องเดินไป Island tile ที่ยังอยู่');
    if (originTileId != null) {
      if (!surviveTheIslandAdjacentIslandTiles(originTileId).includes(destination.id))
        reject('ต้องเดินไป Island tile ที่ติดกัน');
      next.tiles[originTileId]!.adventurerIds = next.tiles[originTileId]!.adventurerIds.filter(
        (id) => id !== adventurer.id,
      );
    } else {
      const originWaterSpace = adventurer.waterSpaceId ?? reject('เลือก Adventurer ไม่ถูกต้อง');
      if (!surviveTheIslandWaterNeighboursForTile(destination.id).includes(originWaterSpace))
        reject('ต้องว่ายจาก Water space ที่ติดกับ Island tile');
      if (adventurer.swamThisTurn) reject('Adventurer ตัวนี้ว่ายน้ำได้เพียงครั้งเดียวในเทิร์นนี้');
      adventurer.swamThisTurn = true;
    }
    destination.adventurerIds.push(adventurer.id);
    adventurer.tileId = destination.id;
    adventurer.waterSpaceId = null;
    next.movesRemaining -= 1;
    next.lastEvent = `${next.players[playerId]!.name} ขยับ Adventurer`;
    return next;
  }

  if (action.type === 'move-raft') {
    if (next.phase !== 'action' || next.movesRemaining <= 0) reject('ไม่มี movement เหลือ');
    const raft = next.rafts[action.raftId];
    if (!raft || raft.waterSpaceId == null) reject('เลือก Raft ไม่ถูกต้อง');
    const raftOrigin = raft.waterSpaceId ?? reject('เลือก Raft ไม่ถูกต้อง');
    if (!isSurviveTheIslandWaterSpace(action.waterSpaceId)) reject('Water space ไม่ถูกต้อง');
    if (!surviveTheIslandAdjacentWaterSpaces(raftOrigin).includes(action.waterSpaceId))
      reject('Raft ต้องขยับไป Water space ที่ติดกัน');
    if (Object.values(next.rafts).some((item) => item.id !== raft.id && item.waterSpaceId === action.waterSpaceId))
      reject('Water space นี้มี Raft แล้ว');
    if (!playerControlsRaft(next, raft, playerId)) reject('คุณควบคุม Raft ลำนี้ไม่ได้');
    raft.waterSpaceId = action.waterSpaceId;
    next.movesRemaining -= 1;
    next.lastEvent = `${next.players[playerId]!.name} ขยับ Raft`;
    return next;
  }

  if (action.type === 'finish-action') {
    if (next.phase !== 'action') reject('ยังไม่ใช่ Action phase');
    next.phase = 'rising_waters';
    next.lastEvent = 'Rising Waters — เลือก tile ชนิดที่ต่ำที่สุดเพื่อจม';
    return next;
  }

  if (action.type === 'sink-tile') {
    if (next.phase !== 'rising_waters' || !legalSinkTileIds(next).includes(action.tileId))
      reject('เลือก tile ที่จมไม่ได้');
    const tile = next.tiles[action.tileId]!;
    const revealedWaterSpace = surviveTheIslandWaterNeighboursForTile(tile.id)[0];
    for (const adventurerId of tile.adventurerIds) {
      const adventurer = next.adventurers[adventurerId]!;
      if (revealedWaterSpace) {
        adventurer.tileId = null;
        adventurer.waterSpaceId = revealedWaterSpace;
        adventurer.swamThisTurn = true;
      } else {
        adventurer.eliminated = true;
      }
    }
    tile.adventurerIds = [];
    if (tile.back.kind === 'ability') {
      next.players[playerId]!.abilities.push(tile.back.ability);
      tile.state = 'sunk';
      next.lastEvent = `ได้ Ability: ${tile.back.ability}`;
    } else if (tile.back.effect === 'volcano') {
      tile.state = 'volcano';
      next.volcanoesRevealed += 1;
      next.lastEvent = `Volcano ปะทุ (${next.volcanoesRevealed}/3)`;
    } else {
      tile.state = 'sunk';
      next.lastEvent = `Effect: ${tile.back.effect}`;
    }
    if (next.volcanoesRevealed >= 3) finish(next, 'ภูเขาไฟลูกที่ 3 ปะทุ');
    else if (
      Object.values(next.adventurers).every(
        (adventurer) => adventurer.eliminated || adventurer.rescued,
      )
    )
      finish(next, 'ไม่มี Adventurer เหลือให้ช่วย');
    else advance(next);
    return next;
  }
  return reject('action ไม่รู้จัก');
}

function getPlayerView(state: SurviveTheIslandState, playerId: string): SurviveTheIslandPlayerView {
  return {
    phase: state.phase,
    playerOrder: state.playerOrder,
    activePlayerId: state.activePlayerId,
    canAct: state.activePlayerId === playerId && state.phase !== 'game_over',
    players: Object.values(state.players).map(({ abilities, ...player }) => ({
      ...player,
      abilityCount: abilities.length,
    })),
    tiles: state.tiles.map((tile) => ({
      ...tile,
      back: tile.state === 'island' ? null : tile.back,
    })),
    adventurers: Object.values(state.adventurers).map(
      ({ treasure: _treasure, ...adventurer }) => adventurer,
    ),
    rafts: Object.values(state.rafts),
    myAbilities: [...(state.players[playerId]?.abilities ?? [])],
    movesRemaining: state.movesRemaining,
    volcanoesRevealed: state.volcanoesRevealed,
    lastEvent: state.lastEvent,
    legalSinkTileIds:
      state.activePlayerId === playerId && state.phase === 'rising_waters'
        ? legalSinkTileIds(state)
        : [],
    result: state.result,
  };
}

export const surviveTheIsland: GameDefinition<SurviveTheIslandState, SurviveTheIslandAction> = {
  id: 'survive-the-island',
  name: 'Survive the Island',
  description: 'พา Adventurer หนีเกาะที่กำลังจม',
  minPlayers: 2,
  maxPlayers: 5,
  thumbnail: GAME_THUMBNAIL_BY_ID['survive-the-island'] ?? '',
  setup,
  onAction,
  getPlayerView,
  isGameOver: (state): GameResult | null => state.result,
};
