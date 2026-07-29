import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MARRAKECH_SWIRLS,
  cellOf,
  connectedColorArea,
  legalRugPlacements,
  marrakechScore,
  moveAssam,
  rotateFacing,
  stepAssam,
  swirlsAreInvolution,
  visibleSquares,
  type MarrakechRug,
  type MarrakechState,
  type Player,
} from 'shared';
import { enqueueDieRolls, marrakechGame } from '../src/games/marrakech/engine.js';
import { computePayment, eliminatePlayer } from '../src/games/marrakech/rules.js';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    avatar: { style: 'adventurer', seed: `p${i + 1}` },
    connected: true,
  })) as Player[];
}

function setup(n: number): MarrakechState {
  return marrakechGame.setup(makePlayers(n)) as MarrakechState;
}

describe('Marrakech — swirls & movement', () => {
  it('swirl map is an involution on every edge', () => {
    assert.equal(swirlsAreInvolution(MARRAKECH_SWIRLS), true);
  });

  it('cannot turn 180 via rotateFacing', () => {
    assert.equal(rotateFacing('up', 'straight'), 'up');
    assert.equal(rotateFacing('up', 'left'), 'left');
    assert.equal(rotateFacing('up', 'right'), 'right');
    assert.notEqual(rotateFacing('up', 'left'), 'down');
    assert.notEqual(rotateFacing('up', 'right'), 'down');
  });

  it('stepAssam moves one cell when staying in bounds', () => {
    const next = stepAssam({ cell: cellOf(3, 3), facing: 'up' });
    assert.equal(next.cell, cellOf(2, 3));
    assert.equal(next.facing, 'up');
  });

  it('swirl about-turn lands on paired lane without costing an extra step', () => {
    // Assam at top of column 0 facing up → swirl to column 1 facing down.
    // That re-entry IS the step.
    const next = stepAssam({ cell: cellOf(0, 0), facing: 'up' });
    assert.equal(next.cell, cellOf(0, 1));
    assert.equal(next.facing, 'down');
  });

  it('moveAssam of N steps consumes exactly N landings', () => {
    // From center facing up, 3 steps → row 0, col 3
    const end = moveAssam({ cell: cellOf(3, 3), facing: 'up' }, 3);
    assert.equal(end.cell, cellOf(0, 3));
    assert.equal(end.facing, 'up');
  });

  it('walking off the top then continuing uses the new facing', () => {
    // Start at (0,0) facing up. 1 step → swirl to (0,1) facing down.
    // 2nd step → (1,1) facing down.
    const end = moveAssam({ cell: cellOf(0, 0), facing: 'up' }, 2);
    assert.equal(end.cell, cellOf(1, 1));
    assert.equal(end.facing, 'down');
  });
});

describe('Marrakech — payment & connected area', () => {
  it('connected area includes Assam square and orthogonal same-color cells', () => {
    const rugs: MarrakechRug[] = [
      { id: 1, ownerId: 'a', color: 'rug-1', cells: [cellOf(3, 3), cellOf(3, 4)] },
      { id: 2, ownerId: 'a', color: 'rug-1', cells: [cellOf(4, 3), cellOf(4, 4)] },
      { id: 3, ownerId: 'b', color: 'rug-2', cells: [cellOf(3, 5), cellOf(4, 5)] },
    ];
    const area = connectedColorArea(rugs, cellOf(3, 3));
    assert.ok(area);
    assert.equal(area!.color, 'rug-1');
    assert.equal(area!.cells.length, 4);
  });

  it('no payment on empty or own rug', () => {
    const rugs: MarrakechRug[] = [
      { id: 1, ownerId: 'p1', color: 'rug-1', cells: [cellOf(3, 3), cellOf(3, 4)] },
    ];
    assert.equal(computePayment(rugs, cellOf(0, 0), 'p1'), null);
    assert.equal(computePayment(rugs, cellOf(3, 3), 'p1'), null);
  });

  it('no payment on neutral (eliminated) rugs', () => {
    const rugs: MarrakechRug[] = [
      { id: 1, ownerId: '', color: 'rug-1', cells: [cellOf(3, 3), cellOf(3, 4)] },
    ];
    assert.equal(computePayment(rugs, cellOf(3, 3), 'p1'), null);
  });

  it('payment equals connected area size', () => {
    const rugs: MarrakechRug[] = [
      { id: 1, ownerId: 'a', color: 'rug-1', cells: [cellOf(3, 3), cellOf(3, 4)] },
      { id: 2, ownerId: 'a', color: 'rug-1', cells: [cellOf(2, 3), cellOf(2, 4)] },
    ];
    const pay = computePayment(rugs, cellOf(3, 3), 'p1');
    assert.ok(pay);
    assert.equal(pay!.amount, 4);
    assert.equal(pay!.toId, 'a');
  });
});

