import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizePlayerAvatar, type GameMeta } from 'shared';
import {
  claimPlayerForUser,
  createRoom,
  getRoomByUserId,
  removeRoom,
} from '../src/room-manager.js';

const fugitive: GameMeta = {
  id: 'fugitive',
  name: 'Fugitive',
  description: 'test game',
  minPlayers: 2,
  maxPlayers: 2,
  thumbnail: '/test.png',
};

test('claiming a guest GamePlayer preserves its stable game identity', () => {
  const guestId = `guest-claim-${Date.now()}-${Math.random()}`;
  const room = createRoom('fugitive', fugitive, {
    id: guestId,
    guestId,
    name: 'Guest',
    avatar: normalizePlayerAvatar({}, guestId),
    connected: true,
  });
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
