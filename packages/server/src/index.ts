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

import './games/register-all.js';

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

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
    origin: CLIENT_URL,
    allowedHeaders: ['Content-Type', 'X-Admin-Secret'],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  }),
);
app.use(express.json());

// REST API
app.get('/api/games', (_req, res) => {
  res.json(listGames());
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// HTTP + WebSocket server
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CLIENT_URL,
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
