import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, Room } from 'shared';
import { createRoom, getRoom, joinRoom, leaveRoom, type ServerRoom } from './room-manager.js';
import { getGame } from './games/registry.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;

// Track socket → room mapping
const socketRoomMap = new Map<string, string>(); // socketId → roomCode
const socketPlayerMap = new Map<string, string>(); // socketId → playerId (stable token)
const playerSocketMap = new Map<string, string>(); // playerId → socketId

function toClientRoom(room: ServerRoom): Room {
  return {
    code: room.code,
    gameId: room.gameId,
    gameMeta: room.gameMeta,
    hostId: room.hostId,
    players: room.players,
    status: room.status,
    createdAt: room.createdAt,
  };
}

function broadcastRoomUpdate(io: TypedIO, room: ServerRoom) {
  io.to(room.code).emit('room-updated', toClientRoom(room));
}

function broadcastGameState(io: TypedIO, room: ServerRoom) {
  const game = getGame(room.gameId);
  if (!game || !room.gameState) return;

  // Send filtered view to each connected player
  for (const player of room.players) {
    const socketId = playerSocketMap.get(player.id);
    if (!socketId) continue; // player is currently disconnected
    const view = game.getPlayerView(room.gameState, player.id);
    io.to(socketId).emit('game-state', view);
  }
}

export function setupSocketHandlers(io: TypedIO) {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`🔌 Connected: ${socket.id}`);

    socket.on('create-room', (data, callback) => {
      const { gameId, playerName, playerToken } = data;
      const game = getGame(gameId);

      if (!game) {
        callback({ success: false, error: 'เกมไม่ถูกต้อง' });
        return;
      }

      const playerId = playerToken ?? socket.id;
      const player = { id: playerId, name: playerName, connected: true };
      const room = createRoom(
        gameId,
        {
          id: game.id,
          name: game.name,
          description: game.description,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          thumbnail: game.thumbnail,
        },
        player,
      );

      if (!room) {
        callback({ success: false, error: 'ห้องเต็ม (สูงสุด 10 ห้อง)' });
        return;
      }

      socket.join(room.code);
      socketRoomMap.set(socket.id, room.code);
      socketPlayerMap.set(socket.id, playerId);
      playerSocketMap.set(playerId, socket.id);
      callback({ success: true, code: room.code, playerToken: playerId });
      broadcastRoomUpdate(io, room);
    });

    socket.on('join-room', (data, callback) => {
      const { code, playerName, playerToken } = data;
      const normalizedCode = code.toUpperCase().trim();
      const existingRoom = getRoom(normalizedCode);

      if (!existingRoom) {
        callback({ success: false, error: 'ไม่พบห้องนี้' });
        return;
      }

      const playerId = playerToken ?? socket.id;
      const priorPlayer = existingRoom.players.find((p) => p.id === playerId);
      const wasDisconnected = priorPlayer ? !priorPlayer.connected : false;

      const player = { id: playerId, name: playerName, connected: true };
      const room = joinRoom(normalizedCode, player);

      if (!room) {
        callback({
          success: false,
          error:
            priorPlayer && !priorPlayer.connected
              ? 'หมดเวลาการกลับเข้าห้องแล้ว'
              : 'ไม่สามารถเข้าห้องได้',
        });
        return;
      }

      socket.join(room.code);
      socketRoomMap.set(socket.id, room.code);
      socketPlayerMap.set(socket.id, playerId);
      playerSocketMap.set(playerId, socket.id);

      callback({ success: true, reconnected: wasDisconnected });
      broadcastRoomUpdate(io, room);

      // If the game is already in progress, sync current state to this socket.
      if (room.status === 'playing' && room.gameState) {
        socket.emit('game-started');
        const game = getGame(room.gameId);
        if (game) {
          const view = game.getPlayerView(room.gameState, playerId);
          socket.emit('game-state', view);
        }
      }
    });

    socket.on('leave-room', () => {
      handleLeave(io, socket);
    });

    socket.on('start-game', () => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) return;

      const room = getRoom(roomCode);
      if (!room) return;
      const playerId = socketPlayerMap.get(socket.id);
      if (!playerId) return;
      if (room.hostId !== playerId) return;

      const game = getGame(room.gameId);
      if (!game) return;

      if (room.players.length < game.minPlayers) {
        socket.emit('error', `ต้องมีผู้เล่นอย่างน้อย ${game.minPlayers} คน`);
        return;
      }

      // Start the game
      room.status = 'playing';
      room.gameState = game.setup(room.players);

      io.to(room.code).emit('game-started');
      broadcastRoomUpdate(io, room);
      broadcastGameState(io, room);
    });

    socket.on('game-action', (action) => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) return;

      const room = getRoom(roomCode);
      if (!room || room.status !== 'playing' || !room.gameState) return;

      const playerId = socketPlayerMap.get(socket.id);
      if (!playerId) return;

      const game = getGame(room.gameId);
      if (!game) return;

      try {
        room.gameState = game.onAction(room.gameState, playerId, action);
        broadcastGameState(io, room);

        // Check game over
        const result = game.isGameOver(room.gameState);
        if (result) {
          room.status = 'finished';
          io.to(room.code).emit('game-over', result);
          broadcastRoomUpdate(io, room);
          // Send final state with all info revealed
          broadcastGameState(io, room);
        }
      } catch (err) {
        console.error('Game action error:', err);
        socket.emit('error', 'เกิดข้อผิดพลาดในเกม');
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Disconnected: ${socket.id}`);
      const roomCode = socketRoomMap.get(socket.id);
      const playerId = socketPlayerMap.get(socket.id);

      // Clean up socket mappings first.
      if (roomCode) socketRoomMap.delete(socket.id);
      if (playerId) {
        socketPlayerMap.delete(socket.id);
        playerSocketMap.delete(playerId);
      }

      if (!roomCode || !playerId) return;

      // For waiting rooms, remove immediately.
      // For active games, mark disconnected and allow reconnect.
      const room = leaveRoom(roomCode, playerId);
      if (!room) return;

      if (room.status !== 'waiting') {
        io.to(roomCode).emit('player-disconnected', playerId);
      }
      broadcastRoomUpdate(io, room);
    });
  });
}

function handleLeave(io: TypedIO, socket: TypedSocket) {
  const roomCode = socketRoomMap.get(socket.id);
  if (!roomCode) return;

  const playerId = socketPlayerMap.get(socket.id);
  if (!playerId) return;

  const room = leaveRoom(roomCode, playerId);
  socket.leave(roomCode);
  socketRoomMap.delete(socket.id);
  socketPlayerMap.delete(socket.id);
  playerSocketMap.delete(playerId);

  if (room) {
    broadcastRoomUpdate(io, room);
  }
}
