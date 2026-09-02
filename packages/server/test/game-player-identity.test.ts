import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizePlayerAvatar, RECONNECT_WINDOW_MS, type GameMeta, type Player } from 'shared';
import {
  claimPlayerForUser,
  createRoom,
  getRoom,
  getRoomByUserId,
  joinRoom,
  listAccountRooms,
  markPlayerDisconnected,
  removeRoom,
  resumePlayer,
} from '../src/room-manager.js';

const fugitive: GameMeta = {
  id: 'fugitive',
  name: 'Fugitive',
  description: 'test game',
  minPlayers: 2,
  maxPlayers: 2,
  thumbnail: '/test.png',
};

function uniqueId(label: string): string {
  return `${label}-${Date.now()}-${Math.random()}`;
}

function guestPlayer(id: string, name: string): Player {
  return {
    id,
    guestId: id,
    name,
    avatar: normalizePlayerAvatar({}, id),
    connected: true,
  };
}

function expireReconnectWindow(code: string, playerId: string): void {
  assert.ok(markPlayerDisconnected(code, playerId));
  const room = getRoom(code);
  assert.ok(room);
  const seat = room.players.find((player) => player.id === playerId);
  assert.ok(seat);
  seat.disconnectedAt = Date.now() - RECONNECT_WINDOW_MS - 1_000;
}

test('claiming a guest GamePlayer preserves its stable game identity', () => {
  const guestId = uniqueId('guest-claim');
  const room = createRoom('fugitive', fugitive, guestPlayer(guestId, 'Guest'));
  assert(room);

  try {
    const claimed = claimPlayerForUser(room, guestId, 'user-123');
    assert(claimed);
    assert.equal(claimed.id, guestId);
    assert.equal(claimed.userId, 'user-123');
    assert.equal(claimed.guestId, undefined);
    assert.equal(getRoomByUserId('user-123', room.code)?.code, room.code);
  } finally {
    removeRoom(room.code);
  }
});

test('a guest cannot resume after the reconnect window', () => {
  const guestId = uniqueId('guest-window');
  const room = createRoom('fugitive', fugitive, guestPlayer(guestId, 'Guest'));
  assert(room);

  try {
    expireReconnectWindow(room.code, guestId);
    assert.equal(resumePlayer(room.code, guestId), null);
    assert.equal(joinRoom(room.code, { ...guestPlayer(guestId, 'Guest'), connected: false }), null);
  } finally {
    removeRoom(room.code);
  }
});

test('an account-owned seat also expires after the reconnect window', () => {
  const guestId = uniqueId('account-window');
  const room = createRoom('fugitive', fugitive, guestPlayer(guestId, 'Guest'));
  assert(room);

  try {
    assert.ok(claimPlayerForUser(room, guestId, 'user-123'));
    expireReconnectWindow(room.code, guestId);

    assert.equal(resumePlayer(room.code, guestId), null);
  } finally {
    removeRoom(room.code);
  }
});

test('joinRoom also rejects a matching account seat after the reconnect window', () => {
  const guestId = uniqueId('account-join');
  const room = createRoom('fugitive', fugitive, guestPlayer(guestId, 'Guest'));
  assert(room);

  try {
    assert.ok(claimPlayerForUser(room, guestId, 'user-123'));
    expireReconnectWindow(room.code, guestId);

    assert.equal(
      joinRoom(room.code, {
        id: guestId,
        name: 'Guest',
        avatar: normalizePlayerAvatar({}, guestId),
        connected: true,
        userId: 'user-123',
      }),
      null,
    );
  } finally {
    removeRoom(room.code);
  }
});

test('joinRoom still rejects a mismatched account after the reconnect window', () => {
  const guestId = uniqueId('account-mismatch');
  const room = createRoom('fugitive', fugitive, guestPlayer(guestId, 'Guest'));
  assert(room);

  try {
    assert.ok(claimPlayerForUser(room, guestId, 'user-123'));
    expireReconnectWindow(room.code, guestId);

    assert.equal(
      joinRoom(room.code, {
        id: guestId,
        name: 'Guest',
        avatar: normalizePlayerAvatar({}, guestId),
        connected: true,
        userId: 'user-other',
      }),
      null,
    );
  } finally {
    removeRoom(room.code);
  }
});

test('listAccountRooms returns live account seats newest first', () => {
  const olderId = uniqueId('older-seat');
  const newerId = uniqueId('newer-seat');
  const userId = uniqueId('list-user');
  const older = createRoom('fugitive', fugitive, guestPlayer(olderId, 'Older'));
  const newer = createRoom('fugitive', fugitive, guestPlayer(newerId, 'Newer'));
  assert(older);
  assert(newer);

  try {
    assert.ok(claimPlayerForUser(older, olderId, userId));
    assert.ok(claimPlayerForUser(newer, newerId, userId));
    assert.ok(markPlayerDisconnected(older.code, olderId));
    const olderSeat = getRoom(older.code)?.players.find((player) => player.id === olderId);
    assert.ok(olderSeat);
    olderSeat.disconnectedAt = 1_000;

    const listed = listAccountRooms(userId, 50_000);
    assert.deepEqual(
      listed.map((room) => room.code),
      [newer.code, older.code],
    );
    assert.equal(listed[0]?.displayName, 'Newer');
    assert.equal(listed[0]?.status, 'waiting');
    assert.equal(listed[0]?.lastSeenAt, 50_000);
    assert.equal(listed[1]?.displayName, 'Older');
    assert.equal(listed[1]?.lastSeenAt, 1_000);
  } finally {
    removeRoom(older.code);
    removeRoom(newer.code);
  }
});

test('listAccountRooms omits seats whose reconnect window has expired', () => {
  const guestId = uniqueId('expired-list');
  const userId = uniqueId('expired-user');
  const room = createRoom('fugitive', fugitive, guestPlayer(guestId, 'Expired'));
  assert(room);

  try {
    assert.ok(claimPlayerForUser(room, guestId, userId));
    expireReconnectWindow(room.code, guestId);

    assert.deepEqual(listAccountRooms(userId, Date.now()), []);
  } finally {
    removeRoom(room.code);
  }
});
