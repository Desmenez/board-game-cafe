import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ExplodingKittensState, Player } from 'shared';
import {
  explodingKittensGame,
  resolveExplosionReveal,
} from '../src/games/exploding-kittens/engine.js';
import { countDeadPlayers } from '../src/games/exploding-kittens/zombieSetup.js';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    avatar: { style: 'adventurer', seed: `p${i + 1}` },
    connected: true,
  })) as Player[];
}

function setupZombie(n: number): ExplodingKittensState {
  return explodingKittensGame.setup(makePlayers(n), {
    mode: 'zombie_kittens',
    mixBase: 'none',
  }) as ExplodingKittensState;
}

function forceTopDraw(
  state: ExplodingKittensState,
  type: 'exploding_kitten',
): ExplodingKittensState {
  const ek = state.drawPile.find((c) => c.type === type);
  assert.ok(ek, 'expected exploding_kitten in draw pile');
  const rest = state.drawPile.filter((c) => c.id !== ek.id);
  return { ...state, drawPile: [ek, ...rest] };
}

describe('Exploding Kittens — Zombie Kittens', () => {
  it('setup standalone 4p: each has zombie_kitten, no defuse, draw has 3 EK', () => {
    const state = setupZombie(4);
    assert.equal(state.mode, 'zombie_kittens');
    assert.equal(state.mixBase, 'none');
    assert.equal(state.players.length, 4);
    for (const p of state.players) {
      assert.ok(
        p.hand.some((c) => c.type === 'zombie_kitten'),
        `${p.name} should start with a Zombie Kitten`,
      );
      assert.equal(
        p.hand.filter((c) => c.type === 'defuse').length,
        0,
        `${p.name} should start with no Defuse`,
      );
      assert.equal(p.hand.length, 8, `${p.name} should have save ZK + 7 cards`);
    }
    const ekInDraw = state.drawPile.filter((c) => c.type === 'exploding_kitten').length;
    assert.equal(ekInDraw, 3);
  });

  it('explode without playing ZK: dead, keeps hand, has faceUpEk', () => {
    let state = setupZombie(4);
    const current = state.players[state.currentPlayerIndex]!;
    const handBefore = current.hand.length;
    state = forceTopDraw(state, 'exploding_kitten');

    state = explodingKittensGame.onAction(state, current.id, { type: 'draw_card' });
    assert.equal(state.phase, 'explosion_reveal');
    assert.equal(state.explosionPlayerId, current.id);

    state = resolveExplosionReveal(state);
    assert.equal(state.phase, 'zombie_prompt');

    state = explodingKittensGame.onAction(state, current.id, { type: 'decline_zombie_kitten' });
    const victim = state.players.find((p) => p.id === current.id)!;
    assert.equal(victim.alive, false);
    assert.equal(victim.hand.length, handBefore, 'hand kept on ZK death');
    assert.ok(victim.faceUpEk, 'face-up EK on dead player');
    assert.equal(victim.faceUpEk!.type, 'exploding_kitten');
    assert.equal(countDeadPlayers(state), 1);
  });

  it('use ZK with one dead: revive + 2 reinserts', () => {
    let state = setupZombie(4);
    const first = state.players[state.currentPlayerIndex]!;

    // Kill first player
    state = forceTopDraw(state, 'exploding_kitten');
    state = explodingKittensGame.onAction(state, first.id, { type: 'draw_card' });
    state = resolveExplosionReveal(state);
    state = explodingKittensGame.onAction(state, first.id, { type: 'decline_zombie_kitten' });
    assert.equal(countDeadPlayers(state), 1);

    const second = state.players[state.currentPlayerIndex]!;
    assert.notEqual(second.id, first.id);
    assert.equal(second.alive, true);

    state = forceTopDraw(state, 'exploding_kitten');
    state = explodingKittensGame.onAction(state, second.id, { type: 'draw_card' });
    state = resolveExplosionReveal(state);
    assert.equal(state.phase, 'zombie_prompt');

    state = explodingKittensGame.onAction(state, second.id, { type: 'use_zombie_kitten' });
    assert.equal(state.phase, 'zombie_revive_pick');

    state = explodingKittensGame.onAction(state, second.id, {
      type: 'zombie_choose_revive',
      targetId: first.id,
    });
    assert.equal(state.phase, 'zombie_reinsert');
    assert.equal(state.zombieReinsertRemaining?.length, 2);
    assert.equal(state.zombieReviveTargetId, first.id);

    const pileBefore = state.drawPile.length;
    state = explodingKittensGame.onAction(state, second.id, { type: 'zombie_reinsert', index: 0 });
    assert.equal(state.phase, 'zombie_reinsert');
    assert.equal(state.zombieReinsertRemaining?.length, 1);
    assert.equal(state.drawPile.length, pileBefore + 1);

    state = explodingKittensGame.onAction(state, second.id, { type: 'zombie_reinsert', index: 1 });
    assert.equal(state.phase, 'turn');
    assert.equal(state.zombieReinsertRemaining, undefined);
    const revived = state.players.find((p) => p.id === first.id)!;
    assert.equal(revived.alive, true);
    assert.equal(revived.faceUpEk, undefined);
    assert.equal(countDeadPlayers(state), 0);
    assert.equal(state.clairvoyanceInserts?.length, 2);
  });

  it('attack_of_the_dead illegal with 0 dead', () => {
    let state = setupZombie(4);
    const current = state.players[state.currentPlayerIndex]!;
    const aotd = current.hand.find((c) => c.type === 'attack_of_the_dead');
    if (!aotd) {
      // Deal one into hand for the test
      current.hand.push({ id: 'test-aotd', type: 'attack_of_the_dead' });
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === current.id ? { ...p, hand: [...current.hand] } : p,
        ),
      };
    }
    const card = state.players[state.currentPlayerIndex]!.hand.find(
      (c) => c.type === 'attack_of_the_dead',
    )!;
    const handLen = state.players[state.currentPlayerIndex]!.hand.length;
    assert.equal(countDeadPlayers(state), 0);

    state = explodingKittensGame.onAction(state, current.id, {
      type: 'play_card',
      cardId: card.id,
    });
    const after = state.players.find((p) => p.id === current.id)!;
    assert.equal(state.phase, 'turn');
    assert.equal(state.pendingAction, undefined);
    assert.equal(after.hand.length, handLen, 'card returned when illegal');
    assert.ok(after.hand.some((c) => c.id === card.id));
  });
});
