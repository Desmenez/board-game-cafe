import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES,
  SURVIVE_THE_ISLAND_WATER_CELLS,
  surviveTheIslandAdjacentWaterSpaces,
  surviveTheIslandWaterNeighboursForTile,
  surviveTheIslandWaterSpaceForTile,
  type Player,
  type SurviveTheIslandState,
  type SurviveTheIslandWaterSpace,
} from 'shared';
import { surviveTheIsland } from '../src/games/survive-the-island/engine.js';

function players(): Player[] {
  return ['p1', 'p2'].map((id) => ({
    id,
    name: id,
    avatar: { style: 'adventurer', seed: id },
    connected: true,
  })) as Player[];
}

let restoreRandom: (() => void) | null = null;

function mockRandomSequence(values: number[]): void {
  restoreRandom?.();
  let index = 0;
  const original = Math.random;
  Math.random = () => {
    const value = values[Math.min(index, values.length - 1)]!;
    index += 1;
    return value;
  };
  restoreRandom = () => {
    Math.random = original;
    restoreRandom = null;
  };
}

afterEach(() => {
  restoreRandom?.();
});

function freeWaterSpace(state: SurviveTheIslandState, near?: string): SurviveTheIslandWaterSpace {
  const creatureSpaces = new Set(
    Object.values(state.creatures).map((creature) => creature.waterSpaceId),
  );
  const raftSpaces = new Set(
    Object.values(state.rafts)
      .map((raft) => raft.waterSpaceId)
      .filter((id): id is string => id != null),
  );
  const candidates = near
    ? surviveTheIslandAdjacentWaterSpaces(near)
    : SURVIVE_THE_ISLAND_WATER_CELLS.map((cell) => cell.id);
  return candidates.find(
    (waterSpaceId) => !creatureSpaces.has(waterSpaceId) && !raftSpaces.has(waterSpaceId),
  )!;
}

describe('Survive the Island — Creature interactions', () => {
  it('eliminates an Adventurer that swims onto a Sea Serpent', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const seaSerpent = Object.values(state.creatures).find(
      (creature) => creature.kind === 'sea-serpent',
    )!;
    const origin = state.tiles.find((tile) =>
      surviveTheIslandWaterNeighboursForTile(tile.id).includes(
        seaSerpent.waterSpaceId as SurviveTheIslandWaterSpace,
      ),
    )!;
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.movesRemaining = 3;
    adventurer.tileId = origin.id;
    origin.adventurerIds = [adventurer.id];

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'move-adventurer',
      adventurerId: adventurer.id,
      waterSpaceId: seaSerpent.waterSpaceId,
    }) as SurviveTheIslandState;

    assert.equal(next.adventurers[adventurer.id]!.eliminated, true);
  });
});

