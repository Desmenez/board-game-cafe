import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Room } from 'shared';
import { useAuth } from '../auth/useAuth';
import { listIncomingInvites, type IncomingInviteItem } from '../auth/invitesApi';
import { GameInviteToastBody } from '../components/GameInviteToastBody';

export const GAME_INVITE_TOAST_ID_PREFIX = 'game-invite-';
const POLL_MS = 15_000;

function toastIdFor(inviteId: string): string {
  return `${GAME_INVITE_TOAST_ID_PREFIX}${inviteId}`;
}

function isInActiveGame(room: Room | null | undefined): boolean {
  return room?.status === 'playing' || room?.status === 'finished';
}

type Options = {
  room: Room | null;
  leaveRoom: () => Promise<{ success: boolean }>;
};

/**
 * Polls pending game invites and shows accept/decline toasts app-wide,
 * except while the player is in an active game (playing / finished).
 */
export function useGameInviteToasts({ room, leaveRoom }: Options) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roomRef = useRef(room);
  roomRef.current = room;
  const leaveRoomRef = useRef(leaveRoom);
  leaveRoomRef.current = leaveRoom;
  /** Invite ids the user dismissed without accepting/declining — don't re-show this session. */
  const snoozedRef = useRef(new Set<string>());
  /** Invite ids dismissed programmatically (in-game / respond) — skip snooze. */
  const skipSnoozeRef = useRef(new Set<string>());
  /** Invite ids currently shown via toast.custom. */
  const shownRef = useRef(new Set<string>());

  const dismissAllInviteToasts = useCallback(() => {
    for (const id of shownRef.current) {
      skipSnoozeRef.current.add(id);
      toast.dismiss(toastIdFor(id));
    }
    shownRef.current.clear();
  }, []);

  const markClosed = useCallback((inviteId: string) => {
    skipSnoozeRef.current.add(inviteId);
    shownRef.current.delete(inviteId);
  }, []);

  const showInviteToast = useCallback(
    (item: IncomingInviteItem) => {
      const inviteId = item.invite.id;
      const toastId = toastIdFor(inviteId);

      toast.custom(
        (t) => (
          <GameInviteToastBody
            item={item}
            visible={t.visible}
            toastId={toastId}
            getCurrentRoomCode={() => roomRef.current?.code}
            leaveRoom={() => leaveRoomRef.current()}
            navigate={navigate}
            onClosed={markClosed}
          />
        ),
        {
          id: toastId,
          duration: Infinity,
          position: 'top-right',
          className: 'game-invite-toast-wrap',
          onDismiss: () => {
            shownRef.current.delete(inviteId);
            if (skipSnoozeRef.current.has(inviteId)) {
              skipSnoozeRef.current.delete(inviteId);
              return;
            }
            snoozedRef.current.add(inviteId);
          },
        },
      );
      shownRef.current.add(inviteId);
    },
    [navigate, markClosed],
  );

  const refresh = useCallback(async () => {
    if (!user) {
      dismissAllInviteToasts();
      return;
    }

    if (isInActiveGame(roomRef.current)) {
      dismissAllInviteToasts();
      return;
    }

    const invites = await listIncomingInvites(user.id);
    const active = invites.filter((i) => !i.expired);
    const activeIds = new Set(active.map((i) => i.invite.id));

    for (const id of [...shownRef.current]) {
      if (!activeIds.has(id)) {
        skipSnoozeRef.current.add(id);
        toast.dismiss(toastIdFor(id));
        shownRef.current.delete(id);
      }
    }

    for (const item of active) {
      const id = item.invite.id;
      if (snoozedRef.current.has(id)) continue;
      if (shownRef.current.has(id)) continue;
      showInviteToast(item);
    }
  }, [user, dismissAllInviteToasts, showInviteToast]);

  useEffect(() => {
    void refresh();
    if (!user) return;
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [user, refresh]);

  // Immediately hide when entering an active game; re-poll when leaving one.
  const inGame = isInActiveGame(room);
  useEffect(() => {
    if (inGame) {
      dismissAllInviteToasts();
      return;
    }
    void refresh();
  }, [inGame, dismissAllInviteToasts, refresh]);
}
