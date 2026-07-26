import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SKY_TEAM_SLOT_DEFS, type Player } from 'shared';
import { skyTeamGame } from '../src/games/sky-team/engine.js';
import { explainCannotPlace, startDicePlacement } from '../src/games/sky-team/helpers.js';
import { setupSkyTeamForTest } from './sky-team-test-setup.js';

const players: Player[] = [
  { id: 'pilot', name: 'Pilot' },
  { id: 'copilot', name: 'Co-Pilot' },
];

describe('Sky Team — Flaps allowed values (printed 1/2, 2/3, 4/5, 5/6)', () => {
  it('slot defs match official flap faces', () => {
    assert.deepEqual(SKY_TEAM_SLOT_DEFS.flaps_12.allowedValues, [1, 2]);
    assert.deepEqual(SKY_TEAM_SLOT_DEFS.flaps_23.allowedValues, [2, 3]);
    assert.deepEqual(SKY_TEAM_SLOT_DEFS.flaps_34.allowedValues, [4, 5]);
    assert.deepEqual(SKY_TEAM_SLOT_DEFS.flaps_45.allowedValues, [5, 6]);
  });

  it('accepts 5 on flaps_34 (printed 4/5) after 2/3 is open', () => {
    const state = setupSkyTeamForTest({ players });
    startDicePlacement(state);
    state.currentPlayerId = 'copilot';
    state.switches.flaps12 = true;
    state.switches.flaps23 = true;

    assert.equal(explainCannotPlace(state, 'copilot', 'flaps_34', 5), null);
    assert.equal(
      explainCannotPlace(state, 'copilot', 'flaps_34', 3),
      'ช่องนี้รับค่า 4, 5 (ตอนนี้ 3)',
    );
  });

  it('accepts 6 on flaps_45 (printed 5/6) after 4/5 is open', () => {
    const state = setupSkyTeamForTest({ players });
    startDicePlacement(state);
    state.currentPlayerId = 'copilot';
    state.switches.flaps12 = true;
    state.switches.flaps23 = true;
    state.switches.flaps34 = true;

    assert.equal(explainCannotPlace(state, 'copilot', 'flaps_45', 6), null);
    assert.equal(
      explainCannotPlace(state, 'copilot', 'flaps_45', 4),
      'ช่องนี้รับค่า 5, 6 (ตอนนี้ 4)',
    );
  });

  it('blocks flaps_34 until flaps_23 is open, even with a legal face', () => {
    const state = setupSkyTeamForTest({ players });
    startDicePlacement(state);
    state.currentPlayerId = 'copilot';
    state.switches.flaps12 = true;
    // flaps23 still false

    assert.equal(explainCannotPlace(state, 'copilot', 'flaps_34', 5), 'ต้องปลด Flaps ตามลำดับ');
  });

  it('blocks placing on a flap whose switch is already green', () => {
    const state = setupSkyTeamForTest({ players });
    startDicePlacement(state);
    state.currentPlayerId = 'copilot';
    state.switches.flaps12 = true;

    assert.equal(explainCannotPlace(state, 'copilot', 'flaps_12', 1), 'สวิตช์เปิดอยู่แล้ว');
  });

  it('blocks placing on landing gear whose switch is already green', () => {
    const state = setupSkyTeamForTest({ players });
    startDicePlacement(state);
    state.currentPlayerId = 'pilot';
    state.switches.gear34 = true;

    assert.equal(explainCannotPlace(state, 'pilot', 'gear_34', 3), 'สวิตช์เปิดอยู่แล้ว');
  });

  it('place-die accepts 5 on flaps_34 when prior switches are open', () => {
    const state = setupSkyTeamForTest({ players });
    startDicePlacement(state);
    state.currentPlayerId = 'copilot';
    state.switches.flaps12 = true;
    state.switches.flaps23 = true;
    const die = state.dice.find((d) => d.color === 'orange' && d.inHand)!;
    die.value = 5;

    const next = skyTeamGame.onAction(state, 'copilot', {
      type: 'place-die',
      dieId: die.id,
      slotId: 'flaps_34',
    });

    assert.ok(next.placedDice.some((p) => p.slotId === 'flaps_34' && p.value === 5));
    assert.equal(next.switches.flaps34, true);
  });
});
