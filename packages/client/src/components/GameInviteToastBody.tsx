import { useState } from 'react';
import toast from 'react-hot-toast';
import { acceptGameInviteAndJoin } from '../auth/acceptGameInvite';
import { respondGameInvite, type IncomingInviteItem } from '../auth/invitesApi';
import { GameInviteToast } from './GameInviteToast';

type Props = {
  item: IncomingInviteItem;
  visible: boolean;
  toastId: string;
  getCurrentRoomCode: () => string | null | undefined;
  leaveRoom: () => Promise<{ success: boolean }>;
  navigate: (to: string) => void;
  onClosed: (inviteId: string) => void;
};

export function GameInviteToastBody({
  item,
  visible,
  toastId,
  getCurrentRoomCode,
  leaveRoom,
  navigate,
  onClosed,
}: Props) {
  const [busy, setBusy] = useState(false);
  const inviteId = item.invite.id;

  return (
    <GameInviteToast
      item={item}
      visible={visible}
      busy={busy}
      onAccept={() => {
        if (busy) return;
        setBusy(true);
        void (async () => {
          const res = await acceptGameInviteAndJoin({
            inviteId,
            roomCode: item.invite.room_code,
            currentRoomCode: getCurrentRoomCode(),
            leaveRoom,
            navigate,
          });
          if (!res.ok) {
            setBusy(false);
            toast.error(res.error);
            return;
          }
          onClosed(inviteId);
          toast.dismiss(toastId);
          toast.success('รับคำเชิญแล้ว — กำลังไปที่ห้อง');
        })();
      }}
      onDecline={() => {
        if (busy) return;
        setBusy(true);
        void (async () => {
          const res = await respondGameInvite(inviteId, 'declined');
          onClosed(inviteId);
          toast.dismiss(toastId);
          if (!res.ok) toast.error(res.error);
          else toast.success('ปฏิเสธคำเชิญแล้ว');
        })();
      }}
    />
  );
}
