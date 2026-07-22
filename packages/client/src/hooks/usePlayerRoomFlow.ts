import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getPlayerDisplayNameValidationError,
  normalizePlayerAvatar,
  normalizePlayerDisplayName,
} from 'shared';
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
  readGlobalPlayerAvatarFromStorage,
  setStoredPlayerAvatar,
  writeGlobalPlayerAvatarToStorage,
} from '../utils/playerAvatar';
import {
  adminJoinInputMaxLength,
  grantAdminNavFromJoin,
  isAdminJoinCode,
} from '../constants/admin';
import { useAuth } from '../auth/useAuth';
import { updateOwnProfile } from '../auth/profileApi';

export type PendingRoomAction =
  | { type: 'create'; gameId: string; playerToken: string }
  | { type: 'join'; code: string; playerToken: string };

export function usePlayerRoomFlow(socket: SocketState) {
  const { connected } = socket;
  const { user, profile, guestLocalEpoch, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState(readGlobalPlayerNameFromStorage);
  const [playerAvatar, setPlayerAvatar] = useState(readGlobalPlayerAvatarFromStorage);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalError, setProfileModalError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingRoomAction | null>(null);
  const pendingRef = useRef<PendingRoomAction | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    pendingRef.current = pendingAction;
  }, [pendingAction]);

  useEffect(() => {
    if (profile) {
      if (profile.display_name?.trim()) {
        setPlayerName(profile.display_name.trim());
      }
      setPlayerAvatar(normalizePlayerAvatar(profile.avatar_config, profile.id));
      return;
    }
    // Guest / after logout — prefer restored local snapshot.
    setPlayerName(readGlobalPlayerNameFromStorage());
    setPlayerAvatar(readGlobalPlayerAvatarFromStorage());
  }, [profile, guestLocalEpoch]);

  const executeAction = useCallback(
    async (action: PendingRoomAction, name: string, avatar: typeof playerAvatar) => {
      if (!connected) {
        toast.error('ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณารอสักครู่แล้วลองใหม่');
        return;
      }

      setLoading(true);
      setProfileModalError(null);
      try {
        if (action.type === 'create') {
          const res = await socket.createRoom(
            action.gameId,
            name,
            avatar,
            action.playerToken,
            profile?.avatar_url,
          );
          if (res.success && res.code) {
            writeGlobalPlayerNameToStorage(name);
            writeGlobalPlayerAvatarToStorage(avatar);
            setPlayerName(name);
            setStoredPlayerToken(res.code, action.playerToken);
            setStoredPlayerName(res.code, name);
            setStoredPlayerAvatar(res.code, avatar);
            setShowProfileModal(false);
            setPendingAction(null);
            pendingRef.current = null;
            navigate(`/room/${res.code}`);
          } else {
            const message = res.error ?? 'สร้างห้องไม่สำเร็จ';
            setProfileModalError(message);
            toast.error(message);
          }
        } else {
          const code = normalizeRoomCode(action.code);
          const res = await socket.joinRoom(
            code,
            name,
            avatar,
            action.playerToken,
            profile?.avatar_url,
          );
          if (res.success) {
            writeGlobalPlayerNameToStorage(name);
            writeGlobalPlayerAvatarToStorage(avatar);
            setPlayerName(name);
            setStoredPlayerToken(code, action.playerToken);
            setStoredPlayerName(code, name);
            setStoredPlayerAvatar(code, avatar);
            setShowProfileModal(false);
            setPendingAction(null);
            pendingRef.current = null;
            navigate(`/room/${code}`);
          } else {
            const message = res.error ?? 'เข้าห้องไม่สำเร็จ';
            setProfileModalError(message);
            toast.error(message);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [connected, navigate, profile?.avatar_url, socket],
  );

  const handleAction = useCallback(
    (action: PendingRoomAction) => {
      if (action.type === 'join' && isAdminJoinCode(action.code)) {
        grantAdminNavFromJoin();
        navigate('/admin');
        return;
      }

      const profileName = profile?.display_name?.trim()
        ? normalizePlayerDisplayName(profile.display_name)
        : null;
      const localName = normalizePlayerDisplayName(playerName);
      const name = profileName || localName;
      const avatar = profile
        ? normalizePlayerAvatar(profile.avatar_config, profile.id)
        : playerAvatar;

      // Skip name/avatar modal when we already have a usable display name
      // (logged-in profile, or guest who set a name before).
      if (name) {
        void executeAction(action, name, avatar);
        return;
      }

      pendingRef.current = action;
      setPendingAction(action);
      setProfileModalError(null);
      setShowProfileModal(true);
    },
    [executeAction, navigate, playerAvatar, playerName, profile],
  );

  const openProfileEditor = useCallback(() => {
    pendingRef.current = null;
    setPendingAction(null);
    setProfileModalError(null);
    setShowProfileModal(true);
  }, []);

  const dismissProfileModal = useCallback(() => {
    pendingRef.current = null;
    setPendingAction(null);
    setProfileModalError(null);
    setShowProfileModal(false);
  }, []);

  const handleProfileSubmit = useCallback(() => {
    const name = normalizePlayerDisplayName(playerName);
    if (!name) {
      setProfileModalError(getPlayerDisplayNameValidationError(playerName));
      return;
    }
    writeGlobalPlayerNameToStorage(name);
    writeGlobalPlayerAvatarToStorage(playerAvatar);
    setPlayerName(name);
    setProfileModalError(null);

    const finish = () => {
      const action = pendingRef.current;
      if (action) {
        void executeAction(action, name, playerAvatar);
        return;
      }
      setShowProfileModal(false);
      toast.success('บันทึกโปรไฟล์แล้ว');
    };

    if (user) {
      void updateOwnProfile(user.id, {
        display_name: name,
        avatar_config: playerAvatar,
      }).then(async (result) => {
        if (!result.ok) {
          setProfileModalError(result.error);
          return;
        }
        await refreshProfile();
        finish();
      });
      return;
    }

    finish();
  }, [executeAction, playerAvatar, playerName, refreshProfile, user]);

  return {
    joinCode,
    setJoinCode,
    playerName,
    setPlayerName,
    playerAvatar,
    setPlayerAvatar,
    showProfileModal,
    setShowProfileModal,
    profileModalError,
    clearProfileModalError: () => setProfileModalError(null),
    pendingAction,
    profileModalMode: pendingAction ? ('continue' as const) : ('edit' as const),
    loading,
    handleAction,
    openProfileEditor,
    dismissProfileModal,
    handleProfileSubmit,
    adminJoinInputMaxLength: adminJoinInputMaxLength(),
    getStoredPlayerToken,
    createPlayerToken,
    normalizeRoomCode,
    isAdminJoinCode,
  };
}
