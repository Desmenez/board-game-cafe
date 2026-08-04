import { respondGameInvite } from './invitesApi';
import { clearStoredRoomSession, normalizeRoomCode } from '../utils/playerToken';

/**
 * Accept a pending game invite, leave any current room seat, then navigate to the invited room.
 */
export async function acceptGameInviteAndJoin(input: {
  inviteId: string;
  roomCode: string;
  currentRoomCode?: string | null;
  leaveRoom: () => Promise<{ success: boolean }>;
  navigate: (to: string) => void;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await respondGameInvite(input.inviteId, 'accepted');
  if (!res.ok) return res;

  if (input.currentRoomCode) {
    clearStoredRoomSession(normalizeRoomCode(input.currentRoomCode));
    await input.leaveRoom();
  }

  const code = normalizeRoomCode(res.roomCode ?? input.roomCode);
  input.navigate(`/room/${code}`);
  return { ok: true };
}
