import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, mock, test } from 'node:test';
import type { User } from '@supabase/supabase-js';
import { Server } from 'socket.io';
import { io as createClient, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';
import { normalizePlayerAvatar, RECONNECT_WINDOW_MS } from 'shared';
import { appAuth } from '../src/auth/index.js';
import { getRoom, markPlayerDisconnected } from '../src/room-manager.js';
import { setupSocketHandlers } from '../src/socket-handlers.js';
import '../src/games/register-all.js';

type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

const ALICE_TOKEN = 'alice-access';
const BOB_TOKEN = 'bob-access';
const ALICE_USER = 'user-alice';
const BOB_USER = 'user-bob';

mock.method(appAuth, 'verifyAdmittedAccessToken', async (accessToken?: string | null) => {
  if (accessToken === ALICE_TOKEN) {
    return {
      userId: ALICE_USER,
      user: { id: ALICE_USER } as User,
      sessionKey: ALICE_TOKEN,
      expiresAt: null,
    };
  }
  if (accessToken === BOB_TOKEN) {
    return {
      userId: BOB_USER,
      user: { id: BOB_USER } as User,
      sessionKey: BOB_TOKEN,
      expiresAt: null,
    };
  }
  return null;
});

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
  timeoutMs = 500,
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
  event: 'game-started' | 'game-session-replaced' | 'player-disconnected',
  timeoutMs = 500,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, ((value: T) => {
      clearTimeout(timer);
      resolve(value);
    }) as never);
  });
}

async function startFugitiveMatch(): Promise<{
  host: TestClient;
  guest: TestClient;
  code: string;
  hostToken: string;
}> {
  const host = await connectClient();
  const created = await emitWithAck<{
    success: boolean;
    code?: string;
    playerToken?: string;
    error?: string;
  }>((ack) => {
    host.emit(
      'create-room',
      {
        gameId: 'fugitive',
        playerName: 'Alice',
        playerAvatar: normalizePlayerAvatar({}, 'alice-seat'),
        playerToken: 'alice-seat',
        accessToken: ALICE_TOKEN,
      },
      ack,
    );
  });
  assert.equal(created.success, true, created.error);
  assert(created.code);
  assert.equal(created.playerToken, 'alice-seat');

  const guest = await connectClient();
  const joined = await emitWithAck<{ success: boolean; error?: string; playerToken?: string }>(
    (ack) => {
      guest.emit(
        'join-room',
        {
          code: created.code!,
          playerName: 'Bob',
          playerAvatar: normalizePlayerAvatar({}, 'bob-seat'),
          playerToken: 'bob-seat',
          accessToken: BOB_TOKEN,
        },
        ack,
      );
    },
  );
  assert.equal(joined.success, true, joined.error);

  const gameStarted = waitForEvent<void>(host, 'game-started');
  host.emit('start-game');
  await gameStarted;

  return { host, guest, code: created.code, hostToken: 'alice-seat' };
}

function expireReconnectWindow(code: string, playerId: string): void {
  assert.ok(markPlayerDisconnected(code, playerId));
  const room = getRoom(code);
  assert.ok(room);
  const seat = room.players.find((player) => player.id === playerId);
  assert.ok(seat);
  seat.disconnectedAt = Date.now() - RECONNECT_WINDOW_MS - 1_000;
}

test('a guest cannot resume an account-owned seat without signing in', async () => {
  const guest = await connectClient();
  const resumed = await emitWithAck<{ success: boolean; error?: string }>((ack) => {
    guest.emit('resume-authenticated-player', { code: 'ABCDEF' }, ack);
  });
  assert.equal(resumed.success, false);
  assert.equal(resumed.error, 'กรุณาเข้าสู่ระบบก่อนกลับเข้าเกม');
});

test('a signed-in player can resume from another device within the reconnect window', async () => {
  const { host, guest, code, hostToken } = await startFugitiveMatch();
  const disconnected = waitForEvent<string>(guest, 'player-disconnected');
  host.disconnect();
  await disconnected;
  const otherDevice = await connectClient();
  const resumed = await emitWithAck<{
    success: boolean;
    code?: string;
    playerToken?: string;
    error?: string;
  }>((ack) => {
    otherDevice.emit('resume-authenticated-player', { accessToken: ALICE_TOKEN, code }, ack);
  });
  assert.equal(resumed.success, true, resumed.error);
  assert.equal(resumed.code, code);
  assert.equal(resumed.playerToken, hostToken);

  const room = getRoom(code);
  assert.ok(room);
  const seat = room.players.find((player) => player.id === hostToken);
  assert.ok(seat);
  assert.equal(seat.connected, true);
  assert.equal(seat.userId, ALICE_USER);
  assert.equal(guest.connected, true);
});

test('a signed-in player cannot resume after the reconnect window', async () => {
  const { host, guest, code, hostToken } = await startFugitiveMatch();
  const disconnected = waitForEvent<string>(guest, 'player-disconnected');
  host.disconnect();
  await disconnected;
  expireReconnectWindow(code, hostToken);

  const otherDevice = await connectClient();
  const resumed = await emitWithAck<{ success: boolean; error?: string }>((ack) => {
    otherDevice.emit('resume-authenticated-player', { accessToken: ALICE_TOKEN, code }, ack);
  });
  assert.equal(resumed.success, false);
  assert.equal(resumed.error, 'ไม่พบเกมที่กำลังเล่นของบัญชีนี้');
});

test('resuming from another device replaces the previous connection', async () => {
  const { host, code, hostToken } = await startFugitiveMatch();
  const replaced = waitForEvent<{ code: string }>(host, 'game-session-replaced');

  const otherDevice = await connectClient();
  const resumed = await emitWithAck<{
    success: boolean;
    code?: string;
    playerToken?: string;
    error?: string;
  }>((ack) => {
    otherDevice.emit('resume-authenticated-player', { accessToken: ALICE_TOKEN, code }, ack);
  });
  assert.equal(resumed.success, true, resumed.error);
  assert.equal(resumed.playerToken, hostToken);

  const payload = await replaced;
  assert.equal(payload.code, code);
});
