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

function waitForEvent<T>(
  socket: TestClient,
  event: keyof ServerToClientEvents,
  timeoutMs = 1000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, ((value: T) => {
      clearTimeout(timer);
      resolve(value);
    }) as never);
  });
}

async function createFugitiveMatch(): Promise<{
  host: TestClient;
  guest: TestClient;
  code: string;
  hostToken: string;
}> {
  const host = await connectClient();
  const guest = await connectClient();
  const hostToken = `host-${Math.random().toString(36).slice(2, 8)}`;
  const guestToken = `guest-${Math.random().toString(36).slice(2, 8)}`;

  const created = await emitWithAck<{
    success: boolean;
    code?: string;
    error?: string;
  }>((ack) => {
    host.emit(
      'create-room',
      {
        gameId: 'fugitive',
        playerName: 'Host',
        playerAvatar: normalizePlayerAvatar({}, hostToken),
        playerToken: hostToken,
      },
      ack,
    );
  });
  assert.equal(created.success, true, created.error);
  assert(created.code);

  const joined = await emitWithAck<{ success: boolean; error?: string }>((ack) => {
    guest.emit(
      'join-room',
      {
        code: created.code!,
        playerName: 'Guest',
        playerAvatar: normalizePlayerAvatar({}, guestToken),
        playerToken: guestToken,
      },
      ack,
    );
  });
  assert.equal(joined.success, true, joined.error);

  const started = waitForEvent<void>(host, 'game-started');
  host.emit('start-game');
  await started;

  return { host, guest, code: created.code!, hostToken };
}

test('room-sticker: rejects guests without userId when server auth is configured', async () => {
  const { host } = await createFugitiveMatch();

  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  try {
    const res = await emitWithAck<{ success: boolean; error?: string }>((ack) => {
      host.emit('room-sticker', { stickerId: 'yeah' }, ack);
    });
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /เข้าสู่ระบบ/);
  } finally {
    if (prevUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = prevUrl;
    if (prevKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
  }
});

test('room-sticker: guest-only server (no Supabase) still lets seats send', async () => {
  const { host, guest } = await createFugitiveMatch();

  const guestSaw = waitForEvent<{ playerId: string; stickerId: string }>(guest, 'room-sticker');
  const res = await emitWithAck<{ success: boolean; error?: string }>((ack) => {
    host.emit('room-sticker', { stickerId: 'yeah' }, ack);
  });
  assert.equal(res.success, true, res.error);
  assert.equal((await guestSaw).stickerId, 'yeah');
});

test('room-sticker: rejects unknown sticker ids', async () => {
  const { host, code, hostToken } = await createFugitiveMatch();
  const room = getRoom(code);
  assert(room);
  const seat = room.players.find((p) => p.id === hostToken);
  assert(seat);
  seat.userId = 'user-host-1';

  const res = await emitWithAck<{ success: boolean; error?: string }>((ack) => {
    host.emit('room-sticker', { stickerId: 'not-a-real-sticker' }, ack);
  });
  assert.equal(res.success, false);
  assert.match(res.error ?? '', /ไม่ถูกต้อง/);
});

test('room-sticker: fans out to room and rate-limits', async () => {
  const { host, guest, code, hostToken } = await createFugitiveMatch();
  const room = getRoom(code);
  assert(room);
  const seat = room.players.find((p) => p.id === hostToken);
  assert(seat);
  seat.userId = 'user-host-2';

  const guestSaw = waitForEvent<{ playerId: string; stickerId: string; at: number }>(
    guest,
    'room-sticker',
  );
  const hostSaw = waitForEvent<{ playerId: string; stickerId: string; at: number }>(
    host,
    'room-sticker',
  );

  const ok = await emitWithAck<{ success: boolean; error?: string }>((ack) => {
    host.emit('room-sticker', { stickerId: 'laugh' }, ack);
  });
  assert.equal(ok.success, true, ok.error);

  const [fromGuest, fromHost] = await Promise.all([guestSaw, hostSaw]);
  assert.equal(fromGuest.stickerId, 'laugh');
  assert.equal(fromGuest.playerId, hostToken);
  assert.equal(fromHost.stickerId, 'laugh');

  const throttled = await emitWithAck<{ success: boolean; error?: string }>((ack) => {
    host.emit('room-sticker', { stickerId: 'yeah' }, ack);
  });
  assert.equal(throttled.success, false);
  assert.match(throttled.error ?? '', /เร็วเกินไป/);

  // Lobby / non-playing reject
  room.status = 'waiting';
  const lobbyReject = await emitWithAck<{ success: boolean; error?: string }>((ack) => {
    host.emit('room-sticker', { stickerId: 'yeah' }, ack);
  });
  assert.equal(lobbyReject.success, false);
  assert.match(lobbyReject.error ?? '', /ตอนเล่น/);
});

test('room-sticker: room-updated still carries no sticker history', async () => {
  const { host, code, hostToken } = await createFugitiveMatch();
  const room = getRoom(code);
  assert(room);
  const seat = room.players.find((p) => p.id === hostToken);
  assert(seat);
  seat.userId = 'user-host-3';

  await emitWithAck<{ success: boolean; error?: string }>((ack) => {
    host.emit('room-sticker', { stickerId: 'oops' }, ack);
  });

  const clientRoom = await new Promise<Room>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no room-updated')), 800);
    host.once('room-updated', (r) => {
      clearTimeout(timer);
      resolve(r);
    });
    // Force a room broadcast by restarting to lobby (host-only)
    host.emit('restart-game');
  });

  assert.equal(clientRoom.status, 'waiting');
  assert.equal('stickers' in clientRoom, false);
  assert.equal('reactions' in clientRoom, false);
});
