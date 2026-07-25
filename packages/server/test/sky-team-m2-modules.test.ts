import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { Player, SkyTeamState } from 'shared';
import { skyTeamGame } from '../src/games/sky-team/engine.js';
import { startDicePlacement } from '../src/games/sky-team/helpers.js';
import { KEROSENE_IDLE_LOSS, KEROSENE_START } from '../src/games/sky-team/modules/kerosene.js';
import { TRAFFIC_DIE_AIRPLANE_SUPPLY } from '../src/games/sky-team/modules/traffic-die.js';
import { validateTurnConstraints } from '../src/games/sky-team/modules/turns.js';
import { advanceApproach } from '../src/games/sky-team/resolve.js';
import { endRound } from '../src/games/sky-team/endRound.js';
import { toPlayerView } from '../src/games/sky-team/view.js';

const players: Player[] = [
  { id: 'pilot', name: 'Pilot' },
  { id: 'copilot', name: 'Co-Pilot' },
];

let restoreRandom: (() => void) | null = null;

function mockRandomSequence(values: number[]): void {
  restoreRandom?.();
  let i = 0;
  const original = Math.random;
  Math.random = () => {
    const v = values[Math.min(i, values.length - 1)]!;
    i += 1;
    return v;
  };
  restoreRandom = () => {
    Math.random = original;
    restoreRandom = null;
  };
}

afterEach(() => {
  restoreRandom?.();
});

function setup(modules: string[]): SkyTeamState {
  return skyTeamGame.setup(players, {
    strategySeconds: 90,
    scenarioId: 'yul',
    enabledModules: modules,
    selectedSpecialAbilityIds: [],
  }) as SkyTeamState;
}

describe('Sky Team Milestone 2 — Traffic Die', () => {
  it('sets up airplane supply when enabled', () => {
    const state = setup(['traffic-die']);
    assert.ok(state.moduleState.trafficDie);
    assert.equal(state.moduleState.trafficDie.remainingAirplaneTokens, TRAFFIC_DIE_AIRPLANE_SUPPLY);
    assert.deepEqual(state.moduleState.trafficDie.lastRolls, []);
  });

  it('does nothing on spaces without trafficDieRolls', () => {
    const state = setup(['traffic-die']);
    assert.equal(state.approachPosition, 0);
    const planesBefore = state.approach.map((s) => s.planes);
    startDicePlacement(state);
    assert.deepEqual(state.approach.map((s) => s.planes), planesBefore);
    assert.deepEqual(state.moduleState.trafficDie?.lastRolls, []);
  });

  it('rolls on current space and places airplanes (server RNG)', () => {
    const state = setup(['traffic-die']);
    state.approachPosition = 1; // 1 traffic die roll
    // Math.random → 0 → roll 1 → place on current space (+0 ahead)
    mockRandomSequence([0]);
    const planesOnCurrent = state.approach[1]!.planes;
    startDicePlacement(state);
    assert.deepEqual(state.moduleState.trafficDie?.lastRolls, [1]);
    assert.equal(state.approach[1]!.planes, planesOnCurrent + 1);
    assert.equal(
      state.moduleState.trafficDie?.remainingAirplaneTokens,
      TRAFFIC_DIE_AIRPLANE_SUPPLY - 1,
    );
    assert.ok(state.eventLog.some((l) => l === 'Traffic Die rolled 1'));
    assert.ok(state.eventLog.some((l) => /appeared on the current approach space/.test(l)));
  });

  it('clamps overflow rolls onto the airport', () => {
    const state = setup(['traffic-die']);
    state.approachPosition = 5; // 1 roll; roll 6 → beyond airport
    mockRandomSequence([0.99]); // → 6
    const airportPlanes = state.approach[6]!.planes;
    startDicePlacement(state);
    assert.deepEqual(state.moduleState.trafficDie?.lastRolls, [6]);
    assert.equal(state.approach[6]!.planes, airportPlanes + 1);
    assert.ok(state.eventLog.some((l) => /appeared at the airport/.test(l)));
  });

  it('skips placement when supply is empty', () => {
    const state = setup(['traffic-die']);
    state.approachPosition = 1;
    state.moduleState.trafficDie!.remainingAirplaneTokens = 0;
    mockRandomSequence([0]);
    const planes = state.approach.map((s) => s.planes);
    startDicePlacement(state);
    assert.deepEqual(state.approach.map((s) => s.planes), planes);
    assert.ok(state.eventLog.some((l) => /No airplane token remained/.test(l)));
  });
});

