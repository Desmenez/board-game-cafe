import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, Room } from 'shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let globalSocket: TypedSocket | null = null;

function getSocket(): TypedSocket {
  if (!globalSocket) {
    globalSocket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return globalSocket;
}

export function useSocket() {
  const socketRef = useRef<TypedSocket>(getSocket());
  const [connected, setConnected] = useState(socketRef.current.connected);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<unknown>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState<{ winners: string[]; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = socketRef.current;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room-updated', (r) => setRoom(r));
    socket.on('game-started', () => setGameStarted(true));
    socket.on('game-state', (s) => setGameState(s));
    socket.on('game-over', (result) => setGameOver(result));
    socket.on('error', (msg) => setError(msg));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room-updated');
      socket.off('game-started');
      socket.off('game-state');
      socket.off('game-over');
      socket.off('error');
    };
  }, []);

  const createRoom = useCallback(
    (
      gameId: string,
      playerName: string,
      playerToken?: string,
    ): Promise<{ success: boolean; code?: string; error?: string; playerToken?: string }> => {
      return new Promise((resolve) => {
        socketRef.current.emit('create-room', { gameId, playerName, playerToken }, resolve);
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
        socketRef.current.emit('join-room', { code, playerName, playerToken }, resolve);
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

  const startGame = useCallback(() => {
    socketRef.current.emit('start-game');
  }, []);

  const sendAction = useCallback((action: unknown) => {
    socketRef.current.emit('game-action', action);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    socket: socketRef.current,
    connected,
    room,
    gameState,
    gameStarted,
    gameOver,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    sendAction,
    clearError,
  };
}
