import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';
import { RECONNECT_WINDOW_MS } from 'shared';
import { setupSocketHandlers, destroyRoomAsAdmin } from './socket-handlers.js';
import { listGames } from './games/registry.js';
import { listRooms, type ServerRoom } from './room-manager.js';
import {
  AdminTestWinsError,
  addTestWin,
  getTestWinSummary,
  resetTestWins,
} from './auth/adminTestWins.js';
import { fetchGamePlayCounts } from './auth/fetchGamePlayCounts.js';

import './games/register-all.js';

const PORT = process.env.PORT || 3001;

/** Comma-separated allowed origins for CORS (web + Capacitor). */
function parseClientOrigins(raw: string | undefined): string[] {
  const value = raw?.trim() || 'http://localhost:5173';
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const CLIENT_ORIGINS = parseClientOrigins(process.env.CLIENT_URL);

function getAdminSecret(): string {
  return process.env.ADMIN_SECRET ?? 'ADMIN$';
}

function assertAdminSecret(req: Request, res: Response, next: NextFunction): void {
  const h = req.headers['x-admin-secret'];
  if (typeof h !== 'string' || h !== getAdminSecret()) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

function adminRoomSummary(room: ServerRoom) {
  return {
    code: room.code,
    gameId: room.gameId,
    gameName: room.gameMeta.name,
    status: room.status,
    createdAt: room.createdAt,
    cleanupAt: room.cleanupAt,
    playerCount: room.players.length,
    connectedCount: room.players.filter((p) => p.connected).length,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
    })),
  };
}

const app = express();
app.use(
  cors({
    origin: CLIENT_ORIGINS,
    allowedHeaders: ['Content-Type', 'X-Admin-Secret'],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  }),
);
app.use(express.json());

// REST API — catalog sorted by play count (most played first); name tiebreak.
app.get('/api/games', async (_req, res) => {
  const games = listGames();
  try {
    const counts = await fetchGamePlayCounts();
    const enriched = games.map((g) => ({
      ...g,
      playCount: counts[g.id] ?? 0,
    }));
    enriched.sort((a, b) => {
      if (b.playCount !== a.playCount) return b.playCount - a.playCount;
      return a.name.localeCompare(b.name, 'th');
    });
    res.json(enriched);
  } catch (err) {
    console.error('/api/games play counts', err);
    res.json(games);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// HTTP + WebSocket server
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Admin-Secret'],
  },
  // Mobile / background tabs + Cloudflare Tunnel: tolerate frozen heartbeats.
  pingInterval: 25_000,
  pingTimeout: 60_000,
  connectionStateRecovery: {
    maxDisconnectionDuration: RECONNECT_WINDOW_MS,
  },
});

setupSocketHandlers(io);

app.get('/api/admin/rooms', assertAdminSecret, (_req, res) => {
  res.json({ rooms: listRooms().map(adminRoomSummary) });
});

app.delete('/api/admin/rooms/:code', assertAdminSecret, async (req, res) => {
  const raw = req.params.code;
  if (!raw || typeof raw !== 'string') {
    res.status(400).json({ error: 'Missing code' });
    return;
  }
  const result = await destroyRoomAsAdmin(io, raw);
  if (!result.ok) {
    const status = result.error === 'ไม่พบห้อง' ? 404 : 500;
    res.status(status).json(result);
    return;
  }
  res.json({ ok: true });
});

function adminTestWinsErrorResponse(res: Response, err: unknown): void {
  if (err instanceof AdminTestWinsError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error('admin test-wins', err);
  res.status(500).json({ error: 'Internal error' });
}

app.get('/api/admin/test-wins', assertAdminSecret, async (req, res) => {
  const handle = typeof req.query.handle === 'string' ? req.query.handle : '';
  if (!handle) {
    res.status(400).json({ error: 'Missing handle' });
    return;
  }
  try {
    const summary = await getTestWinSummary(handle);
    res.json(summary);
  } catch (err) {
    adminTestWinsErrorResponse(res, err);
  }
});

app.post('/api/admin/test-wins', assertAdminSecret, async (req, res) => {
  const handle = typeof req.body?.handle === 'string' ? req.body.handle : '';
  const gameId = typeof req.body?.gameId === 'string' ? req.body.gameId : '';
  if (!handle || !gameId) {
    res.status(400).json({ error: 'Missing handle or gameId' });
    return;
  }
  try {
    const result = await addTestWin(handle, gameId);
    res.json(result);
  } catch (err) {
    adminTestWinsErrorResponse(res, err);
  }
});

app.delete('/api/admin/test-wins', assertAdminSecret, async (req, res) => {
  const handle = typeof req.query.handle === 'string' ? req.query.handle : '';
  if (!handle) {
    res.status(400).json({ error: 'Missing handle' });
    return;
  }
  try {
    const result = await resetTestWins(handle);
    res.json(result);
  } catch (err) {
    adminTestWinsErrorResponse(res, err);
  }
});

httpServer.listen(PORT, () => {
  console.log(`
🎲 Board Game Server
📡 HTTP:      http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}
🎮 Games:     ${listGames()
    .map((g) => g.name)
    .join(', ')}
  `);
});