describe('Marrakech — placement legality', () => {
  it('must touch Assam and cannot cover both halves of one rug', () => {
    const rugs: MarrakechRug[] = [
      { id: 1, ownerId: 'a', color: 'rug-1', cells: [cellOf(3, 2), cellOf(3, 1)] },
    ];
    const assam = cellOf(3, 3);
    const legal = legalRugPlacements(rugs, assam);
    // Covering both halves of rug 1 is illegal
    assert.equal(
      legal.some(
        (p) =>
          (p[0] === cellOf(3, 2) && p[1] === cellOf(3, 1)) ||
          (p[0] === cellOf(3, 1) && p[1] === cellOf(3, 2)),
      ),
      false,
    );
    // Covering half of rug + empty neighbor of Assam is ok
    assert.ok(legal.some((p) => p.includes(cellOf(3, 2)) && p.includes(cellOf(2, 2))));
    // Cannot cover Assam's own square
    assert.equal(
      legal.some((p) => p[0] === assam || p[1] === assam),
      false,
    );
  });

  it('placements are always orthogonally adjacent pairs', () => {
    const legal = legalRugPlacements([], cellOf(3, 3));
    assert.ok(legal.length > 0);
    for (const [a, b] of legal) {
      const ar = Math.floor(a / 7);
      const ac = a % 7;
      const br = Math.floor(b / 7);
      const bc = b % 7;
      assert.equal(Math.abs(ar - br) + Math.abs(ac - bc), 1);
    }
  });
});

