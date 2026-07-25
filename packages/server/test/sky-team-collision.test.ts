import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Player } from 'shared';
import { advanceApproach } from '../src/games/sky-team/resolve.js';
import { setupSkyTeamForTest } from './sky-team-test-setup.js';

const players: Player[] = [
  { id: 'pilot', name: 'Pilot' },
  { id: 'copilot', name: 'Co-Pilot' },
];

describe('Sky Team — Approach collision on enter', () => {
  it('loses immediately when advancing onto a space with airplane tokens', () => {
    const state = setupSkyTeamForTest({ players });
    state.approachPosition = 0;
    for (const s of state.approach) s.planes = 0;
    state.approach[1]!.planes = 1;

    advanceApproach(state, 1);

    assert.equal(state.loseReason, 'collision');
    assert.equal(state.approachPosition, 0, 'must not stay on the occupied space after crash');
    assert.match(state.result!.reason, /ชนเครื่องบิน/);
  });

  it('loses when a multi-step advance enters an occupied intermediate space', () => {
    const state = setupSkyTeamForTest({ players });
    state.approachPosition = 0;
    for (const s of state.approach) s.planes = 0;
    state.approach[1]!.planes = 1;
    state.approach[2]!.planes = 0;

    advanceApproach(state, 2);

    assert.equal(state.loseReason, 'collision');
    assert.equal(state.approachPosition, 0);
  });

  it('allows leaving a clear space onto another clear space', () => {
    const state = setupSkyTeamForTest({ players });
    state.approachPosition = 0;
    for (const s of state.approach) s.planes = 0;

    advanceApproach(state, 1);

    assert.equal(state.result, null);
    assert.equal(state.approachPosition, 1);
  });

  it('does not collide merely for sitting on a space with tokens without advancing onto one', () => {
    const state = setupSkyTeamForTest({ players });
    state.approachPosition = 2;
    for (const s of state.approach) s.planes = 0;
    state.approach[2]!.planes = 2;
    state.approach[3]!.planes = 0;

    advanceApproach(state, 1);

    assert.equal(state.result, null);
    assert.equal(state.approachPosition, 3);
  });
});