describe('Survive the Island — Raft capacity', () => {
  it('does not let a fourth Adventurer enter a Raft space', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const target = state.tiles.flatMap((tile) =>
      surviveTheIslandWaterNeighboursForTile(tile.id)
        .filter(
          (waterSpaceId) =>
            !Object.values(state.creatures).some(
              (creature) => creature.waterSpaceId === waterSpaceId,
            ),
        )
        .map((waterSpaceId) => ({ tile, waterSpaceId })),
    )[0]!;
    const [first, second, third, fourth] = state.players[playerId]!.adventurerIds.map(
      (id) => state.adventurers[id]!,
    );
    const raft = state.rafts[state.players[playerId]!.raftIds[0]!]!;

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.movesRemaining = 3;
    raft.waterSpaceId = target.waterSpaceId;
    [first, second, third].forEach((adventurer) => {
      adventurer.waterSpaceId = target.waterSpaceId;
      adventurer.aboardRaftId = raft.id;
    });
    fourth.tileId = target.tile.id;
    target.tile.adventurerIds = [fourth.id];

    assert.throws(
      () =>
        surviveTheIsland.onAction(state, playerId, {
          type: 'move-adventurer',
          adventurerId: fourth.id,
          waterSpaceId: target.waterSpaceId,
        }),
      /Raft มีผู้โดยสารเต็ม 3 คนแล้ว/,
    );
  });

  it('counts passengers from a game created before raft passengers were tracked separately', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const target = state.tiles.flatMap((tile) =>
      surviveTheIslandWaterNeighboursForTile(tile.id)
        .filter(
          (waterSpaceId) =>
            !Object.values(state.creatures).some(
              (creature) => creature.waterSpaceId === waterSpaceId,
            ),
        )
        .map((waterSpaceId) => ({ tile, waterSpaceId })),
    )[0]!;
    const [first, second, third, fourth] = state.players[playerId]!.adventurerIds.map(
      (id) => state.adventurers[id]!,
    );
    const raft = state.rafts[state.players[playerId]!.raftIds[0]!]!;

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.movesRemaining = 3;
    raft.waterSpaceId = target.waterSpaceId;
    [first, second, third].forEach((adventurer) => {
      adventurer.waterSpaceId = target.waterSpaceId;
      delete (adventurer as Partial<typeof adventurer>).aboardRaftId;
    });
    fourth.tileId = target.tile.id;
    target.tile.adventurerIds = [fourth.id];

    assert.throws(
      () =>
        surviveTheIsland.onAction(state, playerId, {
          type: 'move-adventurer',
          adventurerId: fourth.id,
          waterSpaceId: target.waterSpaceId,
        }),
      /Raft มีผู้โดยสารเต็ม 3 คนแล้ว/,
    );
  });

  it('lets an Adventurer leave a Raft for an adjacent Water space', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const creatureSpaces = new Set(
      Object.values(state.creatures).map((creature) => creature.waterSpaceId),
    );
    const origin = SURVIVE_THE_ISLAND_WATER_CELLS.map((cell) => cell.id).find(
      (waterSpaceId) =>
        !creatureSpaces.has(waterSpaceId) &&
        surviveTheIslandAdjacentWaterSpaces(waterSpaceId).some(
          (neighbour) => !creatureSpaces.has(neighbour),
        ),
    )!;
    const destination = surviveTheIslandAdjacentWaterSpaces(origin).find(
      (waterSpaceId) => !creatureSpaces.has(waterSpaceId),
    )!;
    const raft = state.rafts[state.players[playerId]!.raftIds[0]!]!;
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.movesRemaining = 3;
    raft.waterSpaceId = origin;
    adventurer.tileId = null;
    adventurer.waterSpaceId = origin;
    adventurer.aboardRaftId = raft.id;

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'move-adventurer',
      adventurerId: adventurer.id,
      waterSpaceId: destination,
    }) as SurviveTheIslandState;

    assert.equal(next.adventurers[adventurer.id]!.waterSpaceId, destination);
    assert.equal(next.adventurers[adventurer.id]!.aboardRaftId, null);
    assert.equal(next.adventurers[adventurer.id]!.swamThisTurn, true);
  });
});

describe('Survive the Island — Rescue Island spaces', () => {
  it('leaves a swimmer on a Rescue Island space until they board', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const creatureSpaces = new Set(
      Object.values(state.creatures).map((creature) => creature.waterSpaceId),
    );
    const rescueSpace = SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES.find(
      (waterSpaceId) => !creatureSpaces.has(waterSpaceId),
    )!;
    const origin = surviveTheIslandAdjacentWaterSpaces(rescueSpace).find(
      (waterSpaceId) => !creatureSpaces.has(waterSpaceId),
    )!;
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.movesRemaining = 3;
    adventurer.tileId = null;
    adventurer.waterSpaceId = origin;

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'move-adventurer',
      adventurerId: adventurer.id,
      waterSpaceId: rescueSpace,
    }) as SurviveTheIslandState;

    assert.equal(next.adventurers[adventurer.id]!.rescued, false);
    assert.equal(next.adventurers[adventurer.id]!.waterSpaceId, rescueSpace);
    assert.equal(next.adventurers[adventurer.id]!.aboardRaftId, null);
    assert.equal(next.players[playerId]!.rescuedTreasure, 0);
    assert.equal(next.movesRemaining, 2);
  });

  it('uses one movement to board a swimming Adventurer at Rescue Island', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const rescueSpace = SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES[0]!;
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.movesRemaining = 3;
    adventurer.tileId = null;
    adventurer.waterSpaceId = rescueSpace;
    adventurer.aboardRaftId = null;

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'rescue-adventurer',
      adventurerId: adventurer.id,
    }) as SurviveTheIslandState;

    assert.equal(next.adventurers[adventurer.id]!.rescued, true);
    assert.equal(next.adventurers[adventurer.id]!.waterSpaceId, null);
    assert.equal(next.players[playerId]!.rescuedTreasure, adventurer.treasure);
    assert.equal(next.movesRemaining, 2);
  });

  it('keeps Raft passengers aboard when the Raft reaches Rescue Island', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const creatureSpaces = new Set(
      Object.values(state.creatures).map((creature) => creature.waterSpaceId),
    );
    const rescueSpace = SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES.find(
      (waterSpaceId) => !creatureSpaces.has(waterSpaceId),
    )!;
    const origin = surviveTheIslandAdjacentWaterSpaces(rescueSpace).find(
      (waterSpaceId) => !creatureSpaces.has(waterSpaceId),
    )!;
    const raft = state.rafts[state.players[playerId]!.raftIds[0]!]!;
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.movesRemaining = 3;
    raft.waterSpaceId = origin;
    adventurer.tileId = null;
    adventurer.waterSpaceId = origin;
    adventurer.aboardRaftId = raft.id;

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'move-raft',
      raftId: raft.id,
      waterSpaceId: rescueSpace,
    }) as SurviveTheIslandState;

    assert.equal(next.adventurers[adventurer.id]!.rescued, false);
    assert.equal(next.adventurers[adventurer.id]!.waterSpaceId, rescueSpace);
    assert.equal(next.adventurers[adventurer.id]!.aboardRaftId, raft.id);
    assert.equal(next.players[playerId]!.rescuedTreasure, 0);
  });

  it('uses one movement to rescue a selected Raft passenger at Rescue Island', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const rescueSpace = SURVIVE_THE_ISLAND_RESCUE_WATER_SPACES[0]!;
    const raft = state.rafts[state.players[playerId]!.raftIds[0]!]!;
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.movesRemaining = 3;
    raft.waterSpaceId = rescueSpace;
    adventurer.tileId = null;
    adventurer.waterSpaceId = rescueSpace;
    adventurer.aboardRaftId = raft.id;

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'rescue-adventurer',
      adventurerId: adventurer.id,
    }) as SurviveTheIslandState;

    assert.equal(next.adventurers[adventurer.id]!.rescued, true);
    assert.equal(next.players[playerId]!.rescuedTreasure, adventurer.treasure);
    assert.equal(next.movesRemaining, 2);
  });
});

