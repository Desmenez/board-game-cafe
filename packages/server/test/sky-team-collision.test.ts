import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Player } from 'shared';
import { advanceApproach } from '../src/games/sky-team/resolve.js';
import { setupSkyTeamForTest } from './sky-team-test-setup.js';

const players: Player[] = [
  { id: 'pilot', name: 'Pilot' },
  { id: 'copilot', name: 'Co-Pilot' },
];

function clearPlanes(state: ReturnType<typeof setupSkyTeamForTest>): void {
  for (const s of state.approach) s.planes = 0;
}

describe('Sky Team — Approach collision (official)', () => {
  it('allows landing on a space that has airplane tokens (no immediate lose)', () => {
    const state = setupSkyTeamForTest({ players });
    state.approachPosition = 0;
    clearPlanes(state);
    state.approach[1]!.planes = 1;

    advanceApproach(state, 1);

    assert.equal(state.result, null);
    assert.equal(state.loseReason, null);
    assert.equal(state.approachPosition, 1);
  });

  it('loses immediately when advancing while current position still has airplane tokens', () => {
    const state = setupSkyTeamForTest({ players });
    state.approachPosition = 2;
    clearPlanes(state);
    state.approach[2]!.planes = 2;
    state.approach[3]!.planes = 0;

    advanceApproach(state, 1);

    assert.equal(state.loseReason, 'collision');
    assert.equal(state.approachPosition, 2, 'must stay on the occupied current space');
    assert.match(state.result!.reason, /ชนเครื่องบิน/);
  });

  it('loses immediately when a 2-step advance would leave an occupied intermediate space', () => {
    const state = setupSkyTeamForTest({ players });
    state.approachPosition = 0;
    clearPlanes(state);
    state.approach[1]!.planes = 1; // intermediate
    state.approach[2]!.planes = 0;

    advanceApproach(state, 2);

    assert.equal(state.loseReason, 'collision');
    assert.equal(
      state.approachPosition,
      1,
      'first step lands on intermediate; second step collides',
    );
  });

  it('allows a 2-step advance onto an occupied destination if the intermediate is clear', () => {
    const state = setupSkyTeamForTest({ players });
    state.approachPosition = 0;
    clearPlanes(state);
    state.approach[1]!.planes = 0;
    state.approach[2]!.planes = 2;

    advanceApproach(state, 2);

    assert.equal(state.result, null);
    assert.equal(state.approachPosition, 2);
  });

  it('allows leaving a clear space onto another clear space', () => {
    const state = setupSkyTeamForTest({ players });
    state.approachPosition = 0;
    clearPlanes(state);

    advanceApproach(state, 1);

    assert.equal(state.result, null);
    assert.equal(state.approachPosition, 1);
  });
});
