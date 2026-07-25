import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { Player, SkyTeamState } from 'shared';
import { getSkyTeamLobbyValidationErrors } from 'shared';
import { skyTeamGame } from '../src/games/sky-team/engine.js';
import { startDicePlacement } from '../src/games/sky-team/helpers.js';
import { closestInternToken } from '../src/games/sky-team/modules/intern.js';
import { KEROSENE_START } from '../src/games/sky-team/modules/kerosene.js';
import { applyWindAfterAxis } from '../src/games/sky-team/modules/wind.js';
import { resolveAxisIfReady, resolveEngineIfReady } from '../src/games/sky-team/resolve.js';
import { toPlayerView } from '../src/games/sky-team/view.js';
import { applyInternFinalLanding } from '../src/games/sky-team/modules/intern.js';
import { applyIceBrakesFinalLanding } from '../src/games/sky-team/modules/ice-brakes.js';
import { applySkyTeamTimerExpiry } from '../src/games/sky-team/placement.js';
import { setupSkyTeamForTest } from './sky-team-test-setup.js';

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
  return setupSkyTeamForTest({ modules, players });
}

function setDieValue(state: SkyTeamState, dieId: string, value: number): void {
  const die = state.dice.find((d) => d.id === dieId);
  assert.ok(die);
  die.value = value;
}

function blueDice(state: SkyTeamState) {
  return state.dice.filter((d) => d.color === 'blue' && d.inHand);
}

function orangeDice(state: SkyTeamState) {
  return state.dice.filter((d) => d.color === 'orange' && d.inHand);
}