describe('Survive the Island — Rising Waters', () => {
  it('starts with one tile to sink when the active player still has Adventurers', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;

    state.phase = 'action';
    state.activePlayerId = playerId;

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'finish-action',
    }) as SurviveTheIslandState;

    assert.equal(next.phase, 'rising_waters');
    assert.equal(next.risingWatersTilesToSink, 1);
  });

  it('allows only one tile before the Creature die is rolled by a player with Adventurers left', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const [beachToSink, ...otherBeaches] = state.tiles.filter((tile) => tile.terrain === 'beach');
    const forest = state.tiles.find((tile) => tile.terrain === 'forest')!;

    otherBeaches.forEach((tile) => {
      tile.state = 'sunk';
    });
    state.phase = 'rising_waters';
    state.activePlayerId = playerId;

    const afterBeach = surviveTheIsland.onAction(state, playerId, {
      type: 'sink-tile',
      tileId: beachToSink!.id,
    }) as SurviveTheIslandState;

    assert.throws(
      () =>
        surviveTheIsland.onAction(afterBeach, playerId, {
          type: 'sink-tile',
          tileId: forest.id,
        }),
      /เลือก tile ที่จมไม่ได้/,
    );
  });
});

describe('Survive the Island — Raft colliding with creatures', () => {
  it('destroys the Raft and eliminates all Adventurers when a Raft enters a Sea Serpent space', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const seaSerpent = Object.values(state.creatures).find((creature) => {
      if (creature.kind !== 'sea-serpent') return false;
      return surviveTheIslandAdjacentWaterSpaces(creature.waterSpaceId).some(
        (waterSpaceId) =>
          !Object.values(state.creatures).some((other) => other.waterSpaceId === waterSpaceId),
      );
    })!;
    const origin = freeWaterSpace(state, seaSerpent.waterSpaceId);
    const raft = state.rafts[state.players[playerId]!.raftIds[0]!]!;
    const [first, second] = state.players[playerId]!.adventurerIds.map(
      (id) => state.adventurers[id]!,
    );

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.movesRemaining = 3;
    raft.waterSpaceId = origin;
    for (const passenger of [first, second]) {
      passenger.tileId = null;
      passenger.waterSpaceId = origin;
      passenger.aboardRaftId = raft.id;
    }

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'move-raft',
      raftId: raft.id,
      waterSpaceId: seaSerpent.waterSpaceId,
    }) as SurviveTheIslandState;

    assert.equal(next.rafts[raft.id]!.waterSpaceId, null);
    assert.equal(next.adventurers[first.id]!.eliminated, true);
    assert.equal(next.adventurers[second.id]!.eliminated, true);
  });

  it('lets Raft passengers survive a Shark while eliminating swimmers in that space', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const sharkSpace = freeWaterSpace(state);
    const origin = freeWaterSpace(state, sharkSpace);
    state.creatures['shark:0'] = { id: 'shark:0', kind: 'shark', waterSpaceId: sharkSpace };
    const raft = state.rafts[state.players[playerId]!.raftIds[0]!]!;
    const [passenger, swimmer] = state.players[playerId]!.adventurerIds.map(
      (id) => state.adventurers[id]!,
    );

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.movesRemaining = 3;
    raft.waterSpaceId = origin;
    passenger.tileId = null;
    passenger.waterSpaceId = origin;
    passenger.aboardRaftId = raft.id;
    swimmer.tileId = null;
    swimmer.waterSpaceId = sharkSpace;
    swimmer.aboardRaftId = null;

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'move-raft',
      raftId: raft.id,
      waterSpaceId: sharkSpace,
    }) as SurviveTheIslandState;

    assert.equal(next.rafts[raft.id]!.waterSpaceId, sharkSpace);
    assert.equal(next.adventurers[passenger.id]!.eliminated, false);
    assert.equal(next.adventurers[passenger.id]!.aboardRaftId, raft.id);
    assert.equal(next.adventurers[swimmer.id]!.eliminated, true);
  });
});

