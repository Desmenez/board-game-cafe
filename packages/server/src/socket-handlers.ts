import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, Room } from 'shared';
import {
  getPlayerDisplayNameValidationError,
  normalizePlayerAvatar,
  normalizePlayerDisplayName,
  parseSimiloLobbyOptions,
  parseLoveLetterLobbyOptions,
  loveLetterEditionPlayerBounds,
} from 'shared';
import {
  createRoom,
  getOldestRoomCode,
  getRoom,
  getRoomCount,
  joinRoom,
  kickPlayerFromRoom,
  isPlayerNameTaken,
  leaveRoom,
  markPlayerDisconnected,
  MAX_ROOMS,
  removeRoom,
  updatePlayerNameInRoom,
  updatePlayerAvatarInRoom,
  updateRoomGame,
  type ServerRoom,
} from './room-manager.js';
import { GameActionRejectedError } from './game-action-rejected.js';
import { getGame } from './games/registry.js';
import { resolveGameThumbnail } from 'shared';
import type { AvalonState, ExplodingKittensState, PowsState, Salem1692State } from 'shared';
import {
  advanceQuestRevealStep,
  resolveTeamVote,
  AVALON_QUEST_REVEAL_STEP_MS,
} from './games/avalon/engine.js';
import { resolveExplosionReveal } from './games/exploding-kittens/engine.js';
import type { NameItState } from './games/name-it/engine.js';
import { applyNameItTimerExpiry } from './games/name-it/engine.js';
import type { InsiderState } from './games/insider/engine.js';
import { applyInsiderTimerExpiry } from './games/insider/engine.js';
import { applySpyfallTimerExpiry } from './games/spyfall/engine.js';
import { applyUndercoverTimerExpiry } from './games/undercover/engine.js';
import { applySalem1692NightExpiry } from './games/salem-1692/engine.js';
import {
  applyOnuwNightStepExpiry,
  applyOnuwVoteEliminationRevealExpiry,
  applyOnuwVotePhaseExpiry,
  type OnuwState,
} from './games/one-night-werewolf/engine.js';
import { applyPowsNegotiationExpiry } from './games/panic-on-wall-street/engine.js';

const questRevealTimers = new Map<string, ReturnType<typeof setTimeout>>();
const TEAM_VOTE_RESOLUTION_DELAY_MS = 6000;
const teamVoteResolutionTimers = new Map<string, ReturnType<typeof setTimeout>>();
const EXPLOSION_REVEAL_DELAY_MS = 2000;
const explosionRevealTimers = new Map<string, ReturnType<typeof setTimeout>>();
const nameItTimers = new Map<string, ReturnType<typeof setTimeout>>();
const insiderTimers = new Map<string, ReturnType<typeof setTimeout>>();
const spyfallTimers = new Map<string, ReturnType<typeof setTimeout>>();
const undercoverTimers = new Map<string, ReturnType<typeof setTimeout>>();
const salem1692Timers = new Map<string, ReturnType<typeof setTimeout>>();
const onuwNightTimers = new Map<string, ReturnType<typeof setTimeout>>();
const onuwVoteTimers = new Map<string, ReturnType<typeof setTimeout>>();
const onuwVoteRevealTimers = new Map<string, ReturnType<typeof setTimeout>>();
const powsNegotiationTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearInsiderTimer(roomCode: string) {
  const t = insiderTimers.get(roomCode);
  if (t) clearTimeout(t);
  insiderTimers.delete(roomCode);
}

function clearSpyfallTimer(roomCode: string) {
  const t = spyfallTimers.get(roomCode);
  if (t) clearTimeout(t);
  spyfallTimers.delete(roomCode);
}

function clearUndercoverTimer(roomCode: string) {
  const t = undercoverTimers.get(roomCode);
  if (t) clearTimeout(t);
  undercoverTimers.delete(roomCode);
}

function clearSalem1692Timer(roomCode: string) {
  const t = salem1692Timers.get(roomCode);
  if (t) clearTimeout(t);
  salem1692Timers.delete(roomCode);
}

function clearOnuwNightTimer(roomCode: string) {
  const t = onuwNightTimers.get(roomCode);
  if (t) clearTimeout(t);
  onuwNightTimers.delete(roomCode);
}

function clearOnuwVoteTimer(roomCode: string) {
  const t = onuwVoteTimers.get(roomCode);
  if (t) clearTimeout(t);
  onuwVoteTimers.delete(roomCode);
}

function clearOnuwVoteRevealTimer(roomCode: string) {
  const t = onuwVoteRevealTimers.get(roomCode);
  if (t) clearTimeout(t);
  onuwVoteRevealTimers.delete(roomCode);
}

