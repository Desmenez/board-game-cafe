import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Dialog, DialogDescription, DialogFooter, DialogTitle } from './ui';
import { listAcceptedFriends, type FriendListItem } from '../auth/friendsApi';
import { createGameInvites } from '../auth/invitesApi';
import { PlayerAvatar } from './player-avatar';
import { normalizePlayerAvatar } from 'shared';

interface Props {
  open: boolean;
  onClose: () => void;
  myUserId: string;
  roomCode: string;
  gameId: string;
}

export function InviteFriendsDialog({ open, onClose, myUserId, roomCode, gameId }: Props) {
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setLoading(true);
    void listAcceptedFriends(myUserId)
      .then(setFriends)
      .finally(() => setLoading(false));
  }, [open, myUserId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !sending) onClose();
      }}
      className="max-w-lg room-night-dialog"
      overlayClassName="room-night-dialog-overlay"
      aria-labelledby="invite-friends-title"
      aria-describedby="invite-friends-desc"
      dismissible={!sending}
    >
      <DialogTitle id="invite-friends-title">เชิญเพื่อนเข้าห้อง</DialogTitle>
      <DialogDescription id="invite-friends-desc">
        เลือกเพื่อนที่รับคำขอแล้ว — จะได้คำเชิญในหน้า เพื่อน (หมดอายุ ~10 นาที)
      </DialogDescription>

      {loading ? <p className="text-ink-2">กำลังโหลด…</p> : null}
      {!loading && friends.length === 0 ? (
        <p className="text-ink-2">ยังไม่มีเพื่อนที่ยอมรับแล้ว — ไปเพิ่มที่หน้า เพื่อน ก่อน</p>
      ) : null}

      <ul className="m-0 mt-4 flex max-h-64 list-none flex-col gap-2 overflow-y-auto p-0">
        {friends.map((friend) => {
          const checked = selected.has(friend.other.id);
          return (
            <li key={friend.friendshipId}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-rule px-3 py-2 hover:bg-paper-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(friend.other.id)) next.delete(friend.other.id);
                      else next.add(friend.other.id);
                      return next;
                    });
                  }}
                />
                <PlayerAvatar
                  playerId={friend.other.id}
                  name={friend.other.display_name}
                  avatar={normalizePlayerAvatar(friend.other.avatar_config, friend.other.id)}
                  size={36}
                  decorative
                />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{friend.other.display_name}</strong>
                  <code className="text-xs text-ink-2">{friend.other.handle}</code>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={sending}>
          ปิด
        </Button>
        <Button
          type="button"
          disabled={sending || selected.size === 0}
          onClick={() => {
            setSending(true);
            void createGameInvites({
              fromUserId: myUserId,
              toUserIds: [...selected],
              roomCode,
              gameId,
            })
              .then((res) => {
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(`ส่งคำเชิญ ${res.created} คนแล้ว`);
                onClose();
              })
              .finally(() => setSending(false));
          }}
        >
          {sending ? 'กำลังส่ง…' : `ส่งคำเชิญ (${selected.size})`}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
