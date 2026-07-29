import {
  connectedColorArea,
  legalRugPlacements,
  marrakechScore,
  moveAssam,
  nextColorForPlayer,
  rotateFacing,
  rugCellsEqual,
  type MarrakechAssam,
  type MarrakechColor,
  type MarrakechPaymentEvent,
  type MarrakechPhase,
  type MarrakechPlayerSeat,
  type MarrakechRug,
  type MarrakechRugCells,
  type MarrakechState,
  type MarrakechTurn,
  type GameResult,
} from 'shared';

/** Apply a direction turn to Assam. */
export function applyDirection(assam: MarrakechAssam, turn: MarrakechTurn): MarrakechAssam {
  return { ...assam, facing: rotateFacing(assam.facing, turn) };
}

/** Move Assam `steps` squares following swirls. */
export function applyMove(assam: MarrakechAssam, steps: number): MarrakechAssam {
  return moveAssam(assam, steps);
}

/**
 * Compute payment owed when Assam lands on a rug.
 * Returns null if no payment (empty / own / neutral).
 */
export function computePayment(
  rugs: readonly MarrakechRug[],
  assamCell: number,
  payerId: string,
): MarrakechPaymentEvent | null {
  const area = connectedColorArea(rugs, assamCell);
  if (!area) return null;
  if (area.ownerId === '' || area.ownerId === payerId) return null;
  return {
    fromId: payerId,
    toId: area.ownerId,
    amount: area.cells.length,
    color: area.color,
    areaSize: area.cells.length,
  };
}

/**
 * Transfer dirhams. If payer can't cover in full: pay what they can,
 * mark eliminated, zero remaining rugs, neutralize their placed rugs.
 * Returns whether the payer was eliminated.
 */
export function applyPayment(
  players: Record<string, MarrakechPlayerSeat>,
  rugs: MarrakechRug[],
  payment: MarrakechPaymentEvent,
): { eliminated: boolean; paid: number } {
  const payer = players[payment.fromId];
  const payee = players[payment.toId];
  if (!payer || !payee) return { eliminated: false, paid: 0 };

  const paid = Math.min(payer.dirhams, payment.amount);
  payer.dirhams -= paid;
  payee.dirhams += paid;

  if (paid < payment.amount) {
    eliminatePlayer(players, rugs, payment.fromId);
    return { eliminated: true, paid };
  }
  return { eliminated: false, paid };
}

export function eliminatePlayer(
  players: Record<string, MarrakechPlayerSeat>,
  rugs: MarrakechRug[],
  playerId: string,
): void {
  const p = players[playerId];
  if (!p || p.eliminated) return;
  p.eliminated = true;
  p.rugsRemaining = 0;
  p.rugPile = [];
  for (const rug of rugs) {
    if (rug.ownerId === playerId) {
      rug.ownerId = '';
    }
  }
}

export function activeNonEliminated(state: MarrakechState): MarrakechPlayerSeat[] {
  return state.playerOrder
    .map((id) => state.players[id]!)
    .filter((p) => p && !p.eliminated);
}

export function nextActivePlayerId(state: MarrakechState, fromId: string): string | null {
  const alive = activeNonEliminated(state);
  if (alive.length === 0) return null;
  const order = state.playerOrder.filter((id) => !state.players[id]?.eliminated);
  if (order.length === 0) return null;
  const idx = order.indexOf(fromId);
  const nextIdx = idx === -1 ? 0 : (idx + 1) % order.length;
  return order[nextIdx] ?? null;
}

export function anyRugsLeft(state: MarrakechState): boolean {
  return activeNonEliminated(state).some((p) => p.rugsRemaining > 0);
}

export function finishGame(state: MarrakechState, reason: string): void {
  const alive = activeNonEliminated(state);
  if (alive.length === 1) {
    const winner = alive[0]!;
    state.phase = 'game_over';
    state.result = {
      winners: [winner.id],
      reason: reason || `${winner.name} เป็นผู้เล่นคนสุดท้ายที่เหลือ`,
    };
    return;
  }

  const scores = marrakechScore(alive, state.rugs);
  const best = scores[0];
  if (!best) {
    state.phase = 'game_over';
    state.result = { winners: [], reason: 'ไม่มีผู้ชนะ' };
    return;
  }
  const winners = scores.filter((s) => s.total === best.total && s.dirhams === best.dirhams);
  // If totals tie but dirhams differ, marrakechScore already sorted by dirhams —
  // only keep those matching the top dirhams among equal totals.
  const topTotal = best.total;
  const sameTotal = scores.filter((s) => s.total === topTotal);
  const topDirhams = Math.max(...sameTotal.map((s) => s.dirhams));
  const finalWinners = sameTotal.filter((s) => s.dirhams === topDirhams);

  state.phase = 'game_over';
  state.result = {
    winners: finalWinners.map((w) => w.playerId),
    reason:
      finalWinners.length === 1
        ? `${finalWinners[0]!.name} ชนะด้วย ${finalWinners[0]!.total} แต้ม`
        : `เสมอกันที่ ${topTotal} แต้ม`,
  };
  void winners;
  void reason;
}

export function consumeNextColor(player: MarrakechPlayerSeat): MarrakechColor {
  const color = nextColorForPlayer(player);
  if (!color) {
    throw new Error('ไม่มีพรมเหลือให้วาง');
  }
  if (player.rugPile.length > 0) {
    player.rugPile.shift();
  }
  player.rugsRemaining = Math.max(0, player.rugsRemaining - 1);
  return color;
}

export function placeRugOnBoard(
  state: MarrakechState,
  cells: MarrakechRugCells,
  color: MarrakechColor,
  ownerId: string,
): MarrakechRug {
  const rug: MarrakechRug = {
    id: state.nextRugId++,
    ownerId,
    color,
    cells,
  };
  state.rugs.push(rug);
  return rug;
}

export function isLegalPlacement(
  rugs: readonly MarrakechRug[],
  assamCell: number,
  cells: MarrakechRugCells,
): boolean {
  return legalRugPlacements(rugs, assamCell).some((p) => rugCellsEqual(p, cells));
}

export function phaseAfterDirection(_mode: MarrakechState['directionMode']): MarrakechPhase {
  return 'roll';
}

export type { GameResult };