function scheduleOnuwNightStep(io: TypedIO, roomCode: string) {
  clearOnuwNightTimer(roomCode);
  const room = getRoom(roomCode);
  if (
    !room?.gameState ||
    room.gameId !== 'one-night-ultimate-werewolf' ||
    room.status !== 'playing'
  ) {
    return;
  }
  const gs = room.gameState as OnuwState;
  if (gs.phase !== 'night' || gs.outcome != null || gs.nightStepEndsAtMs == null) return;

  const delay = Math.max(0, gs.nightStepEndsAtMs - Date.now() + 50);
  const t = setTimeout(() => {
    const r = getRoom(roomCode);
    if (!r?.gameState || r.gameId !== 'one-night-ultimate-werewolf' || r.status !== 'playing')
      return;
    const prev = r.gameState as OnuwState;
    const next = applyOnuwNightStepExpiry(prev);
    if (next === prev) return;
    r.gameState = next;
    broadcastGameState(io, r);
    const game = getGame('one-night-ultimate-werewolf');
    if (!game) return;
    const result = game.isGameOver(next);
    if (result) {
      r.status = 'finished';
      io.to(roomCode).emit('game-over', result);
      broadcastRoomUpdate(io, r);
      broadcastGameState(io, r);
      clearOnuwNightTimer(roomCode);
    } else if (next.phase === 'night') {
      scheduleOnuwNightStep(io, roomCode);
    } else {
      clearOnuwNightTimer(roomCode);
      refreshOnuwTimers(io, roomCode);
    }
  }, delay);
  onuwNightTimers.set(roomCode, t);
}

function scheduleOnuwVoteExpiry(io: TypedIO, roomCode: string) {
  clearOnuwVoteTimer(roomCode);
  const room = getRoom(roomCode);
  if (
    !room?.gameState ||
    room.gameId !== 'one-night-ultimate-werewolf' ||
    room.status !== 'playing'
  ) {
    return;
  }
  const gs = room.gameState as OnuwState;
  if (gs.phase !== 'vote' || gs.outcome != null || gs.votePhaseEndsAtMs == null) return;

  const delay = Math.max(0, gs.votePhaseEndsAtMs - Date.now() + 50);
  const t = setTimeout(() => {
    const r = getRoom(roomCode);
    if (!r?.gameState || r.gameId !== 'one-night-ultimate-werewolf' || r.status !== 'playing')
      return;
    const prev = r.gameState as OnuwState;
    const next = applyOnuwVotePhaseExpiry(prev);
    if (next === prev) return;
    r.gameState = next;
    broadcastGameState(io, r);
    const game = getGame('one-night-ultimate-werewolf');
    if (!game) return;
    const result = game.isGameOver(next);
    if (result) {
      r.status = 'finished';
      io.to(roomCode).emit('game-over', result);
      broadcastRoomUpdate(io, r);
      broadcastGameState(io, r);
    }
    clearOnuwVoteTimer(roomCode);
  }, delay);
  onuwVoteTimers.set(roomCode, t);
}

function scheduleOnuwVoteEliminationRevealExpiry(io: TypedIO, roomCode: string) {
  clearOnuwVoteRevealTimer(roomCode);
  const room = getRoom(roomCode);
  if (
    !room?.gameState ||
    room.gameId !== 'one-night-ultimate-werewolf' ||
    room.status !== 'playing'
  ) {
    return;
  }
  const gs = room.gameState as OnuwState;
  if (
    gs.phase !== 'vote_elimination_reveal' ||
    gs.outcome != null ||
    gs.voteEliminationRevealEndsAtMs == null
  ) {
    return;
  }

  const delay = Math.max(0, gs.voteEliminationRevealEndsAtMs - Date.now() + 50);
  const t = setTimeout(() => {
    const r = getRoom(roomCode);
    if (!r?.gameState || r.gameId !== 'one-night-ultimate-werewolf' || r.status !== 'playing')
      return;
    const prev = r.gameState as OnuwState;
    const next = applyOnuwVoteEliminationRevealExpiry(prev);
    if (next === prev) return;
    r.gameState = next;
    broadcastGameState(io, r);
    const game = getGame('one-night-ultimate-werewolf');
    if (!game) return;
    const result = game.isGameOver(next);
    if (result) {
      r.status = 'finished';
      io.to(roomCode).emit('game-over', result);
      broadcastRoomUpdate(io, r);
      broadcastGameState(io, r);
    }
    clearOnuwVoteRevealTimer(roomCode);
    refreshOnuwTimers(io, roomCode);
  }, delay);
  onuwVoteRevealTimers.set(roomCode, t);
}

