import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, Room } from 'shared';
import {
  createRoom,
  getRoom,
  joinRoom,
  kickPlayerFromRoom,
  leaveRoom,
  markPlayerDisconnected,
  type ServerRoom,
} from './room-manager.js';
import { GameActionRejectedError } from './game-action-rejected.js';
import { getGame } from './games/registry.js';
import { resolveGameThumbnail } from 'shared';
import type { AvalonState, ExplodingKittensState } from 'shared';
import { advanceQuestRevealStep, resolveTeamVote } from './games/avalon/engine.js';
import { resolveExplosionReveal } from './games/exploding-kittens/engine.js';
import type { NameItState } from './games/name-it/engine.js';
import { applyNameItTimerExpiry } from './games/name-it/engine.js';

const QUEST_REVEAL_INTERVAL_MS = 1800;
const questRevealTimers = new Map<string, ReturnType<typeof setInterval>>();
const TEAM_VOTE_RESOLUTION_DELAY_MS = 6000;
const teamVoteResolutionTimers = new Map<string, ReturnType<typeof setTimeout>>();
const EXPLOSION_REVEAL_DELAY_MS = 2000;
const explosionRevealTimers = new Map<string, ReturnType<typeof setTimeout>>();
const nameItTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearNameItTimer(roomCode: string) {
  const t = nameItTimers.get(roomCode);
  if (t) clearTimeout(t);
  nameItTimers.delete(roomCode);
}

function scheduleNameItExpiry(io: TypedIO, roomCode: string) {
  clearNameItTimer(roomCode);
  const room = getRoom(roomCode);
  if (!room?.gameState || room.gameId !== 'name-it' || room.status !== 'playing') return;
  const gs = room.gameState as NameItState;
  if (gs.phase !== 'playing' || !gs.activeRound) return;
  const ar = gs.activeRound;
  const now = Date.now();
  const end =
    ar.subPhase === 'owner_naming' && ar.nameDeadlineMs != null ? ar.nameDeadlineMs : ar.deadlineMs;
  if (end == null) return;
  const delay = Math.max(0, end - now + 30);
  const t = setTimeout(() => {
    const r = getRoom(roomCode);
    if (!r?.gameState || r.gameId !== 'name-it') return;
    let st = r.gameState as NameItState;
    st = applyNameItTimerExpiry(st);
    r.gameState = st;
    broadcastGameState(io, r);
    const game = getGame('name-it');
    if (game) {
      const result = game.isGameOver(st);
      if (result) {
        r.status = 'finished';
        io.to(roomCode).emit('game-over', result);
        broadcastRoomUpdate(io, r);
        broadcastGameState(io, r);
      }
    }
    scheduleNameItExpiry(io, roomCode);
  }, delay);
  nameItTimers.set(roomCode, t);
}

function scheduleQuestReveal(io: TypedIO, roomCode: string) {
  if (questRevealTimers.has(roomCode)) return;
  const timerId = setInterval(() => {
    const room = getRoom(roomCode);
    if (!room?.gameState || room.gameId !== 'avalon') {
      clearInterval(timerId);
      questRevealTimers.delete(roomCode);
      return;
    }
    const gs = room.gameState as AvalonState;
    if (gs.phase !== 'quest_reveal') {
      clearInterval(timerId);
      questRevealTimers.delete(roomCode);
      return;
    }
    const next = advanceQuestRevealStep(gs);
    room.gameState = next;
    broadcastGameState(io, room);

    const game = getGame(room.gameId);
    if (game) {
      const result = game.isGameOver(next);
      if (result) {
        room.status = 'finished';
        io.to(roomCode).emit('game-over', result);
        broadcastRoomUpdate(io, room);
        broadcastGameState(io, room);
      }
    }

    if (next.phase !== 'quest_reveal') {
      clearInterval(timerId);
      questRevealTimers.delete(roomCode);
    }
  }, QUEST_REVEAL_INTERVAL_MS);
  questRevealTimers.set(roomCode, timerId);
}