describe('Survive the Island — Kaiju movement and blocking', () => {
  it('lets Kaiju move from water onto an Island tile using water:tile ids', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const island = state.tiles.find((tile) => tile.state === 'island')!;
    const water = surviveTheIslandWaterNeighboursForTile(island.id).find(
      (waterSpaceId) =>
        !Object.values(state.creatures).some((creature) => creature.waterSpaceId === waterSpaceId),
    )!;
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;
    state.creatures['kaiju:0'] = { id: 'kaiju:0', kind: 'kaiju', waterSpaceId: water };
    adventurer.tileId = island.id;
    island.adventurerIds = [adventurer.id];

    state.phase = 'creatures';
    state.activePlayerId = playerId;
    state.creatureToMove = 'kaiju';

    const destination = surviveTheIslandWaterSpaceForTile(island.id);
    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'move-creature',
      creatureId: 'kaiju:0',
      waterSpaceId: destination,
    }) as SurviveTheIslandState;

    assert.equal(next.creatures['kaiju:0']!.waterSpaceId, destination);
    assert.equal(next.tiles[island.id]!.adventurerIds.includes(adventurer.id), false);
    assert.notEqual(next.adventurers[adventurer.id]!.tileId, island.id);
  });

  it('rejects Shark moves onto Island tiles', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const island = state.tiles.find((tile) => tile.state === 'island')!;
    const water = surviveTheIslandWaterNeighboursForTile(island.id).find(
      (waterSpaceId) =>
        !Object.values(state.creatures).some((creature) => creature.waterSpaceId === waterSpaceId),
    )!;
    state.creatures['shark:0'] = { id: 'shark:0', kind: 'shark', waterSpaceId: water };

    state.phase = 'creatures';
    state.activePlayerId = playerId;
    state.creatureToMove = 'shark';

    assert.throws(
      () =>
        surviveTheIsland.onAction(state, playerId, {
          type: 'move-creature',
          creatureId: 'shark:0',
          waterSpaceId: surviveTheIslandWaterSpaceForTile(island.id),
        }),
      /Creature ไปถึง space นี้ไม่ได้/,
    );
  });

  it('rejects Adventurer and Raft movement into a Kaiju space', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const islandOrigin = state.tiles.find((tile) =>
      surviveTheIslandWaterNeighboursForTile(tile.id).some(
        (waterSpaceId) =>
          !Object.values(state.creatures).some(
            (creature) => creature.waterSpaceId === waterSpaceId,
          ),
      ),
    )!;
    const kaijuSpace = surviveTheIslandWaterNeighboursForTile(islandOrigin.id).find(
      (waterSpaceId) =>
        !Object.values(state.creatures).some((creature) => creature.waterSpaceId === waterSpaceId),
    )!;
    const adjacent = freeWaterSpace(state, kaijuSpace);
    state.creatures['kaiju:0'] = { id: 'kaiju:0', kind: 'kaiju', waterSpaceId: kaijuSpace };
    const raft = state.rafts[state.players[playerId]!.raftIds[0]!]!;
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.movesRemaining = 3;
    raft.waterSpaceId = adjacent;
    adventurer.tileId = islandOrigin.id;
    islandOrigin.adventurerIds = [adventurer.id];

    assert.throws(
      () =>
        surviveTheIsland.onAction(state, playerId, {
          type: 'move-raft',
          raftId: raft.id,
          waterSpaceId: kaijuSpace,
        }),
      /เข้า Kaiju space ไม่ได้/,
    );
    assert.throws(
      () =>
        surviveTheIsland.onAction(state, playerId, {
          type: 'move-adventurer',
          adventurerId: adventurer.id,
          waterSpaceId: kaijuSpace,
        }),
      /เข้า Kaiju space ไม่ได้/,
    );
  });

  function availableWaterIncludingSunk(state: SurviveTheIslandState): SurviveTheIslandWaterSpace[] {
    return [
      ...SURVIVE_THE_ISLAND_WATER_CELLS.map((cell) => cell.id),
      ...state.tiles
        .filter((tile) => tile.state === 'sunk')
        .map((tile) => surviveTheIslandWaterSpaceForTile(tile.id)),
    ];
  }

  function occupyAdjacentWatersWith(
    state: SurviveTheIslandState,
    origin: string,
    kind: 'sea-serpent' | 'shark',
  ): void {
    const destinations = surviveTheIslandAdjacentWaterSpaces(
      origin,
      availableWaterIncludingSunk(state),
    );
    destinations.forEach((waterSpaceId, index) => {
      const id = `${kind}:push-${index}`;
      state.creatures[id] = { id, kind, waterSpaceId };
    });
  }

  it('eliminates an Adventurer that a spawned Kaiju pushes onto a Sea Serpent', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const [beachToSink, ...otherBeaches] = state.tiles.filter((tile) => tile.terrain === 'beach');
    otherBeaches.forEach((tile) => {
      tile.state = 'sunk';
    });
    beachToSink!.back = { kind: 'effect', effect: 'kaiju' };
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;
    adventurer.tileId = beachToSink!.id;
    beachToSink!.adventurerIds = [adventurer.id];
    occupyAdjacentWatersWith(
      state,
      surviveTheIslandWaterSpaceForTile(beachToSink!.id),
      'sea-serpent',
    );

    state.phase = 'rising_waters';
    state.activePlayerId = playerId;
    state.risingWatersSunk = 0;
    state.risingWatersTilesToSink = 1;

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'sink-tile',
      tileId: beachToSink!.id,
    }) as SurviveTheIslandState;

    assert.equal(next.adventurers[adventurer.id]!.eliminated, true);
    assert.equal(next.adventurers[adventurer.id]!.waterSpaceId, null);
  });

  it('eliminates an Adventurer that a moving Kaiju pushes onto a Sea Serpent', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const landing = freeWaterSpace(state);
    const kaijuOrigin = surviveTheIslandAdjacentWaterSpaces(landing).find(
      (waterSpaceId) =>
        waterSpaceId !== landing &&
        !Object.values(state.creatures).some((creature) => creature.waterSpaceId === waterSpaceId),
    )!;
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;
    state.creatures['kaiju:0'] = { id: 'kaiju:0', kind: 'kaiju', waterSpaceId: kaijuOrigin };
    occupyAdjacentWatersWith(state, landing, 'sea-serpent');
    adventurer.tileId = null;
    adventurer.waterSpaceId = landing;
    adventurer.aboardRaftId = null;

    state.phase = 'creatures';
    state.activePlayerId = playerId;
    state.creatureToMove = 'kaiju';

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'move-creature',
      creatureId: 'kaiju:0',
      waterSpaceId: landing,
    }) as SurviveTheIslandState;

    assert.equal(next.adventurers[adventurer.id]!.eliminated, true);
    assert.equal(next.adventurers[adventurer.id]!.waterSpaceId, null);
  });

  it('eliminates a swimmer that a moving Kaiju pushes onto a Shark', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const landing = freeWaterSpace(state);
    const kaijuOrigin = surviveTheIslandAdjacentWaterSpaces(landing).find(
      (waterSpaceId) =>
        waterSpaceId !== landing &&
        !Object.values(state.creatures).some((creature) => creature.waterSpaceId === waterSpaceId),
    )!;
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;
    state.creatures['kaiju:0'] = { id: 'kaiju:0', kind: 'kaiju', waterSpaceId: kaijuOrigin };
    occupyAdjacentWatersWith(state, landing, 'shark');
    adventurer.tileId = null;
    adventurer.waterSpaceId = landing;
    adventurer.aboardRaftId = null;

    state.phase = 'creatures';
    state.activePlayerId = playerId;
    state.creatureToMove = 'kaiju';

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'move-creature',
      creatureId: 'kaiju:0',
      waterSpaceId: landing,
    }) as SurviveTheIslandState;

    assert.equal(next.adventurers[adventurer.id]!.eliminated, true);
    assert.equal(next.adventurers[adventurer.id]!.waterSpaceId, null);
  });
});

