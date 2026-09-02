import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeHomeRoomSessions } from '../../client/src/utils/savedRooms.ts';

test('mergeHomeRoomSessions sorts newest first and keeps live account rooms', () => {
  const merged = mergeHomeRoomSessions(
    [
      { code: 'OLD123', displayName: 'Local', lastSeenAt: 1_000 },
      { code: 'NEW456', displayName: 'Recent', lastSeenAt: 9_000 },
    ],
    [
      {
        code: 'LIVE78',
        displayName: 'Alice',
        status: 'playing',
        lastSeenAt: 50_000,
      },
      {
        code: 'NEW456',
        displayName: 'Alice',
        status: 'waiting',
        lastSeenAt: 8_000,
      },
    ],
  );

  assert.deepEqual(
    merged.map((room) => room.code),
    ['LIVE78', 'NEW456', 'OLD123'],
  );
  assert.equal(merged[0]?.storedLocally, false);
  assert.equal(merged[0]?.liveStatus, 'playing');
  assert.equal(merged[1]?.storedLocally, true);
  assert.equal(merged[1]?.liveStatus, 'waiting');
  assert.equal(merged[1]?.displayName, 'Alice');
  assert.equal(merged[1]?.lastSeenAt, 9_000);
});
