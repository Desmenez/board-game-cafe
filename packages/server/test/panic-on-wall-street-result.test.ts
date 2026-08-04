import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PowsPlayerPublic, PowsState } from 'shared';
import { computeGameResult } from '../src/games/panic-on-wall-street/engine.js';

function player(
  id: string,
  name: string,
  money: number,
  role: PowsPlayerPublic['role'],
  opts?: { isBankrupt?: boolean },
): PowsPlayerPublic {
  return {
    id,
    name,
    money,
    role,
    isBankrupt: opts?.isBankrupt ?? false,
    bankTokenColor: role === 'manager' ? null : 'navy',
    companyIds: [],
  };
}

/** Minimal state for computeGameResult — only fields it reads. */
function stubState(partial: {
  playerOrder: string[];
  players: Record<string, PowsPlayerPublic>;
  managerIds: string[];
  investorIds: string[];
}): PowsState {
  return partial as PowsState;
}

describe('Panic on Wall Street — computeGameResult ties', () => {
  it('dual mode: sole richest player wins', () => {
    const result = computeGameResult(
      stubState({
        playerOrder: ['a', 'b', 'c'],
        players: {
          a: player('a', 'Alice', 200_000, 'dual'),
          b: player('b', 'Bob', 150_000, 'dual'),
          c: player('c', 'Cara', 100_000, 'dual'),
        },
        managerIds: ['a', 'b', 'c'],
        investorIds: ['a', 'b', 'c'],
      }),
    );
    assert.deepEqual(result.winners, ['a']);
    assert.match(result.reason, /Alice/);
  });

  it('dual mode: equal top money shares victory', () => {
    const result = computeGameResult(
      stubState({
        playerOrder: ['a', 'b', 'c'],
        players: {
          a: player('a', 'Alice', 180_000, 'dual'),
          b: player('b', 'Bob', 180_000, 'dual'),
          c: player('c', 'Cara', 90_000, 'dual'),
        },
        managerIds: ['a', 'b', 'c'],
        investorIds: ['a', 'b', 'c'],
      }),
    );
    assert.deepEqual(result.winners, ['a', 'b']);
    assert.match(result.reason, /เสมอรวม/);
  });

  it('role mode: tied managers and sole investor all win', () => {
    const result = computeGameResult(
      stubState({
        playerOrder: ['m1', 'm2', 'm3', 'i1', 'i2'],
        players: {
          m1: player('m1', 'Mgr1', 250_000, 'manager'),
          m2: player('m2', 'Mgr2', 250_000, 'manager'),
          m3: player('m3', 'Mgr3', 100_000, 'manager'),
          i1: player('i1', 'Inv1', 300_000, 'investor'),
          i2: player('i2', 'Inv2', 120_000, 'investor'),
        },
        managerIds: ['m1', 'm2', 'm3'],
        investorIds: ['i1', 'i2'],
      }),
    );
    assert.deepEqual(result.winners, ['m1', 'm2', 'i1']);
    assert.match(result.reason, /ผู้จัดการเสมอ/);
    assert.match(result.reason, /นักลงทุนรวยสุด/);
  });

  it('role mode: bankrupt investors excluded from investor race', () => {
    const result = computeGameResult(
      stubState({
        playerOrder: ['m1', 'i1', 'i2', 'i3', 'i4'],
        players: {
          m1: player('m1', 'Mgr', 200_000, 'manager'),
          i1: player('i1', 'Broke', 500_000, 'investor', { isBankrupt: true }),
          i2: player('i2', 'Alive', 80_000, 'investor'),
          i3: player('i3', 'Alive2', 80_000, 'investor'),
          i4: player('i4', 'Alive3', 40_000, 'investor'),
        },
        managerIds: ['m1'],
        investorIds: ['i1', 'i2', 'i3', 'i4'],
      }),
    );
    assert.deepEqual(result.winners, ['m1', 'i2', 'i3']);
    assert.ok(!result.winners.includes('i1'));
  });
});
