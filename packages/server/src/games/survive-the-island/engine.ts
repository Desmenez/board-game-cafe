import {
  GAME_THUMBNAIL_BY_ID,
  SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES,
  SURVIVE_THE_ISLAND_SEA_SERPENT_STARTING_WATER_SPACES,
  SURVIVE_THE_ISLAND_WATER_CELLS,
  SURVIVE_THE_ISLAND_COLORS,
  SURVIVE_THE_ISLAND_RAFT_COUNT,
  SURVIVE_THE_ISLAND_SETUP_RAFTS_PER_PLAYER,
  createSurviveTheIslandDeck,
  surviveTheIslandAdjacentIslandTiles,
  surviveTheIslandAdjacentWaterSpaces,
  surviveTheIslandTileIdForWaterSpace,
  surviveTheIslandWaterCellForSpace,
  surviveTheIslandWaterNeighboursForTile,
  surviveTheIslandWaterSpaceForTile,
  type SurviveTheIslandCreature,
  type SurviveTheIslandPlacement,
  type SurviveTheIslandPendingRaftBoarding,
  type GameDefinition,
  type GameResult,
  type Player,
  type SurviveTheIslandAbility,
  type SurviveTheIslandAction,
  type SurviveTheIslandAdventurer,
  type SurviveTheIslandEliminationCause,
  type SurviveTheIslandPlayer,
  type SurviveTheIslandPlayerView,
  type SurviveTheIslandRaft,
  type SurviveTheIslandState,
  type SurviveTheIslandWaterSpace,
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

const CREATURE_DIE_KINDS: readonly SurviveTheIslandCreature['kind'][] = [
  'sea-serpent',
  'shark',
  'kaiju',
];

const RAFT_CAPACITY = 3;

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

function kaijuAt(
  state: SurviveTheIslandState,
  spaceId: string,
  exceptId?: string,
): SurviveTheIslandCreature | undefined {
  return Object.values(state.creatures).find(
    (creature) =>
      creature.id !== exceptId && creature.kind === 'kaiju' && creature.waterSpaceId === spaceId,
  );
}

function creatureAtWaterSpace(
  state: SurviveTheIslandState,
  waterSpaceId: string,
): SurviveTheIslandCreature | undefined {
  return Object.values(state.creatures).find((creature) => creature.waterSpaceId === waterSpaceId);
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
          surviveTheIslandWaterNeighboursForTile(tile.id, availableWaterSpaces(state)).includes(
            spaceId,
          ),
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

/** Open water (printed sea or sunk tile), not an island land space. */
function isWaterPushTarget(state: SurviveTheIslandState, spaceId: string): boolean {
  const tileId = surviveTheIslandTileIdForWaterSpace(spaceId);
  if (tileId == null) return true;
  return state.tiles[tileId]?.state !== 'island';
}

/**
 * On-board adjacent push targets only (never invents off-board cells).
 * Ranked by Kaiju movement continuation, then water before land.
 * If the preferred vector has no hex (board edge), those directions simply
 * are absent from this list — callers fall through to the next ranked space.
 */
function kaijuPushDestinations(
  state: SurviveTheIslandState,
  kaijuSpace: string,
  fromSpaceId: string | null,
): string[] {
  const candidates = adjacentKaijuSpaces(state, kaijuSpace).filter(
    (spaceId) => !kaijuAt(state, spaceId),
  );
  const kaijuCell = surviveTheIslandWaterCellForSpace(kaijuSpace);
  const fromCell = fromSpaceId ? surviveTheIslandWaterCellForSpace(fromSpaceId) : null;
  const moveDr = fromCell && kaijuCell ? kaijuCell.row - fromCell.row : 0;
  const moveDq = fromCell && kaijuCell ? kaijuCell.q2 - fromCell.q2 : 0;
  const hasVector = Boolean(fromCell && kaijuCell && (moveDr !== 0 || moveDq !== 0));

  return [...candidates].sort((a, b) => {
    const cellA = surviveTheIslandWaterCellForSpace(a);
    const cellB = surviveTheIslandWaterCellForSpace(b);
    let alignA = 0;
    let alignB = 0;
    if (hasVector && kaijuCell) {
      if (cellA) alignA = (cellA.row - kaijuCell.row) * moveDr + (cellA.q2 - kaijuCell.q2) * moveDq;
      if (cellB) alignB = (cellB.row - kaijuCell.row) * moveDr + (cellB.q2 - kaijuCell.q2) * moveDq;
    }
    if (alignB !== alignA) return alignB - alignA;
    const waterA = isWaterPushTarget(state, a) ? 1 : 0;
    const waterB = isWaterPushTarget(state, b) ? 1 : 0;
    if (waterB !== waterA) return waterB - waterA;
    return a.localeCompare(b);
  });
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
  state.creaturesAdvancePending = false;
  state.phase = 'action';
}

/** After the Creatures die is spent, advance once pending interrupts resolve. */
function tryFinishCreaturesTurn(state: SurviveTheIslandState): void {
  if (state.phase !== 'creatures') return;
  if (!state.creaturesAdvancePending) return;
  if (state.pendingRepellent || state.pendingRaftBoarding) return;
  state.creaturesAdvancePending = false;
  if (
    Object.values(state.adventurers).every(
      (adventurer) => adventurer.eliminated || adventurer.rescued,
    )
  ) {
    finish(state, 'ไม่มี Adventurer เหลือให้ช่วย');
    return;
  }
  advance(state);
}

function beginRisingWaters(state: SurviveTheIslandState, lastEvent?: string): void {
  state.phase = 'rising_waters';
  state.risingWatersSunk = 0;
  state.risingWatersTilesToSink =
    remainingAdventurers(state, state.activePlayerId).length === 0 ? 2 : 1;
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
    (adventurer) =>
      !adventurer.eliminated && !adventurer.rescued && adventurer.aboardRaftId === raft.id,
  );
  const own = aboard.filter((adventurer) => adventurer.playerId === playerId).length;
  return Object.keys(state.players)
    .filter((id) => id !== playerId)
    .every(
      (opponentId) =>
        own >= aboard.filter((adventurer) => adventurer.playerId === opponentId).length,
    );
}

function raftAtWaterSpace(
  state: SurviveTheIslandState,
  waterSpaceId: string,
): SurviveTheIslandRaft | undefined {
  return Object.values(state.rafts).find((raft) => raft.waterSpaceId === waterSpaceId);
}

function raftPassengerCount(state: SurviveTheIslandState, raftId: string): number {
  return Object.values(state.adventurers).filter(
    (adventurer) =>
      !adventurer.eliminated && !adventurer.rescued && adventurer.aboardRaftId === raftId,
  ).length;
}

function raftSeatsLeft(state: SurviveTheIslandState, raft: SurviveTheIslandRaft): number {
  return Math.max(0, RAFT_CAPACITY - raftPassengerCount(state, raft.id));
}

function swimmersAtWaterSpace(
  state: SurviveTheIslandState,
  waterSpaceId: string,
): SurviveTheIslandAdventurer[] {
  return Object.values(state.adventurers).filter(
    (adventurer) =>
      !adventurer.eliminated &&
      !adventurer.rescued &&
      adventurer.waterSpaceId === waterSpaceId &&
      adventurer.aboardRaftId == null,
  );
}

function boardAdventurersOntoRaft(
  state: SurviveTheIslandState,
  raft: SurviveTheIslandRaft,
  adventurerIds: readonly string[],
): void {
  for (const id of adventurerIds) {
    const adventurer = state.adventurers[id];
    if (!adventurer || adventurer.eliminated || adventurer.rescued) continue;
    if (adventurer.waterSpaceId !== raft.waterSpaceId) continue;
    adventurer.aboardRaftId = raft.id;
  }
}

/**
 * Place swimmers aboard immediately when seats remain. If more swimmers than
 * seats, open a pending choice for the deciding player (FAQ).
 * @returns true when waiting for `choose-raft-boarding`
 */
function tryBoardSwimmersOntoRaft(
  state: SurviveTheIslandState,
  raft: SurviveTheIslandRaft,
  decidingPlayerId: string,
): boolean {
  if (raft.waterSpaceId == null || state.pendingRaftBoarding) return false;
  const seats = raftSeatsLeft(state, raft);
  if (seats <= 0) return false;
  const swimmers = swimmersAtWaterSpace(state, raft.waterSpaceId);
  if (!swimmers.length) return false;
  if (swimmers.length <= seats) {
    boardAdventurersOntoRaft(
      state,
      raft,
      swimmers.map((adventurer) => adventurer.id),
    );
    return false;
  }
  state.pendingRaftBoarding = {
    raftId: raft.id,
    waterSpaceId: raft.waterSpaceId,
    seats,
    candidateAdventurerIds: swimmers.map((adventurer) => adventurer.id),
    decidingPlayerId,
    deferredRevealBack: null,
  };
  state.lastEvent = `${state.players[decidingPlayerId]!.name} เลือก ${seats} คนขึ้นแพ (ผู้โดยสารเกินที่นั่ง)`;
  return true;
}

/** Board swimmers sharing a raft's space; defer creature resolve while choosing seats. */
function boardSwimmersThenResolveCreatures(
  state: SurviveTheIslandState,
  waterSpaceId: string,
  decidingPlayerId: string,
  resume: RepellentResume = 'none',
): void {
  const raft = raftAtWaterSpace(state, waterSpaceId);
  if (raft && tryBoardSwimmersOntoRaft(state, raft, decidingPlayerId)) return;
  resolveCreatureInteractionsAt(state, waterSpaceId, resume);
}

/**
 * Rooms are in-memory and can outlive a hot reload. Before `aboardRaftId` was
 * introduced, every Adventurer sharing a raft's Water space was implicitly on
 * that raft, so hydrate that one legacy shape on its next action.
 */
function hydrateLegacyRaftPassengers(state: SurviveTheIslandState): void {
  Object.values(state.adventurers).forEach((adventurer) => {
    if (Object.hasOwn(adventurer, 'aboardRaftId')) return;
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
  if (
    Object.values(state.adventurers).every(
      (adventurer) => adventurer.eliminated || adventurer.rescued,
    )
  )
    finish(state, 'ไม่มี Adventurer เหลือให้ช่วย');
}

function moveRaftWithPassengers(
  state: SurviveTheIslandState,
  raft: SurviveTheIslandRaft,
  waterSpaceId: SurviveTheIslandWaterSpace,
  decidingPlayerId: string,
): void {
  raft.waterSpaceId = waterSpaceId;
  Object.values(state.adventurers).forEach((adventurer) => {
    if (adventurer.aboardRaftId === raft.id) adventurer.waterSpaceId = waterSpaceId;
  });
  boardSwimmersThenResolveCreatures(state, waterSpaceId, decidingPlayerId);
}

function recordEliminationNotice(
  state: SurviveTheIslandState,
  victims: readonly SurviveTheIslandAdventurer[],
  cause: SurviveTheIslandEliminationCause,
): void {
  if (!victims.length) return;
  const mapped = victims.map((adventurer) => ({
    adventurerId: adventurer.id,
    playerId: adventurer.playerId,
    color: adventurer.color,
  }));
  const batching = (state as SurviveTheIslandState & { __elimBatch?: boolean }).__elimBatch;
  if (batching && state.eliminationNotice) {
    const seen = new Set(state.eliminationNotice.victims.map((victim) => victim.adventurerId));
    state.eliminationNotice = {
      cause: state.eliminationNotice.cause,
      victims: [
        ...state.eliminationNotice.victims,
        ...mapped.filter((victim) => !seen.has(victim.adventurerId)),
      ],
    };
    return;
  }
  (state as SurviveTheIslandState & { __elimBatch?: boolean }).__elimBatch = true;
  state.eliminationNoticeSeq = (state.eliminationNoticeSeq ?? 0) + 1;
  state.eliminationNotice = { cause, victims: mapped };
}

function eliminateAdventurersAt(
  state: SurviveTheIslandState,
  waterSpaceIds: readonly string[],
  cause: SurviveTheIslandEliminationCause,
): void {
  const victims: SurviveTheIslandAdventurer[] = [];
  Object.values(state.adventurers).forEach((adventurer) => {
    if (adventurer.waterSpaceId && waterSpaceIds.includes(adventurer.waterSpaceId)) {
      adventurer.waterSpaceId = null;
      adventurer.aboardRaftId = null;
      adventurer.eliminated = true;
      victims.push(adventurer);
    }
  });
  recordEliminationNotice(state, victims, cause);
}

function recordPlacement(
  state: SurviveTheIslandState,
  playerId: string,
  payload: Omit<SurviveTheIslandPlacement, 'id' | 'playerId'>,
): void {
  state.lastPlacement = {
    id: (state.lastPlacement?.id ?? 0) + 1,
    playerId,
    ...payload,
  };
}

function recordCreatureDieNotice(
  state: SurviveTheIslandState,
  playerId: string,
  kind: SurviveTheIslandCreature['kind'],
): void {
  state.creatureDieNoticeSeq = (state.creatureDieNoticeSeq ?? 0) + 1;
  state.creatureDieNotice = { playerId, kind };
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
  playerId: string,
): string {
  if (effect === 'shark' || effect === 'kaiju') {
    spawnCreature(state, effect, waterSpaceId);
    const creature = Object.values(state.creatures).find(
      (item) => item.kind === effect && item.waterSpaceId === waterSpaceId,
    );
    if (creature) {
      recordPlacement(state, playerId, {
        kind: 'creature',
        tileId: null,
        waterSpaceId,
        creatureKind: effect,
      });
      resolveCreatureArrival(state, creature);
    }
    return `${effect === 'shark' ? 'Shark' : 'Kaiju'} เข้าสู่ Water space`;
  }
  if (effect === 'raft') {
    // Prefer unused meeples from the 12-raft supply; only relocate an empty
    // board raft when every meeple is already on the board.
    const supply = Object.values(state.rafts).find((raft) => raft.waterSpaceId == null);
    const emptyOnBoard = Object.values(state.rafts).find(
      (raft) =>
        raft.waterSpaceId != null &&
        !Object.values(state.adventurers).some((adventurer) => adventurer.aboardRaftId === raft.id),
    );
    const raft = supply ?? emptyOnBoard;
    if (!raft) return 'Raft effect แต่ไม่มี Raft ว่าง';
    raft.waterSpaceId = waterSpaceId;
    recordPlacement(state, playerId, {
      kind: 'raft',
      tileId: null,
      waterSpaceId,
    });
    boardSwimmersThenResolveCreatures(state, waterSpaceId, playerId);
    return supply ? 'วาง Raft จากคลัง' : 'ย้าย Raft ว่างมาที่ Water space นี้';
  }
  const affected = [
    waterSpaceId,
    ...surviveTheIslandAdjacentWaterSpaces(waterSpaceId, availableWaterSpaces(state)),
  ];
  eliminateAdventurersAt(state, affected, 'whirlpool');
  Object.values(state.rafts).forEach((raft) => {
    if (raft.waterSpaceId && affected.includes(raft.waterSpaceId)) raft.waterSpaceId = null;
  });
  Object.values(state.creatures).forEach((creature) => {
    if (affected.includes(creature.waterSpaceId)) delete state.creatures[creature.id];
  });
  return 'Whirlpool กวาดทุกสิ่งใน Water space รอบตัว';
}

function reachableWaterSpaces(
  state: SurviveTheIslandState,
  origin: string,
  range: number,
): string[] {
  const distances = new Map<string, number>([[origin, 0]]);
  const queue = [origin];
  while (queue.length) {
    const current = queue.shift()!;
    const distance = distances.get(current)!;
    if (distance >= range) continue;
    for (const neighbour of surviveTheIslandAdjacentWaterSpaces(
      current,
      availableWaterSpaces(state),
    )) {
      if (!distances.has(neighbour)) {
        distances.set(neighbour, distance + 1);
        queue.push(neighbour);
      }
    }
  }
  return [...distances.keys()].filter((id) => id !== origin);
}

function creatureDestinations(
  state: SurviveTheIslandState,
  creature: SurviveTheIslandCreature,
): string[] {
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
  if (!creatureDestinations(state, creature).includes(waterSpaceId))
    reject('Creature ไปถึง space นี้ไม่ได้');
  const displacedKaiju =
    creature.kind === 'kaiju' ? kaijuAt(state, waterSpaceId, creature.id) : undefined;
  const origin = creature.waterSpaceId;
  creature.waterSpaceId = waterSpaceId;
  if (displacedKaiju) displacedKaiju.waterSpaceId = origin;
  resolveCreatureArrival(state, creature, resume, origin);
}

function moveAdventurerToKaijuPushTarget(
  state: SurviveTheIslandState,
  adventurer: SurviveTheIslandAdventurer,
  kaijuSpace: string,
  offset: number,
  fromSpaceId: string | null,
  resume: RepellentResume = 'none',
): boolean {
  const target = kaijuPushDestinations(state, kaijuSpace, fromSpaceId)[offset];
  const originTileId = adventurer.tileId;
  if (originTileId != null)
    state.tiles[originTileId]!.adventurerIds = state.tiles[originTileId]!.adventurerIds.filter(
      (id) => id !== adventurer.id,
    );
  adventurer.tileId = null;
  adventurer.aboardRaftId = null;
  if (!target) {
    adventurer.waterSpaceId = null;
    adventurer.eliminated = true;
    return true;
  }
  const targetTileId = surviveTheIslandTileIdForWaterSpace(target);
  if (targetTileId != null && state.tiles[targetTileId]?.state === 'island') {
    adventurer.waterSpaceId = null;
    adventurer.tileId = targetTileId;
    state.tiles[targetTileId]!.adventurerIds.push(adventurer.id);
    return false;
  }
  adventurer.waterSpaceId = target;
  adventurer.aboardRaftId = null;
  boardSwimmersThenResolveCreatures(state, target, state.activePlayerId, resume);
  return false;
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
  pushFromSpaceId: SurviveTheIslandWaterSpace | null = null,
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
    pushFromSpaceId,
  };
  const names = eligiblePlayerIds.map((id) => state.players[id]!.name).join(', ');
  state.lastEvent = `ไล่สัตว์: ${names} ใช้การ์ดไล่สัตว์ได้`;
  return true;
}

function continueAfterRepellent(state: SurviveTheIslandState): void {
  if (state.pendingRepellent) return;
  finishIfNoAdventurersRemain(state);
  if (state.result) return;
  tryFinishCreaturesTurn(state);
  if (state.result) return;
  if (state.phase === 'rising_waters') {
    state.lastEvent =
      state.risingWatersSunk < state.risingWatersTilesToSink
        ? `${state.lastEvent} — เลือก tile ระดับต่ำสุดเพิ่ม (${state.risingWatersSunk}/${state.risingWatersTilesToSink})`
        : `${state.lastEvent} — ทอย Creature die`;
  }
}

function applyRepellentUse(
  state: SurviveTheIslandState,
  playerId: string,
  creatureId: string,
): void {
  const creature = state.creatures[creatureId];
  if (!creature || creature.kind === 'sea-serpent')
    reject('Repellent ใช้ได้กับ Shark หรือ Kaiju เท่านั้น');
  if (
    !Object.values(state.adventurers).some(
      (adventurer) =>
        adventurer.playerId === playerId &&
        adventurerSharesCreatureSpace(state, adventurer, creature),
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
  fromSpaceId: SurviveTheIslandWaterSpace | null = null,
): void {
  if (offerRepellent(state, creature, resume, fromSpaceId)) return;
  applyCreatureArrivalEffects(state, creature, resume, fromSpaceId);
}

function applyCreatureArrivalEffects(
  state: SurviveTheIslandState,
  creature: SurviveTheIslandCreature,
  resume: RepellentResume = 'none',
  fromSpaceId: SurviveTheIslandWaterSpace | null = null,
): void {
  const waterSpaceId = creature.waterSpaceId;
  if (creature.kind === 'sea-serpent') {
    eliminateAdventurersAt(state, [waterSpaceId], 'sea-serpent');
    Object.values(state.rafts).forEach((raft) => {
      if (raft.waterSpaceId === waterSpaceId) raft.waterSpaceId = null;
    });
    return;
  }
  if (creature.kind === 'shark') {
    const victims = Object.values(state.adventurers).filter(
      (adventurer) => adventurer.waterSpaceId === waterSpaceId && adventurer.aboardRaftId == null,
    );
    victims.forEach((adventurer) => {
      adventurer.waterSpaceId = null;
      adventurer.eliminated = true;
    });
    recordEliminationNotice(state, victims, 'shark');
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
  const kaijuVictims: SurviveTheIslandAdventurer[] = [];
  affected.forEach((adventurer) => {
    const fellOff = moveAdventurerToKaijuPushTarget(
      state,
      adventurer,
      waterSpaceId,
      nextTarget++,
      fromSpaceId,
      resume,
    );
    if (fellOff) kaijuVictims.push(adventurer);
  });
  recordEliminationNotice(state, kaijuVictims, 'kaiju');
  Object.values(state.creatures)
    .filter((other) => other.id !== creature.id && other.waterSpaceId === waterSpaceId)
    .forEach((other) => displaceCreatureFromKaiju(state, other, resume));
}

/** Resolve the same interaction when an element enters a Creature's space. */
function resolveCreatureInteractionsAt(
  state: SurviveTheIslandState,
  waterSpaceId: string,
  resume: RepellentResume = 'none',
): void {
  Object.values(state.creatures)
    .filter((creature) => creature.waterSpaceId === waterSpaceId)
    .forEach((creature) => resolveCreatureArrival(state, creature, resume));
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

function consumeAbility(
  state: SurviveTheIslandState,
  playerId: string,
  ability: SurviveTheIslandAbility,
): void {
  const abilities = state.players[playerId]!.abilities;
  const index = abilities.indexOf(ability);
  if (index < 0) reject('คุณไม่มี Ability นี้');
  abilities.splice(index, 1);
  state.abilityUseNoticeSeq = (state.abilityUseNoticeSeq ?? 0) + 1;
  state.abilityUseNotice = { playerId, ability };
}

function setup(players: Player[]): SurviveTheIslandState {
  if (players.length < 2 || players.length > 5)
    throw new Error('Survive the Island ต้องมีผู้เล่น 2–5 คน');
  const playerOrder = shuffle(players.map((player) => player.id));
  const colorPool = shuffle(SURVIVE_THE_ISLAND_COLORS);
  const seats: Record<string, SurviveTheIslandPlayer> = {};
  const adventurers: Record<string, SurviveTheIslandAdventurer> = {};
  const rafts: Record<string, SurviveTheIslandRaft> = {};
  const creatures: Record<string, SurviveTheIslandCreature> = {};
  SURVIVE_THE_ISLAND_SEA_SERPENT_STARTING_WATER_SPACES.forEach((waterSpaceId, index) => {
    const id = `sea-serpent:${index}`;
    creatures[id] = { id, kind: 'sea-serpent', waterSpaceId };
  });
  playerOrder.forEach((playerId, playerIndex) => {
    const player = players.find((seat) => seat.id === playerId)!;
    const colors =
      players.length === 2
        ? [colorPool[playerIndex * 2]!, colorPool[playerIndex * 2 + 1]!]
        : [colorPool[playerIndex]!];
    const color = colors[0]!;
    const ids: string[] = [];
    const raftIds: string[] = [];
    for (let raftIndex = 0; raftIndex < SURVIVE_THE_ISLAND_SETUP_RAFTS_PER_PLAYER; raftIndex += 1) {
      const id = `${player.id}:raft:${raftIndex}`;
      raftIds.push(id);
      rafts[id] = { id, playerId: player.id, waterSpaceId: null };
    }
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
  const setupRaftTotal = players.length * SURVIVE_THE_ISLAND_SETUP_RAFTS_PER_PLAYER;
  for (let index = setupRaftTotal; index < SURVIVE_THE_ISLAND_RAFT_COUNT; index += 1) {
    const id = `supply:raft:${index}`;
    rafts[id] = { id, playerId: null, waterSpaceId: null };
  }
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
    setupRaftsRemaining: setupRaftTotal,
    movesRemaining: 0,
    risingWatersSunk: 0,
    risingWatersTilesToSink: 1,
    volcanoesRevealed: 0,
    creatureToMove: null,
    pendingCreatureDie: null,
    creaturesAdvancePending: false,
    pendingRepellent: null,
    pendingRaftBoarding: null,
    lastReveal: null,
    lastPlacement: null,
    creatureDieNoticeSeq: 0,
    creatureDieNotice: null,
    abilityUseNoticeSeq: 0,
    abilityUseNotice: null,
    rescueNoticeSeq: 0,
    rescueNotice: null,
    eliminationNoticeSeq: 0,
    eliminationNotice: null,
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
  if (next.creaturesAdvancePending == null) next.creaturesAdvancePending = false;
  if (next.pendingRepellent === undefined) next.pendingRepellent = null;
  if (next.pendingRepellent) {
    next.pendingRepellent.pushFromSpaceId = next.pendingRepellent.pushFromSpaceId ?? null;
  }
  if (next.pendingRaftBoarding === undefined) next.pendingRaftBoarding = null;
  if (next.pendingRaftBoarding && next.pendingRaftBoarding.deferredRevealBack === undefined) {
    next.pendingRaftBoarding = { ...next.pendingRaftBoarding, deferredRevealBack: null };
  }
  if (next.lastPlacement === undefined) next.lastPlacement = null;
  if (next.creatureDieNoticeSeq == null) next.creatureDieNoticeSeq = 0;
  if (next.creatureDieNotice === undefined) next.creatureDieNotice = null;
  if (next.abilityUseNoticeSeq == null) next.abilityUseNoticeSeq = 0;
  if (next.abilityUseNotice === undefined) next.abilityUseNotice = null;
  if (next.rescueNoticeSeq == null) next.rescueNoticeSeq = 0;
  if (next.rescueNotice === undefined) next.rescueNotice = null;
  if (next.eliminationNoticeSeq == null) next.eliminationNoticeSeq = 0;
  if (next.eliminationNotice === undefined) next.eliminationNotice = null;
  (next as SurviveTheIslandState & { __elimBatch?: boolean }).__elimBatch = false;
  hydrateLegacyRaftPassengers(next);

  if (next.pendingRaftBoarding) {
    if (action.type !== 'choose-raft-boarding') reject('ต้องเลือกผู้โดยสารขึ้นแพก่อน');
    const boarding = action as Extract<SurviveTheIslandAction, { type: 'choose-raft-boarding' }>;
    const pending = next.pendingRaftBoarding;
    if (playerId !== pending.decidingPlayerId) reject('ยังไม่ถึงตาคุณเลือกผู้โดยสาร');
    if (boarding.adventurerIds.length !== pending.seats)
      reject(`ต้องเลือกผู้โดยสาร ${pending.seats} คน`);
    const unique = new Set(boarding.adventurerIds);
    if (unique.size !== boarding.adventurerIds.length) reject('เลือก Adventurer ซ้ำ');
    if (!boarding.adventurerIds.every((id) => pending.candidateAdventurerIds.includes(id)))
      reject('เลือก Adventurer ไม่ถูกต้อง');
    const raft = next.rafts[pending.raftId] ?? reject('เลือก Raft ไม่ถูกต้อง');
    boardAdventurersOntoRaft(next, raft, boarding.adventurerIds);
    const deferred = pending.deferredRevealBack ?? null;
    next.pendingRaftBoarding = null;
    next.lastEvent = `${next.players[playerId]!.name} เลือกผู้โดยสารขึ้นแพ`;
    if (deferred) {
      if (deferred.kind === 'ability') {
        next.players[playerId]!.abilities.push(deferred.ability);
        next.lastEvent = `ได้ Ability: ${deferred.ability}`;
        resolveCreatureInteractionsAt(next, pending.waterSpaceId);
      } else if (deferred.effect === 'volcano') {
        next.volcanoesRevealed += 1;
        eliminateAdventurersAt(next, [pending.waterSpaceId], 'volcano');
        Object.values(next.creatures).forEach((creature) => {
          if (creature.waterSpaceId === pending.waterSpaceId) delete next.creatures[creature.id];
        });
        next.lastEvent = `Volcano ปะทุ (${next.volcanoesRevealed}/3)`;
      } else {
        next.lastEvent = applyEffect(next, deferred.effect, pending.waterSpaceId, playerId);
      }
    } else {
      resolveCreatureInteractionsAt(next, pending.waterSpaceId);
    }
    if (next.pendingRepellent || next.pendingRaftBoarding) return next;
    if (next.volcanoesRevealed >= 3) finish(next, 'ภูเขาไฟลูกที่ 3 ปะทุ');
    else finishIfNoAdventurersRemain(next);
    if (next.result) return next;
    tryFinishCreaturesTurn(next);
    if (next.result) return next;
    if (deferred && next.phase === 'rising_waters') {
      next.lastEvent =
        next.risingWatersSunk < next.risingWatersTilesToSink
          ? `${next.lastEvent} — เลือก tile ระดับต่ำสุดเพิ่ม (${next.risingWatersSunk}/${next.risingWatersTilesToSink})`
          : `${next.lastEvent} — ทอย Creature die`;
    }
    return next;
  }

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
        if (creature) {
          applyCreatureArrivalEffects(next, creature, resume, pending.pushFromSpaceId ?? null);
        }
        continueAfterRepellent(next);
      }
      return next;
    }
    if (action.type === 'use-ability' && action.ability === 'repellent') {
      const pending = next.pendingRepellent;
      if (!pending.eligiblePlayerIds.includes(playerId)) reject('คุณใช้การ์ดไล่สัตว์ไม่ได้');
      if (pending.passedPlayerIds.includes(playerId)) reject('คุณเลือกไม่ใช้แล้ว');
      if (action.creatureId !== pending.creatureId) reject('เลือก Creature ไม่ถูกต้อง');
      applyRepellentUse(next, playerId, pending.creatureId);
      next.pendingRepellent = null;
      continueAfterRepellent(next);
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
    recordPlacement(next, playerId, {
      kind: 'adventurer',
      tileId: tile.id,
      waterSpaceId: null,
      color: adventurer.color,
    });
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
    recordPlacement(next, playerId, {
      kind: 'raft',
      tileId: null,
      waterSpaceId: action.waterSpaceId,
    });
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
      const originWaterSpace = adventurer.waterSpaceId;
      if (
        originTileId == null &&
        originWaterSpace === action.waterSpaceId &&
        adventurer.aboardRaftId == null
      ) {
        const raft = raftAtWaterSpace(next, originWaterSpace) ?? reject('ไม่มีแพในช่องนี้');
        if (raftSeatsLeft(next, raft) <= 0) reject('Raft มีผู้โดยสารเต็ม 3 คนแล้ว');
        adventurer.aboardRaftId = raft.id;
        consumeMovement(next, `${next.players[playerId]!.name} ขึ้นแพ`);
        if (!next.pendingRepellent) finishIfNoAdventurersRemain(next);
        return next;
      }
      if (adventurer.swamThisTurn) reject('Adventurer ตัวนี้ว่ายน้ำได้เพียงครั้งเดียวในเทิร์นนี้');
      if (originTileId != null) {
        if (
          !surviveTheIslandWaterNeighboursForTile(
            originTileId,
            availableWaterSpaces(next),
          ).includes(action.waterSpaceId)
        )
          reject('ต้องว่ายไป Water space ที่ติดกับ Island tile');
        next.tiles[originTileId]!.adventurerIds = next.tiles[originTileId]!.adventurerIds.filter(
          (id) => id !== adventurer.id,
        );
      } else {
        const originWaterSpace = adventurer.waterSpaceId ?? reject('เลือก Adventurer ไม่ถูกต้อง');
        if (
          !surviveTheIslandAdjacentWaterSpaces(
            originWaterSpace,
            availableWaterSpaces(next),
          ).includes(action.waterSpaceId)
        )
          reject('ต้องว่ายหรือกระโดดจาก Raft ไป Water space ที่ติดกัน');
      }
      adventurer.tileId = null;
      adventurer.waterSpaceId = action.waterSpaceId;
      adventurer.aboardRaftId = null;
      adventurer.swamThisTurn = true;
      boardSwimmersThenResolveCreatures(next, action.waterSpaceId, playerId);
      const event = adventurer.eliminated
        ? `${next.players[playerId]!.name} ว่ายน้ำเข้า Creature และถูกกำจัด`
        : `${next.players[playerId]!.name} ว่ายน้ำด้วย Adventurer`;
      consumeMovement(next, event);
      if (!next.pendingRepellent && !next.pendingRaftBoarding) finishIfNoAdventurersRemain(next);
      return next;
    }
    const destination =
      (action.tileId == null ? undefined : next.tiles[action.tileId]) ??
      reject('ต้องเลือก Island tile ปลายทาง');
    if (destination.state !== 'island') reject('ต้องเดินไป Island tile ที่ยังอยู่');
    if (kaijuAt(next, surviveTheIslandWaterSpaceForTile(destination.id)))
      reject('เข้า Kaiju space ไม่ได้');
    if (originTileId != null) {
      if (!surviveTheIslandAdjacentIslandTiles(originTileId).includes(destination.id))
        reject('ต้องเดินไป Island tile ที่ติดกัน');
      next.tiles[originTileId]!.adventurerIds = next.tiles[originTileId]!.adventurerIds.filter(
        (id) => id !== adventurer.id,
      );
    } else {
      const originWaterSpace = adventurer.waterSpaceId ?? reject('เลือก Adventurer ไม่ถูกต้อง');
      if (
        !surviveTheIslandWaterNeighboursForTile(
          destination.id,
          availableWaterSpaces(next),
        ).includes(originWaterSpace)
      )
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
    if (creatureAtWaterSpace(next, action.waterSpaceId))
      reject('Raft เข้าช่องที่มี Creature ไม่ได้');
    if (
      !surviveTheIslandAdjacentWaterSpaces(raftOrigin, availableWaterSpaces(next)).includes(
        action.waterSpaceId,
      )
    )
      reject('Raft ต้องขยับไป Water space ที่ติดกัน');
    if (
      Object.values(next.rafts).some(
        (item) => item.id !== raft.id && item.waterSpaceId === action.waterSpaceId,
      )
    )
      reject('Water space นี้มี Raft แล้ว');
    if (!playerControlsRaft(next, raft, playerId)) reject('คุณควบคุม Raft ลำนี้ไม่ได้');
    moveRaftWithPassengers(next, raft, action.waterSpaceId, playerId);
    consumeMovement(next, `${next.players[playerId]!.name} ขยับ Raft`);
    if (!next.pendingRepellent && !next.pendingRaftBoarding) finishIfNoAdventurersRemain(next);
    return next;
  }

  if (action.type === 'rescue-adventurer') {
    if (next.phase !== 'action' || next.movesRemaining <= 0) reject('ไม่มี movement เหลือ');
    const adventurer = next.adventurers[action.adventurerId];
    if (!adventurer || adventurer.playerId !== playerId || adventurer.waterSpaceId == null)
      reject('เลือก Adventurer ไม่ถูกต้อง');
    const rescueWaterSpace = adventurer.waterSpaceId ?? reject('เลือก Adventurer ไม่ถูกต้อง');
    if (!isRescueWaterSpace(rescueWaterSpace)) reject('ต้องอยู่ที่ Rescue Island');
    if (
      adventurer.aboardRaftId != null &&
      next.rafts[adventurer.aboardRaftId]?.waterSpaceId !== rescueWaterSpace
    )
      reject('Adventurer ต้องอยู่บน Raft เพื่อขึ้น Rescue Island');
    adventurer.waterSpaceId = null;
    adventurer.aboardRaftId = null;
    adventurer.rescued = true;
    next.players[playerId]!.rescuedTreasure += adventurer.treasure;
    next.rescueNoticeSeq = (next.rescueNoticeSeq ?? 0) + 1;
    next.rescueNotice = {
      playerId,
      color: adventurer.color,
      treasure: adventurer.treasure,
    };
    consumeMovement(next, `${next.players[playerId]!.name} ช่วย Adventurer ขึ้น Rescue Island`);
    if (Object.values(next.adventurers).every((item) => item.eliminated || item.rescued))
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
      if (creatureAtWaterSpace(next, action.waterSpaceId))
        reject('Raft เข้าช่องที่มี Creature ไม่ได้');
      if (!playerControlsRaft(next, raft, playerId)) reject('คุณควบคุม Raft ลำนี้ไม่ได้');
      if (!reachableWaterSpaces(next, raftOrigin, 2).includes(action.waterSpaceId))
        reject('Paddle ขยับ Raft ได้ 1 หรือ 2 Water spaces');
      if (
        Object.values(next.rafts).some(
          (item) => item.id !== raft.id && item.waterSpaceId === action.waterSpaceId,
        )
      )
        reject('Water space นี้มี Raft แล้ว');
      moveRaftWithPassengers(next, raft, action.waterSpaceId, playerId);
      consumeAbility(next, playerId, action.ability);
      next.lastEvent = next.pendingRaftBoarding ? next.lastEvent : 'ใช้ Paddle';
      if (!next.pendingRepellent && !next.pendingRaftBoarding) finishIfNoAdventurersRemain(next);
      return next;
    }
    if (action.ability === 'dolphin') {
      const adventurer = next.adventurers[action.adventurerId];
      if (
        !adventurer ||
        adventurer.playerId !== playerId ||
        adventurer.waterSpaceId == null ||
        adventurer.aboardRaftId != null
      )
        reject('Dolphin ใช้กับ Adventurer ที่กำลังว่ายน้ำเท่านั้น');
      const origin =
        adventurer.waterSpaceId ?? reject('Dolphin ใช้กับ Adventurer ที่กำลังว่ายน้ำเท่านั้น');
      const reachable = reachableWaterSpaces(next, origin, 2);
      if (action.waterSpaceId) {
        if (!reachable.includes(action.waterSpaceId)) reject('Dolphin ไปถึง Water space นี้ไม่ได้');
        if (kaijuAt(next, action.waterSpaceId)) reject('เข้า Kaiju space ไม่ได้');
        adventurer.waterSpaceId = action.waterSpaceId;
        adventurer.aboardRaftId = null;
        boardSwimmersThenResolveCreatures(next, action.waterSpaceId, playerId);
      } else {
        const destination =
          (action.tileId == null ? undefined : next.tiles[action.tileId]) ??
          reject('เลือกปลายทาง Dolphin ไม่ถูกต้อง');
        if (destination.state !== 'island') reject('เลือกปลายทาง Dolphin ไม่ถูกต้อง');
        if (kaijuAt(next, surviveTheIslandWaterSpaceForTile(destination.id)))
          reject('เข้า Kaiju space ไม่ได้');
        if (
          !surviveTheIslandWaterNeighboursForTile(destination.id, availableWaterSpaces(next)).some(
            (water) => reachable.includes(water),
          )
        )
          reject('Dolphin ไปถึง Island tile นี้ไม่ได้');
        adventurer.waterSpaceId = null;
        adventurer.aboardRaftId = null;
        adventurer.tileId = destination.id;
        destination.adventurerIds.push(adventurer.id);
      }
      consumeAbility(next, playerId, action.ability);
      next.lastEvent = next.pendingRaftBoarding ? next.lastEvent : 'ใช้ Dolphin';
      if (!next.pendingRepellent && !next.pendingRaftBoarding) finishIfNoAdventurersRemain(next);
      return next;
    }
    if (action.ability === 'dive') {
      const creature = next.creatures[action.creatureId];
      if (!creature || !isAvailableWaterSpace(next, action.waterSpaceId))
        reject('เลือก Creature หรือ Water space ไม่ถูกต้อง');
      if (
        Object.values(next.creatures).some(
          (item) => item.id !== creature.id && item.waterSpaceId === action.waterSpaceId,
        )
      )
        reject('Dive ต้องเลือก Water space ที่ว่าง');
      creature.waterSpaceId = action.waterSpaceId;
      consumeAbility(next, playerId, action.ability);
      recordPlacement(next, playerId, {
        kind: 'creature',
        tileId: surviveTheIslandTileIdForWaterSpace(action.waterSpaceId),
        waterSpaceId: action.waterSpaceId,
        creatureKind: creature.kind,
      });
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
    recordCreatureDieNotice(next, playerId, rolledKind);
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
      next.creaturesAdvancePending = false;
      next.risingWatersSunk = 0;
    }
    if (next.phase !== 'creatures') reject('ยังทอย Creature ไม่ได้');
    if (next.creaturesAdvancePending) reject('รอจบ interrupt ก่อนจบตา Creatures');
    if (next.creatureToMove) reject('ยังทอย Creature ไม่ได้');
    next.creatureToMove =
      CREATURE_DIE_KINDS[Math.floor(Math.random() * CREATURE_DIE_KINDS.length)]!;
    recordCreatureDieNotice(next, playerId, next.creatureToMove);
    next.lastEvent = `Creature die: ${next.creatureToMove}`;
    if (!Object.values(next.creatures).some((creature) => creature.kind === next.creatureToMove)) {
      next.lastEvent = `${next.lastEvent} — ไม่มีตัวนี้บนกระดาน`;
      next.creatureToMove = null;
      next.creaturesAdvancePending = true;
      tryFinishCreaturesTurn(next);
    } else if (!anyCreatureOfKindCanMove(next, next.creatureToMove)) {
      next.lastEvent = `${next.lastEvent} — ขยับไม่ได้`;
      next.creatureToMove = null;
      next.creaturesAdvancePending = true;
      tryFinishCreaturesTurn(next);
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
    next.creaturesAdvancePending = true;
    if (!next.pendingRepellent) next.lastEvent = `${creature.kind} เคลื่อนที่`;
    tryFinishCreaturesTurn(next);
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
      adventurer.aboardRaftId = null;
      // Sinking is not a movement, so the Adventurer may still swim on their next Action.
      adventurer.swamThisTurn = false;
    }
    tile.adventurerIds = [];
    const raftAlreadyHere = raftAtWaterSpace(next, revealedWaterSpace);
    if (raftAlreadyHere) tryBoardSwimmersOntoRaft(next, raftAlreadyHere, playerId);
    // `pendingRaftBoarding` is narrowed to null after the early handler above; re-read via cast.
    const pendingBoarding = next.pendingRaftBoarding as SurviveTheIslandPendingRaftBoarding | null;
    if (pendingBoarding) {
      pendingBoarding.deferredRevealBack = tile.back;
      return next;
    }
    if (tile.back.kind === 'ability') {
      next.players[playerId]!.abilities.push(tile.back.ability);
      next.lastEvent = `ได้ Ability: ${tile.back.ability}`;
    } else if (tile.back.effect === 'volcano') {
      next.volcanoesRevealed += 1;
      eliminateAdventurersAt(next, [revealedWaterSpace], 'volcano');
      Object.values(next.creatures).forEach((creature) => {
        if (creature.waterSpaceId === revealedWaterSpace) delete next.creatures[creature.id];
      });
      next.lastEvent = `Volcano ปะทุ (${next.volcanoesRevealed}/3)`;
    } else {
      next.lastEvent = applyEffect(next, tile.back.effect, revealedWaterSpace, playerId);
    }
    if (next.pendingRepellent || next.pendingRaftBoarding) return next;
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

function publicAdventurerView(
  adventurer: SurviveTheIslandAdventurer,
): Omit<SurviveTheIslandAdventurer, 'treasure'> {
  return Object.fromEntries(
    Object.entries(adventurer).filter(([key]) => key !== 'treasure'),
  ) as Omit<SurviveTheIslandAdventurer, 'treasure'>;
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
    adventurers: Object.values(state.adventurers).map(publicAdventurerView),
    rafts: Object.values(state.rafts),
    creatures: Object.values(state.creatures),
    myAdventurerTreasures: Object.fromEntries(
      (state.players[playerId]?.adventurerIds ?? []).map((id) => [
        id,
        state.adventurers[id]!.treasure,
      ]),
    ),
    myAbilities: [...(state.players[playerId]?.abilities ?? [])],
    movesRemaining: state.movesRemaining,
    risingWatersSunk: state.risingWatersSunk,
    risingWatersTilesToSink: state.risingWatersTilesToSink,
    volcanoesRevealed: state.volcanoesRevealed,
    creatureToMove: state.creatureToMove,
    pendingCreatureDie: state.pendingCreatureDie ?? null,
    pendingRepellent: state.pendingRepellent ?? null,
    pendingRaftBoarding: state.pendingRaftBoarding ?? null,
    lastReveal: state.lastReveal,
    lastPlacement: state.lastPlacement ?? null,
    creatureDieNoticeSeq: state.creatureDieNoticeSeq ?? 0,
    creatureDieNotice: state.creatureDieNotice ?? null,
    abilityUseNoticeSeq: state.abilityUseNoticeSeq ?? 0,
    abilityUseNotice: state.abilityUseNotice ?? null,
    rescueNoticeSeq: state.rescueNoticeSeq ?? 0,
    rescueNotice: state.rescueNotice ?? null,
    eliminationNoticeSeq: state.eliminationNoticeSeq ?? 0,
    eliminationNotice: state.eliminationNotice ?? null,
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
  description:
    'พา Adventurer ลงแพหนีเกาะที่กำลังจม — เลี่ยงฉลาม งูทะเล และไคจู แล้วไปถึงเกาะกู้ภัยให้ได้คะแนนมากที่สุด',
  minPlayers: 2,
  maxPlayers: 5,
  thumbnail: GAME_THUMBNAIL_BY_ID['survive-the-island'] ?? '',
  setup,
  onAction,
  getPlayerView,
  isGameOver: (state): GameResult | null => state.result,
};
