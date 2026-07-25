import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { Player, SkyTeamState } from 'shared';
import { skyTeamGame } from '../src/games/sky-team/engine.js';
import { startDicePlacement } from '../src/games/sky-team/helpers.js';
import { resolveAxisIfReady, resolveEngineIfReady } from '../src/games/sky-team/resolve.js';
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

function setup(abilities: string[]): SkyTeamState {
  return setupSkyTeamForTest({ abilities, players });
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

describe('Sky Team Milestone 5 — Special Abilities', () => {
  it('Mastery grants reroll when engines match', () => {
    const state = setup(['mastery']);
    startDicePlacement(state);
    state.placedDice = [
      {
        dieId: 'a',
        slotId: 'engine_pilot',
        color: 'blue',
        value: 4,
        ownerId: 'pilot',
      },
      {
        dieId: 'b',
        slotId: 'engine_copilot',
        color: 'orange',
        value: 4,
        ownerId: 'copilot',
      },
    ];
    resolveEngineIfReady(state);
    assert.ok(state.rerollTokens >= 1);
    assert.equal(state.specialAbilityState.mastery?.usedThisRound, true);
  });

  it('Control grants coffee when axis match', () => {
    const state = setup(['control']);
    startDicePlacement(state);
    state.placedDice = [
      {
        dieId: 'a',
        slotId: 'axis_pilot',
        color: 'blue',
        value: 3,
        ownerId: 'pilot',
      },
      {
        dieId: 'b',
        slotId: 'axis_copilot',
        color: 'orange',
        value: 3,
        ownerId: 'copilot',
      },
    ];
    resolveAxisIfReady(state);
    assert.equal(state.coffeeTokens, 1);
    assert.equal(state.specialAbilityState.control?.usedThisRound, true);
  });

  it('Adaptation flips die to opposite once per player', () => {
    const state = setup(['adaptation']);
    startDicePlacement(state);
    const die = blueDice(state)[0]!;
    setDieValue(state, die.id, 2);
    const after = skyTeamGame.onAction(state, 'pilot', {
      type: 'adaptation-flip',
      dieId: die.id,
    }) as SkyTeamState;
    assert.equal(after.dice.find((d) => d.id === die.id)!.value, 5);
    assert.deepEqual(after.specialAbilityState.adaptation?.usedByPlayerIds, ['pilot']);
    assert.throws(
      () =>
        skyTeamGame.onAction(after, 'pilot', {
          type: 'adaptation-flip',
          dieId: blueDice(after)[0]!.id,
        }),
      /Adaptation/,
    );
  });

  it('Anticipation lets first player reroll before first place', () => {
    mockRandomSequence([0.9]); // rollDie → 6
    const state = setup(['anticipation']);
    startDicePlacement(state);
    assert.equal(state.specialAbilityState.anticipation?.anticipationOpen, true);
    state.currentPlayerId = 'pilot';
    const die = blueDice(state)[0]!;
    setDieValue(state, die.id, 1);
    const after = skyTeamGame.onAction(state, 'pilot', {
      type: 'anticipation-reroll',
      dieId: die.id,
    }) as SkyTeamState;
    assert.equal(after.dice.find((d) => d.id === die.id)!.value, 6);
    assert.equal(after.specialAbilityState.anticipation?.anticipationOpen, false);
  });

  it('Working Together swaps values and returns dice', () => {
    const state = setup(['working-together']);
    startDicePlacement(state);
    state.currentPlayerId = 'pilot';
    const blue = blueDice(state)[0]!;
    const orange = orangeDice(state)[0]!;
    setDieValue(state, blue.id, 2);
    setDieValue(state, orange.id, 5);

    const mid = skyTeamGame.onAction(state, 'pilot', {
      type: 'place-die',
      dieId: blue.id,
      slotId: 'skill_wt_pilot',
    }) as SkyTeamState;
    assert.ok(mid.specialAbilityState['working-together']?.workingTogether);
    assert.equal(mid.currentPlayerId, 'copilot');

    const done = skyTeamGame.onAction(mid, 'copilot', {
      type: 'place-die',
      dieId: orange.id,
      slotId: 'skill_wt_copilot',
    }) as SkyTeamState;

    assert.equal(done.dice.find((d) => d.id === blue.id)!.value, 5);
    assert.equal(done.dice.find((d) => d.id === orange.id)!.value, 2);
    assert.equal(done.dice.find((d) => d.id === blue.id)!.inHand, true);
    assert.equal(done.dice.find((d) => d.id === orange.id)!.inHand, true);
    assert.equal(done.specialAbilityState['working-together']?.usedThisRound, true);
    assert.equal(done.specialAbilityState['working-together']?.workingTogether, undefined);
  });

  it('Synchronisation rolls traffic die after gear+flaps and places ignoring colour', () => {
    mockRandomSequence([0]); // first face = 2
    const state = setup(['synchronisation']);
    startDicePlacement(state);
    state.currentPlayerId = 'pilot';
    const blue = blueDice(state)[0]!;
    setDieValue(state, blue.id, 1);
    let s = skyTeamGame.onAction(state, 'pilot', {
      type: 'place-die',
      dieId: blue.id,
      slotId: 'gear_12',
    }) as SkyTeamState;

    s.currentPlayerId = 'copilot';
    const orange = orangeDice(s)[0]!;
    setDieValue(s, orange.id, 1);
    s = skyTeamGame.onAction(s, 'copilot', {
      type: 'place-die',
      dieId: orange.id,
      slotId: 'flaps_12',
    }) as SkyTeamState;

    assert.equal(s.specialAbilityState.synchronisation?.pendingValue, 2);
    assert.equal(s.currentPlayerId, 'copilot');

    // Co-Pilot places Traffic 2 on pilot radio (ignore colour; value any)
    s = skyTeamGame.onAction(s, 'copilot', {
      type: 'place-ability-die',
      slotId: 'radio_pilot',
    }) as SkyTeamState;

    assert.equal(s.specialAbilityState.synchronisation?.pendingValue, undefined);
    assert.ok(
      s.placedDice.some(
        (p) => p.slotId === 'radio_pilot' && p.source === 'ability' && p.value === 2,
      ),
    );
  });
});
