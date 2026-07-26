import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { skyTeamGame } from '../src/games/sky-team/engine.js';

describe('sky-team ability_pick → strategy', () => {
  const players = [
    { id: 'pilot', name: 'Pilot' },
    { id: 'copilot', name: 'Co-Pilot' },
  ];

  it('PRG starts in ability_pick; confirm after both agree enters strategy', () => {
    const state = skyTeamGame.setup(players, {
      scenarioId: 'prg',
      pilotMode: 'manual',
      pilotPlayerId: 'pilot',
    });
    assert.equal(state.phase, 'ability_pick');
    assert.deepEqual(state.selectedSpecialAbilityIds, []);

    const mid = skyTeamGame.onAction(state, 'pilot', {
      type: 'set-ability-picks',
      abilityIds: ['mastery', 'control'],
    });
    assert.equal(mid.phase, 'ability_pick');
    assert.deepEqual(mid.abilityPicksByPlayerId.pilot, ['mastery', 'control']);

    const matched = skyTeamGame.onAction(mid, 'copilot', {
      type: 'set-ability-picks',
      abilityIds: ['control', 'mastery'],
    });
    assert.equal(matched.phase, 'ability_pick');
    assert.deepEqual(matched.selectedSpecialAbilityIds, []);

    assert.throws(
      () => skyTeamGame.onAction(mid, 'pilot', { type: 'confirm-ability-picks' }),
      /ตรงกัน/,
    );

    const done = skyTeamGame.onAction(matched, 'pilot', { type: 'confirm-ability-picks' });
    assert.equal(done.phase, 'strategy');
    assert.deepEqual(done.selectedSpecialAbilityIds, ['mastery', 'control']);
    assert.ok(done.specialAbilityState.mastery);
    assert.ok(done.specialAbilityState.control);

    const view = skyTeamGame.getPlayerView(done, 'pilot');
    assert.equal(view.phase, 'strategy');
    assert.equal(view.specialAbilitySlots, 2);
  });

  it('YUL skips ability_pick and starts in strategy', () => {
    const state = skyTeamGame.setup(players, {
      scenarioId: 'yul',
      pilotMode: 'manual',
      pilotPlayerId: 'pilot',
    });
    assert.equal(state.phase, 'strategy');
    assert.deepEqual(state.selectedSpecialAbilityIds, []);
  });

  it('mismatch keeps ability_pick open and blocks confirm', () => {
    let state = skyTeamGame.setup(players, {
      scenarioId: 'prg',
      pilotMode: 'manual',
      pilotPlayerId: 'pilot',
    });
    state = skyTeamGame.onAction(state, 'pilot', {
      type: 'set-ability-picks',
      abilityIds: ['mastery', 'control'],
    });
    state = skyTeamGame.onAction(state, 'copilot', {
      type: 'set-ability-picks',
      abilityIds: ['anticipation', 'adaptation'],
    });
    assert.equal(state.phase, 'ability_pick');
    assert.deepEqual(state.selectedSpecialAbilityIds, []);
    assert.throws(
      () => skyTeamGame.onAction(state, 'copilot', { type: 'confirm-ability-picks' }),
      /ตรงกัน/,
    );
  });
});
