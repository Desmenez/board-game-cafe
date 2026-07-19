import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { Server } from 'socket.io';
import { io as createClient, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';
import { normalizePlayerAvatar } from 'shared';
import { setupSocketHandlers } from '../src/socket-handlers.js';
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

function waitForEvent<T>(socket: TestClient, event: 'game-started', timeoutMs = 500): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, ((value: T) => {
      clearTimeout(timer);
      resolve(value);
    }) as never);
  });
}

test('a returning player can resume the room and the host can start without a refresh', async () => {
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
        playerName: 'Host',
        playerAvatar: normalizePlayerAvatar({}, 'host-token'),
        playerToken: 'host-token',
      },
      ack,
    );
  });
  assert.equal(created.success, true, created.error);
  assert(created.code);

  const firstGuestSocket = await connectClient();
  const joined = await emitWithAck<{ success: boolean; error?: string }>((ack) => {
    firstGuestSocket.emit(
      'join-room',
      {
        code: created.code!,
        playerName: 'Guest',
        playerAvatar: normalizePlayerAvatar({}, 'guest-token'),
        playerToken: 'guest-token',
      },
      ack,
    );
  });
  assert.equal(joined.success, true, joined.error);

  firstGuestSocket.disconnect();

  const resumedGuestSocket = await connectClient();
  const resumed = await emitWithAck<{ success: boolean; error?: string }>((ack) => {
    resumedGuestSocket.emit(
      'resume-room',
      {
        code: created.code!,
        playerToken: 'guest-token',
      },
      ack,
    );
  });
  assert.equal(resumed.success, true, resumed.error);

  const gameStarted = waitForEvent<void>(host, 'game-started');
  host.emit('start-game');
  await gameStarted;
});
