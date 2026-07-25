import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Player } from 'shared';
import { skyTeamGame } from '../src/games/sky-team/engine.js';
import { startDicePlacement } from '../src/games/sky-team/helpers.js';
import { resolveRadio } from '../src/games/sky-team/resolve.js';
import { setupSkyTeamForTest } from './sky-team-test-setup.js';

const players: Player[] = [
  { id: 'pilot', name: 'Pilot' },
  { id: 'copilot', name: 'Co-Pilot' },
];

describe('Sky Team — Radio clears airplane tokens', () => {
  it('resolveRadio removes one plane from approachPosition + (value - 1)', () => {
    const state = setupSkyTeamForTest({ players });
    state.approachPosition = 0;
    // YUL space 2 starts with traffic: 1
    assert.equal(state.approach[2]!.planes, 1);
    assert.equal(state.approach[2]!.printedPlanes, 1);

    resolveRadio(state, 3); // target index 0 + 2 = 2

    assert.equal(state.approach[2]!.planes, 0);
    assert.equal(state.approach[2]!.printedPlanes, 1, 'printed setup icons must stay');
  });

  it('place-die on radio_pilot clears the targeted space', () => {
    const state = setupSkyTeamForTest({ players });
    startDicePlacement(state);
    state.currentPlayerId = 'pilot';
    const die = state.dice.find((d) => d.color === 'blue' && d.inHand)!;
    die.value = 3;

    assert.equal(state.approach[2]!.planes, 1);

    const next = skyTeamGame.onAction(state, 'pilot', {
      type: 'place-die',
      dieId: die.id,
      slotId: 'radio_pilot',
    });

    assert.equal(next.approach[2]!.planes, 0);
    assert.ok(next.eventLog.some((l) => /Radio 3: เคลียร์เครื่องบิน/.test(l)));
  });

  it('place-die on radio_copilot_1 clears the targeted space', () => {
    const state = setupSkyTeamForTest({ players });
    startDicePlacement(state);
    state.currentPlayerId = 'copilot';
    const die = state.dice.find((d) => d.color === 'orange' && d.inHand)!;
    die.value = 4; // YUL space 3 starts with traffic: 2 → target 0+3=3

    assert.equal(state.approach[3]!.planes, 2);

    const next = skyTeamGame.onAction(state, 'copilot', {
      type: 'place-die',
      dieId: die.id,
      slotId: 'radio_copilot_1',
    });

    assert.equal(next.approach[3]!.planes, 1);
  });

  it('does nothing when the target space has no planes', () => {
    const state = setupSkyTeamForTest({ players });
    startDicePlacement(state);
    state.currentPlayerId = 'pilot';
    const die = state.dice.find((d) => d.color === 'blue' && d.inHand)!;
    die.value = 1; // space 0 has 0 planes

    const next = skyTeamGame.onAction(state, 'pilot', {
      type: 'place-die',
      dieId: die.id,
      slotId: 'radio_pilot',
    });

    assert.equal(next.approach[0]!.planes, 0);
    assert.ok(next.eventLog.some((l) => /Radio 1: ไม่มีเครื่องบิน/.test(l)));
  });
});