describe('Sky Team Milestone 3 — Intern', () => {
  it('sets up 6 shuffled tokens', () => {
    mockRandomSequence([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
    const state = setup(['intern']);
    assert.ok(state.moduleState.intern);
    assert.equal(state.moduleState.intern.wells.length, 6);
    const values = state.moduleState.intern.wells
      .filter(Boolean)
      .map((t) => t!.value)
      .sort();
    assert.deepEqual(values, [1, 2, 3, 4, 5, 6]);
  });

  it('rejects die equal to closest token', () => {
    const state = setup(['intern']);
    startDicePlacement(state);
    state.currentPlayerId = 'pilot';
    const next = closestInternToken(state.moduleState.intern!.wells, 'pilot')!;
    const die = blueDice(state)[0]!;
    setDieValue(state, die.id, next.value);

    assert.throws(
      () =>
        skyTeamGame.onAction(state, 'pilot', {
          type: 'place-die',
          dieId: die.id,
          slotId: 'intern_pilot',
        }),
      /วางในช่องนี้ไม่ได้/,
    );
  });

  it('takes closest token from pilot side and requires place-intern-token', () => {
    const state = setup(['intern']);
    startDicePlacement(state);
    state.currentPlayerId = 'pilot';
    const next = closestInternToken(state.moduleState.intern!.wells, 'pilot')!;
    const tokenValue = next.value;
    const die = blueDice(state)[0]!;
    const dieValue = tokenValue === 6 ? 5 : ((tokenValue + 1) as 1 | 2 | 3 | 4 | 5 | 6);
    setDieValue(state, die.id, dieValue);

    const afterTrain = skyTeamGame.onAction(state, 'pilot', {
      type: 'place-die',
      dieId: die.id,
      slotId: 'intern_pilot',
    }) as SkyTeamState;

    assert.equal(afterTrain.moduleState.intern!.wells.filter(Boolean).length, 5);
    assert.equal(afterTrain.moduleState.intern!.wells[0], null);
    assert.ok(afterTrain.moduleState.intern!.pendingToken);
    assert.equal(afterTrain.moduleState.intern!.pendingToken!.value, tokenValue);
    assert.equal(afterTrain.currentPlayerId, 'pilot');

    // Cannot place another die while pending
    const other = blueDice(afterTrain)[0]!;
    assert.throws(
      () =>
        skyTeamGame.onAction(afterTrain, 'pilot', {
          type: 'place-die',
          dieId: other.id,
          slotId: 'radio_pilot',
        }),
      /Intern token/,
    );

    // Reject concentration
    assert.throws(
      () =>
        skyTeamGame.onAction(afterTrain, 'pilot', {
          type: 'place-intern-token',
          slotId: 'concentration_1',
        }),
      /Concentration/,
    );

    // Place on radio (any value ok for pilot)
    const afterPlace = skyTeamGame.onAction(afterTrain, 'pilot', {
      type: 'place-intern-token',
      slotId: 'radio_pilot',
    }) as SkyTeamState;

    assert.equal(afterPlace.moduleState.intern!.pendingToken, undefined);
    const placed = afterPlace.placedDice.find((p) => p.slotId === 'radio_pilot');
    assert.ok(placed);
    assert.equal(placed.source, 'intern');
    assert.equal(placed.value, tokenValue);
  });

  it('blocks win when tokens remain', () => {
    const state = setup(['intern']);
    assert.ok(state.moduleState.intern!.wells.some(Boolean));
    const msg = applyInternFinalLanding(state);
    assert.ok(msg);
    assert.match(msg, /Intern/);
  });

  it('allows win check when tokens empty', () => {
    const state = setup(['intern']);
    state.moduleState.intern!.wells = [null, null, null, null, null, null];
    assert.equal(applyInternFinalLanding(state), null);
  });

  it('shows intern slots only when module enabled', () => {
    const withMod = setup(['intern']);
    const without = setup([]);
    const v1 = toPlayerView(withMod, 'pilot');
    const v2 = toPlayerView(without, 'pilot');
    assert.ok(v1.slots.some((s) => s.id === 'intern_pilot'));
    assert.ok(!v2.slots.some((s) => s.id === 'intern_pilot'));
  });
});

describe('Sky Team Milestone 3 — Wind', () => {
  it('sets up at center with modifier 0', () => {
    const state = setup(['wind']);
    assert.deepEqual(state.moduleState.wind, { position: 0, modifier: 0 });
  });

  it('rotates left when axis is toward Pilot', () => {
    const state = setup(['wind']);
    state.axisPosition = 2;
    applyWindAfterAxis(state);
    // CW ring from 0; CCW 2 → index 18 → -2
    assert.equal(state.moduleState.wind!.position, 18);
    assert.equal(state.moduleState.wind!.modifier, -2);
  });

  it('rotates right when axis is toward Co-Pilot', () => {
    const state = setup(['wind']);
    state.axisPosition = -1;
    applyWindAfterAxis(state);
    assert.equal(state.moduleState.wind!.position, 1);
    assert.equal(state.moduleState.wind!.modifier, 1);
  });

  it('re-rotates each Axis resolve even if Axis did not move', () => {
    const state = setup(['wind']);
    state.axisPosition = 1;
    applyWindAfterAxis(state);
    applyWindAfterAxis(state);
    assert.equal(state.moduleState.wind!.position, 18);
  });

  it('adds modifier to engine total', () => {
    const state = setup(['wind']);
    state.moduleState.wind!.position = 2;
    state.moduleState.wind!.modifier = 2;
    state.placedDice = [
      {
        dieId: 'b1',
        slotId: 'engine_pilot',
        color: 'blue',
        value: 5,
        ownerId: 'pilot',
      },
      {
        dieId: 'o1',
        slotId: 'engine_copilot',
        color: 'orange',
        value: 3,
        ownerId: 'copilot',
      },
    ];
    for (const s of state.approach) s.planes = 0;
    resolveEngineIfReady(state);
    assert.equal(state.lastSpeed, 10); // 5+3+2
  });

  it('wraps around the full ring', () => {
    const state = setup(['wind']);
    state.moduleState.wind!.position = 18;
    state.axisPosition = 3; // CCW 3 from 18 → 15 → -3
    applyWindAfterAxis(state);
    assert.equal(state.moduleState.wind!.position, 15);
    assert.equal(state.moduleState.wind!.modifier, -3);
  });

  it('runs afterAxisResolved from resolveAxisIfReady', () => {
    const state = setup(['wind']);
    state.axisPosition = 0;
    state.placedDice = [
      {
        dieId: 'b1',
        slotId: 'axis_pilot',
        color: 'blue',
        value: 4,
        ownerId: 'pilot',
      },
      {
        dieId: 'o1',
        slotId: 'axis_copilot',
        color: 'orange',
        value: 2,
        ownerId: 'copilot',
      },
    ];
    resolveAxisIfReady(state);
    assert.equal(state.axisPosition, 2);
    assert.equal(state.moduleState.wind!.position, 18);
    assert.equal(state.moduleState.wind!.modifier, -2);
  });
});

describe('Sky Team Milestone 3 — Kerosene Leak', () => {
  it('starts at 20 and rejects placing on kerosene slot', () => {
    const state = setup(['kerosene-leak']);
    assert.equal(state.moduleState.keroseneLeak!.remaining, KEROSENE_START);
    const view = toPlayerView(state, 'pilot');
    assert.ok(!view.slots.some((s) => s.id === 'kerosene'));
  });

  it('spends |diff|+1 when both engines placed', () => {
    const state = setup(['kerosene-leak']);
    startDicePlacement(state);
    state.currentPlayerId = 'pilot';

    const blue = blueDice(state);
    const orange = orangeDice(state);
    setDieValue(state, blue[0]!.id, 6);
    setDieValue(state, orange[0]!.id, 3);

    // Place axis first so we don't care about order — just engines
    let s = state;
    // Place engine pilot
    s = skyTeamGame.onAction(s, 'pilot', {
      type: 'place-die',
      dieId: blue[0]!.id,
      slotId: 'engine_pilot',
    }) as SkyTeamState;
    assert.equal(s.moduleState.keroseneLeak!.remaining, KEROSENE_START);

    s.currentPlayerId = 'copilot';
    s = skyTeamGame.onAction(s, 'copilot', {
      type: 'place-die',
      dieId: orange[0]!.id,
      slotId: 'engine_copilot',
    }) as SkyTeamState;

    // |6-3|+1 = 4
    assert.equal(s.moduleState.keroseneLeak!.remaining, KEROSENE_START - 4);
    assert.equal(s.moduleState.keroseneLeak!.spentThisRound, true);
  });

  it('loses when remaining drops below 0', () => {
    const state = setup(['kerosene-leak']);
    state.moduleState.keroseneLeak!.remaining = 2;
    startDicePlacement(state);
    const blue = blueDice(state);
    const orange = orangeDice(state);
    setDieValue(state, blue[0]!.id, 6);
    setDieValue(state, orange[0]!.id, 1);

    let s = state;
    s.currentPlayerId = 'pilot';
    s = skyTeamGame.onAction(s, 'pilot', {
      type: 'place-die',
      dieId: blue[0]!.id,
      slotId: 'engine_pilot',
    }) as SkyTeamState;
    s.currentPlayerId = 'copilot';
    s = skyTeamGame.onAction(s, 'copilot', {
      type: 'place-die',
      dieId: orange[0]!.id,
      slotId: 'engine_copilot',
    }) as SkyTeamState;

    // |6-1|+1 = 6 → 2-6 = -4
    assert.ok(s.result);
    assert.equal(s.loseReason, 'kerosene_empty');
  });

  it('lobby rejects kerosene + kerosene-leak together', () => {
    const errors = getSkyTeamLobbyValidationErrors({
      scenarioId: 'yul',
      enabledModules: ['kerosene', 'kerosene-leak'],
      selectedSpecialAbilityIds: [],
      pilotMode: 'random',
    });
    assert.ok(errors.length > 0);
  });
});

describe('Sky Team Milestone 4 — Ice Brakes', () => {
  it('sets up marker at 0 and hides normal brake slots', () => {
    const state = setup(['ice-brakes']);
    assert.ok(state.moduleState.iceBrakes);
    assert.equal(state.moduleState.iceBrakes.markerPosition, 0);
    const view = toPlayerView(state, 'pilot');
    const ids = view.slots.map((s) => s.id);
    assert.ok(!ids.includes('brake_2'));
    assert.ok(!ids.includes('brake_4'));
    assert.ok(!ids.includes('brake_6'));
    assert.ok(ids.includes('ice_brake_pilot_2'));
    assert.ok(ids.includes('ice_brake_copilot_2'));
  });

  it('rejects placing on level 3 before level 2 is complete', () => {
    const state = setup(['ice-brakes']);
    startDicePlacement(state);
    state.currentPlayerId = 'pilot';
    const die = blueDice(state)[0]!;
    setDieValue(state, die.id, 3);

    assert.throws(
      () =>
        skyTeamGame.onAction(state, 'pilot', {
          type: 'place-die',
          dieId: die.id,
          slotId: 'ice_brake_pilot_3',
        }),
      /วางในช่องนี้ไม่ได้/,
    );
  });

  it('advances marker when both sides match on the next level', () => {
    const state = setup(['ice-brakes']);
    startDicePlacement(state);
    const blue = blueDice(state);
    const orange = orangeDice(state);
    setDieValue(state, blue[0]!.id, 2);
    setDieValue(state, orange[0]!.id, 2);

    let s = state;
    s.currentPlayerId = 'pilot';
    s = skyTeamGame.onAction(s, 'pilot', {
      type: 'place-die',
      dieId: blue[0]!.id,
      slotId: 'ice_brake_pilot_2',
    }) as SkyTeamState;
    assert.equal(s.moduleState.iceBrakes!.markerPosition, 0);
    assert.equal(s.brakeLevel, 0);

    s.currentPlayerId = 'copilot';
    s = skyTeamGame.onAction(s, 'copilot', {
      type: 'place-die',
      dieId: orange[0]!.id,
      slotId: 'ice_brake_copilot_2',
    }) as SkyTeamState;
    assert.equal(s.moduleState.iceBrakes!.markerPosition, 1);
    assert.equal(s.brakeLevel, 2);
  });

  it('can multi-advance in one round (2 then 3)', () => {
    const state = setup(['ice-brakes']);
    startDicePlacement(state);
    const blue = blueDice(state);
    const orange = orangeDice(state);
    setDieValue(state, blue[0]!.id, 2);
    setDieValue(state, blue[1]!.id, 3);
    setDieValue(state, orange[0]!.id, 2);
    setDieValue(state, orange[1]!.id, 3);

    let s = state;
    s.currentPlayerId = 'pilot';
    s = skyTeamGame.onAction(s, 'pilot', {
      type: 'place-die',
      dieId: blue[0]!.id,
      slotId: 'ice_brake_pilot_2',
    }) as SkyTeamState;
    s.currentPlayerId = 'copilot';
    s = skyTeamGame.onAction(s, 'copilot', {
      type: 'place-die',
      dieId: orange[0]!.id,
      slotId: 'ice_brake_copilot_2',
    }) as SkyTeamState;
    assert.equal(s.moduleState.iceBrakes!.markerPosition, 1);

    s.currentPlayerId = 'pilot';
    s = skyTeamGame.onAction(s, 'pilot', {
      type: 'place-die',
      dieId: blue[1]!.id,
      slotId: 'ice_brake_pilot_3',
    }) as SkyTeamState;
    s.currentPlayerId = 'copilot';
    s = skyTeamGame.onAction(s, 'copilot', {
      type: 'place-die',
      dieId: orange[1]!.id,
      slotId: 'ice_brake_copilot_3',
    }) as SkyTeamState;
    assert.equal(s.moduleState.iceBrakes!.markerPosition, 2);
    assert.equal(s.brakeLevel, 3);
  });

  it('fails final landing if marker is not past 5', () => {
    const state = setup(['ice-brakes']);
    state.moduleState.iceBrakes!.markerPosition = 3;
    state.brakeLevel = 4;
    const msg = applyIceBrakesFinalLanding(state);
    assert.ok(msg);
    assert.match(msg!, /Ice Brakes/);
  });

  it('passes ice-brakes final check when marker is past 5', () => {
    const state = setup(['ice-brakes']);
    state.moduleState.iceBrakes!.markerPosition = 4;
    state.brakeLevel = 5;
    assert.equal(applyIceBrakesFinalLanding(state), null);
  });
});

describe('Sky Team Milestone 4 — Real-Time', () => {
  it('starts a 60s deadline when dice placement begins', () => {
    const before = Date.now();
    const state = setup(['real-time']);
    assert.ok(state.moduleState.realtime);
    assert.equal(state.moduleState.realtime.deadlineAt, null);

    startDicePlacement(state);
    assert.ok(state.moduleState.realtime.deadlineAt != null);
    assert.ok(state.moduleState.realtime.deadlineAt! >= before + 59_000);
    assert.ok(state.moduleState.realtime.deadlineAt! <= Date.now() + 60_000);
    assert.equal(state.moduleState.realtime.durationSeconds, 60);
  });

  it('rejects placing dice after the deadline', () => {
    const state = setup(['real-time']);
    startDicePlacement(state);
    state.moduleState.realtime!.deadlineAt = Date.now() - 1;
    state.currentPlayerId = 'pilot';
    const die = blueDice(state)[0]!;
    setDieValue(state, die.id, 3);

    assert.throws(
      () =>
        skyTeamGame.onAction(state, 'pilot', {
          type: 'place-die',
          dieId: die.id,
          slotId: 'axis_pilot',
        }),
      /หมดเวลา/,
    );
  });

  it('loses on expiry when Axis/Engines are incomplete', () => {
    const state = setup(['real-time']);
    startDicePlacement(state);
    state.moduleState.realtime!.deadlineAt = Date.now() - 1;

    const next = applySkyTeamTimerExpiry(state);
    assert.ok(next.result);
    assert.equal(next.loseReason, 'missing_mandatory');
    assert.equal(next.moduleState.realtime!.deadlineAt, null);
  });

  it('ends the round on expiry when mandatory slots are filled', () => {
    const state = setup(['real-time']);
    startDicePlacement(state);
    // Force mandatory slots occupied without full placement flow
    state.placedDice = [
      { dieId: 'a', slotId: 'axis_pilot', color: 'blue', value: 1, ownerId: 'pilot' },
      { dieId: 'b', slotId: 'axis_copilot', color: 'orange', value: 1, ownerId: 'copilot' },
      { dieId: 'c', slotId: 'engine_pilot', color: 'blue', value: 2, ownerId: 'pilot' },
      { dieId: 'd', slotId: 'engine_copilot', color: 'orange', value: 2, ownerId: 'copilot' },
    ];
    for (const d of state.dice) d.inHand = false;
    state.axisPosition = 0;
    state.lastSpeed = 5;
    state.moduleState.realtime!.deadlineAt = Date.now() - 1;

    const next = applySkyTeamTimerExpiry(state);
    assert.equal(next.result, null);
    assert.equal(next.loseReason, null);
    // After endRound without final landing → next strategy round
    assert.equal(next.phase, 'strategy');
    assert.equal(next.round, 2);
    assert.equal(next.moduleState.realtime!.deadlineAt, null);
  });
});
