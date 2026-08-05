import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { ClientToServerEvents, Player, ServerToClientEvents } from 'shared';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../../auth/useAuth';
import {
  StickerReactionOverlay,
  type FloatingSticker,
} from './StickerReactionOverlay';
import { StickerPickerButton } from './StickerPickerButton';

const MAX_CONCURRENT = 12;
const STICKER_ERROR_TOAST_ID = 'sticker-error';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Props {
  socket: TypedSocket;
  players: readonly Player[];
  /** Only show picker / accept sends while the match is actively playing. */
  canSend: boolean;
  sendRoomSticker: (stickerId: string) => Promise<{ success: boolean; error?: string }>;
}

function randomOffsetX(): number {
  return Math.round(Math.random() * 48);
}

export function StickerReactionsHost({ socket, players, canSend, sendRoomSticker }: Props) {
  const { configured, user } = useAuth();
  const [items, setItems] = useState<FloatingSticker[]>([]);

  useEffect(() => {
    const onSticker: ServerToClientEvents['room-sticker'] = (payload) => {
      const key = `${payload.playerId}:${payload.stickerId}:${payload.at}:${Math.random().toString(36).slice(2, 8)}`;
      setItems((prev) => {
        const next: FloatingSticker[] = [
          ...prev,
          {
            key,
            playerId: payload.playerId,
            stickerId: payload.stickerId,
            at: payload.at,
            offsetX: randomOffsetX(),
          },
        ];
        return next.length > MAX_CONCURRENT ? next.slice(next.length - MAX_CONCURRENT) : next;
      });
    };

    socket.on('room-sticker', onSticker);
    return () => {
      socket.off('room-sticker', onSticker);
    };
  }, [socket]);

  const onItemComplete = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const showPicker = configured && !!user && canSend;

  return (
    <>
      <StickerReactionOverlay items={items} players={players} onItemComplete={onItemComplete} />
      {showPicker && (
        <StickerPickerButton
          onSend={async (stickerId) => {
            const res = await sendRoomSticker(stickerId);
            if (!res.success && res.error) {
              toast.error(res.error, { id: STICKER_ERROR_TOAST_ID });
            }
          }}
        />
      )}
    </>
  );
}