describe('Sky Team Milestone 2 — Turns', () => {
  it('does not check on advance 0', () => {
    const state = setup(['turns']);
    state.axisPosition = 2;
    state.approachPosition = 0;
    advanceApproach(state, 0);
    assert.equal(state.result, null);
  });

  it('loses when destination axis is illegal (advance 1)', () => {
    const state = setup(['turns']);
    // Space 1 allows [-1,0,1]
    state.approachPosition = 0;
    state.axisPosition = 2;
    // Clear planes so collision does not fire first
    for (const s of state.approach) s.planes = 0;
    advanceApproach(state, 1);
    assert.ok(state.result);
    assert.equal(state.loseReason, 'turn_constraint');
    assert.match(state.result!.reason, /Invalid aircraft axis while passing a turn constraint/);
  });

  it('checks both path and destination on advance 2', () => {
    const state = setup(['turns']);
    state.approachPosition = 0;
    state.axisPosition = 0;
    for (const s of state.approach) s.planes = 0;
    // Space 3 allows only [0] — we'll pass space 1 (ok) and 2 (ok for 0)
    // Force fail on space 3 by setting axis after... actually validate uses current axis for all traversed.
    state.axisPosition = 2;
    advanceApproach(state, 2);
    // Space 1 forbids ±2 → lose on first traversed
    assert.equal(state.loseReason, 'turn_constraint');
  });

  it('passes when axis is allowed', () => {
    const state = setup(['turns']);
    state.approachPosition = 0;
    state.axisPosition = 0;
    for (const s of state.approach) s.planes = 0;
    advanceApproach(state, 1);
    assert.equal(state.result, null);
    assert.equal(state.approachPosition, 1);
  });

  it('validateTurnConstraints is a no-op without module state', () => {
    const state = setup([]);
    state.axisPosition = 99;
    validateTurnConstraints(state, [1, 2, 3]);
    assert.equal(state.result, null);
  });
});

