import {
  GAME_THUMBNAIL_BY_ID,
  SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES,
  SURVIVE_THE_ISLAND_SEA_SERPENT_STARTING_WATER_SPACES,
  SURVIVE_THE_ISLAND_WATER_CELLS,
  SURVIVE_THE_ISLAND_COLORS,
  createSurviveTheIslandDeck,
  surviveTheIslandAdjacentIslandTiles,
  surviveTheIslandAdjacentWaterSpaces,
  surviveTheIslandTileIdForWaterSpace,
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

const CREATURE_DIE_KINDS: readonly SurviveTheIslandCreature['kind'][] = ['sea-serpent', 'shark', 'kaiju'];

type RepellentResume = 'advance' | 'none';

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

function kaijuAt(state: SurviveTheIslandState, spaceId: string, exceptId?: string): SurviveTheIslandCreature | undefined {
  return Object.values(state.creatures).find(
    (creature) => creature.id !== exceptId && creature.kind === 'kaiju' && creature.waterSpaceId === spaceId,
  );
}

function isAvailableKaijuSpace(state: SurviveTheIslandState, spaceId: string): boolean {
  if (isAvailableWaterSpace(state, spaceId)) return true;
  const tileId = surviveTheIslandTileIdForWaterSpace(spaceId);
  return tileId != null && state.tiles[tileId]?.state === 'island';
}

function adjacentKaijuSpaces(state: SurviveTheIslandState, spaceId: string): string[] {
  const landTileId = surviveTheIslandTileIdForWaterSpace(spaceId);
  if (landTileId != null && state.tiles[landTileId]?.state === 'island') {
    return [
      ...surviveTheIslandAdjacentIslandTiles(landTileId)
        .filter((tileId) => state.tiles[tileId]?.state === 'island')
        .map((tileId) => surviveTheIslandWaterSpaceForTile(tileId)),
      ...surviveTheIslandWaterNeighboursForTile(landTileId, availableWaterSpaces(state)),
    ];
  }
  return [
    ...surviveTheIslandAdjacentWaterSpaces(spaceId, availableWaterSpaces(state)),
    ...state.tiles
      .filter(
        (tile) =>
          tile.state === 'island' &&
          surviveTheIslandWaterNeighboursForTile(tile.id, availableWaterSpaces(state)).includes(spaceId),
      )
      .map((tile) => surviveTheIslandWaterSpaceForTile(tile.id)),
  ];
}

function reachableKaijuSpaces(state: SurviveTheIslandState, origin: string, range = 2): string[] {
  const distances = new Map<string, number>([[origin, 0]]);
  const queue = [origin];
  while (queue.length) {
    const current = queue.shift()!;
    const distance = distances.get(current)!;
    if (distance >= range) continue;
    for (const neighbour of adjacentKaijuSpaces(state, current)) {
      if (!distances.has(neighbour) && isAvailableKaijuSpace(state, neighbour)) {
        distances.set(neighbour, distance + 1);
        queue.push(neighbour);
      }
    }
  }
  return [...distances.keys()].filter((id) => id !== origin);
}

function isWaterAdjacentToIsland(state: SurviveTheIslandState, waterSpaceId: string): boolean {
  const waterSpaces = availableWaterSpaces(state);
  return state.tiles.some(
    (tile) =>
      tile.state === 'island' &&
      surviveTheIslandWaterNeighboursForTile(tile.id, waterSpaces).includes(waterSpaceId),
  );
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

function beginRisingWaters(state: SurviveTheIslandState, lastEvent?: string): void {
  state.phase = 'rising_waters';
  state.risingWatersSunk = 0;
  state.risingWatersTilesToSink = remainingAdventurers(state, state.activePlayerId).length === 0 ? 2 : 1;
  state.movesRemaining = 0;
  state.lastEvent = lastEvent ?? 'Rising Waters — เลือก tile ชนิดที่ต่ำที่สุดเพื่อจม';
}

function consumeMovement(state: SurviveTheIslandState, lastEvent: string): void {
  state.movesRemaining -= 1;

  if (state.movesRemaining === 0) {
    beginRisingWaters(state, `${lastEvent} — ใช้ movement ครบ 3 ครั้ง: Rising Waters`);
    return;
  }

  state.lastEvent = lastEvent;
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
  if (state.risingWatersSunk >= state.risingWatersTilesToSink) return [];
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
    (adventurer) => !adventurer.eliminated && !adventurer.rescued && adventurer.aboardRaftId === raft.id,
  );
  const own = aboard.filter((adventurer) => adventurer.playerId === playerId).length;
  return Object.keys(state.players)
    .filter((id) => id !== playerId)
    .every((opponentId) => own >= aboard.filter((adventurer) => adventurer.playerId === opponentId).length);
}

function waterSpaceCanAcceptAdventurer(state: SurviveTheIslandState, waterSpaceId: string): boolean {
  const raft = Object.values(state.rafts).find((item) => item.waterSpaceId === waterSpaceId);
  if (!raft) return true;
  return (
    Object.values(state.adventurers).filter(
      (adventurer) =>
        !adventurer.eliminated && !adventurer.rescued && adventurer.aboardRaftId === raft.id,
    ).length < 3
  );
}

function raftAtWaterSpace(state: SurviveTheIslandState, waterSpaceId: string): SurviveTheIslandRaft | undefined {
  return Object.values(state.rafts).find((raft) => raft.waterSpaceId === waterSpaceId);
}

/**
 * Rooms are in-memory and can outlive a hot reload. Before `aboardRaftId` was
 * introduced, every Adventurer sharing a raft's Water space was implicitly on
 * that raft, so hydrate that one legacy shape on its next action.
 */
function hydrateLegacyRaftPassengers(state: SurviveTheIslandState): void {
  Object.values(state.adventurers).forEach((adventurer) => {
    if ('aboardRaftId' in adventurer) return;
    adventurer.aboardRaftId = adventurer.waterSpaceId
      ? (raftAtWaterSpace(state, adventurer.waterSpaceId)?.id ?? null)
      : null;
  });
}

function isRescueWaterSpace(waterSpaceId: string | null): boolean {
  return (
    waterSpaceId != null &&
    (SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES as readonly string[]).includes(waterSpaceId)
  );
}

function finishIfNoAdventurersRemain(state: SurviveTheIslandState): void {
  if (Object.values(state.adventurers).every((adventurer) => adventurer.eliminated || adventurer.rescued))
    finish(state, 'ไม่มี Adventurer เหลือให้ช่วย');
}

function moveRaftWithPassengers(
  state: SurviveTheIslandState,
  raft: SurviveTheIslandRaft,
  waterSpaceId: SurviveTheIslandWaterSpace,
): void {
  raft.waterSpaceId = waterSpaceId;
  Object.values(state.adventurers).forEach((adventurer) => {
    if (adventurer.aboardRaftId === raft.id) adventurer.waterSpaceId = waterSpaceId;
  });
  resolveCreatureInteractionsAt(state, waterSpaceId);
}

function eliminateAdventurersAt(state: SurviveTheIslandState, waterSpaceIds: readonly string[]): void {
  Object.values(state.adventurers).forEach((adventurer) => {
    if (adventurer.waterSpaceId && waterSpaceIds.includes(adventurer.waterSpaceId)) {
      adventurer.waterSpaceId = null;
      adventurer.aboardRaftId = null;
      adventurer.eliminated = true;
    }
  });
}

function spawnCreature(
  state: SurviveTheIslandState,
  kind: SurviveTheIslandCreature['kind'],
  waterSpaceId: string,
): void {
  const limit = kind === 'shark' ? 6 : 2;
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
        !Object.values(state.adventurers).some((adventurer) => adventurer.aboardRaftId === raft.id),
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

function creatureDestinations(state: SurviveTheIslandState, creature: SurviveTheIslandCreature): string[] {
  return creature.kind === 'kaiju'
    ? reachableKaijuSpaces(state, creature.waterSpaceId, 2)
    : reachableWaterSpaces(state, creature.waterSpaceId, creature.kind === 'sea-serpent' ? 1 : 2);
}

function anyCreatureOfKindCanMove(
  state: SurviveTheIslandState,
  kind: SurviveTheIslandCreature['kind'],
): boolean {
  return Object.values(state.creatures).some(
    (creature) => creature.kind === kind && creatureDestinations(state, creature).length > 0,
  );
}

function applyCreatureMove(
  state: SurviveTheIslandState,
  creature: SurviveTheIslandCreature,
  waterSpaceId: string,
  resume: RepellentResume = 'none',
): void {
  if (!creatureDestinations(state, creature).includes(waterSpaceId)) reject('Creature ไปถึง space นี้ไม่ได้');
  const displacedKaiju = creature.kind === 'kaiju' ? kaijuAt(state, waterSpaceId, creature.id) : undefined;
  const origin = creature.waterSpaceId;
  creature.waterSpaceId = waterSpaceId;
  if (displacedKaiju) displacedKaiju.waterSpaceId = origin;
  resolveCreatureArrival(state, creature, resume);
}

function moveAdventurerToKaijuPushTarget(
  state: SurviveTheIslandState,
  adventurer: SurviveTheIslandAdventurer,
  origin: string,
  offset: number,
): void {
  const target = adjacentKaijuSpaces(state, origin)
    .filter((spaceId) => !kaijuAt(state, spaceId))
    .filter((spaceId) => {
      const tileId = surviveTheIslandTileIdForWaterSpace(spaceId);
      return tileId != null || waterSpaceCanAcceptAdventurer(state, spaceId);
    })[offset];
  const originTileId = adventurer.tileId;
  if (originTileId != null)
    state.tiles[originTileId]!.adventurerIds = state.tiles[originTileId]!.adventurerIds.filter((id) => id !== adventurer.id);
  adventurer.tileId = null;
  adventurer.aboardRaftId = null;
  if (!target) {
    adventurer.waterSpaceId = null;
    adventurer.eliminated = true;
    return;
  }
  const targetTileId = surviveTheIslandTileIdForWaterSpace(target);
  if (targetTileId != null && state.tiles[targetTileId]?.state === 'island') {
    adventurer.waterSpaceId = null;
    adventurer.tileId = targetTileId;
    state.tiles[targetTileId]!.adventurerIds.push(adventurer.id);
    return;
  }
  adventurer.waterSpaceId = target;
  adventurer.aboardRaftId = raftAtWaterSpace(state, target)?.id ?? null;
  resolveCreatureInteractionsAt(state, target);
}

function displaceCreatureFromKaiju(
  state: SurviveTheIslandState,
  creature: SurviveTheIslandCreature,
  resume: RepellentResume = 'none',
): void {
  const destinations =
    creature.kind === 'sea-serpent'
      ? reachableWaterSpaces(state, creature.waterSpaceId, 1)
      : creature.kind === 'shark'
        ? reachableWaterSpaces(state, creature.waterSpaceId, 2)
        : reachableKaijuSpaces(state, creature.waterSpaceId, 2);
  const destination = destinations.find((spaceId) => !kaijuAt(state, spaceId, creature.id));
  if (destination) {
    creature.waterSpaceId = destination;
    resolveCreatureArrival(state, creature, resume);
  }
}

function adventurerSharesCreatureSpace(
  state: SurviveTheIslandState,
  adventurer: SurviveTheIslandAdventurer,
  creature: SurviveTheIslandCreature,
): boolean {
  if (adventurer.eliminated || adventurer.rescued) return false;
  if (adventurer.waterSpaceId === creature.waterSpaceId) return true;
  const tileId = surviveTheIslandTileIdForWaterSpace(creature.waterSpaceId);
  return tileId != null && adventurer.tileId === tileId && state.tiles[tileId]?.state === 'island';
}

function eligibleRepellentPlayerIds(
  state: SurviveTheIslandState,
  creature: SurviveTheIslandCreature,
): string[] {
  if (creature.kind === 'sea-serpent') return [];
  const ids = new Set<string>();
  Object.values(state.adventurers).forEach((adventurer) => {
    if (adventurerSharesCreatureSpace(state, adventurer, creature)) ids.add(adventurer.playerId);
  });
  return [...ids].filter((playerId) => state.players[playerId]!.abilities.includes('repellent'));
}

function offerRepellent(
  state: SurviveTheIslandState,
  creature: SurviveTheIslandCreature,
  resume: RepellentResume,
): boolean {
  if (state.pendingRepellent) return true;
  if (creature.kind === 'sea-serpent') return false;
  const eligiblePlayerIds = eligibleRepellentPlayerIds(state, creature);
  if (!eligiblePlayerIds.length) return false;
  state.pendingRepellent = {
    creatureId: creature.id,
    waterSpaceId: creature.waterSpaceId,
    kind: creature.kind,
    eligiblePlayerIds,
    passedPlayerIds: [],
    resume,
  };
  const names = eligiblePlayerIds.map((id) => state.players[id]!.name).join(', ');
  state.lastEvent = `ไล่สัตว์: ${names} ใช้การ์ดไล่สัตว์ได้`;
  return true;
}

function continueAfterRepellent(state: SurviveTheIslandState, resume: RepellentResume): void {
  if (state.pendingRepellent) return;
  finishIfNoAdventurersRemain(state);
  if (state.phase === 'game_over') return;
  if (resume === 'advance' && state.phase === 'creatures') advance(state);
  else if (state.phase === 'rising_waters') {
    state.lastEvent =
      state.risingWatersSunk < state.risingWatersTilesToSink
        ? `${state.lastEvent} — เลือก tile ระดับต่ำสุดเพิ่ม (${state.risingWatersSunk}/${state.risingWatersTilesToSink})`
        : `${state.lastEvent} — ทอย Creature die`;
  }
}

function applyRepellentUse(state: SurviveTheIslandState, playerId: string, creatureId: string): void {
  const creature = state.creatures[creatureId];
  if (!creature || creature.kind === 'sea-serpent') reject('Repellent ใช้ได้กับ Shark หรือ Kaiju เท่านั้น');
  if (
    !Object.values(state.adventurers).some(
      (adventurer) => adventurer.playerId === playerId && adventurerSharesCreatureSpace(state, adventurer, creature),
    )
  )
    reject('ต้องมี Adventurer ของคุณอยู่กับ Creature');
  delete state.creatures[creature.id];
  consumeAbility(state, playerId, 'repellent');
  state.lastEvent = `${state.players[playerId]!.name} ใช้การ์ดไล่สัตว์`;
}

function resolveCreatureArrival(
  state: SurviveTheIslandState,
  creature: SurviveTheIslandCreature,
  resume: RepellentResume = 'none',
): void {
  if (offerRepellent(state, creature, resume)) return;
  applyCreatureArrivalEffects(state, creature, resume);
}

function applyCreatureArrivalEffects(
  state: SurviveTheIslandState,
  creature: SurviveTheIslandCreature,
  resume: RepellentResume = 'none',
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
    Object.values(state.adventurers)
      .filter((adventurer) => adventurer.waterSpaceId === waterSpaceId && adventurer.aboardRaftId == null)
      .forEach((adventurer) => {
        adventurer.waterSpaceId = null;
        adventurer.eliminated = true;
      });
    return;
  }
  Object.values(state.rafts).forEach((raft) => {
    if (raft.waterSpaceId === waterSpaceId) raft.waterSpaceId = null;
  });
  const landTileId = surviveTheIslandTileIdForWaterSpace(waterSpaceId);
  const affected = Object.values(state.adventurers).filter(
    (adventurer) =>
      adventurer.waterSpaceId === waterSpaceId ||
      (landTileId != null && adventurer.tileId === landTileId),
  );
  let nextTarget = 0;
  affected.forEach((adventurer) => moveAdventurerToKaijuPushTarget(state, adventurer, waterSpaceId, nextTarget++));
  Object.values(state.creatures)
    .filter((other) => other.id !== creature.id && other.waterSpaceId === waterSpaceId)
    .forEach((other) => displaceCreatureFromKaiju(state, other, resume));
}

/** Resolve the same interaction when an element enters a Creature's space. */
function resolveCreatureInteractionsAt(
  state: SurviveTheIslandState,
  waterSpaceId: string,
): void {
  Object.values(state.creatures)
    .filter((creature) => creature.waterSpaceId === waterSpaceId)
    .forEach((creature) => resolveCreatureArrival(state, creature));
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
  SURVIVE_THE_ISLAND_SEA_SERPENT_STARTING_WATER_SPACES.forEach((waterSpaceId, index) => {
    const id = `sea-serpent:${index}`;
    creatures[id] = { id, kind: 'sea-serpent', waterSpaceId };
  });
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
    const adventurersPerColor = adventurerCount / colors.length;
    for (let index = 0; index < adventurerCount; index += 1) {
      const id = `${player.id}:${index}`;
      ids.push(id);
      adventurers[id] = {
        id,
        playerId: player.id,
        // In a 2-player game, each player controls two complete 10-token colors:
        // values 1–5 occur twice within each color.
        color: colors[Math.floor(index / adventurersPerColor)]!,
        treasure: (index % 5) + 1,
        tileId: null,
        waterSpaceId: null,
        aboardRaftId: null,
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
    risingWatersSunk: 0,
    risingWatersTilesToSink: 1,
    volcanoesRevealed: 0,
    creatureToMove: null,
    pendingCreatureDie: null,
    pendingRepellent: null,
    lastReveal: null,
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
  // In-memory rooms can survive a hot reload from before this counter existed.
  if (next.risingWatersTilesToSink == null) next.risingWatersTilesToSink = 1;
  if (next.pendingCreatureDie === undefined) next.pendingCreatureDie = null;
  if (next.pendingRepellent === undefined) next.pendingRepellent = null;
  hydrateLegacyRaftPassengers(next);

  if (next.pendingRepellent) {
    if (action.type === 'pass-repellent') {
      const pending = next.pendingRepellent;
      if (!pending.eligiblePlayerIds.includes(playerId)) reject('คุณใช้การ์ดไล่สัตว์ไม่ได้');
      if (pending.passedPlayerIds.includes(playerId)) reject('คุณเลือกไม่ใช้แล้ว');
      pending.passedPlayerIds = [...pending.passedPlayerIds, playerId];
      next.lastEvent = `${next.players[playerId]!.name} ไม่ใช้การ์ดไล่สัตว์`;
      if (pending.eligiblePlayerIds.every((id) => pending.passedPlayerIds.includes(id))) {
        const resume = pending.resume;
        const creature = next.creatures[pending.creatureId];
        next.pendingRepellent = null;
        if (creature) applyCreatureArrivalEffects(next, creature, resume);
        continueAfterRepellent(next, resume);
      }
      return next;
    }
    if (action.type === 'use-ability' && action.ability === 'repellent') {
      const pending = next.pendingRepellent;
      if (!pending.eligiblePlayerIds.includes(playerId)) reject('คุณใช้การ์ดไล่สัตว์ไม่ได้');
      if (pending.passedPlayerIds.includes(playerId)) reject('คุณเลือกไม่ใช้แล้ว');
      if (action.creatureId !== pending.creatureId) reject('เลือก Creature ไม่ถูกต้อง');
      const resume = pending.resume;
      applyRepellentUse(next, playerId, pending.creatureId);
      next.pendingRepellent = null;
      continueAfterRepellent(next, resume);
      return next;
    }
    reject('รอผู้เล่นใช้หรือไม่ใช้การ์ดไล่สัตว์');
  }

  if (next.activePlayerId !== playerId) reject('ยังไม่ถึงตาคุณ');
  if (next.pendingCreatureDie && action.type !== 'move-creature')
    reject('ต้องขยับ Creature จากลูกเต๋าก่อน');

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

  // DEV TEST SHORTCUT — paired with SurviveTheIslandStatusPanel's DEV section.
  // Delete this block and the matching action type when manual setup is no longer needed for testing.
  if (action.type === 'dev-auto-place-adventurers') {
    if (next.phase !== 'setup_adventurers') reject('ใช้ปุ่มสุ่มวางได้เฉพาะช่วงวาง Adventurer');
    const unplaced = Object.values(next.adventurers).filter(
      (adventurer) => adventurer.tileId == null && !adventurer.eliminated && !adventurer.rescued,
    );
    const slots = next.tiles.flatMap((tile) =>
      Array.from({ length: Math.max(0, 2 - tile.adventurerIds.length) }, () => tile),
    );
    for (let index = slots.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [slots[index], slots[swapIndex]] = [slots[swapIndex]!, slots[index]!];
    }
    if (slots.length < unplaced.length) reject('Island tile ไม่พอสำหรับวาง Adventurer ที่เหลือ');
    for (const [index, adventurer] of unplaced.entries()) {
      const tile = slots[index]!;
      adventurer.tileId = tile.id;
      tile.adventurerIds.push(adventurer.id);
    }
    next.setupRemaining = 0;
    next.phase = 'setup_rafts';
    next.activePlayerId = next.playerOrder[0]!;
    next.movesRemaining = 0;
    next.lastEvent = 'DEV: สุ่มวาง Adventurer ครบแล้ว — วาง Raft ต่อได้เลย';
    return next;
  }

  if (action.type === 'place-raft') {
    if (next.phase !== 'setup_rafts') reject('ยังไม่ใช่ช่วงวาง Raft');
    const raft = next.rafts[action.raftId];
    if (!raft || raft.playerId !== playerId || raft.waterSpaceId != null)
      reject('เลือก Raft ไม่ถูกต้อง');
    if (!isAvailableWaterSpace(next, action.waterSpaceId)) reject('Water space ไม่ถูกต้อง');
    if (!isWaterAdjacentToIsland(next, action.waterSpaceId))
      reject('ต้องวาง Raft บน Water space ที่ติดกับ Island tile');
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
      if (!isAvailableWaterSpace(next, action.waterSpaceId)) reject('Water space ไม่ถูกต้อง');
      if (kaijuAt(next, action.waterSpaceId)) reject('เข้า Kaiju space ไม่ได้');
      if (adventurer.swamThisTurn) reject('Adventurer ตัวนี้ว่ายน้ำได้เพียงครั้งเดียวในเทิร์นนี้');
      if (originTileId != null) {
        if (!surviveTheIslandWaterNeighboursForTile(originTileId, availableWaterSpaces(next)).includes(action.waterSpaceId))
          reject('ต้องว่ายไป Water space ที่ติดกับ Island tile');
        next.tiles[originTileId]!.adventurerIds = next.tiles[originTileId]!.adventurerIds.filter(
          (id) => id !== adventurer.id,
        );
      } else {
        const originWaterSpace = adventurer.waterSpaceId ?? reject('เลือก Adventurer ไม่ถูกต้อง');
        if (adventurer.aboardRaftId == null && !isRescueWaterSpace(action.waterSpaceId))
          reject('Adventurer ที่กำลังว่ายน้ำต้องขึ้น Island tile ก่อน');
        if (!surviveTheIslandAdjacentWaterSpaces(originWaterSpace, availableWaterSpaces(next)).includes(action.waterSpaceId))
          reject('ต้องกระโดดจาก Raft ไป Water space ที่ติดกัน');
      }
      if (!waterSpaceCanAcceptAdventurer(next, action.waterSpaceId))
        reject('Raft มีผู้โดยสารเต็ม 3 คนแล้ว');
      adventurer.tileId = null;
      adventurer.waterSpaceId = action.waterSpaceId;
      adventurer.aboardRaftId = raftAtWaterSpace(next, action.waterSpaceId)?.id ?? null;
      adventurer.swamThisTurn = true;
      resolveCreatureInteractionsAt(next, action.waterSpaceId);
      const event = adventurer.eliminated
        ? `${next.players[playerId]!.name} ว่ายน้ำเข้า Creature และถูกกำจัด`
        : `${next.players[playerId]!.name} ว่ายน้ำด้วย Adventurer`;
      consumeMovement(next, event);
      if (!next.pendingRepellent) finishIfNoAdventurersRemain(next);
      return next;
    }
    const destination =
      (action.tileId == null ? undefined : next.tiles[action.tileId]) ??
      reject('ต้องเลือก Island tile ปลายทาง');
    if (destination.state !== 'island') reject('ต้องเดินไป Island tile ที่ยังอยู่');
    if (kaijuAt(next, surviveTheIslandWaterSpaceForTile(destination.id))) reject('เข้า Kaiju space ไม่ได้');
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
    adventurer.aboardRaftId = null;
    consumeMovement(next, `${next.players[playerId]!.name} ขยับ Adventurer`);
    return next;
  }

  if (action.type === 'move-raft') {
    if (next.phase !== 'action' || next.movesRemaining <= 0) reject('ไม่มี movement เหลือ');
    const raft = next.rafts[action.raftId];
    if (!raft || raft.waterSpaceId == null) reject('เลือก Raft ไม่ถูกต้อง');
    const raftOrigin = raft.waterSpaceId ?? reject('เลือก Raft ไม่ถูกต้อง');
    if (!isAvailableWaterSpace(next, action.waterSpaceId)) reject('Water space ไม่ถูกต้อง');
    if (kaijuAt(next, action.waterSpaceId)) reject('เข้า Kaiju space ไม่ได้');
    if (!surviveTheIslandAdjacentWaterSpaces(raftOrigin, availableWaterSpaces(next)).includes(action.waterSpaceId))
      reject('Raft ต้องขยับไป Water space ที่ติดกัน');
    if (Object.values(next.rafts).some((item) => item.id !== raft.id && item.waterSpaceId === action.waterSpaceId))
      reject('Water space นี้มี Raft แล้ว');
    if (!playerControlsRaft(next, raft, playerId)) reject('คุณควบคุม Raft ลำนี้ไม่ได้');
    moveRaftWithPassengers(next, raft, action.waterSpaceId);
    consumeMovement(next, `${next.players[playerId]!.name} ขยับ Raft`);
    if (!next.pendingRepellent) finishIfNoAdventurersRemain(next);
    return next;
  }

  if (action.type === 'rescue-adventurer') {
    if (next.phase !== 'action' || next.movesRemaining <= 0) reject('ไม่มี movement เหลือ');
    const adventurer = next.adventurers[action.adventurerId];
    if (!adventurer || adventurer.playerId !== playerId || adventurer.waterSpaceId == null)
      reject('เลือก Adventurer ไม่ถูกต้อง');
    const rescueWaterSpace = adventurer.waterSpaceId ?? reject('เลือก Adventurer ไม่ถูกต้อง');
    if (!isRescueWaterSpace(rescueWaterSpace)) reject('ต้องอยู่ที่ Rescue Island');
    if (adventurer.aboardRaftId != null && next.rafts[adventurer.aboardRaftId]?.waterSpaceId !== rescueWaterSpace)
      reject('Adventurer ต้องอยู่บน Raft เพื่อขึ้น Rescue Island');
    adventurer.waterSpaceId = null;
    adventurer.aboardRaftId = null;
    adventurer.rescued = true;
    next.players[playerId]!.rescuedTreasure += adventurer.treasure;
    consumeMovement(next, `${next.players[playerId]!.name} ช่วย Adventurer ขึ้น Rescue Island`);
    if (
      Object.values(next.adventurers).every(
        (item) => item.eliminated || item.rescued,
      )
    )
      finish(next, 'ไม่มี Adventurer เหลือให้ช่วย');
    return next;
  }

  if (action.type === 'use-ability') {
    const ownedAbilities = next.players[playerId]!.abilities;
    if (!ownedAbilities.includes(action.ability)) reject('คุณไม่มี Ability นี้');
    if (action.ability === 'repellent') {
      applyRepellentUse(next, playerId, action.creatureId);
      return next;
    }
    if (next.phase !== 'action') reject('Ability ใช้ได้เฉพาะ Action phase');
    if (action.ability === 'paddle') {
      const raft = next.rafts[action.raftId];
      if (!raft || raft.waterSpaceId == null || !isAvailableWaterSpace(next, action.waterSpaceId))
        reject('เลือก Raft หรือ Water space ไม่ถูกต้อง');
      const raftOrigin = raft.waterSpaceId ?? reject('เลือก Raft หรือ Water space ไม่ถูกต้อง');
      if (kaijuAt(next, action.waterSpaceId)) reject('เข้า Kaiju space ไม่ได้');
      if (!playerControlsRaft(next, raft, playerId)) reject('คุณควบคุม Raft ลำนี้ไม่ได้');
      if (!reachableWaterSpaces(next, raftOrigin, 2).includes(action.waterSpaceId))
        reject('Paddle ขยับ Raft ได้ 1 หรือ 2 Water spaces');
      if (Object.values(next.rafts).some((item) => item.id !== raft.id && item.waterSpaceId === action.waterSpaceId))
        reject('Water space นี้มี Raft แล้ว');
      moveRaftWithPassengers(next, raft, action.waterSpaceId);
      consumeAbility(next, playerId, action.ability);
      next.lastEvent = 'ใช้ Paddle';
      if (!next.pendingRepellent) finishIfNoAdventurersRemain(next);
      return next;
    }
    if (action.ability === 'dolphin') {
      const adventurer = next.adventurers[action.adventurerId];
      if (!adventurer || adventurer.playerId !== playerId || adventurer.waterSpaceId == null || adventurer.aboardRaftId != null)
        reject('Dolphin ใช้กับ Adventurer ที่กำลังว่ายน้ำเท่านั้น');
      const origin = adventurer.waterSpaceId ?? reject('Dolphin ใช้กับ Adventurer ที่กำลังว่ายน้ำเท่านั้น');
      const reachable = reachableWaterSpaces(next, origin, 2);
      if (action.waterSpaceId) {
        if (!reachable.includes(action.waterSpaceId)) reject('Dolphin ไปถึง Water space นี้ไม่ได้');
        if (kaijuAt(next, action.waterSpaceId)) reject('เข้า Kaiju space ไม่ได้');
        if (!waterSpaceCanAcceptAdventurer(next, action.waterSpaceId))
          reject('Raft มีผู้โดยสารเต็ม 3 คนแล้ว');
        adventurer.waterSpaceId = action.waterSpaceId;
        adventurer.aboardRaftId = raftAtWaterSpace(next, action.waterSpaceId)?.id ?? null;
        resolveCreatureInteractionsAt(next, action.waterSpaceId);
      } else {
        const destination =
          (action.tileId == null ? undefined : next.tiles[action.tileId]) ??
          reject('เลือกปลายทาง Dolphin ไม่ถูกต้อง');
        if (destination.state !== 'island') reject('เลือกปลายทาง Dolphin ไม่ถูกต้อง');
        if (kaijuAt(next, surviveTheIslandWaterSpaceForTile(destination.id))) reject('เข้า Kaiju space ไม่ได้');
        if (!surviveTheIslandWaterNeighboursForTile(destination.id, availableWaterSpaces(next)).some((water) => reachable.includes(water)))
          reject('Dolphin ไปถึง Island tile นี้ไม่ได้');
        adventurer.waterSpaceId = null;
        adventurer.aboardRaftId = null;
        adventurer.tileId = destination.id;
        destination.adventurerIds.push(adventurer.id);
      }
      consumeAbility(next, playerId, action.ability);
      next.lastEvent = 'ใช้ Dolphin';
      if (!next.pendingRepellent) finishIfNoAdventurersRemain(next);
      return next;
    }
    if (action.ability === 'dive') {
      const creature = next.creatures[action.creatureId];
      if (!creature || !isAvailableWaterSpace(next, action.waterSpaceId)) reject('เลือก Creature หรือ Water space ไม่ถูกต้อง');
      if (Object.values(next.creatures).some((item) => item.id !== creature.id && item.waterSpaceId === action.waterSpaceId))
        reject('Dive ต้องเลือก Water space ที่ว่าง');
      creature.waterSpaceId = action.waterSpaceId;
      consumeAbility(next, playerId, action.ability);
      resolveCreatureArrival(next, creature);
      next.lastEvent = next.pendingRepellent ? next.lastEvent : 'ใช้ Dive';
      return next;
    }
    const rolledKind = CREATURE_DIE_KINDS[Math.floor(Math.random() * CREATURE_DIE_KINDS.length)]!;
    const candidates = Object.values(next.creatures).filter((item) => item.kind === rolledKind);
    if (!candidates.length) {
      consumeAbility(next, playerId, action.ability);
      next.lastEvent = `Creature die: ${rolledKind} ไม่มีตัวบนกระดาน`;
      return next;
    }
    if (!anyCreatureOfKindCanMove(next, rolledKind)) {
      consumeAbility(next, playerId, action.ability);
      next.lastEvent = `Creature die: ${rolledKind} ขยับไม่ได้`;
      return next;
    }
    next.pendingCreatureDie = { kind: rolledKind };
    next.lastEvent = `Creature die: ${rolledKind} — เลือกตัวแล้วขยับ`;
    return next;
  }

  if (action.type === 'roll-creature') {
    if (next.phase === 'rising_waters') {
      if (next.risingWatersSunk < next.risingWatersTilesToSink)
        reject(`ต้องเลือก Island tile ให้จม ${next.risingWatersTilesToSink} แผ่น`);
      next.phase = 'creatures';
      next.movesRemaining = 0;
      next.creatureToMove = null;
      next.risingWatersSunk = 0;
    }
    if (next.phase !== 'creatures' || next.creatureToMove) reject('ยังทอย Creature ไม่ได้');
    next.creatureToMove = CREATURE_DIE_KINDS[Math.floor(Math.random() * CREATURE_DIE_KINDS.length)]!;
    next.lastEvent = `Creature die: ${next.creatureToMove}`;
    if (!Object.values(next.creatures).some((creature) => creature.kind === next.creatureToMove)) {
      next.lastEvent = `${next.lastEvent} — ไม่มีตัวนี้บนกระดาน`;
      next.creatureToMove = null;
      advance(next);
    } else if (!anyCreatureOfKindCanMove(next, next.creatureToMove)) {
      next.lastEvent = `${next.lastEvent} — ขยับไม่ได้`;
      next.creatureToMove = null;
      advance(next);
    }
    return next;
  }

  if (action.type === 'move-creature') {
    const abilityMove = next.pendingCreatureDie;
    if (!abilityMove && (next.phase !== 'creatures' || !next.creatureToMove))
      reject('ต้องทอย Creature die ก่อน');
    const requiredKind = abilityMove?.kind ?? next.creatureToMove;
    const creature = next.creatures[action.creatureId];
    if (!creature || creature.kind !== requiredKind) reject('เลือก Creature ไม่ถูกต้อง');
    applyCreatureMove(next, creature, action.waterSpaceId, abilityMove ? 'none' : 'advance');
    if (abilityMove) {
      consumeAbility(next, playerId, 'creature-die');
      next.pendingCreatureDie = null;
      if (!next.pendingRepellent) next.lastEvent = `ใช้ Creature die — ${creature.kind} เคลื่อนที่`;
      if (!next.pendingRepellent) finishIfNoAdventurersRemain(next);
      return next;
    }
    next.creatureToMove = null;
    if (!next.pendingRepellent) next.lastEvent = `${creature.kind} เคลื่อนที่`;
    if (next.pendingRepellent) return next;
    if (Object.values(next.adventurers).every((item) => item.eliminated || item.rescued))
      finish(next, 'ไม่มี Adventurer เหลือให้ช่วย');
    else advance(next);
    return next;
  }

  if (action.type === 'finish-action') {
    if (next.phase !== 'action') reject('ยังไม่ใช่ Action phase');
    beginRisingWaters(next);
    return next;
  }

  if (action.type === 'sink-tile') {
    if (next.phase !== 'rising_waters' || !legalSinkTileIds(next).includes(action.tileId))
      reject('เลือก tile ที่จมไม่ได้');
    const tile = next.tiles[action.tileId]!;
    const revealedWaterSpace = surviveTheIslandWaterSpaceForTile(tile.id);
    tile.state = tile.back.kind === 'effect' && tile.back.effect === 'volcano' ? 'volcano' : 'sunk';
    next.risingWatersSunk += 1;
    next.lastReveal = {
      id: (next.lastReveal?.id ?? 0) + 1,
      tileId: tile.id,
      playerId,
      back: tile.back,
    };
    for (const adventurerId of tile.adventurerIds) {
      const adventurer = next.adventurers[adventurerId]!;
      adventurer.tileId = null;
      adventurer.waterSpaceId = revealedWaterSpace;
      adventurer.aboardRaftId = raftAtWaterSpace(next, revealedWaterSpace)?.id ?? null;
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
    if (next.pendingRepellent) return next;
    if (next.volcanoesRevealed >= 3) finish(next, 'ภูเขาไฟลูกที่ 3 ปะทุ');
    else if (
      Object.values(next.adventurers).every(
        (adventurer) => adventurer.eliminated || adventurer.rescued,
      )
    )
      finish(next, 'ไม่มี Adventurer เหลือให้ช่วย');
    else {
      next.lastEvent =
        next.risingWatersSunk < next.risingWatersTilesToSink
          ? `${next.lastEvent} — เลือก tile ระดับต่ำสุดเพิ่ม (${next.risingWatersSunk}/${next.risingWatersTilesToSink})`
          : `${next.lastEvent} — ทอย Creature die`;
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
    risingWatersSunk: state.risingWatersSunk,
    risingWatersTilesToSink: state.risingWatersTilesToSink,
    volcanoesRevealed: state.volcanoesRevealed,
    creatureToMove: state.creatureToMove,
    pendingCreatureDie: state.pendingCreatureDie ?? null,
    pendingRepellent: state.pendingRepellent ?? null,
    lastReveal: state.lastReveal,
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