describe('Survive the Island — Creature die faces', () => {
  it('skips movement and advances when the rolled kind is absent from the board', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    // Setup only has sea serpents; 0.4 → shark face.
    mockRandomSequence([0.4]);

    state.phase = 'creatures';
    state.activePlayerId = playerId;
    state.creatureToMove = null;

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'roll-creature',
    }) as SurviveTheIslandState;

    assert.equal(next.creatureToMove, null);
    assert.equal(next.phase, 'action');
    assert.match(next.lastEvent ?? '', /shark/);
    assert.match(next.lastEvent ?? '', /ไม่มีตัวนี้บนกระดาน/);
  });

  it('skips movement and advances when every Shark is boxed in by land', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    mockRandomSequence([0.4]);

    state.phase = 'creatures';
    state.activePlayerId = playerId;
    state.creatureToMove = null;
    for (const id of Object.keys(state.creatures)) {
      if (state.creatures[id]!.kind === 'shark') delete state.creatures[id];
    }
    state.creatures['shark:0'] = { id: 'shark:0', kind: 'shark', waterSpaceId: 'water:3:0' };

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'roll-creature',
    }) as SurviveTheIslandState;

    assert.equal(next.creatureToMove, null);
    assert.equal(next.phase, 'action');
    assert.equal(next.creatures['shark:0']!.waterSpaceId, 'water:3:0');
    assert.match(next.lastEvent ?? '', /shark/);
    assert.match(next.lastEvent ?? '', /ขยับไม่ได้/);
  });

  it('still requires a Shark move when another Shark has a legal water destination', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    mockRandomSequence([0.4]);
    const openWater = SURVIVE_THE_ISLAND_WATER_CELLS.map((cell) => cell.id).find(
      (waterSpaceId) =>
        waterSpaceId !== 'water:3:0' &&
        surviveTheIslandAdjacentWaterSpaces(waterSpaceId).length > 0 &&
        !Object.values(state.creatures).some((creature) => creature.waterSpaceId === waterSpaceId),
    )!;

    state.phase = 'creatures';
    state.activePlayerId = playerId;
    state.creatureToMove = null;
    for (const id of Object.keys(state.creatures)) {
      if (state.creatures[id]!.kind === 'shark') delete state.creatures[id];
    }
    state.creatures['shark:0'] = { id: 'shark:0', kind: 'shark', waterSpaceId: 'water:3:0' };
    state.creatures['shark:1'] = { id: 'shark:1', kind: 'shark', waterSpaceId: openWater };

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'roll-creature',
    }) as SurviveTheIslandState;

    assert.equal(next.creatureToMove, 'shark');
    assert.equal(next.phase, 'creatures');
    assert.equal(next.creatures['shark:0']!.waterSpaceId, 'water:3:0');
    assert.equal(next.creatures['shark:1']!.waterSpaceId, openWater);
  });

  it('skips the creature-die ability when the rolled kind is absent', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    mockRandomSequence([0.4]);

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.players[playerId]!.abilities.push('creature-die');

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'use-ability',
      ability: 'creature-die',
    }) as SurviveTheIslandState;

    assert.equal(next.players[playerId]!.abilities.includes('creature-die'), false);
    assert.equal(next.pendingCreatureDie, null);
    assert.equal(next.phase, 'action');
    assert.equal(
      Object.values(next.creatures).every((creature) => creature.kind === 'sea-serpent'),
      true,
    );
    assert.match(next.lastEvent ?? '', /shark/);
    assert.match(next.lastEvent ?? '', /ไม่มีตัวบนกระดาน/);
  });

  it('skips the creature-die ability when every Shark is boxed in by land', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    mockRandomSequence([0.4]);

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.players[playerId]!.abilities.push('creature-die');
    for (const id of Object.keys(state.creatures)) {
      if (state.creatures[id]!.kind === 'shark') delete state.creatures[id];
    }
    state.creatures['shark:0'] = { id: 'shark:0', kind: 'shark', waterSpaceId: 'water:3:0' };

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'use-ability',
      ability: 'creature-die',
    }) as SurviveTheIslandState;

    assert.equal(next.players[playerId]!.abilities.includes('creature-die'), false);
    assert.equal(next.pendingCreatureDie, null);
    assert.equal(next.phase, 'action');
    assert.equal(next.creatures['shark:0']!.waterSpaceId, 'water:3:0');
    assert.match(next.lastEvent ?? '', /shark/);
    assert.match(next.lastEvent ?? '', /ขยับไม่ได้/);
  });

  it('requires a player-chosen move when the rolled kind is on the board', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    mockRandomSequence([0]);

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.players[playerId]!.abilities.push('creature-die');
    const before = Object.fromEntries(
      Object.values(state.creatures).map((creature) => [creature.id, creature.waterSpaceId]),
    );

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'use-ability',
      ability: 'creature-die',
    }) as SurviveTheIslandState;

    assert.deepEqual(next.pendingCreatureDie, { kind: 'sea-serpent' });
    assert.equal(next.players[playerId]!.abilities.includes('creature-die'), true);
    assert.equal(next.phase, 'action');
    assert.equal(next.creatureToMove, null);
    for (const creature of Object.values(next.creatures)) {
      assert.equal(creature.waterSpaceId, before[creature.id]);
    }
    assert.throws(
      () => surviveTheIsland.onAction(next, playerId, { type: 'finish-action' }),
      /ต้องขยับ Creature จากลูกเต๋าก่อน/,
    );
  });

  it('consumes the ability after the chosen move and stays in Action', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    mockRandomSequence([0]);

    state.phase = 'action';
    state.activePlayerId = playerId;
    state.movesRemaining = 3;
    state.players[playerId]!.abilities.push('creature-die');

    const rolled = surviveTheIsland.onAction(state, playerId, {
      type: 'use-ability',
      ability: 'creature-die',
    }) as SurviveTheIslandState;
    const occupied = new Set(
      Object.values(rolled.creatures).map((creature) => creature.waterSpaceId),
    );
    const destination = Object.values(rolled.creatures)
      .filter((creature) => creature.kind === 'sea-serpent')
      .flatMap((creature) =>
        surviveTheIslandAdjacentWaterSpaces(creature.waterSpaceId).map((waterSpaceId) => ({
          creature,
          waterSpaceId,
        })),
      )
      .find(({ waterSpaceId }) => !occupied.has(waterSpaceId));
    assert.ok(destination, 'expected a legal sea-serpent step');

    const next = surviveTheIsland.onAction(rolled, playerId, {
      type: 'move-creature',
      creatureId: destination.creature.id,
      waterSpaceId: destination.waterSpaceId,
    }) as SurviveTheIslandState;

    assert.equal(next.phase, 'action');
    assert.equal(next.pendingCreatureDie, null);
    assert.equal(next.players[playerId]!.abilities.includes('creature-die'), false);
    assert.equal(next.creatures[destination.creature.id]!.waterSpaceId, destination.waterSpaceId);
    assert.equal(next.activePlayerId, playerId);
    assert.equal(next.movesRemaining, 3);
  });
});