/** จัดตารางจับเวลา ONUW (กลางคืน / โหวต) หลังสถานะเปลี่ยน หรือหลังผู้เล่น reconnect */
function refreshOnuwTimers(io: TypedIO, roomCode: string) {
  const room = getRoom(roomCode);
  if (
    !room?.gameState ||
    room.gameId !== 'one-night-ultimate-werewolf' ||
    room.status !== 'playing'
  ) {
    clearOnuwNightTimer(roomCode);
    clearOnuwVoteTimer(roomCode);
    clearOnuwVoteRevealTimer(roomCode);
    return;
  }
  const gs = room.gameState as OnuwState;
  if (gs.outcome != null) {
    clearOnuwNightTimer(roomCode);
    clearOnuwVoteTimer(roomCode);
    clearOnuwVoteRevealTimer(roomCode);
    return;
  }
  if (gs.phase === 'night') {
    clearOnuwVoteTimer(roomCode);
    clearOnuwVoteRevealTimer(roomCode);
    scheduleOnuwNightStep(io, roomCode);
    return;
  }
  if (gs.phase === 'vote') {
    clearOnuwNightTimer(roomCode);
    clearOnuwVoteRevealTimer(roomCode);
    scheduleOnuwVoteExpiry(io, roomCode);
    return;
  }
  if (gs.phase === 'vote_elimination_reveal') {
    clearOnuwNightTimer(roomCode);
    clearOnuwVoteTimer(roomCode);
    scheduleOnuwVoteEliminationRevealExpiry(io, roomCode);
    return;
  }
  clearOnuwNightTimer(roomCode);
  clearOnuwVoteTimer(roomCode);
  clearOnuwVoteRevealTimer(roomCode);
}

function scheduleInsiderExpiry(io: TypedIO, roomCode: string) {
  clearInsiderTimer(roomCode);
  const room = getRoom(roomCode);
  if (!room?.gameState || room.gameId !== 'insider' || room.status !== 'playing') return;
  const gs = room.gameState as InsiderState;
  if (gs.outcome) return;

  const now = Date.now();
  let deadline: number | null = null;
  if (gs.phase === 'questioning' && gs.questioningEndsAtMs > 0) {
    deadline = gs.questioningEndsAtMs;
  } else if (gs.phase === 'discussion' && gs.discussionEndsAtMs != null) {
    deadline = gs.discussionEndsAtMs;
  }
  if (deadline == null) return;

  const delay = Math.max(0, deadline - now + 30);
  const t = setTimeout(() => {
    const r = getRoom(roomCode);
    if (!r?.gameState || r.gameId !== 'insider' || r.status !== 'playing') return;
    const prev = r.gameState as InsiderState;
    const st = applyInsiderTimerExpiry(prev);
    if (st === prev) return;
    r.gameState = st;
    broadcastGameState(io, r);
    const g = getGame('insider');
    if (!g) return;
    const res = g.isGameOver(st);
    if (res) {
      r.status = 'finished';
      io.to(roomCode).emit('game-over', res);
      broadcastRoomUpdate(io, r);
      broadcastGameState(io, r);
      clearInsiderTimer(roomCode);
    } else {
      scheduleInsiderExpiry(io, roomCode);
    }
  }, delay);
  insiderTimers.set(roomCode, t);
}

function scheduleUndercoverExpiry(io: TypedIO, roomCode: string) {
  clearUndercoverTimer(roomCode);
  const room = getRoom(roomCode);
  if (!room?.gameState || room.gameId !== 'undercover' || room.status !== 'playing') return;
  const gs = room.gameState as import('shared').UndercoverState;
  if (gs.outcome) return;

  const now = Date.now();
  let deadline: number | null = null;
  if (gs.phase === 'clue_round' && gs.clueEndsAtMs != null) {
    deadline = gs.clueEndsAtMs;
  } else if (gs.phase === 'discussion' && gs.discussionEndsAtMs != null) {
    deadline = gs.discussionEndsAtMs;
  }
  if (deadline == null) return;

  const delay = Math.max(0, deadline - now + 30);
  const t = setTimeout(() => {
    const r = getRoom(roomCode);
    if (!r?.gameState || r.gameId !== 'undercover' || r.status !== 'playing') return;
    const prev = r.gameState as import('shared').UndercoverState;
    const st = applyUndercoverTimerExpiry(prev);
    if (st === prev) return;
    r.gameState = st;
    broadcastGameState(io, r);
    const g = getGame('undercover');
    if (!g) return;
    const res = g.isGameOver(st);
    if (res) {
      r.status = 'finished';
      io.to(roomCode).emit('game-over', res);
      broadcastRoomUpdate(io, r);
      broadcastGameState(io, r);
      clearUndercoverTimer(roomCode);
    } else {
      scheduleUndercoverExpiry(io, roomCode);
    }
  }, delay);
  undercoverTimers.set(roomCode, t);
}

