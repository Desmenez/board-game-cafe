import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Player } from 'shared';
import { endRound } from '../src/games/sky-team/endRound.js';
import { setupSkyTeamForTest } from './sky-team-test-setup.js';

const players: Player[] = [
  { id: 'pilot', name: 'Pilot' },
  { id: 'copilot', name: 'Co-Pilot' },
];

/** Descend from 1000 ft → Airplane with airport + mandatory dice already filled. */
function setupFinalLandingRound(opts: {
  brakeLevel: number;
  lastSpeed: number;
  switchesComplete?: boolean;
}): ReturnType<typeof setupSkyTeamForTest> {
  const state = setupSkyTeamForTest({ players });
  state.altitudeIndex = 5; // 1000 ft — endRound will descend to Airplane
  state.approachPosition = state.approach.findIndex((s) => s.base === 'airport');
  for (const s of state.approach) s.planes = 0;
  state.axisPosition = 0;
  state.brakeLevel = opts.brakeLevel;
  state.lastSpeed = opts.lastSpeed;
  state.switches = {
    gear12: true,
    gear34: true,
    gear56: true,
    flaps12: true,
    flaps23: true,
    flaps34: true,
    flaps45: true,
    brake2: opts.brakeLevel >= 2,
    brake4: opts.brakeLevel >= 4,
    brake6: opts.brakeLevel >= 6,
  };
  if (opts.switchesComplete === false) {
    state.switches.gear12 = false;
  }
  state.phase = 'dice_placement';
  state.placedDice = [
    { dieId: 'a', slotId: 'axis_pilot', color: 'blue', value: 3, ownerId: 'pilot' },
    { dieId: 'b', slotId: 'axis_copilot', color: 'orange', value: 3, ownerId: 'copilot' },
    { dieId: 'c', slotId: 'engine_pilot', color: 'blue', value: 2, ownerId: 'pilot' },
    { dieId: 'd', slotId: 'engine_copilot', color: 'orange', value: 2, ownerId: 'copilot' },
  ];
  return state;
}

describe('Sky Team — brake fail on landing', () => {
  it('loses with brake_fail when only brakes are insufficient', () => {
    const state = setupFinalLandingRound({ brakeLevel: 2, lastSpeed: 4 });
    endRound(state);
    assert.equal(state.loseReason, 'brake_fail');
    assert.match(state.result!.reason, /เบรกไม่พอ/);
  });

  it('loses with incomplete_landing when brakes and switches both fail', () => {
    const state = setupFinalLandingRound({
      brakeLevel: 2,
      lastSpeed: 4,
      switchesComplete: false,
    });
    endRound(state);
    assert.equal(state.loseReason, 'incomplete_landing');
  });

  it('wins when speed is below brake level and other landing checks pass', () => {
    const state = setupFinalLandingRound({ brakeLevel: 4, lastSpeed: 3 });
    endRound(state);
    assert.equal(state.winReason, 'landed');
    assert.equal(state.loseReason, null);
  });
});