describe('Survive the Island — Shark capacity', () => {
  it('keeps at most six Sharks by relocating an existing one when supply is full', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const freeSpaces = SURVIVE_THE_ISLAND_WATER_CELLS.map((cell) => cell.id).filter(
      (waterSpaceId) =>
        !Object.values(state.creatures).some((creature) => creature.waterSpaceId === waterSpaceId),
    );
    for (let index = 0; index < 6; index += 1) {
      const id = `shark:${index}`;
      state.creatures[id] = { id, kind: 'shark', waterSpaceId: freeSpaces[index]! };
    }
    const [beachToSink, ...otherBeaches] = state.tiles.filter((tile) => tile.terrain === 'beach');
    otherBeaches.forEach((tile) => {
      tile.state = 'sunk';
    });
    beachToSink!.back = { kind: 'effect', effect: 'shark' };

    state.phase = 'rising_waters';
    state.activePlayerId = playerId;
    state.risingWatersSunk = 0;
    state.risingWatersTilesToSink = 1;

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'sink-tile',
      tileId: beachToSink!.id,
    }) as SurviveTheIslandState;

    const sharks = Object.values(next.creatures).filter((creature) => creature.kind === 'shark');
    assert.equal(sharks.length, 6);
    assert.ok(
      sharks.some(
        (shark) => shark.waterSpaceId === surviveTheIslandWaterSpaceForTile(beachToSink!.id),
      ),
    );
  });
});