function scheduleSpyfallExpiry(io: TypedIO, roomCode: string) {
  clearSpyfallTimer(roomCode);
  const room = getRoom(roomCode);
  if (!room?.gameState || room.gameId !== 'spyfall' || room.status !== 'playing') return;
  const gs = room.gameState as { phase?: string; roundEndsAtMs?: number | null; result?: unknown };
  if (gs.result) return;
  if (gs.phase !== 'questioning' || gs.roundEndsAtMs == null) return;

  const delay = Math.max(0, gs.roundEndsAtMs - Date.now() + 30);
  const t = setTimeout(() => {
    const r = getRoom(roomCode);
    if (!r?.gameState || r.gameId !== 'spyfall' || r.status !== 'playing') return;
    const prev = r.gameState;
    const st = applySpyfallTimerExpiry(prev as Parameters<typeof applySpyfallTimerExpiry>[0]);
    if (st === prev) return;
    r.gameState = st;
    broadcastGameState(io, r);
    const g = getGame('spyfall');
    if (!g) return;
    const res = g.isGameOver(st);
    if (res) {
      r.status = 'finished';
      io.to(roomCode).emit('game-over', res);
      broadcastRoomUpdate(io, r);
      broadcastGameState(io, r);
      clearSpyfallTimer(roomCode);
    } else {
      scheduleSpyfallExpiry(io, roomCode);
    }
  }, delay);
  spyfallTimers.set(roomCode, t);
}

function scheduleSalem1692NightExpiry(io: TypedIO, roomCode: string) {
  clearSalem1692Timer(roomCode);
  const room = getRoom(roomCode);
  if (!room?.gameState || room.gameId !== 'salem-1692' || room.status !== 'playing') return;
  const gs = room.gameState as Salem1692State;
  if (gs.result) return;
  if (
    gs.phase !== 'night_witch' &&
    gs.phase !== 'night_constable' &&
    gs.phase !== 'night_confess'
  ) {
    return;
  }
  if (gs.nightStepEndsAtMs == null) return;

  const delay = Math.max(0, gs.nightStepEndsAtMs - Date.now() + 30);
  const t = setTimeout(() => {
    const r = getRoom(roomCode);
    if (!r?.gameState || r.gameId !== 'salem-1692' || r.status !== 'playing') return;
    const prev = r.gameState as Salem1692State;
    const st = applySalem1692NightExpiry(prev);
    if (st === prev) return;
    r.gameState = st;
    broadcastGameState(io, r);
    const g = getGame('salem-1692');
    if (!g) return;
    const res = g.isGameOver(st);
    if (res) {
      r.status = 'finished';
      io.to(roomCode).emit('game-over', res);
      broadcastRoomUpdate(io, r);
      broadcastGameState(io, r);
      clearSalem1692Timer(roomCode);
    } else {
      scheduleSalem1692NightExpiry(io, roomCode);
    }
  }, delay);
  salem1692Timers.set(roomCode, t);
}

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

  const runStep = () => {
    const room = getRoom(roomCode);
    if (!room?.gameState || room.gameId !== 'avalon') {
      questRevealTimers.delete(roomCode);
      return;
    }
    const gs = room.gameState as AvalonState;
    if (gs.phase !== 'quest_reveal') {
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
      questRevealTimers.delete(roomCode);
      return;
    }
    const t = setTimeout(runStep, AVALON_QUEST_REVEAL_STEP_MS);
    questRevealTimers.set(roomCode, t);
  };

  const first = setTimeout(runStep, AVALON_QUEST_REVEAL_STEP_MS);
  questRevealTimers.set(roomCode, first);
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

function clearQuestRevealTimerForRoom(roomCode: string) {
  const id = questRevealTimers.get(roomCode);
  if (id != null) {
    clearTimeout(id);
    questRevealTimers.delete(roomCode);
  }
}

function clearTeamVoteResolutionTimerForRoom(roomCode: string) {
  const t = teamVoteResolutionTimers.get(roomCode);
  if (t != null) {
    clearTimeout(t);
    teamVoteResolutionTimers.delete(roomCode);
  }
}

