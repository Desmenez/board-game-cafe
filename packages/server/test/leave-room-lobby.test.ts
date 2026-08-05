import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { Server } from 'socket.io';
import { io as createClient, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, Room, ServerToClientEvents } from 'shared';
import { normalizePlayerAvatar } from 'shared';
import { setupSocketHandlers } from '../src/socket-handlers.js';
import { getRoom } from '../src/room-manager.js';
import '../src/games/register-all.js';

type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
let serverUrl = '';
const clients: TestClient[] = [];

before(async () => {
  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', resolve);
  });
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  serverUrl = `http://127.0.0.1:${address.port}`;
  setupSocketHandlers(io);
});

after(async () => {
  for (const client of clients) client.disconnect();
  await new Promise<void>((resolve) => {
    io.close(() => resolve());
  });
});

function connectClient(): Promise<TestClient> {
  return new Promise((resolve, reject) => {
    const client: TestClient = createClient(serverUrl, {
      forceNew: true,
      reconnection: false,
    });
    clients.push(client);
    client.once('connect', () => resolve(client));
    client.once('connect_error', reject);
  });
}

function emitWithAck<T>(
  emit: (callback: (result: T) => void) => void,
  timeoutMs = 1000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timed out waiting for acknowledgement')),
      timeoutMs,
    );
    emit((result) => {
      clearTimeout(timer);
      resolve(result);
    });
  });
}

function waitForRoomUpdate(
  socket: TestClient,
  predicate: (room: Room) => boolean,
  timeoutMs = 1000,
) {
  return new Promise<Room>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timed out waiting for room-updated')),
      timeoutMs,
    );
    const onUpdate = (room: Room) => {
      if (!predicate(room)) return;
      clearTimeout(timer);
      socket.off('room-updated', onUpdate);
      resolve(room);
    };
    socket.on('room-updated', onUpdate);
  });
}

test('waiting lobby: leave-room removes the player so the other seat no longer sees them', async () => {
  const host = await connectClient();
  const guest = await connectClient();

  const created = await emitWithAck<{
    success: boolean;
    code?: string;
    playerToken?: string;
  }>((ack) => {
    host.emit(
      'create-room',
      {
        gameId: 'marrakech',
        playerName: 'HostA',
        playerAvatar: normalizePlayerAvatar(undefined, 'host-a'),
        playerToken: 'host-a-token',
      },
      ack,
    );
  });
  assert.equal(created.success, true);
  assert.ok(created.code);

  const joined = await emitWithAck<{ success: boolean; playerToken?: string }>((ack) => {
    guest.emit(
      'join-room',
      {
        code: created.code!,
        playerName: 'GuestB',
        playerAvatar: normalizePlayerAvatar(undefined, 'guest-b'),
        playerToken: 'guest-b-token',
      },
      ack,
    );
  });
  assert.equal(joined.success, true);

  const beforeLeave = getRoom(created.code!);
  assert.ok(beforeLeave);
  assert.equal(beforeLeave.players.length, 2);

  const hostSeesLeave = waitForRoomUpdate(
    host,
    (room) => room.code === created.code && room.players.length === 1,
  );

  guest.emit('leave-room');
  const updated = await hostSeesLeave;

  assert.equal(updated.players.length, 1);
  assert.equal(updated.players[0]?.id, 'host-a-token');
  assert.equal(
    updated.players.some((p) => p.id === 'guest-b-token'),
    false,
  );

  const serverRoom = getRoom(created.code!);
  assert.ok(serverRoom);
  assert.equal(serverRoom.players.length, 1);
  assert.equal(
    serverRoom.players.some((p) => p.id === 'guest-b-token'),
    false,
  );
});

test('waiting lobby: tab disconnect without leave-room keeps the seat (soft disconnect)', async () => {
  const host = await connectClient();
  const guest = await connectClient();

  const created = await emitWithAck<{
    success: boolean;
    code?: string;
  }>((ack) => {
    host.emit(
      'create-room',
      {
        gameId: 'marrakech',
        playerName: 'HostA2',
        playerAvatar: normalizePlayerAvatar(undefined, 'host-a2'),
        playerToken: 'host-a2-token',
      },
      ack,
    );
  });
  assert.equal(created.success, true);
  assert.ok(created.code);

  const joined = await emitWithAck<{ success: boolean }>((ack) => {
    guest.emit(
      'join-room',
      {
        code: created.code!,
        playerName: 'GuestB2',
        playerAvatar: normalizePlayerAvatar(undefined, 'guest-b2'),
        playerToken: 'guest-b2-token',
      },
      ack,
    );
  });
  assert.equal(joined.success, true);

  const hostSeesDisconnect = waitForRoomUpdate(
    host,
    (room) =>
      room.code === created.code &&
      room.players.some((p) => p.id === 'guest-b2-token' && p.connected === false),
  );

  guest.disconnect();
  const updated = await hostSeesDisconnect;

  assert.equal(updated.players.length, 2);
  const guestSeat = updated.players.find((p) => p.id === 'guest-b2-token');
  assert.ok(guestSeat);
  assert.equal(guestSeat.connected, false);
});