function scheduleTeamVoteResolution(io: TypedIO, roomCode: string) {
  if (teamVoteResolutionTimers.has(roomCode)) return;

  const timerId = setTimeout(() => {
    const room = getRoom(roomCode);
    if (!room?.gameState || room.gameId !== 'avalon') {
      teamVoteResolutionTimers.delete(roomCode);
      return;
    }

    const gs = room.gameState as AvalonState;
    if (gs.phase !== 'team_vote') {
      teamVoteResolutionTimers.delete(roomCode);
      return;
    }

    const playerCount = gs.players.length;
    const votedCount = Object.keys(gs.teamVotes).length;
    if (votedCount !== playerCount) {
      teamVoteResolutionTimers.delete(roomCode);
      return;
    }

    const next = resolveTeamVote(gs);
    room.gameState = next;
    broadcastGameState(io, room);

    const game = getGame(room.gameId);
    if (game) {
      const result = game.isGameOver(next);
      if (result) {
        room.status = 'finished';
        io.to(room.code).emit('game-over', result);
        broadcastRoomUpdate(io, room);
        broadcastGameState(io, room);
      }
    }

    teamVoteResolutionTimers.delete(roomCode);
  }, TEAM_VOTE_RESOLUTION_DELAY_MS);

  teamVoteResolutionTimers.set(roomCode, timerId);
}

