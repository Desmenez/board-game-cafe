import type { SocketState } from '../types';
import { useGameInviteToasts } from '../hooks/useGameInviteToasts';

type Props = {
  socket: SocketState;
};

/** Mount under BrowserRouter + AuthProvider to drive global game-invite toasts. */
export function GameInviteToastHost({ socket }: Props) {
  useGameInviteToasts({
    room: socket.room,
    leaveRoom: socket.leaveRoom,
  });
  return null;
}