test('waiting lobby: leave-room ack then disconnect still removes the seat', async () => {
  const host = await connectClient();
  const guest = await connectClient();

  const created = await emitWithAck<{
    success: boolean;
    code?: string;
  }>((ack) => {
    host.emit(
      'create-room',
      {
        gameId: 'marrakech',
        playerName: 'HostA3',
        playerAvatar: normalizePlayerAvatar(undefined, 'host-a3'),
        playerToken: 'host-a3-token',
      },
      ack,
    );
  });
  assert.equal(created.success, true);
  assert.ok(created.code);

  const joined = await emitWithAck<{ success: boolean }>((ack) => {
    guest.emit(
      'join-room',
      {
        code: created.code!,
        playerName: 'GuestB3',
        playerAvatar: normalizePlayerAvatar(undefined, 'guest-b3'),
        playerToken: 'guest-b3-token',
      },
      ack,
    );
  });
  assert.equal(joined.success, true);

  const hostSeesLeave = waitForRoomUpdate(
    host,
    (room) => room.code === created.code && !room.players.some((p) => p.id === 'guest-b3-token'),
    1500,
  );

  await emitWithAck<{ success: boolean }>((ack) => {
    guest.emit('leave-room', ack);
  });
  guest.disconnect();

  const updated = await hostSeesLeave;
  assert.equal(updated.players.length, 1);

  await new Promise((r) => setTimeout(r, 50));
  const serverRoom = getRoom(created.code!);
  assert.ok(serverRoom);
  assert.equal(serverRoom.players.length, 1);
  assert.equal(
    serverRoom.players.some((p) => p.id === 'guest-b3-token'),
    false,
  );
});

test('waiting lobby: join-room to another lobby removes the player from the previous room', async () => {
  const hostA = await connectClient();
  const hostB = await connectClient();
  const guest = await connectClient();

  const roomA = await emitWithAck<{ success: boolean; code?: string }>((ack) => {
    hostA.emit(
      'create-room',
      {
        gameId: 'marrakech',
        playerName: 'HostA',
        playerAvatar: normalizePlayerAvatar(undefined, 'host-a-switch'),
        playerToken: 'host-a-switch-token',
      },
      ack,
    );
  });
  assert.equal(roomA.success, true);
  assert.ok(roomA.code);

  const roomB = await emitWithAck<{ success: boolean; code?: string }>((ack) => {
    hostB.emit(
      'create-room',
      {
        gameId: 'splendor',
        playerName: 'HostB',
        playerAvatar: normalizePlayerAvatar(undefined, 'host-b-switch'),
        playerToken: 'host-b-switch-token',
      },
      ack,
    );
  });
  assert.equal(roomB.success, true);
  assert.ok(roomB.code);

  const joinedB = await emitWithAck<{ success: boolean }>((ack) => {
    guest.emit(
      'join-room',
      {
        code: roomB.code!,
        playerName: 'GuestSwitch',
        playerAvatar: normalizePlayerAvatar(undefined, 'guest-switch'),
        playerToken: 'guest-switch-token',
      },
      ack,
    );
  });
  assert.equal(joinedB.success, true);
  assert.equal(getRoom(roomB.code!)?.players.length, 2);

  const hostBSeesLeave = waitForRoomUpdate(
    hostB,
    (room) => room.code === roomB.code && room.players.length === 1,
  );
  const hostASeesJoin = waitForRoomUpdate(
    hostA,
    (room) => room.code === roomA.code && room.players.some((p) => p.id === 'guest-switch-token'),
  );

  const joinedA = await emitWithAck<{ success: boolean }>((ack) => {
    guest.emit(
      'join-room',
      {
        code: roomA.code!,
        playerName: 'GuestSwitch',
        playerAvatar: normalizePlayerAvatar(undefined, 'guest-switch'),
        playerToken: 'guest-switch-token',
      },
      ack,
    );
  });
  assert.equal(joinedA.success, true);

  await hostBSeesLeave;
  await hostASeesJoin;

  const leftB = getRoom(roomB.code!);
  assert.ok(leftB);
  assert.equal(leftB.players.length, 1);
  assert.equal(
    leftB.players.some((p) => p.id === 'guest-switch-token'),
    false,
  );

  const inA = getRoom(roomA.code!);
  assert.ok(inA);
  assert.equal(
    inA.players.some((p) => p.id === 'guest-switch-token' && p.connected),
    true,
  );
});

test('create-room while seated detaches the previous lobby (no dual-room socket)', async () => {
  const host = await connectClient();

  const first = await emitWithAck<{
    success: boolean;
    code?: string;
    playerToken?: string;
  }>((ack) => {
    host.emit(
      'create-room',
      {
        gameId: 'marrakech',
        playerName: 'HostRecreate',
        playerAvatar: normalizePlayerAvatar(undefined, 'host-recreate'),
        playerToken: 'host-recreate-token-1',
      },
      ack,
    );
  });
  assert.equal(first.success, true);
  assert.ok(first.code);
  assert.equal(getRoom(first.code!)?.players.length, 1);

  const second = await emitWithAck<{
    success: boolean;
    code?: string;
    playerToken?: string;
  }>((ack) => {
    host.emit(
      'create-room',
      {
        gameId: 'splendor',
        playerName: 'HostRecreate',
        playerAvatar: normalizePlayerAvatar(undefined, 'host-recreate'),
        playerToken: 'host-recreate-token-2',
      },
      ack,
    );
  });
  assert.equal(second.success, true);
  assert.ok(second.code);
  assert.notEqual(second.code, first.code);

  // Previous solo lobby should be gone after detach+leave.
  assert.equal(getRoom(first.code!), undefined);

  const newRoom = getRoom(second.code!);
  assert.ok(newRoom);
  assert.equal(newRoom.gameId, 'splendor');
  assert.equal(newRoom.players.length, 1);
  assert.equal(newRoom.players[0]?.id, 'host-recreate-token-2');
});