describe('Survive the Island — Repellent interrupt', () => {
  function placeSwimmerOnEmptyWater(state: SurviveTheIslandState, playerId: string) {
    const dest = freeWaterSpace(state);
    const origin = surviveTheIslandAdjacentWaterSpaces(dest).find(
      (waterSpaceId) =>
        waterSpaceId !== dest &&
        !Object.values(state.creatures).some((creature) => creature.waterSpaceId === waterSpaceId),
    )!;
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;
    adventurer.tileId = null;
    adventurer.waterSpaceId = dest;
    adventurer.aboardRaftId = null;
    return { dest, origin, adventurer };
  }

  it('pauses Shark arrival when an Adventurer owner has Repellent', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const { dest, origin, adventurer } = placeSwimmerOnEmptyWater(state, playerId);
    state.creatures['shark:0'] = { id: 'shark:0', kind: 'shark', waterSpaceId: origin };
    state.players[playerId]!.abilities.push('repellent');
    state.phase = 'creatures';
    state.activePlayerId = playerId;
    state.creatureToMove = 'shark';

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'move-creature',
      creatureId: 'shark:0',
      waterSpaceId: dest,
    }) as SurviveTheIslandState;

    assert.equal(next.phase, 'creatures');
    assert.equal(next.adventurers[adventurer.id]!.eliminated, false);
    assert.equal(next.creatures['shark:0']!.waterSpaceId, dest);
    assert.deepEqual(next.pendingRepellent?.eligiblePlayerIds, [playerId]);
    assert.equal(next.pendingRepellent?.kind, 'shark');
    assert.equal(next.players[playerId]!.abilities.includes('repellent'), true);
  });

  it('lets the first of two eligible players consume Repellent and remove the Shark', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const [playerId, otherId] = state.playerOrder as [string, string];
    const { dest, origin, adventurer } = placeSwimmerOnEmptyWater(state, playerId);
    const other = state.adventurers[state.players[otherId]!.adventurerIds[0]!]!;
    other.tileId = null;
    other.waterSpaceId = dest;
    other.aboardRaftId = null;
    state.creatures['shark:0'] = { id: 'shark:0', kind: 'shark', waterSpaceId: origin };
    state.players[playerId]!.abilities.push('repellent');
    state.players[otherId]!.abilities.push('repellent');
    state.phase = 'creatures';
    state.activePlayerId = playerId;
    state.creatureToMove = 'shark';

    const offered = surviveTheIsland.onAction(state, playerId, {
      type: 'move-creature',
      creatureId: 'shark:0',
      waterSpaceId: dest,
    }) as SurviveTheIslandState;
    const spectator = surviveTheIsland.getPlayerView(offered, otherId);
    assert.ok(spectator.pendingRepellent);
    assert.equal(spectator.pendingRepellent?.eligiblePlayerIds.includes(playerId), true);
    assert.equal(spectator.pendingRepellent?.eligiblePlayerIds.includes(otherId), true);

    const next = surviveTheIsland.onAction(offered, otherId, {
      type: 'use-ability',
      ability: 'repellent',
      creatureId: 'shark:0',
    }) as SurviveTheIslandState;

    assert.equal(next.creatures['shark:0'], undefined);
    assert.equal(next.pendingRepellent, null);
    assert.equal(next.adventurers[adventurer.id]!.eliminated, false);
    assert.equal(next.adventurers[other.id]!.eliminated, false);
    assert.equal(next.players[otherId]!.abilities.includes('repellent'), false);
    assert.equal(next.players[playerId]!.abilities.includes('repellent'), true);
    assert.equal(next.phase, 'action');
    assert.equal(next.activePlayerId, otherId);
  });

  it('does not offer Repellent when a Sea Serpent shares the space', () => {
    const state = surviveTheIsland.setup(players()) as SurviveTheIslandState;
    const playerId = state.playerOrder[0]!;
    const occupied = new Set(
      Object.values(state.creatures).map((creature) => creature.waterSpaceId),
    );
    const step = Object.values(state.creatures)
      .filter((creature) => creature.kind === 'sea-serpent')
      .flatMap((creature) =>
        surviveTheIslandAdjacentWaterSpaces(creature.waterSpaceId).map((waterSpaceId) => ({
          creature,
          waterSpaceId,
        })),
      )
      .find(({ waterSpaceId }) => !occupied.has(waterSpaceId));
    assert.ok(step, 'expected a legal sea-serpent step');
    const adventurer = state.adventurers[state.players[playerId]!.adventurerIds[0]!]!;
    adventurer.tileId = null;
    adventurer.waterSpaceId = step.waterSpaceId;
    adventurer.aboardRaftId = null;
    state.players[playerId]!.abilities.push('repellent');
    state.phase = 'creatures';
    state.activePlayerId = playerId;
    state.creatureToMove = 'sea-serpent';

    const next = surviveTheIsland.onAction(state, playerId, {
      type: 'move-creature',
      creatureId: step.creature.id,
      waterSpaceId: step.waterSpaceId,
    }) as SurviveTheIslandState;

    assert.equal(next.pendingRepellent, null);
    assert.equal(next.adventurers[adventurer.id]!.eliminated, true);
    assert.equal(next.phase, 'action');
  });
});