function clearExplosionRevealTimerForRoom(roomCode: string) {
  const t = explosionRevealTimers.get(roomCode);
  if (t != null) {
    clearTimeout(t);
    explosionRevealTimers.delete(roomCode);
  }
}

/** Stops all scheduled timers for a room (used when returning to lobby). */
function clearAllRoomGameTimers(roomCode: string) {
  clearQuestRevealTimerForRoom(roomCode);
  clearTeamVoteResolutionTimerForRoom(roomCode);
  clearExplosionRevealTimerForRoom(roomCode);
  clearNameItTimer(roomCode);
  clearInsiderTimer(roomCode);
  clearSpyfallTimer(roomCode);
  clearUndercoverTimer(roomCode);
  clearSalem1692Timer(roomCode);
  clearOnuwNightTimer(roomCode);
  clearOnuwVoteTimer(roomCode);
  clearOnuwVoteRevealTimer(roomCode);
  clearPowsNegotiationTimer(roomCode);
}

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;

function clearPowsNegotiationTimer(roomCode: string) {
  const t = powsNegotiationTimers.get(roomCode);
  if (t) clearTimeout(t);
  powsNegotiationTimers.delete(roomCode);
}

function schedulePowsNegotiationExpiry(io: TypedIO, roomCode: string) {
  clearPowsNegotiationTimer(roomCode);
  const room = getRoom(roomCode);
  if (!room?.gameState || room.gameId !== 'panic-on-wall-street' || room.status !== 'playing')
    return;
  const gs = room.gameState as PowsState;
  if (gs.phase !== 'negotiation' || gs.negotiationEndsAtMs == null) return;
  const delay = Math.max(0, gs.negotiationEndsAtMs - Date.now() + 50);
  const t = setTimeout(() => {
    const r = getRoom(roomCode);
    if (!r?.gameState || r.gameId !== 'panic-on-wall-street' || r.status !== 'playing') {
      clearPowsNegotiationTimer(roomCode);
      return;
    }
    const st = r.gameState as PowsState;
    const beforePhase = st.phase;
    const beforeEnd = st.negotiationEndsAtMs;
    applyPowsNegotiationExpiry(st);
    r.gameState = st;
    broadcastGameState(io, r);
    if (
      beforePhase === 'negotiation' &&
      st.phase === 'negotiation' &&
      st.negotiationEndsAtMs === beforeEnd
    ) {
      schedulePowsNegotiationExpiry(io, roomCode);
    } else {
      clearPowsNegotiationTimer(roomCode);
    }
  }, delay);
  powsNegotiationTimers.set(roomCode, t);
}

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

function emitGameStateToPlayer(io: TypedIO, room: ServerRoom, playerId: string): void {
  const game = getGame(room.gameId);
  if (!game || !room.gameState) return;
  const view = game.getPlayerView(room.gameState, playerId);
  const socketId = playerSocketMap.get(playerId);
  if (socketId) io.to(socketId).emit('game-state', view);
}

function syncPlayingGameToSocket(
  io: TypedIO,
  socket: TypedSocket,
  room: ServerRoom,
  playerId: string,
): void {
  if (room.status !== 'playing' && room.status !== 'finished') return;
  if (!room.gameState) return;
  socket.emit('game-started');
  emitGameStateToPlayer(io, room, playerId);
  if (room.gameId === 'one-night-ultimate-werewolf') {
    refreshOnuwTimers(io, room.code);
  }
}

function broadcastGameState(io: TypedIO, room: ServerRoom) {
  void broadcastGameStateToRoom(io, room);
}

async function broadcastGameStateToRoom(io: TypedIO, room: ServerRoom) {
  const game = getGame(room.gameId);
  if (!game || !room.gameState) return;

  const delivered = new Set<string>();

  try {
    const sockets = await io.in(room.code).fetchSockets();
    for (const remoteSocket of sockets) {
      const playerId = socketPlayerMap.get(remoteSocket.id);
      if (!playerId) continue;
      delivered.add(playerId);
      const view = game.getPlayerView(room.gameState, playerId);
      remoteSocket.emit('game-state', view);
    }
  } catch (err) {
    console.error('broadcastGameState fetchSockets', err);
  }

  for (const player of room.players) {
    if (delivered.has(player.id)) continue;
    emitGameStateToPlayer(io, room, player.id);
  }
}