describe('Sky Team Milestone 2 — Kerosene', () => {
  it('starts at 20 and exposes the slot only when enabled', () => {
    const off = setup([]);
    const on = setup(['kerosene']);
    assert.equal(on.moduleState.kerosene?.remaining, KEROSENE_START);
    const offView = toPlayerView(off, 'pilot');
    const onView = toPlayerView(on, 'pilot');
    assert.ok(!offView.slots.some((s) => s.id === 'kerosene'));
    assert.ok(onView.slots.some((s) => s.id === 'kerosene'));
  });

  it('spends die value on place', () => {
    const state = setup(['kerosene']);
    let s = skyTeamGame.onAction(state, 'pilot', { type: 'finish-strategy' });
    s = skyTeamGame.onAction(s, 'copilot', { type: 'finish-strategy' });
    assert.equal(s.phase, 'dice_placement');

    const die = s.dice.find((d) => d.inHand && d.color === 'blue')!;
    die.value = 3;
    s.currentPlayerId = 'pilot';
    s = skyTeamGame.onAction(s, 'pilot', {
      type: 'place-die',
      dieId: die.id,
      slotId: 'kerosene',
    });
    assert.equal(s.moduleState.kerosene?.remaining, KEROSENE_START - 3);
    assert.equal(s.moduleState.kerosene?.diePlacedThisRound, true);
    assert.equal(s.result, null);
  });

  it('survives when remaining lands exactly on 0', () => {
    const state = setup(['kerosene']);
    let s = skyTeamGame.onAction(state, 'pilot', { type: 'finish-strategy' });
    s = skyTeamGame.onAction(s, 'copilot', { type: 'finish-strategy' });
    s.moduleState.kerosene!.remaining = 3;
    const die = s.dice.find((d) => d.inHand && d.color === 'blue')!;
    die.value = 3;
    s.currentPlayerId = 'pilot';
    s = skyTeamGame.onAction(s, 'pilot', {
      type: 'place-die',
      dieId: die.id,
      slotId: 'kerosene',
    });
    assert.equal(s.moduleState.kerosene?.remaining, 0);
    assert.equal(s.result, null);
    assert.equal(s.loseReason, null);
  });

  it('loses immediately when placement goes below 0 (red X)', () => {
    const state = setup(['kerosene']);
    let s = skyTeamGame.onAction(state, 'pilot', { type: 'finish-strategy' });
    s = skyTeamGame.onAction(s, 'copilot', { type: 'finish-strategy' });
    s.moduleState.kerosene!.remaining = 2;
    const die = s.dice.find((d) => d.inHand && d.color === 'blue')!;
    die.value = 4;
    s.currentPlayerId = 'pilot';
    s = skyTeamGame.onAction(s, 'pilot', {
      type: 'place-die',
      dieId: die.id,
      slotId: 'kerosene',
    });
    assert.equal(s.loseReason, 'kerosene_empty');
    assert.ok(s.result);
  });

  it('loses 6 at end of round when no kerosene die was placed', () => {
    const state = setup(['kerosene']);
    // Fill mandatory slots so endRound does not lose for missing_mandatory
    state.phase = 'dice_placement';
    state.placedDice = [
      { dieId: 'a', slotId: 'axis_pilot', color: 'blue', value: 3, ownerId: 'pilot' },
      { dieId: 'b', slotId: 'axis_copilot', color: 'orange', value: 3, ownerId: 'copilot' },
      { dieId: 'c', slotId: 'engine_pilot', color: 'blue', value: 2, ownerId: 'pilot' },
      { dieId: 'd', slotId: 'engine_copilot', color: 'orange', value: 2, ownerId: 'copilot' },
    ];
    state.lastSpeed = 4;
    state.moduleState.kerosene!.diePlacedThisRound = false;
    endRound(state);
    assert.equal(state.moduleState.kerosene?.remaining, KEROSENE_START - KEROSENE_IDLE_LOSS);
    assert.equal(state.moduleState.kerosene?.diePlacedThisRound, false);
    assert.equal(state.result, null);
  });

  it('does not idle-drain when a kerosene die was placed', () => {
    const state = setup(['kerosene']);
    state.phase = 'dice_placement';
    state.placedDice = [
      { dieId: 'a', slotId: 'axis_pilot', color: 'blue', value: 3, ownerId: 'pilot' },
      { dieId: 'b', slotId: 'axis_copilot', color: 'orange', value: 3, ownerId: 'copilot' },
      { dieId: 'c', slotId: 'engine_pilot', color: 'blue', value: 2, ownerId: 'pilot' },
      { dieId: 'd', slotId: 'engine_copilot', color: 'orange', value: 2, ownerId: 'copilot' },
    ];
    state.lastSpeed = 4;
    state.moduleState.kerosene!.remaining = 15;
    state.moduleState.kerosene!.diePlacedThisRound = true;
    endRound(state);
    assert.equal(state.moduleState.kerosene?.remaining, 15);
    assert.equal(state.moduleState.kerosene?.diePlacedThisRound, false);
  });
});

describe('Sky Team Milestone 2 — base game unchanged', () => {
  it('has empty moduleState when no modules enabled', () => {
    const state = setup([]);
    assert.deepEqual(state.enabledModules, []);
    assert.deepEqual(state.moduleState, {});
  });
});
