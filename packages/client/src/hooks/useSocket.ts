import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, Room } from 'shared';
import { clearStoredRoomSession, normalizeRoomCode } from '../utils/playerToken';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const SOCKET_ERROR_TOAST_ID = 'socket-error';
/** If the server never acks (offline, proxy, etc.), avoid hanging forever. */
const SOCKET_ACK_TIMEOUT_MS = 15_000;
/** Probe for zombie connections after returning from a backgrounded mobile tab. */
const SOCKET_PROBE_TIMEOUT_MS = 5_000;

let globalSocket: TypedSocket | null = null;

function getSocket(): TypedSocket {
  if (!globalSocket) {
    globalSocket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
    });
  }
  return globalSocket;
}

function waitForSocketConnect(socket: TypedSocket, timeoutMs: number): Promise<boolean> {
  if (socket.connected) return Promise.resolve(true);
  return new Promise((resolve) => {
    const onConnect = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = window.setTimeout(() => {
      socket.off('connect', onConnect);
      resolve(false);
    }, timeoutMs);
    socket.once('connect', onConnect);
    socket.connect();
  });
}

function probeSocketAlive(socket: TypedSocket): Promise<boolean> {
  if (!socket.connected) return Promise.resolve(false);
  return new Promise((resolve) => {
    socket.timeout(SOCKET_PROBE_TIMEOUT_MS).emit('sync-game-state', (err) => {
      resolve(!err);
    });
  });
}

async function ensureLiveConnection(socket: TypedSocket): Promise<boolean> {
  if (!socket.connected) {
    return waitForSocketConnect(socket, SOCKET_ACK_TIMEOUT_MS);
  }
  const alive = await probeSocketAlive(socket);
  if (alive) return true;
  socket.disconnect();
  return waitForSocketConnect(socket, SOCKET_ACK_TIMEOUT_MS);
}

export function useSocket() {
  const socketRef = useRef<TypedSocket>(getSocket());
  const [connected, setConnected] = useState(socketRef.current.connected);
  const [resumeGeneration, setResumeGeneration] = useState(0);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<unknown>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState<{ winners: string[]; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kickedMessage, setKickedMessage] = useState<string | null>(null);
  const resumeInFlightRef = useRef(false);

  useEffect(() => {
    const socket = socketRef.current;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room-updated', (r) => {
      setRoom(r);
      if (r.status === 'waiting') {
        setGameStarted(false);
        setGameState(null);
        setGameOver(null);
      } else if (r.status === 'playing' || r.status === 'finished') {
        setGameStarted(true);
      }
    });
    socket.on('game-started', () => setGameStarted(true));
    socket.on('game-state', (s) => setGameState(s));
    socket.on('game-over', (result) => setGameOver(result));
    socket.on('error', (msg) => {
      setError(msg);
      toast.error(msg, { id: SOCKET_ERROR_TOAST_ID });
    });
    socket.on('kicked-from-room', (payload) => {
      if (payload?.code) {
        clearStoredRoomSession(normalizeRoomCode(payload.code));
      }
      setKickedMessage('คุณถูกเตะออกจากห้องโดยหัวห้อง');
      setRoom(null);
      setGameState(null);
      setGameStarted(false);
      setGameOver(null);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room-updated');
      socket.off('game-started');
      socket.off('game-state');
      socket.off('game-over');
      socket.off('error');
      socket.off('kicked-from-room');
    };
  }, []);

  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState !== 'visible') return;
      if (resumeInFlightRef.current) return;
      resumeInFlightRef.current = true;
      void ensureLiveConnection(socketRef.current).then((ok) => {
        resumeInFlightRef.current = false;
        if (ok) setResumeGeneration((g) => g + 1);
      });
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) onResume();
    };

    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  const createRoom = useCallback(
    (
      gameId: string,
      playerName: string,
      playerToken?: string,
    ): Promise<{ success: boolean; code?: string; error?: string; playerToken?: string }> => {
      return new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket.connected) {
          resolve({ success: false, error: 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์' });
          return;
        }
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve({ success: false, error: 'หมดเวลารอตอบจากเซิร์ฟเวอร์' });
        }, SOCKET_ACK_TIMEOUT_MS);
        socket.emit('create-room', { gameId, playerName, playerToken }, (res) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(res);
        });
      });
    },
    [],
  );

  const joinRoom = useCallback(
    (
      code: string,
      playerName: string,
      playerToken?: string,
    ): Promise<{ success: boolean; error?: string; reconnected?: boolean }> => {
      return new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket.connected) {
          resolve({ success: false, error: 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์' });
          return;
        }
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve({ success: false, error: 'หมดเวลารอตอบจากเซิร์ฟเวอร์' });
        }, SOCKET_ACK_TIMEOUT_MS);
        socket.emit('join-room', { code, playerName, playerToken }, (res) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(res);
        });
      });
    },
    [],
  );

  const leaveRoom = useCallback(() => {
    socketRef.current.emit('leave-room');
    setRoom(null);
    setGameState(null);
    setGameStarted(false);
    setGameOver(null);
  }, []);

  const startGame = useCallback((options?: unknown) => {
    socketRef.current.emit('start-game', options);
  }, []);

  const restartGame = useCallback(() => {
    socketRef.current.emit('restart-game');
  }, []);

  const sendAction = useCallback((action: unknown) => {
    socketRef.current.emit('game-action', action);
  }, []);

  const syncGameState = useCallback(() => {
    socketRef.current.emit('sync-game-state');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    toast.dismiss(SOCKET_ERROR_TOAST_ID);
  }, []);
  const clearKickedMessage = useCallback(() => setKickedMessage(null), []);

  const kickPlayer = useCallback((targetPlayerId: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current.emit('kick-player', { targetPlayerId }, resolve);
    });
  }, []);

  const updateLobbyOptions = useCallback((options: unknown) => {
    socketRef.current.emit('update-lobby-options', options);
  }, []);

  const updateRoomGame = useCallback((gameId: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      const socket = socketRef.current;
      if (!socket.connected) {
        resolve({ success: false, error: 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์' });
        return;
      }
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({ success: false, error: 'หมดเวลารอตอบจากเซิร์ฟเวอร์' });
      }, SOCKET_ACK_TIMEOUT_MS);
      socket.emit('update-room-game', { gameId }, (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(res);
      });
    });
  }, []);

  const updatePlayerName = useCallback((name: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      const socket = socketRef.current;
      if (!socket.connected) {
        resolve({ success: false, error: 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์' });
        return;
      }
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({ success: false, error: 'หมดเวลารอตอบจากเซิร์ฟเวอร์' });
      }, SOCKET_ACK_TIMEOUT_MS);
      socket.emit('update-player-name', { name }, (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(res);
      });
    });
  }, []);

  useEffect(() => {
    if (!gameStarted || gameState || !room) return;
    if (room.status !== 'playing' && room.status !== 'finished') return;
    const timer = window.setTimeout(() => {
      socketRef.current.emit('sync-game-state');
    }, 400);
    return () => window.clearTimeout(timer);
  }, [gameStarted, gameState, room?.status]);

  return {
    socket: socketRef.current,
    connected,
    resumeGeneration,
    room,
    gameState,
    gameStarted,
    gameOver,
    error,
    kickedMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    restartGame,
    sendAction,
    syncGameState,
    kickPlayer,
    updateLobbyOptions,
    updateRoomGame,
    updatePlayerName,
    clearError,
    clearKickedMessage,
  };
}
