import type { ReactNode } from 'react';
import type { ClientToServerEvents, Player, ServerToClientEvents } from 'shared';
import { LogOut, RotateCcw } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { Button } from '../ui';
import { StickerReactionsHost } from '../stickers';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Props {
  activeGame: ReactNode;
  players: Player[];
  canSendStickers: boolean;
  socket: AppSocket;
  sendRoomSticker: (stickerId: string) => Promise<{ success: boolean; error?: string }>;
  gameLeaveConfirmOpen: boolean;
  restartToLobbyConfirmOpen: boolean;
  isHost: boolean;
  onCloseLeaveConfirm: () => void;
  onCloseRestartConfirm: () => void;
  onConfirmLeave: () => void;
  onConfirmRestart: () => void;
}

export function RoomActiveGameSession({
  activeGame,
  players,
  canSendStickers,
  socket,
  sendRoomSticker,
  gameLeaveConfirmOpen,
  restartToLobbyConfirmOpen,
  isHost,
  onCloseLeaveConfirm,
  onCloseRestartConfirm,
  onConfirmLeave,
  onConfirmRestart,
}: Props) {
  return (
    <>
      {activeGame}
      <StickerReactionsHost
        socket={socket}
        players={players}
        canSend={canSendStickers}
        sendRoomSticker={sendRoomSticker}
      />
      {gameLeaveConfirmOpen && (
        <div
          className="modal-overlay game-session-confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-leave-modal-title"
        >
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 id="game-leave-modal-title">ออกจากเกม?</h2>
            <p className="game-session-confirm-text">
              คุณจะออกจากห้องและกลับไปที่เมนู — การกระทำนี้ไม่สามารถย้อนกลับได้จากที่นี่
            </p>
            <div className="game-session-confirm-actions">
              <Button type="button" variant="secondary" block onClick={onCloseLeaveConfirm}>
                ยกเลิก
              </Button>
              <Button type="button" variant="danger" block onClick={onConfirmLeave}>
                <LogOut size={16} aria-hidden />
                ออกจากห้อง
              </Button>
            </div>
          </div>
        </div>
      )}
      {restartToLobbyConfirmOpen && isHost && (
        <div
          className="modal-overlay game-session-confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-restart-modal-title"
        >
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 id="game-restart-modal-title">กลับไปล็อบบี้?</h2>
            <p className="game-session-confirm-text">
              ทุกคนในห้องจะกลับไปหน้ารอ (รหัสห้องเดิม) — หัวห้องสามารถกดเริ่มเกมใหม่ได้เมื่อพร้อม
            </p>
            <div className="game-session-confirm-actions">
              <Button type="button" variant="secondary" block onClick={onCloseRestartConfirm}>
                ยกเลิก
              </Button>
              <Button type="button" variant="primary" block onClick={onConfirmRestart}>
                <RotateCcw size={16} aria-hidden />
                กลับไปล็อบบี้
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
