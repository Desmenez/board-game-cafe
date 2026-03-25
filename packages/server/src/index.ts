import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';
import { setupSocketHandlers } from './socket-handlers.js';
import { listGames } from './games/registry.js';

// Register all games
import './games/avalon/index.js';

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_URL }));
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
    methods: ['GET', 'POST'],
  },
});

setupSocketHandlers(io);

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