describe('Marrakech — engine turn flow', () => {
  it('setup 3 players: 15 rugs, 1 color each, 30 dirhams', () => {
    const state = setup(3);
    assert.equal(state.playerOrder.length, 3);
    for (const id of state.playerOrder) {
      const p = state.players[id]!;
      assert.equal(p.dirhams, 30);
      assert.equal(p.colors.length, 1);
      assert.equal(p.rugsRemaining, 15);
      assert.equal(p.rugPile.length, 0);
    }
    assert.equal(state.assam.cell, 24);
    assert.equal(state.phase, 'choose_direction');
  });

  it('setup 4 players: 12 rugs each', () => {
    const state = setup(4);
    for (const id of state.playerOrder) {
      assert.equal(state.players[id]!.rugsRemaining, 12);
    }
  });

  it('2-player: each owns 2 colors in a shuffled pile of 24', () => {
    const state = setup(2);
    for (const id of state.playerOrder) {
      const p = state.players[id]!;
      assert.equal(p.colors.length, 2);
      assert.equal(p.rugsRemaining, 24);
      assert.equal(p.rugPile.length, 24);
      // Pile only contains the player's two colors
      for (const c of p.rugPile) {
        assert.ok(p.colors.includes(c));
      }
      // 12 of each
      assert.equal(p.rugPile.filter((c) => c === p.colors[0]).length, 12);
      assert.equal(p.rugPile.filter((c) => c === p.colors[1]).length, 12);
    }
    // Players have distinct color pairs
    const all = state.playerOrder.flatMap((id) => state.players[id]!.colors);
    assert.equal(new Set(all).size, 4);
  });

  it('set-direction then roll-die then place-rug advances turn', () => {
    const state = setup(3);
    const first = state.activePlayerId;
    enqueueDieRolls(state, [1]);

    let s = marrakechGame.onAction(state, first, {
      type: 'set-direction',
      turn: 'straight',
    }) as MarrakechState;
    assert.equal(s.phase, 'roll');

    s = marrakechGame.onAction(s, first, { type: 'roll-die' }) as MarrakechState;
    assert.equal(s.phase, 'place_rug');
    assert.equal(s.lastRoll, 1);

    const view = marrakechGame.getPlayerView(s, first);
    assert.ok(view.legalPlacements.length > 0);
    const cells = view.legalPlacements[0]!;

    s = marrakechGame.onAction(s, first, { type: 'place-rug', cells }) as MarrakechState;
    assert.equal(s.phase, 'choose_direction');
    assert.notEqual(s.activePlayerId, first);
    assert.equal(s.rugs.length, 1);
    assert.equal(s.players[first]!.rugsRemaining, 14);
  });

  it('rejects 180-equivalent by only allowing straight/left/right', () => {
    const state = setup(3);
    const first = state.activePlayerId;
    assert.throws(
      () =>
        marrakechGame.onAction(state, first, { type: 'set-direction', turn: 'around' as 'left' }),
      /ทิศทาง/,
    );
  });

  it('pays opponent when landing on their rug', () => {
    const state = setup(3);
    const payer = state.activePlayerId;
    const others = state.playerOrder.filter((id) => id !== payer);
    const owner = others[0]!;

    // Plant a rug belonging to owner under Assam's destination.
    // Assam starts at (3,3) facing up. Keep facing, roll 1 → (2,3).
    state.rugs.push({
      id: state.nextRugId++,
      ownerId: owner,
      color: state.players[owner]!.colors[0]!,
      cells: [cellOf(2, 3), cellOf(2, 4)],
    });
    enqueueDieRolls(state, [1]);

    let s = marrakechGame.onAction(state, payer, {
      type: 'set-direction',
      turn: 'straight',
    }) as MarrakechState;
    s = marrakechGame.onAction(s, payer, { type: 'roll-die' }) as MarrakechState;

    assert.ok(s.lastPayment);
    assert.equal(s.lastPayment!.fromId, payer);
    assert.equal(s.lastPayment!.toId, owner);
    assert.equal(s.lastPayment!.amount, 2);
    assert.equal(s.players[payer]!.dirhams, 28);
    assert.equal(s.players[owner]!.dirhams, 32);
  });

  it('eliminates player who cannot pay in full and neutralizes their rugs', () => {
    const state = setup(3);
    const payer = state.activePlayerId;
    const owner = state.playerOrder.find((id) => id !== payer)!;

    state.players[payer]!.dirhams = 1;
    // Big connected area of 3
    state.rugs.push(
      {
        id: state.nextRugId++,
        ownerId: owner,
        color: state.players[owner]!.colors[0]!,
        cells: [cellOf(2, 3), cellOf(2, 4)],
      },
      {
        id: state.nextRugId++,
        ownerId: owner,
        color: state.players[owner]!.colors[0]!,
        cells: [cellOf(1, 3), cellOf(1, 4)],
      },
    );
    // Also plant a rug of the payer so we can check neutralization
    state.rugs.push({
      id: state.nextRugId++,
      ownerId: payer,
      color: state.players[payer]!.colors[0]!,
      cells: [cellOf(5, 5), cellOf(5, 6)],
    });

    enqueueDieRolls(state, [1]);
    let s = marrakechGame.onAction(state, payer, {
      type: 'set-direction',
      turn: 'straight',
    }) as MarrakechState;
    s = marrakechGame.onAction(s, payer, { type: 'roll-die' }) as MarrakechState;

    assert.equal(s.players[payer]!.eliminated, true);
    assert.equal(s.players[payer]!.dirhams, 0);
    assert.equal(s.players[payer]!.rugsRemaining, 0);
    assert.ok(s.rugs.some((r) => r.ownerId === '' && r.color === state.players[payer]!.colors[0]));
    // Turn should have advanced past eliminated player
    assert.notEqual(s.activePlayerId, payer);
  });

  it('last player standing wins when others are eliminated', () => {
    const state = setup(3);
    const survivor = state.activePlayerId;
    for (const id of state.playerOrder) {
      if (id === survivor) continue;
      eliminatePlayer(state.players, state.rugs, id);
    }
    // Force a payment that eliminates the last other somehow — instead just finish via roll
    // when only one remains: place a roll that somehow triggers check.
    // Simpler: set phase to roll, roll onto empty, and check after we eliminate mid-turn.
    // Directly call finish path by having payer land and be the second-to-last.
    // Reset: re-eliminate and trigger via roll with 0 others needing payment.
    // Actually after eliminatePlayer above, only survivor is alive. Trigger via roll.
    enqueueDieRolls(state, [1]);
    let s = marrakechGame.onAction(state, survivor, {
      type: 'set-direction',
      turn: 'straight',
    }) as MarrakechState;
    s = marrakechGame.onAction(s, survivor, { type: 'roll-die' }) as MarrakechState;
    // After roll with only 1 alive → game over
    assert.equal(s.phase, 'game_over');
    assert.deepEqual(s.result?.winners, [survivor]);
  });
});

