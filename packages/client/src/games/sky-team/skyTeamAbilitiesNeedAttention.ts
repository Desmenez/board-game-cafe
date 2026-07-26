import type { SkyTeamPlayerView } from 'shared';

/** True when the HUD star should show an attention badge. */
export function skyTeamAbilitiesNeedAttention(view: SkyTeamPlayerView, myId: string): boolean {
  if (view.selectedSpecialAbilityIds.length === 0) return false;
  const syncPending = view.specialAbilityState.synchronisation?.pendingValue;
  const wtPending = view.specialAbilityState['working-together']?.workingTogether;
  const anticipationOpen =
    Boolean(view.specialAbilityState.anticipation?.anticipationOpen) &&
    view.isMyTurn &&
    view.currentPlayerId === myId;
  if (wtPending && view.isMyTurn) return true;
  if (anticipationOpen) return true;
  if (syncPending != null && view.isMyTurn && myId === view.copilotId) return true;
  return false;
}
