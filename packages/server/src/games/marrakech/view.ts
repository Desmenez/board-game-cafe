import {
  legalRugPlacements,
  nextColorForPlayer,
  type MarrakechPlayerView,
  type MarrakechPublicPlayer,
  type MarrakechState,
  marrakechScore,
} from 'shared';

export function toPlayerView(state: MarrakechState, playerId: string): MarrakechPlayerView {
  const players: MarrakechPublicPlayer[] = state.playerOrder.map((id) => {
    const p = state.players[id]!;
    return {
      id: p.id,
      name: p.name,
      dirhams: p.dirhams,
      colors: [...p.colors],
      rugsRemaining: p.rugsRemaining,
      nextColor: nextColorForPlayer(p),
      eliminated: p.eliminated,
    };
  });

  const isActive = state.activePlayerId === playerId;
  const canAct =
    isActive &&
    !state.players[playerId]?.eliminated &&
    (state.phase === 'choose_direction' || state.phase === 'roll' || state.phase === 'place_rug');

  const legalPlacements =
    state.phase === 'place_rug' && isActive ? legalRugPlacements(state.rugs, state.assam.cell) : [];

  const active = state.players[state.activePlayerId];
  const nextPlaceColor = active ? nextColorForPlayer(active) : null;

  const scores =
    state.phase === 'game_over'
      ? marrakechScore(
          state.playerOrder.map((id) => state.players[id]!),
          state.rugs,
        )
      : null;

  return {
    phase: state.phase,
    directionMode: state.directionMode,
    playerOrder: [...state.playerOrder],
    players,
    activePlayerId: state.activePlayerId,
    myId: playerId,
    canAct,
    assam: { ...state.assam },
    rugs: state.rugs.map((r) => ({ ...r, cells: [r.cells[0], r.cells[1]] as [number, number] })),
    lastRoll: state.lastRoll,
    lastPayment: state.lastPayment ? { ...state.lastPayment } : null,
    lastEvent: state.lastEvent,
    legalPlacements,
    nextPlaceColor,
    pendingAdvanceAfterDirection: state.pendingAdvanceAfterDirection,
    result: state.result,
    scores,
  };
}