function scheduleExplosionRevealResolution(io: TypedIO, roomCode: string) {
  if (explosionRevealTimers.has(roomCode)) return;

  const timerId = setTimeout(() => {
    const room = getRoom(roomCode);
    if (!room?.gameState || room.gameId !== 'exploding-kittens') {
      explosionRevealTimers.delete(roomCode);
      return;
    }
    const gs = room.gameState as Record<string, unknown>;
    if (gs.phase !== 'explosion_reveal') {
      explosionRevealTimers.delete(roomCode);
      return;
    }

    room.gameState = resolveExplosionReveal(room.gameState as ExplodingKittensState);
    broadcastGameState(io, room);

    const game = getGame(room.gameId);
    if (game) {
      const result = game.isGameOver(room.gameState);
      if (result) {
        room.status = 'finished';
        io.to(room.code).emit('game-over', result);
        broadcastRoomUpdate(io, room);
        broadcastGameState(io, room);
      }
    }

    explosionRevealTimers.delete(roomCode);
  }, EXPLOSION_REVEAL_DELAY_MS);

  explosionRevealTimers.set(roomCode, timerId);
}

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
    lobbyOptions: room.lobbyOptions,
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
          thumbnail: resolveGameThumbnail(game.id, game.thumbnail),
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

    socket.on('update-lobby-options', (options) => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) return;
      const room = getRoom(roomCode);
      if (!room || room.status !== 'waiting') return;
      const playerId = socketPlayerMap.get(socket.id);
      if (!playerId || room.hostId !== playerId) return;
      room.lobbyOptions = options;
      broadcastRoomUpdate(io, room);
    });

    socket.on('kick-player', async (data, callback) => {
      const respond = (res: { success: boolean; error?: string }) => {
        callback?.(res);
      };

      const roomCode = socketRoomMap.get(socket.id);
      const hostId = socketPlayerMap.get(socket.id);
      if (!roomCode || !hostId) {
        respond({ success: false, error: 'ไม่ได้อยู่ในห้อง' });
        return;
      }

      const result = kickPlayerFromRoom(roomCode, hostId, data.targetPlayerId);
      if (!result.ok) {
        respond({ success: false, error: result.error });
        return;
      }

      const targetId = data.targetPlayerId;
      const targetSocketId = playerSocketMap.get(targetId);
      if (targetSocketId) {
        try {
          const remoteSockets = await io.in(targetSocketId).fetchSockets();
          for (const s of remoteSockets) {
            s.emit('kicked-from-room', { code: roomCode });
            s.leave(roomCode);
            socketRoomMap.delete(s.id);
            socketPlayerMap.delete(s.id);
          }
        } catch (e) {
          console.error('kick-player: fetchSockets', e);
        }
        playerSocketMap.delete(targetId);
      }

      broadcastRoomUpdate(io, result.room);
      respond({ success: true });
    });

    socket.on('start-game', (options) => {
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

      const setupOptions = options !== undefined && options !== null ? options : room.lobbyOptions;

      // Start the game
      room.status = 'playing';
      room.gameState = game.setup(room.players, setupOptions);

      io.to(room.code).emit('game-started');
      broadcastRoomUpdate(io, room);
      broadcastGameState(io, room);
      if (room.gameId === 'name-it') {
        scheduleNameItExpiry(io, room.code);
      }
    });

    // Restart a finished round without removing the room.
    // Host-only: avoids griefing / accidental restarts.
    socket.on('restart-game', () => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) return;

      const room = getRoom(roomCode);
      if (!room) return;
      const playerId = socketPlayerMap.get(socket.id);
      if (!playerId) return;

      if (room.hostId !== playerId) return;
      if (room.status !== 'finished') return;

      const game = getGame(room.gameId);
      if (!game) return;
      if (room.players.length < game.minPlayers) {
        socket.emit('error', `ต้องมีผู้เล่นอย่างน้อย ${game.minPlayers} คน`);
        return;
      }

      room.status = 'playing';
      const currentMode =
        room.gameId === 'exploding-kittens' &&
        room.gameState &&
        typeof room.gameState === 'object' &&
        'mode' in (room.gameState as Record<string, unknown>)
          ? ((room.gameState as { mode?: string }).mode ?? 'original')
          : undefined;
      room.gameState = game.setup(room.players, currentMode ? { mode: currentMode } : undefined);

      io.to(room.code).emit('game-started');
      broadcastRoomUpdate(io, room);
      broadcastGameState(io, room);
      if (room.gameId === 'name-it') {
        scheduleNameItExpiry(io, room.code);
      }
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

        if (
          room.gameId === 'avalon' &&
          (room.gameState as AvalonState).phase === 'quest_reveal' &&
          ((room.gameState as AvalonState).questRevealShown ?? 0) === 0
        ) {
          scheduleQuestReveal(io, roomCode);
        }

        // After all players have voted (team_vote), show results for a moment,
        // then resolve + move to next phase.
        if (room.gameId === 'avalon' && (room.gameState as AvalonState).phase === 'team_vote') {
          const gs = room.gameState as AvalonState;
          const playerCount = gs.players.length;
          const votedCount = Object.keys(gs.teamVotes).length;
          if (votedCount === playerCount) {
            scheduleTeamVoteResolution(io, roomCode);
          }
        }

        if (room.gameId === 'exploding-kittens') {
          const gs = room.gameState as Record<string, unknown>;
          if (gs.phase === 'explosion_reveal') {
            scheduleExplosionRevealResolution(io, roomCode);
          }
        }

        // Check game over
        const result = game.isGameOver(room.gameState);
        if (result) {
          if (room.gameId === 'name-it') {
            clearNameItTimer(roomCode);
          }
          room.status = 'finished';
          io.to(room.code).emit('game-over', result);
          broadcastRoomUpdate(io, room);
          // Send final state with all info revealed
          broadcastGameState(io, room);
        } else if (room.gameId === 'name-it') {
          scheduleNameItExpiry(io, roomCode);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในเกม';
        socket.emit('error', msg);
        if (err instanceof GameActionRejectedError) {
          // เกมอาจ mutate state ก่อน throw (เช่น cooldown หลังกดผิด) — ต้อง broadcast ให้ client ตรงกับเซิร์ฟเวอร์
          broadcastGameState(io, room);
          if (room.gameId === 'name-it') {
            scheduleNameItExpiry(io, roomCode);
          }
        } else {
          console.error('Game action error:', err);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Disconnected: ${socket.id}`);
      const roomCode = socketRoomMap.get(socket.id);
      const playerId = socketPlayerMap.get(socket.id);

      if (!roomCode || !playerId) {
        if (roomCode) socketRoomMap.delete(socket.id);
        if (playerId) socketPlayerMap.delete(socket.id);
        return;
      }

      // If this player already reconnected with a new socket (e.g. page refresh), this disconnect is
      // stale — do not mark them disconnected or wipe playerSocketMap for the active socket.
      const activeSocketId = playerSocketMap.get(playerId);
      if (activeSocketId !== undefined && activeSocketId !== socket.id) {
        socketRoomMap.delete(socket.id);
        socketPlayerMap.delete(socket.id);
        return;
      }

      socketRoomMap.delete(socket.id);
      socketPlayerMap.delete(socket.id);
      playerSocketMap.delete(playerId);

      // Keep player in the room (waiting or in-game) so they can reconnect with the same token after refresh.
      const room = markPlayerDisconnected(roomCode, playerId);
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