/** Admin HTTP API: remove room, kick all connected clients, clear socket maps. */
export async function destroyRoomAsAdmin(
  io: TypedIO,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const normalized = code.toUpperCase().trim();
  const room = getRoom(normalized);
  if (!room) return { ok: false, error: 'ไม่พบห้อง' };

  clearAllRoomGameTimers(normalized);

  try {
    const sockets = await io.in(normalized).fetchSockets();
    for (const s of sockets) {
      const playerId = socketPlayerMap.get(s.id);
      s.emit('kicked-from-room', { code: normalized });
      s.leave(normalized);
      socketRoomMap.delete(s.id);
      socketPlayerMap.delete(s.id);
      if (playerId) playerSocketMap.delete(playerId);
    }
  } catch (e) {
    console.error('destroyRoomAsAdmin', e);
    return { ok: false, error: 'ลบห้องไม่สำเร็จ' };
  }

  removeRoom(normalized);
  return { ok: true };
}

export function setupSocketHandlers(io: TypedIO) {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`🔌 Connected: ${socket.id}`);

    socket.on('create-room', async (data, callback) => {
      const { gameId, playerName, playerAvatar, playerToken } = data;
      const game = getGame(gameId);

      if (!game) {
        callback({ success: false, error: 'เกมไม่ถูกต้อง' });
        return;
      }

      if (getRoomCount() >= MAX_ROOMS) {
        const evictCode = getOldestRoomCode();
        if (!evictCode) {
          callback({ success: false, error: `ห้องเต็ม (สูงสุด ${MAX_ROOMS} ห้อง)` });
          return;
        }
        const destroyed = await destroyRoomAsAdmin(io, evictCode);
        if (!destroyed.ok) {
          callback({
            success: false,
            error: destroyed.error ?? 'ไม่สามารถเตรียมห้องได้ (ลบห้องเก่าไม่สำเร็จ)',
          });
          return;
        }
        console.log(`♻️ Evicted oldest room ${evictCode} to stay at or below ${MAX_ROOMS} rooms`);
      }

      const playerId = playerToken ?? socket.id;
      const name = normalizePlayerDisplayName(playerName);
      if (!name) {
        callback({
          success: false,
          error: getPlayerDisplayNameValidationError(playerName) ?? 'กรุณาใส่ชื่อที่ถูกต้อง',
        });
        return;
      }
      const player = {
        id: playerId,
        name,
        avatar: normalizePlayerAvatar(playerAvatar, playerId),
        connected: true,
      };
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
        callback({ success: false, error: `ห้องเต็ม (สูงสุด ${MAX_ROOMS} ห้อง)` });
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
      const { code, playerName, playerAvatar, playerToken } = data;
      const normalizedCode = code.toUpperCase().trim();
      const existingRoom = getRoom(normalizedCode);

      if (!existingRoom) {
        callback({ success: false, error: 'ไม่พบห้องนี้' });
        return;
      }

      const playerId = playerToken ?? socket.id;
      const priorPlayer = existingRoom.players.find((p) => p.id === playerId);
      const wasDisconnected = priorPlayer ? !priorPlayer.connected : false;

      const name = normalizePlayerDisplayName(playerName);
      if (!name) {
        callback({
          success: false,
          error: getPlayerDisplayNameValidationError(playerName) ?? 'กรุณาใส่ชื่อที่ถูกต้อง',
        });
        return;
      }
      if (isPlayerNameTaken(existingRoom, name, priorPlayer?.id)) {
        callback({ success: false, error: 'ชื่อนี้มีคนใช้แล้ว' });
        return;
      }

      const player = {
        id: playerId,
        name,
        avatar: normalizePlayerAvatar(playerAvatar ?? priorPlayer?.avatar, playerId),
        connected: true,
      };
      const room = joinRoom(normalizedCode, player);

      if (!room) {
        callback({
          success: false,
          error:
            priorPlayer && !priorPlayer.connected
              ? 'หมดเวลาการกลับเข้าห้องแล้ว'
              : isPlayerNameTaken(existingRoom, name, priorPlayer?.id)
                ? 'ชื่อนี้มีคนใช้แล้ว'
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

      if (room.status === 'playing' || room.status === 'finished') {
        syncPlayingGameToSocket(io, socket, room, playerId);
      }
    });

    socket.on('sync-game-state', (callback) => {
      const ack = (ok: boolean) => callback?.({ ok });
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) {
        ack(true);
        return;
      }
      const room = getRoom(roomCode);
      if (!room) {
        ack(true);
        return;
      }
      const playerId = socketPlayerMap.get(socket.id);
      if (!playerId) {
        ack(true);
        return;
      }
      if (room.status === 'playing' || room.status === 'finished') {
        syncPlayingGameToSocket(io, socket, room, playerId);
      } else {
        socket.emit('room-updated', toClientRoom(room));
      }
      ack(true);
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
      room.lobbyOptions =
        room.gameId === 'similo'
          ? parseSimiloLobbyOptions(options)
          : room.gameId === 'love-letter'
            ? parseLoveLetterLobbyOptions(options)
            : options;
      broadcastRoomUpdate(io, room);
    });

    socket.on('update-player-name', (data, callback) => {
      const respond = (res: { success: boolean; error?: string }) => {
        callback?.(res);
      };

      const roomCode = socketRoomMap.get(socket.id);
      const playerId = socketPlayerMap.get(socket.id);
      if (!roomCode || !playerId) {
        respond({ success: false, error: 'ไม่ได้อยู่ในห้อง' });
        return;
      }

      const result = updatePlayerNameInRoom(roomCode, playerId, data.name);
      if (!result.ok) {
        respond({ success: false, error: result.error });
        return;
      }

      broadcastRoomUpdate(io, result.room);
      respond({ success: true });
    });

    socket.on('update-player-avatar', (data, callback) => {
      const respond = (res: { success: boolean; error?: string }) => {
        callback?.(res);
      };

      const roomCode = socketRoomMap.get(socket.id);
      const playerId = socketPlayerMap.get(socket.id);
      if (!roomCode || !playerId) {
        respond({ success: false, error: 'ไม่ได้อยู่ในห้อง' });
        return;
      }

      const result = updatePlayerAvatarInRoom(roomCode, playerId, data.avatar);
      if (!result.ok) {
        respond({ success: false, error: result.error });
        return;
      }

      broadcastRoomUpdate(io, result.room);
      respond({ success: true });
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

    socket.on('update-room-game', (data, callback) => {
      const respond = (res: { success: boolean; error?: string }) => {
        callback?.(res);
      };

      const roomCode = socketRoomMap.get(socket.id);
      const hostId = socketPlayerMap.get(socket.id);
      if (!roomCode || !hostId) {
        respond({ success: false, error: 'ไม่ได้อยู่ในห้อง' });
        return;
      }

      const game = getGame(data.gameId);
      if (!game) {
        respond({ success: false, error: 'เกมไม่ถูกต้อง' });
        return;
      }

      const result = updateRoomGame(roomCode, hostId, game.id, {
        id: game.id,
        name: game.name,
        description: game.description,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        thumbnail: resolveGameThumbnail(game.id, game.thumbnail),
      });
      if (!result.ok) {
        respond({ success: false, error: result.error });
        return;
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

      if (room.players.length > game.maxPlayers) {
        socket.emit('error', `เกมนี้รองรับได้สูงสุด ${game.maxPlayers} คน`);
        return;
      }

      const offline = room.players.filter((p) => !playerSocketMap.get(p.id));
      if (offline.length > 0) {
        socket.emit('error', `รอผู้เล่นเชื่อมต่อ: ${offline.map((p) => p.name).join(', ')}`);
        return;
      }

      let setupOptions: unknown =
        options !== undefined && options !== null ? options : room.lobbyOptions;
      if (room.gameId === 'similo') {
        setupOptions = parseSimiloLobbyOptions(setupOptions);
        room.lobbyOptions = setupOptions;
      }
      if (room.gameId === 'love-letter') {
        const opts = parseLoveLetterLobbyOptions(setupOptions);
        room.lobbyOptions = opts;
        setupOptions = opts;

        if (opts.edition === 'premium') {
          socket.emit('error', 'โหมด Premium ยังไม่พร้อม — เลือก Classic ก่อนเริ่มเกม');
          return;
        }
        const { min, max } = loveLetterEditionPlayerBounds(opts.edition);
        const n = room.players.length;
        if (n < min || n > max) {
          socket.emit('error', `โหมด Classic รองรับ ${min}–${max} คน (ตอนนี้มี ${n} คน)`);
          return;
        }
      }
      if (room.gameId === 'welcome-to-the-dungeon' || room.gameId === 'panic-on-wall-street') {
        const o =
          setupOptions && typeof setupOptions === 'object'
            ? { ...(setupOptions as Record<string, unknown>) }
            : {};
        o.hostId = room.hostId;
        setupOptions = o;
      }

      // Start the game
      room.status = 'playing';
      room.gameState = game.setup(room.players, setupOptions);

      io.to(room.code).emit('game-started');
      broadcastRoomUpdate(io, room);
      broadcastGameState(io, room);
      if (room.gameId === 'name-it') {
        scheduleNameItExpiry(io, room.code);
      }
      if (room.gameId === 'insider') {
        scheduleInsiderExpiry(io, room.code);
      }
      if (room.gameId === 'spyfall') {
        scheduleSpyfallExpiry(io, room.code);
      }
      if (room.gameId === 'undercover') {
        scheduleUndercoverExpiry(io, room.code);
      }
      if (room.gameId === 'salem-1692') {
        scheduleSalem1692NightExpiry(io, room.code);
      }
      if (room.gameId === 'one-night-ultimate-werewolf') {
        refreshOnuwTimers(io, room.code);
      }
      if (room.gameId === 'panic-on-wall-street') {
        schedulePowsNegotiationExpiry(io, room.code);
      }
    });

    // Host-only: return everyone to the lobby (same room code); clears round state.
    socket.on('restart-game', () => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) return;

      const room = getRoom(roomCode);
      if (!room) return;
      const playerId = socketPlayerMap.get(socket.id);
      if (!playerId) return;

      if (room.hostId !== playerId) return;
      if (room.status !== 'playing' && room.status !== 'finished') return;

      clearAllRoomGameTimers(roomCode);

      room.status = 'waiting';
      room.gameState = null;

      broadcastRoomUpdate(io, room);
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

        if (room.gameId === 'one-night-ultimate-werewolf') {
          refreshOnuwTimers(io, roomCode);
        }

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
          if (room.gameId === 'insider') {
            clearInsiderTimer(roomCode);
          }
          if (room.gameId === 'spyfall') {
            clearSpyfallTimer(roomCode);
          }
          if (room.gameId === 'undercover') {
            clearUndercoverTimer(roomCode);
          }
          if (room.gameId === 'salem-1692') {
            clearSalem1692Timer(roomCode);
          }
          if (room.gameId === 'one-night-ultimate-werewolf') {
            refreshOnuwTimers(io, roomCode);
          }
          if (room.gameId === 'panic-on-wall-street') {
            clearPowsNegotiationTimer(roomCode);
          }
          room.status = 'finished';
          io.to(room.code).emit('game-over', result);
          broadcastRoomUpdate(io, room);
          // Send final state with all info revealed
          broadcastGameState(io, room);
        } else if (room.gameId === 'name-it') {
          scheduleNameItExpiry(io, roomCode);
        } else if (room.gameId === 'insider') {
          scheduleInsiderExpiry(io, roomCode);
        } else if (room.gameId === 'spyfall') {
          scheduleSpyfallExpiry(io, roomCode);
        } else if (room.gameId === 'undercover') {
          scheduleUndercoverExpiry(io, roomCode);
        } else if (room.gameId === 'salem-1692') {
          scheduleSalem1692NightExpiry(io, roomCode);
        }
        if (room.gameId === 'panic-on-wall-street') {
          const gs = room.gameState as PowsState;
          if (gs.phase === 'negotiation' && gs.negotiationEndsAtMs != null) {
            schedulePowsNegotiationExpiry(io, roomCode);
          } else {
            clearPowsNegotiationTimer(roomCode);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในเกม';
        socket.emit('error', msg);
        if (err instanceof GameActionRejectedError) {
          // เกมอาจ mutate state ก่อน throw (เช่น cooldown หลังกดผิด) — ต้อง broadcast ให้ client ตรงกับเซิร์ฟเวอร์
          broadcastGameState(io, room);
          if (room.gameId === 'one-night-ultimate-werewolf') {
            refreshOnuwTimers(io, roomCode);
          }
          if (room.gameId === 'name-it') {
            scheduleNameItExpiry(io, roomCode);
          }
          if (room.gameId === 'insider') {
            scheduleInsiderExpiry(io, roomCode);
          }
          if (room.gameId === 'spyfall') {
            scheduleSpyfallExpiry(io, roomCode);
          }
          if (room.gameId === 'undercover') {
            scheduleUndercoverExpiry(io, roomCode);
          }
          if (room.gameId === 'salem-1692') {
            scheduleSalem1692NightExpiry(io, roomCode);
          }
          if (room.gameId === 'panic-on-wall-street') {
            const gs = room.gameState as PowsState;
            if (gs.phase === 'negotiation' && gs.negotiationEndsAtMs != null) {
              schedulePowsNegotiationExpiry(io, roomCode);
            } else {
              clearPowsNegotiationTimer(roomCode);
            }
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

      // Stale tab / replaced socket — do not mark disconnected or clear the active mapping.
      const activeSocketId = playerSocketMap.get(playerId);
      if (activeSocketId !== socket.id) {
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
