import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getPlayerDisplayNameValidationError, normalizePlayerDisplayName } from 'shared';
import type { SocketState } from '../types';
import {
  createPlayerToken,
  getStoredPlayerToken,
  normalizeRoomCode,
  setStoredPlayerName,
  setStoredPlayerToken,
} from '../utils/playerToken';
import {
  readGlobalPlayerNameFromStorage,
  writeGlobalPlayerNameToStorage,
} from '../utils/playerDisplayName';
import {
  adminJoinInputMaxLength,
  grantAdminNavFromJoin,
  isAdminJoinCode,
} from '../constants/admin';

export type PendingRoomAction =
  | { type: 'create'; gameId: string; playerToken: string }
  | { type: 'join'; code: string; playerToken: string };

export function usePlayerRoomFlow(socket: SocketState) {
  const { connected } = socket;
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState(readGlobalPlayerNameFromStorage);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameModalError, setNameModalError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingRoomAction | null>(null);
  const pendingRef = useRef<PendingRoomAction | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    pendingRef.current = pendingAction;
  }, [pendingAction]);

  const handleAction = useCallback(
    async (action: PendingRoomAction) => {
      if (action.type === 'join' && isAdminJoinCode(action.code)) {
        grantAdminNavFromJoin();
        navigate('/admin');
        return;
      }

      const name = normalizePlayerDisplayName(playerName);
      if (!name) {
        setNameModalError(getPlayerDisplayNameValidationError(playerName));
        setPendingAction(action);
        setShowNameModal(true);
        return;
      }

      if (!connected) {
        toast.error('ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณารอสักครู่แล้วลองใหม่');
        return;
      }

      setLoading(true);
      setNameModalError(null);
      try {
        if (action.type === 'create') {
          const res = await socket.createRoom(action.gameId, name, action.playerToken);
          if (res.success && res.code) {
            writeGlobalPlayerNameToStorage(name);
            setPlayerName(name);
            setStoredPlayerToken(res.code, action.playerToken);
            setStoredPlayerName(res.code, name);
            navigate(`/room/${res.code}`);
          } else {
            toast.error(res.error ?? 'สร้างห้องไม่สำเร็จ');
          }
        } else {
          const code = normalizeRoomCode(action.code);
          const res = await socket.joinRoom(code, name, action.playerToken);
          if (res.success) {
            writeGlobalPlayerNameToStorage(name);
            setPlayerName(name);
            setStoredPlayerToken(code, action.playerToken);
            setStoredPlayerName(code, name);
            navigate(`/room/${code}`);
          } else {
            toast.error(res.error ?? 'เข้าห้องไม่สำเร็จ');
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [connected, navigate, playerName, socket],
  );

  const handleNameSubmit = useCallback(() => {
    const name = normalizePlayerDisplayName(playerName);
    if (!name) {
      setNameModalError(getPlayerDisplayNameValidationError(playerName));
      return;
    }
    writeGlobalPlayerNameToStorage(name);
    setPlayerName(name);
    setNameModalError(null);
    setShowNameModal(false);
    const action = pendingRef.current;
    setPendingAction(null);
    if (action) void handleAction(action);
  }, [handleAction, playerName]);

  return {
    joinCode,
    setJoinCode,
    playerName,
    setPlayerName,
    showNameModal,
    setShowNameModal,
    nameModalError,
    clearNameModalError: () => setNameModalError(null),
    pendingAction,
    loading,
    handleAction,
    handleNameSubmit,
    adminJoinInputMaxLength: adminJoinInputMaxLength(),
    getStoredPlayerToken,
    createPlayerToken,
    normalizeRoomCode,
    isAdminJoinCode,
  };
}
