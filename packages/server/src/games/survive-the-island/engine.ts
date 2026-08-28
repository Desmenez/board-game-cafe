import {
  GAME_THUMBNAIL_BY_ID,
  SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES,
  SURVIVE_THE_ISLAND_WATER_CELLS,
  SURVIVE_THE_ISLAND_COLORS,
  createSurviveTheIslandDeck,
  surviveTheIslandAdjacentIslandTiles,
  surviveTheIslandAdjacentWaterSpaces,
  surviveTheIslandWaterNeighboursForTile,
  surviveTheIslandWaterSpaceForTile,
  type SurviveTheIslandCreature,
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

function availableWaterSpaces(state: SurviveTheIslandState): string[] {
  return [
    ...SURVIVE_THE_ISLAND_WATER_CELLS.map((cell) => cell.id),
    ...state.tiles
      .filter((tile) => tile.state === 'sunk')
      .map((tile) => surviveTheIslandWaterSpaceForTile(tile.id)),
  ];
}

function isAvailableWaterSpace(state: SurviveTheIslandState, waterSpaceId: string): boolean {
  return availableWaterSpaces(state).includes(waterSpaceId);
}

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

function eliminateAdventurersAt(state: SurviveTheIslandState, waterSpaceIds: readonly string[]): void {
  Object.values(state.adventurers).forEach((adventurer) => {
    if (adventurer.waterSpaceId && waterSpaceIds.includes(adventurer.waterSpaceId)) {
      adventurer.waterSpaceId = null;
      adventurer.eliminated = true;
    }
  });
}

function spawnCreature(
  state: SurviveTheIslandState,
  kind: SurviveTheIslandCreature['kind'],
  waterSpaceId: string,
): void {
  const limit = kind === 'shark' ? 3 : 2;
  const existing = Object.values(state.creatures).filter((creature) => creature.kind === kind);
  if (existing.length >= limit) {
    existing[0]!.waterSpaceId = waterSpaceId;
    return;
  }
  const id = `${kind}:${existing.length}`;
  state.creatures[id] = { id, kind, waterSpaceId };
}

function applyEffect(
  state: SurviveTheIslandState,
  effect: 'shark' | 'kaiju' | 'raft' | 'whirlpool',
  waterSpaceId: string,
): string {
  if (effect === 'shark' || effect === 'kaiju') {
    spawnCreature(state, effect, waterSpaceId);
    const creature = Object.values(state.creatures).find(
      (item) => item.kind === effect && item.waterSpaceId === waterSpaceId,
    );
    if (creature) resolveCreatureArrival(state, creature);
    return `${effect === 'shark' ? 'Shark' : 'Kaiju'} เข้าสู่ Water space`;
  }
  if (effect === 'raft') {
    const supply = Object.values(state.rafts).find((raft) => raft.waterSpaceId == null);
    const emptyOnBoard = Object.values(state.rafts).find(
      (raft) =>
        raft.waterSpaceId != null &&
        !Object.values(state.adventurers).some((adventurer) => adventurer.waterSpaceId === raft.waterSpaceId),
    );
    const raft = supply ?? emptyOnBoard;
    if (!raft) return 'Raft effect แต่ไม่มี Raft ว่าง';
    raft.waterSpaceId = waterSpaceId;
    return 'Raft ลำใหม่เข้าสู่ Water space';
  }
  const affected = [
    waterSpaceId,
    ...surviveTheIslandAdjacentWaterSpaces(waterSpaceId, availableWaterSpaces(state)),
  ];
  eliminateAdventurersAt(state, affected);
  Object.values(state.rafts).forEach((raft) => {
    if (raft.waterSpaceId && affected.includes(raft.waterSpaceId)) raft.waterSpaceId = null;
  });
  Object.values(state.creatures).forEach((creature) => {
    if (affected.includes(creature.waterSpaceId)) delete state.creatures[creature.id];
  });
  return 'Whirlpool กวาดทุกสิ่งใน Water space รอบตัว';
}

function reachableWaterSpaces(state: SurviveTheIslandState, origin: string, range: number): string[] {
  const distances = new Map<string, number>([[origin, 0]]);
  const queue = [origin];
  while (queue.length) {
    const current = queue.shift()!;
    const distance = distances.get(current)!;
    if (distance >= range) continue;
    for (const neighbour of surviveTheIslandAdjacentWaterSpaces(current, availableWaterSpaces(state))) {
      if (!distances.has(neighbour)) {
        distances.set(neighbour, distance + 1);
        queue.push(neighbour);
      }
    }
  }
  return [...distances.keys()].filter((id) => id !== origin);
}

function resolveCreatureArrival(
  state: SurviveTheIslandState,
  creature: SurviveTheIslandCreature,
): void {
  const waterSpaceId = creature.waterSpaceId;
  if (creature.kind === 'sea-serpent') {
    eliminateAdventurersAt(state, [waterSpaceId]);
    Object.values(state.rafts).forEach((raft) => {
      if (raft.waterSpaceId === waterSpaceId) raft.waterSpaceId = null;
    });
    return;
  }
  if (creature.kind === 'shark') {
    const raftIsPresent = Object.values(state.rafts).some((raft) => raft.waterSpaceId === waterSpaceId);
    if (!raftIsPresent) eliminateAdventurersAt(state, [waterSpaceId]);
    return;
  }
  Object.values(state.rafts).forEach((raft) => {
    if (raft.waterSpaceId === waterSpaceId) raft.waterSpaceId = null;
  });
  const pushTargets = surviveTheIslandAdjacentWaterSpaces(waterSpaceId, availableWaterSpaces(state));
  let nextTarget = 0;
  Object.values(state.adventurers).forEach((adventurer) => {
    if (adventurer.waterSpaceId !== waterSpaceId) return;
    const target = pushTargets[nextTarget++];
    if (target) adventurer.waterSpaceId = target;
    else {
      adventurer.waterSpaceId = null;
      adventurer.eliminated = true;
    }
  });
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

function consumeAbility(state: SurviveTheIslandState, playerId: string, ability: string): void {
  const abilities = state.players[playerId]!.abilities;
  const index = abilities.indexOf(ability as (typeof abilities)[number]);
  if (index < 0) reject('คุณไม่มี Ability นี้');
  abilities.splice(index, 1);
}

function setup(players: Player[]): SurviveTheIslandState {
  if (players.length < 2 || players.length > 5)
    throw new Error('Survive the Island ต้องมีผู้เล่น 2–5 คน');
  const playerOrder = players.map((player) => player.id);
  const seats: Record<string, SurviveTheIslandPlayer> = {};
  const adventurers: Record<string, SurviveTheIslandAdventurer> = {};
  const rafts: Record<string, SurviveTheIslandRaft> = {};
  const creatures: Record<string, SurviveTheIslandCreature> = {};
  creatures['sea-serpent:0'] = {
    id: 'sea-serpent:0',
    kind: 'sea-serpent',
    waterSpaceId: 'water:3:0',
  };
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
    creatures,
    setupRemaining: players.length === 2 ? 40 : players.length * 10,
    setupRaftsRemaining: players.length * 2,
    movesRemaining: 0,
    volcanoesRevealed: 0,
    creatureToMove: null,
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
    if (!isAvailableWaterSpace(next, action.waterSpaceId)) reject('Water space ไม่ถูกต้อง');
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
      if (!isAvailableWaterSpace(next, action.waterSpaceId)) reject('Water space ไม่ถูกต้อง');
      if (adventurer.swamThisTurn) reject('Adventurer ตัวนี้ว่ายน้ำได้เพียงครั้งเดียวในเทิร์นนี้');
      if (!surviveTheIslandWaterNeighboursForTile(islandOrigin, availableWaterSpaces(next)).includes(action.waterSpaceId))
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
      if (!surviveTheIslandWaterNeighboursForTile(destination.id, availableWaterSpaces(next)).includes(originWaterSpace))
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
    if (!isAvailableWaterSpace(next, action.waterSpaceId)) reject('Water space ไม่ถูกต้อง');
    if (!surviveTheIslandAdjacentWaterSpaces(raftOrigin, availableWaterSpaces(next)).includes(action.waterSpaceId))
      reject('Raft ต้องขยับไป Water space ที่ติดกัน');
    if (Object.values(next.rafts).some((item) => item.id !== raft.id && item.waterSpaceId === action.waterSpaceId))
      reject('Water space นี้มี Raft แล้ว');
    if (!playerControlsRaft(next, raft, playerId)) reject('คุณควบคุม Raft ลำนี้ไม่ได้');
    raft.waterSpaceId = action.waterSpaceId;
    next.movesRemaining -= 1;
    next.lastEvent = `${next.players[playerId]!.name} ขยับ Raft`;
    return next;
  }

  if (action.type === 'rescue-adventurer') {
    if (next.phase !== 'action' || next.movesRemaining <= 0) reject('ไม่มี movement เหลือ');
    const adventurer = next.adventurers[action.adventurerId];
    if (!adventurer || adventurer.playerId !== playerId || adventurer.waterSpaceId == null)
      reject('เลือก Adventurer ไม่ถูกต้อง');
    const rescueWaterSpace = adventurer.waterSpaceId ?? reject('เลือก Adventurer ไม่ถูกต้อง');
    if (!(SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES as readonly string[]).includes(rescueWaterSpace))
      reject('ต้องอยู่ที่ Rescue Island');
    if (!Object.values(next.rafts).some((raft) => raft.waterSpaceId === rescueWaterSpace))
      reject('Adventurer ต้องอยู่บน Raft เพื่อขึ้น Rescue Island');
    adventurer.waterSpaceId = null;
    adventurer.rescued = true;
    next.players[playerId]!.rescuedTreasure += adventurer.treasure;
    next.movesRemaining -= 1;
    next.lastEvent = `${next.players[playerId]!.name} ช่วย Adventurer ขึ้น Rescue Island`;
    if (
      Object.values(next.adventurers).every(
        (item) => item.eliminated || item.rescued,
      )
    )
      finish(next, 'ไม่มี Adventurer เหลือให้ช่วย');
    return next;
  }

  if (action.type === 'use-ability') {
    if (next.phase !== 'action') reject('Ability ใช้ได้เฉพาะ Action phase');
    const ownedAbilities = next.players[playerId]!.abilities;
    if (!ownedAbilities.includes(action.ability)) reject('คุณไม่มี Ability นี้');
    if (action.ability === 'paddle') {
      const raft = next.rafts[action.raftId];
      if (!raft || raft.waterSpaceId == null || !isAvailableWaterSpace(next, action.waterSpaceId))
        reject('เลือก Raft หรือ Water space ไม่ถูกต้อง');
      const raftOrigin = raft.waterSpaceId ?? reject('เลือก Raft หรือ Water space ไม่ถูกต้อง');
      if (!playerControlsRaft(next, raft, playerId)) reject('คุณควบคุม Raft ลำนี้ไม่ได้');
      if (!reachableWaterSpaces(next, raftOrigin, 2).includes(action.waterSpaceId))
        reject('Paddle ขยับ Raft ได้ 1 หรือ 2 Water spaces');
      if (Object.values(next.rafts).some((item) => item.id !== raft.id && item.waterSpaceId === action.waterSpaceId))
        reject('Water space นี้มี Raft แล้ว');
      raft.waterSpaceId = action.waterSpaceId;
      consumeAbility(next, playerId, action.ability);
      next.lastEvent = 'ใช้ Paddle';
      return next;
    }
    if (action.ability === 'dolphin') {
      const adventurer = next.adventurers[action.adventurerId];
      if (!adventurer || adventurer.playerId !== playerId || adventurer.waterSpaceId == null)
        reject('Dolphin ใช้กับ Adventurer ที่กำลังว่ายน้ำเท่านั้น');
      const origin = adventurer.waterSpaceId ?? reject('Dolphin ใช้กับ Adventurer ที่กำลังว่ายน้ำเท่านั้น');
      const reachable = reachableWaterSpaces(next, origin, 2);
      if (action.waterSpaceId) {
        if (!reachable.includes(action.waterSpaceId)) reject('Dolphin ไปถึง Water space นี้ไม่ได้');
        adventurer.waterSpaceId = action.waterSpaceId;
      } else {
        const destination =
          (action.tileId == null ? undefined : next.tiles[action.tileId]) ??
          reject('เลือกปลายทาง Dolphin ไม่ถูกต้อง');
        if (destination.state !== 'island') reject('เลือกปลายทาง Dolphin ไม่ถูกต้อง');
        if (!surviveTheIslandWaterNeighboursForTile(destination.id, availableWaterSpaces(next)).some((water) => reachable.includes(water)))
          reject('Dolphin ไปถึง Island tile นี้ไม่ได้');
        adventurer.waterSpaceId = null;
        adventurer.tileId = destination.id;
        destination.adventurerIds.push(adventurer.id);
      }
      consumeAbility(next, playerId, action.ability);
      next.lastEvent = 'ใช้ Dolphin';
      return next;
    }
    if (action.ability === 'dive') {
      const creature = next.creatures[action.creatureId];
      if (!creature || !isAvailableWaterSpace(next, action.waterSpaceId)) reject('เลือก Creature หรือ Water space ไม่ถูกต้อง');
      if (Object.values(next.creatures).some((item) => item.id !== creature.id && item.waterSpaceId === action.waterSpaceId))
        reject('Dive ต้องเลือก Water space ที่ว่าง');
      creature.waterSpaceId = action.waterSpaceId;
      consumeAbility(next, playerId, action.ability);
      next.lastEvent = 'ใช้ Dive';
      return next;
    }
    if (action.ability === 'repellent') {
      const creature = next.creatures[action.creatureId];
      if (!creature || creature.kind === 'sea-serpent') reject('Repellent ใช้ได้กับ Shark หรือ Kaiju เท่านั้น');
      if (!Object.values(next.adventurers).some((adventurer) => adventurer.playerId === playerId && adventurer.waterSpaceId === creature.waterSpaceId))
        reject('ต้องมี Adventurer ของคุณอยู่กับ Creature');
      delete next.creatures[creature.id];
      consumeAbility(next, playerId, action.ability);
      next.lastEvent = 'ใช้ Repellent ขับ Creature ออกไป';
      return next;
    }
    const candidates = Object.values(next.creatures);
    const creature = candidates[Math.floor(Math.random() * candidates.length)];
    if (!creature) reject('ไม่มี Creature บนกระดาน');
    const destinations = reachableWaterSpaces(
      next,
      creature.waterSpaceId,
      creature.kind === 'sea-serpent' ? 1 : 2,
    );
    if (!destinations.length) reject('Creature ไม่มีทางขยับ');
    creature.waterSpaceId = destinations[Math.floor(Math.random() * destinations.length)]!;
    resolveCreatureArrival(next, creature);
    consumeAbility(next, playerId, action.ability);
    next.lastEvent = 'ใช้ Creature die';
    return next;
  }

  if (action.type === 'roll-creature') {
    if (next.phase !== 'creatures' || next.creatureToMove) reject('ยังทอย Creature ไม่ได้');
    const kinds = [...new Set(Object.values(next.creatures).map((creature) => creature.kind))];
    if (!kinds.length) {
      advance(next);
      return next;
    }
    next.creatureToMove = kinds[Math.floor(Math.random() * kinds.length)]!;
    next.lastEvent = `Creature die: ${next.creatureToMove}`;
    return next;
  }

  if (action.type === 'move-creature') {
    if (next.phase !== 'creatures' || !next.creatureToMove) reject('ต้องทอย Creature die ก่อน');
    const creature = next.creatures[action.creatureId];
    if (!creature || creature.kind !== next.creatureToMove) reject('เลือก Creature ไม่ถูกต้อง');
    if (!isAvailableWaterSpace(next, action.waterSpaceId)) reject('Water space ไม่ถูกต้อง');
    const range = creature.kind === 'sea-serpent' ? 1 : 2;
    if (!reachableWaterSpaces(next, creature.waterSpaceId, range).includes(action.waterSpaceId))
      reject('Creature ไปถึง Water space นี้ไม่ได้');
    creature.waterSpaceId = action.waterSpaceId;
    resolveCreatureArrival(next, creature);
    next.creatureToMove = null;
    next.lastEvent = `${creature.kind} เคลื่อนที่`;
    if (Object.values(next.adventurers).every((item) => item.eliminated || item.rescued))
      finish(next, 'ไม่มี Adventurer เหลือให้ช่วย');
    else advance(next);
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
    const revealedWaterSpace = surviveTheIslandWaterSpaceForTile(tile.id);
    tile.state = tile.back.kind === 'effect' && tile.back.effect === 'volcano' ? 'volcano' : 'sunk';
    for (const adventurerId of tile.adventurerIds) {
      const adventurer = next.adventurers[adventurerId]!;
      adventurer.tileId = null;
      adventurer.waterSpaceId = revealedWaterSpace;
      adventurer.swamThisTurn = true;
    }
    tile.adventurerIds = [];
    if (tile.back.kind === 'ability') {
      next.players[playerId]!.abilities.push(tile.back.ability);
      next.lastEvent = `ได้ Ability: ${tile.back.ability}`;
    } else if (tile.back.effect === 'volcano') {
      next.volcanoesRevealed += 1;
      eliminateAdventurersAt(next, [revealedWaterSpace]);
      Object.values(next.creatures).forEach((creature) => {
        if (creature.waterSpaceId === revealedWaterSpace) delete next.creatures[creature.id];
      });
      next.lastEvent = `Volcano ปะทุ (${next.volcanoesRevealed}/3)`;
    } else {
      next.lastEvent = applyEffect(next, tile.back.effect, revealedWaterSpace);
    }
    if (next.volcanoesRevealed >= 3) finish(next, 'ภูเขาไฟลูกที่ 3 ปะทุ');
    else if (
      Object.values(next.adventurers).every(
        (adventurer) => adventurer.eliminated || adventurer.rescued,
      )
    )
      finish(next, 'ไม่มี Adventurer เหลือให้ช่วย');
    else {
      next.phase = 'creatures';
      next.movesRemaining = 0;
      next.creatureToMove = null;
      next.lastEvent = `${next.lastEvent} — Creature phase: ทอย Creature die`;
    }
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
    creatures: Object.values(state.creatures),
    myAdventurerTreasures: Object.fromEntries(
      (state.players[playerId]?.adventurerIds ?? []).map((id) => [id, state.adventurers[id]!.treasure]),
    ),
    myAbilities: [...(state.players[playerId]?.abilities ?? [])],
    movesRemaining: state.movesRemaining,
    volcanoesRevealed: state.volcanoesRevealed,
    creatureToMove: state.creatureToMove,
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
