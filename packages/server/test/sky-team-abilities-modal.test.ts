import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { skyTeamGame } from '../src/games/sky-team/engine.js';
import { setupSkyTeamForTest } from './sky-team-test-setup.js';

describe('sky-team abilities modal sync', () => {
  it('opens and focuses for both player views', () => {
    const state = setupSkyTeamForTest({ abilities: ['anticipation', 'adaptation'] });
    assert.equal(state.abilitiesModal.open, false);

    const opened = skyTeamGame.onAction(state, 'pilot', {
      type: 'set-abilities-modal',
      open: true,
      focusedAbilityId: null,
    });
    assert.equal(opened.abilitiesModal.open, true);
    assert.equal(opened.abilitiesModal.focusedAbilityId, null);

    const pilotView = skyTeamGame.getPlayerView(opened, 'pilot');
    const copilotView = skyTeamGame.getPlayerView(opened, 'copilot');
    assert.equal(pilotView.abilitiesModal.open, true);
    assert.equal(copilotView.abilitiesModal.open, true);

    const focused = skyTeamGame.onAction(opened, 'copilot', {
      type: 'set-abilities-modal',
      open: true,
      focusedAbilityId: 'anticipation',
    });
    assert.equal(focused.abilitiesModal.focusedAbilityId, 'anticipation');
    assert.equal(
      skyTeamGame.getPlayerView(focused, 'pilot').abilitiesModal.focusedAbilityId,
      'anticipation',
    );

    const closed = skyTeamGame.onAction(focused, 'pilot', {
      type: 'set-abilities-modal',
      open: false,
    });
    assert.equal(closed.abilitiesModal.open, false);
    assert.equal(closed.abilitiesModal.focusedAbilityId, null);
  });

  it('auto-focuses when the match has a single ability', () => {
    const state = setupSkyTeamForTest({ abilities: ['mastery'] });
    const opened = skyTeamGame.onAction(state, 'copilot', {
      type: 'set-abilities-modal',
      open: true,
      focusedAbilityId: null,
    });
    assert.equal(opened.abilitiesModal.open, true);
    assert.equal(opened.abilitiesModal.focusedAbilityId, 'mastery');
  });
});
