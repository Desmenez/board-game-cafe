import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { SocketState } from '../types';
import {
  createPlayerToken,
  getStoredPlayerToken,
  normalizeRoomCode,
  setStoredPlayerName,
  setStoredPlayerToken,
} from '../utils/playerToken';
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
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
  const [showNameModal, setShowNameModal] = useState(false);
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

      const name = playerName.trim();
      if (!name) {
        setPendingAction(action);
        setShowNameModal(true);
        return;
      }

      if (!connected) {
        toast.error('ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณารอสักครู่แล้วลองใหม่');
        return;
      }

      setLoading(true);
      try {
        if (action.type === 'create') {
          const res = await socket.createRoom(action.gameId, name, action.playerToken);
          if (res.success && res.code) {
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
    const name = playerName.trim();
    if (!name) return;
    localStorage.setItem('playerName', name);
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