describe('Marrakech — scoring', () => {
  it('score = dirhams + visible squares; tiebreak by dirhams', () => {
    const rugs: MarrakechRug[] = [
      { id: 1, ownerId: 'a', color: 'rug-1', cells: [0, 1] },
      { id: 2, ownerId: 'b', color: 'rug-2', cells: [2, 3] },
      // Cover half of a's rug
      { id: 3, ownerId: 'b', color: 'rug-2', cells: [1, 8] },
    ];
    const vis = visibleSquares(rugs);
    assert.equal(vis['a'], 1); // only cell 0 remains for a
    // cells: 0(a), 1(b via rug3), 2(b), 3(b), 8(b) → a=1, b=4
    assert.equal(vis['b'], 4);

    const scores = marrakechScore(
      [
        { id: 'a', name: 'A', dirhams: 10, eliminated: false },
        { id: 'b', name: 'B', dirhams: 5, eliminated: false },
      ],
      rugs,
    );
    // a: 10+1=11, b: 5+4=9 → a wins
    assert.equal(scores[0]!.playerId, 'a');
    assert.equal(scores[0]!.total, 11);

    // Tie on total: dirhams wins
    const tied = marrakechScore(
      [
        { id: 'a', name: 'A', dirhams: 5, eliminated: false },
        { id: 'b', name: 'B', dirhams: 7, eliminated: false },
      ],
      [
        { id: 1, ownerId: 'a', color: 'rug-1', cells: [0, 1] },
        { id: 2, ownerId: 'b', color: 'rug-2', cells: [2, 3] },
      ],
    );
    // a: 5+2=7, b: 7+2=9 → b wins on total
    assert.equal(tied[0]!.playerId, 'b');

    const trueTie = marrakechScore(
      [
        { id: 'a', name: 'A', dirhams: 10, eliminated: false },
        { id: 'b', name: 'B', dirhams: 8, eliminated: false },
      ],
      [
        { id: 1, ownerId: 'a', color: 'rug-1', cells: [0, 1] },
        { id: 2, ownerId: 'b', color: 'rug-2', cells: [2, 3] },
        { id: 3, ownerId: 'b', color: 'rug-2', cells: [4, 5] },
      ],
    );
    // a: 10+2=12, b: 8+4=12 → tiebreak dirhams → a
    assert.equal(trueTie[0]!.total, 12);
    assert.equal(trueTie[0]!.playerId, 'a');
  });

  it('2p colors stay separate for payment areas even under same owner', () => {
    const rugs: MarrakechRug[] = [
      { id: 1, ownerId: 'p1', color: 'rug-1', cells: [cellOf(3, 3), cellOf(3, 4)] },
      { id: 2, ownerId: 'p1', color: 'rug-2', cells: [cellOf(4, 3), cellOf(4, 4)] },
    ];
    const area = connectedColorArea(rugs, cellOf(3, 3));
    assert.equal(area!.cells.length, 2); // only rug-1, not rug-2
  });
});
