import type { AccountLiveRoom, RoomStatus } from 'shared';
import type { StoredRoomSession } from './playerToken';

export interface HomeRoomSession {
  code: string;
  displayName: string;
  lastSeenAt: number;
  storedLocally: boolean;
  liveStatus?: RoomStatus;
}

/** Merge this-browser seats with account-owned live rooms; newest first. */
export function mergeHomeRoomSessions(
  local: StoredRoomSession[],
  account: AccountLiveRoom[],
): HomeRoomSession[] {
  const byCode = new Map<string, HomeRoomSession>();

  for (const session of local) {
    byCode.set(session.code, {
      code: session.code,
      displayName: session.displayName,
      lastSeenAt: session.lastSeenAt,
      storedLocally: true,
    });
  }

  for (const session of account) {
    const existing = byCode.get(session.code);
    if (existing) {
      existing.liveStatus = session.status;
      existing.lastSeenAt = Math.max(existing.lastSeenAt, session.lastSeenAt);
      if (session.displayName.trim()) existing.displayName = session.displayName;
    } else {
      byCode.set(session.code, {
        code: session.code,
        displayName: session.displayName,
        lastSeenAt: session.lastSeenAt,
        storedLocally: false,
        liveStatus: session.status,
      });
    }
  }

  return [...byCode.values()].sort(
    (a, b) => b.lastSeenAt - a.lastSeenAt || a.code.localeCompare(b.code),
  );
}
