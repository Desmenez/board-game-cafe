import type { ExplodingKittensPlayerView } from 'shared';

type Player = ExplodingKittensPlayerView['players'][number];

function nextAliveIndex(players: readonly Player[], from: number): number {
  for (let step = 1; step <= players.length; step++) {
    const i = (from + step) % players.length;
    if (players[i]?.alive) return i;
  }
  return from;
}

type TurnSim = {
  players: readonly Player[];
  index: number;
  pending: Map<string, number>;
};

/** Mirror server `consumeOneTurnOrAdvance` on a local copy of pendingTurns. */
function consumeOneTurn(sim: TurnSim): void {
  const cur = sim.players[sim.index];
  if (!cur) return;
  const nextPending = Math.max(0, (sim.pending.get(cur.id) ?? 0) - 1);
  sim.pending.set(cur.id, nextPending);
  if (nextPending > 0) return;
  sim.index = nextAliveIndex(sim.players, sim.index);
  const next = sim.players[sim.index];
  if (next && (sim.pending.get(next.id) ?? 0) <= 0) {
    sim.pending.set(next.id, 1);
  }
}

function startSimAfterReinsert(players: readonly Player[], fromPlayerId: string): TurnSim | null {
  const start = players.findIndex((p) => p.id === fromPlayerId);
  if (start < 0) return null;
  const pending = new Map(players.map((p) => [p.id, Math.max(0, p.pendingTurns)]));
  const sim: TurnSim = { players, index: start, pending };
  // After defuse/bury reinsert the server calls consumeOneTurnOrAdvance once.
  consumeOneTurn(sim);
  return sim;
}

/** Alive seats in draw order starting from who actually draws first after reinsert. */
export function getAliveDrawOrderAfterReinsert(
  players: readonly Player[],
  fromPlayerId: string,
): Player[] {
  const sim = startSimAfterReinsert(players, fromPlayerId);
  if (!sim) return players.filter((p) => p.alive);
  const ordered: Player[] = [];
  const seen = new Set<string>();
  let idx = sim.index;
  for (let n = 0; n < players.length; n++) {
    const p = players[idx];
    if (p?.alive && !seen.has(p.id)) {
      ordered.push(p);
      seen.add(p.id);
    }
    idx = nextAliveIndex(players, idx);
  }
  return ordered;
}

/**
 * Who draws the card at 1-based insert slot (top = 1), assuming each turn draws once
 * and turn order follows pendingTurns — same as post-reinsert server flow.
 */
export function whoDrawsAtInsertSlot(
  players: readonly Player[],
  fromPlayerId: string,
  insertSlot: number,
): string | null {
  if (insertSlot < 1) return null;
  const sim = startSimAfterReinsert(players, fromPlayerId);
  if (!sim) return null;

  for (let draw = 1; draw <= insertSlot; draw++) {
    const drawer = sim.players[sim.index];
    if (!drawer?.alive) return null;
    if (draw === insertSlot) return drawer.id;
    // Drew a card above the planted one — turn progresses.
    consumeOneTurn(sim);
  }
  return null;
}
