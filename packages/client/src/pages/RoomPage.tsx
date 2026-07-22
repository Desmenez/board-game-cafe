import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { SocketState } from '../types';
import {
  MAX_PLAYER_DISPLAY_NAME_LENGTH,
  PLAYER_DISPLAY_NAME_HINT,
  getPlayerDisplayNameValidationError,
  normalizePlayerDisplayName,
  sanitizePlayerDisplayNameInput,
  getRoomPlayerCountError,
  normalizePlayerAvatar,
  normalizePlayerAvatarDisplay,
} from 'shared';
import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import { renderActiveGame } from '../games/playRegistry';
import {
  Check,
  Copy,
  Crown,
  LogOut,
  Palette,
  RotateCcw,
  Rocket,
  Shuffle,
  UserPlus,
  X,
} from 'lucide-react';
import { getLobbyOptionsComponent } from '../components/game-lobby-options';
import { LobbyGamePicker } from '../components/LobbyGamePicker';
import { InviteFriendsDialog } from '../components/InviteFriendsDialog';
import { PlayerProfileModal } from '../components/PlayerProfileModal';
import { AvatarEditor, PlayerAvatar } from '../components/player-avatar';
import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Input,
} from '../components/ui';
import {
  clearStoredRoomSession,
  createPlayerToken,
  getStoredPlayerName,
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
  getStoredPlayerAvatar,
  readGlobalPlayerAvatarFromStorage,
  setStoredPlayerAvatar,
  writeGlobalPlayerAvatarToStorage,
} from '../utils/playerAvatar';
import { useAuth } from '../auth/useAuth';
import { updateOwnProfile } from '../auth/profileApi';
import toast from 'react-hot-toast';

interface Props {
  socket: SocketState;
}

export function RoomPage({ socket }: Props) {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    configured: authConfigured,
    loading: authLoading,
    user,
    profile,
    guestLocalEpoch,
    refreshProfile,
  } = useAuth();
  const {
    room: socketRoom,
    gameState,
    resumeRoom,
    connected,
    roomConnectionStatus,
    kickedMessage,
    kickPlayer,
    clearKickedMessage,
    updateLobbyOptions,
    updateRoomGame,
    updatePlayerName,
    updatePlayerAvatar,
    syncGameState,
    error: socketError,
    clearError,
    resumeGeneration,
  } = socket;
  const [playerName, setPlayerName] = useState(readGlobalPlayerNameFromStorage);
  const [playerAvatar, setPlayerAvatar] = useState(readGlobalPlayerAvatarFromStorage);
  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [needsJoin, setNeedsJoin] = useState(false);
  const autoJoinAttemptedRef = useRef(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [gameLeaveConfirmOpen, setGameLeaveConfirmOpen] = useState(false);
  const [restartToLobbyConfirmOpen, setRestartToLobbyConfirmOpen] = useState(false);
  const [startOptions, setStartOptions] = useState<unknown>(undefined);
  const [kickAlertMessage, setKickAlertMessage] = useState<string | null>(null);
  const [kickConfirm, setKickConfirm] = useState<{ id: string; name: string } | null>(null);
  const [myNameDraft, setMyNameDraft] = useState('');
  const [avatarDraft, setAvatarDraft] = useState<PlayerAvatarConfig>(
    readGlobalPlayerAvatarFromStorage,
  );
  const [avatarUrlDraft, setAvatarUrlDraft] = useState<string | null>(null);
  const [avatarDisplayDraft, setAvatarDisplayDraft] = useState<PlayerAvatarDisplay>('character');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileModalError, setProfileModalError] = useState<string | null>(null);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [changingGame, setChangingGame] = useState(false);
  const [inviteFriendsOpen, setInviteFriendsOpen] = useState(false);
  const lobbyAvatarUrlSyncRef = useRef<string | null>(null);

  /** Re-bind socket ↔ player after reconnect, refresh, background resume, or missing game-state. */
  const prevConnectedRef = useRef<boolean | null>(null);
  const prevResumeGenerationRef = useRef(0);
  useEffect(() => {
    if (!code || !connected || kickedMessage) return;

    const normalized = normalizeRoomCode(code);
    const storedToken = playerToken ?? getStoredPlayerToken(normalized);
    if (!storedToken) return;

    const reconnected = prevConnectedRef.current !== null && !prevConnectedRef.current && connected;
    prevConnectedRef.current = connected;

    const resumedFromBackground = resumeGeneration > prevResumeGenerationRef.current;
    if (resumedFromBackground) {
      prevResumeGenerationRef.current = resumeGeneration;
    }

    const room = socketRoom;
    const needsRoom = !room;
    const needsGameView =
      room != null && (room.status === 'playing' || room.status === 'finished') && !gameState;

    if (!needsRoom && !needsGameView && !reconnected && !resumedFromBackground) return;

    void (async () => {
      const res = await resumeRoom(normalized, storedToken);
      if (res.success) {
        setNeedsJoin(false);
        setPlayerToken(storedToken);
      } else if (needsGameView || resumedFromBackground) {
        syncGameState();
      }
    })();
  }, [
    connected,
    code,
    resumeRoom,
    kickedMessage,
    playerToken,
    socketRoom,
    gameState,
    syncGameState,
    resumeGeneration,
  ]);

  // Keep token in sync with localStorage when URL has a room code (e.g. after create-room, room
  // may already be in socket state so the auto-join effect never runs — without this, myId would
  // fall back to socket.id and never match hostId).
  useEffect(() => {
    if (!code) return;
    const stored = getStoredPlayerToken(normalizeRoomCode(code));
    if (stored) setPlayerToken(stored);
  }, [code]);

  // Logged-in account profile → local join defaults (cross-device). Skip once seated in the room.
  // After logout, restore guest locals when not seated.
  useEffect(() => {
    const seatedId = playerToken ?? (code ? getStoredPlayerToken(normalizeRoomCode(code)) : null);
    const seated = Boolean(
      socketRoom && seatedId && socketRoom.players.some((p) => p.id === seatedId),
    );
    if (seated) return;

    if (profile) {
      if (profile.display_name?.trim()) {
        setPlayerName(profile.display_name.trim());
      }
      setPlayerAvatar(normalizePlayerAvatar(profile.avatar_config, profile.id));
      setAvatarUrlDraft(profile.avatar_url ?? null);
      setAvatarDisplayDraft(normalizePlayerAvatarDisplay(profile.avatar_display));
      return;
    }

    setPlayerName(readGlobalPlayerNameFromStorage());
    setPlayerAvatar(readGlobalPlayerAvatarFromStorage());
    setAvatarUrlDraft(null);
    setAvatarDisplayDraft('character');
  }, [profile, guestLocalEpoch, socketRoom, playerToken, code]);

  useEffect(() => {
    const r = socketRoom;
    if (!r || r.status !== 'waiting' || !code) return;
    const myPlayerId =
      playerToken ?? getStoredPlayerToken(normalizeRoomCode(code)) ?? socket.socket.id;
    if (!myPlayerId) return;
    const seat = r.players.find((p) => p.id === myPlayerId);
    if (!seat) return;
    setPlayerAvatar(seat.avatar);
    setAvatarDraft((draft) => (profileModalOpen ? draft : seat.avatar));
    setAvatarUrlDraft((draft) =>
      profileModalOpen ? draft : (seat.avatarUrl ?? profile?.avatar_url ?? null),
    );
    setAvatarDisplayDraft((draft) =>
      profileModalOpen
        ? draft
        : normalizePlayerAvatarDisplay(seat.avatarDisplay ?? profile?.avatar_display),
    );
    setMyNameDraft((draft) => {
      if (profileModalOpen) return draft;
      const committed = seat.name;
      if (!draft.trim()) return committed;
      if (draft.trim() !== committed.trim()) return draft;
      return committed;
    });
  }, [
    socketRoom,
    playerToken,
    code,
    socket.socket.id,
    profileModalOpen,
    profile?.avatar_url,
    profile?.avatar_display,
  ]);

  // Seat may lack photo/display (joined before upload / resume). Push profile into the lobby.
  useEffect(() => {
    if (!socketRoom || socketRoom.status !== 'waiting') return;
    if (!user || !profile) return;
    const myPlayerId =
      playerToken ??
      (code ? getStoredPlayerToken(normalizeRoomCode(code)) : null) ??
      socket.socket.id;
    if (!myPlayerId) return;
    const seat = socketRoom.players.find((p) => p.id === myPlayerId);
    if (!seat) return;
    const profileDisplay = normalizePlayerAvatarDisplay(profile.avatar_display);
    const profileUrl = profile.avatar_url ?? null;
    const seatDisplay = normalizePlayerAvatarDisplay(seat.avatarDisplay);
    const seatBase = seat.avatarUrl?.split('?')[0] ?? '';
    const profileBase = profileUrl?.split('?')[0] ?? '';
    const urlMatch =
      profileDisplay !== 'photo' ||
      (Boolean(seatBase) && Boolean(profileBase) && seatBase === profileBase);
    const displayMatch = seatDisplay === profileDisplay;
    if (urlMatch && displayMatch) {
      lobbyAvatarUrlSyncRef.current = `${profileDisplay}:${profileUrl ?? ''}`;
      return;
    }
    const syncKey = `${profileDisplay}:${profileUrl ?? ''}`;
    if (lobbyAvatarUrlSyncRef.current === syncKey) return;
    lobbyAvatarUrlSyncRef.current = syncKey;
    void updatePlayerAvatar(
      seat.avatar,
      profileDisplay === 'photo' ? profileUrl : null,
      profileDisplay,
    );
  }, [code, playerToken, profile, socket.socket.id, socketRoom, updatePlayerAvatar, user]);

  // First visit via URL — join or show name modal
  useEffect(() => {
    if (!code) return;
    if (socketRoom) return;
    if (kickedMessage) return;
    if (!connected) return;

    const normalized = normalizeRoomCode(code);
    const storedToken = getStoredPlayerToken(normalized);
    const storedName = getStoredPlayerName(normalized) ?? readGlobalPlayerNameFromStorage();
    const storedAvatar = getStoredPlayerAvatar(normalized) ?? readGlobalPlayerAvatarFromStorage();

    setPlayerToken(storedToken);
    setPlayerName(storedName);
    setPlayerAvatar(storedAvatar);
    setJoinError(null);
    autoJoinAttemptedRef.current = false;

    if (storedToken) {
      void (async () => {
        const res = await resumeRoom(normalized, storedToken);
        if (res.success) setNeedsJoin(false);
        else {
          setJoinError(res.error ?? 'เข้าห้องไม่สำเร็จ');
          setPlayerToken(null);
          setNeedsJoin(true);
        }
      })();
    } else {
      setNeedsJoin(true);
    }
  }, [code, socketRoom, resumeRoom, connected, kickedMessage]);

  // Keep latest room/host identity for a stable lobby onChange — an inline callback
  // recreates every render and retriggers lobby-option effects → updateLobbyOptions →
  // room-updated → infinite "Maximum update depth exceeded" loop.
  const lobbyRoomRef = useRef(socketRoom);
  lobbyRoomRef.current = socketRoom;
  const lobbyPlayerTokenRef = useRef(playerToken);
  lobbyPlayerTokenRef.current = playerToken;
  const lobbyCodeRef = useRef(code);
  lobbyCodeRef.current = code;

  const handleLobbyOptionsChange = useCallback(
    (opts: unknown) => {
      setStartOptions(opts);
      const room = lobbyRoomRef.current;
      if (!room || room.status !== 'waiting') return;
      const storedId = lobbyCodeRef.current
        ? getStoredPlayerToken(normalizeRoomCode(lobbyCodeRef.current))
        : null;
      const myId = lobbyPlayerTokenRef.current ?? storedId ?? socket.socket.id;
      if (!myId || room.hostId !== myId) return;
      if (JSON.stringify(opts) === JSON.stringify(room.lobbyOptions)) return;
      updateLobbyOptions(opts);
    },
    [updateLobbyOptions, socket.socket.id],
  );

  const handleJoin = useCallback(
    async (nameOverride?: string, avatarOverride?: PlayerAvatarConfig) => {
      if (!code) return;
      const rawName = nameOverride ?? playerName;
      const avatarToUse = avatarOverride ?? playerAvatar;
      const normalizedName = normalizePlayerDisplayName(rawName);
      if (!normalizedName) {
        setJoinError(getPlayerDisplayNameValidationError(rawName) ?? 'กรุณาใส่ชื่อที่ถูกต้อง');
        return;
      }

      const normalized = normalizeRoomCode(code);
      const tokenToUse = playerToken ?? createPlayerToken();
      writeGlobalPlayerNameToStorage(normalizedName);

      setJoinError(null);
      const res = await socket.joinRoom(
        normalized,
        normalizedName,
        avatarToUse,
        tokenToUse,
        normalizePlayerAvatarDisplay(profile?.avatar_display) === 'photo'
          ? profile?.avatar_url
          : null,
        normalizePlayerAvatarDisplay(profile?.avatar_display),
      );
      if (res.success) {
        setStoredPlayerToken(normalized, tokenToUse);
        setStoredPlayerName(normalized, normalizedName);
        setStoredPlayerAvatar(normalized, avatarToUse);
        writeGlobalPlayerAvatarToStorage(avatarToUse);
        setPlayerToken(tokenToUse);
        setNeedsJoin(false);
      } else {
        setJoinError(res.error ?? 'เข้าห้องไม่สำเร็จ');
      }
      if (!res.success && playerToken) {
        // Stored token might have expired; force generating a new one.
        setPlayerToken(null);
      }
    },
    [
      code,
      playerAvatar,
      playerName,
      playerToken,
      profile?.avatar_display,
      profile?.avatar_url,
      socket,
    ],
  );

  // Logged-in users with a profile skip the join modal and seat automatically.
  useEffect(() => {
    if (!needsJoin || !code || !connected || kickedMessage) return;
    if (authLoading) return;
    const profileName = profile?.display_name?.trim();
    if (!profile || !profileName) return;
    if (autoJoinAttemptedRef.current) return;
    autoJoinAttemptedRef.current = true;

    const avatar = normalizePlayerAvatar(profile.avatar_config, profile.id);
    setPlayerName(profileName);
    setPlayerAvatar(avatar);
    setJoinError(null);
    void handleJoin(profileName, avatar);
  }, [needsJoin, code, connected, kickedMessage, authLoading, profile, handleJoin]);

  const performLeaveRoom = () => {
    setLeaveModalOpen(false);
    setGameLeaveConfirmOpen(false);
    if (code) clearStoredRoomSession(normalizeRoomCode(code));
    socket.leaveRoom();
    navigate('/');
  };

  const requestLeaveFromGame = () => setGameLeaveConfirmOpen(true);
  const requestRestartToLobby = () => setRestartToLobbyConfirmOpen(true);
  const confirmRestartToLobby = () => {
    setRestartToLobbyConfirmOpen(false);
    socket.restartGame();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const confirmKickPlayer = async () => {
    const target = kickConfirm;
    if (!target) return;
    setKickConfirm(null);
    setKickAlertMessage(null);
    const res = await kickPlayer(target.id);
    if (!res.success) {
      setKickAlertMessage(res.error ?? 'เตะไม่สำเร็จ');
    }
  };

  if (kickedMessage) {
    return (
      <div className="page app-night-page room-state-page grid min-h-svh place-items-center p-6 text-center">
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kick-modal-title"
        >
          <div className="modal">
            <h2 id="kick-modal-title">ถูกเตะออกจากห้อง</h2>
            <p>{kickedMessage}</p>
            <Button
              block
              type="button"
              onClick={() => {
                if (code) clearStoredRoomSession(normalizeRoomCode(code));
                clearKickedMessage();
                navigate('/');
              }}
            >
              กลับหน้าหลัก
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Name input for link-shared joins (guests / no profile only)
  if (needsJoin) {
    const waitingForAuth = authConfigured && (authLoading || (Boolean(user) && profile == null));
    const hasProfileToAutoJoin = Boolean(profile?.display_name?.trim());

    if (waitingForAuth || hasProfileToAutoJoin) {
      return (
        <div className="page app-night-page room-state-page grid min-h-svh place-items-center p-6 text-center">
          <p className="m-0 text-ink-2">
            {hasProfileToAutoJoin ? 'กำลังเข้าห้อง…' : 'กำลังโหลดโปรไฟล์…'}
          </p>
          {joinError ? (
            <div className="mt-6 max-w-md">
              <Alert variant="destructive" className="mb-4">
                {joinError}
              </Alert>
              <Button
                block
                type="button"
                onClick={() => {
                  autoJoinAttemptedRef.current = false;
                  setJoinError(null);
                  if (profile?.display_name?.trim()) {
                    const avatar = normalizePlayerAvatar(profile.avatar_config, profile.id);
                    void handleJoin(profile.display_name.trim(), avatar);
                  }
                }}
              >
                ลองอีกครั้ง
              </Button>
              <Button
                variant="secondary"
                block
                type="button"
                className="mt-3"
                onClick={() => navigate('/')}
              >
                กลับหน้าหลัก
              </Button>
            </div>
          ) : null}
        </div>
      );
    }

    const joinNameValidationError = getPlayerDisplayNameValidationError(playerName);
    const canJoin = joinNameValidationError === null;
    const joinInputError =
      joinError ?? (playerName.trim() ? joinNameValidationError : null) ?? undefined;

    return (
      <div className="page app-night-page room-state-page grid min-h-svh place-items-center p-6 text-center">
        <div className="modal-overlay">
          <div className="modal max-h-[calc(100svh-2rem)] max-w-2xl overflow-y-auto p-4! sm:p-8!">
            <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
              คำเชิญเข้าร่วมโต๊ะ
            </span>
            <h2>
              เข้าร่วมห้อง <span className="font-label tracking-[0.08em] text-pear">{code}</span>
            </h2>
            <p>ใส่ชื่อของคุณเพื่อเข้าร่วมเกม</p>
            <div className="form-group">
              <Input
                label="ชื่อที่แสดงในเกม"
                type="text"
                placeholder="ชื่อของคุณ"
                value={playerName}
                maxLength={MAX_PLAYER_DISPLAY_NAME_LENGTH}
                hint={PLAYER_DISPLAY_NAME_HINT}
                onChange={(e) => {
                  setPlayerName(sanitizePlayerDisplayNameInput(e.target.value));
                  setJoinError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && canJoin && void handleJoin()}
                error={joinInputError}
                autoFocus
              />
            </div>
            <AvatarEditor
              value={playerAvatar}
              onChange={(avatar) => {
                setPlayerAvatar(avatar);
                setJoinError(null);
              }}
              previewName={playerName.trim() || 'คุณ'}
              className="my-6 border-y border-rule py-5"
              photoUpload={
                user
                  ? {
                      userId: user.id,
                      avatarUrl: avatarUrlDraft,
                      avatarDisplay: avatarDisplayDraft,
                      onAvatarUrlChange: (url) => {
                        setAvatarUrlDraft(url);
                        void refreshProfile();
                      },
                      onAvatarDisplayChange: setAvatarDisplayDraft,
                    }
                  : null
              }
            />
            <Button block onClick={() => void handleJoin()} disabled={!canJoin}>
              เข้าร่วม
            </Button>
            {joinError?.includes('ไม่พบห้อง') && (
              <Button variant="secondary" block onClick={() => navigate('/')} className="mt-3">
                กลับหน้าหลัก
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!socket.room) {
    return (
      <div className="page app-night-page room-state-page grid min-h-svh place-content-center gap-6 p-6 text-center">
        <div className="waiting-indicator">
          <p>กำลังเชื่อมต่อห้อง...</p>
          <div className="waiting-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  const room = socket.room;
  // Stable player id must match server (playerToken / stored per room). socket.id changes per
  // connection and is only used by the server when no token is sent — never compare hostId to it.
  const storedIdForRoom = code ? getStoredPlayerToken(normalizeRoomCode(code)) : null;
  const myId = playerToken ?? storedIdForRoom ?? socket.socket.id!;
  const isHost = myId === room.hostId;
  const playerCountError = getRoomPlayerCountError(
    room.players.length,
    room.gameMeta.minPlayers,
    room.gameMeta.maxPlayers,
  );
  const canStart =
    isHost && connected && roomConnectionStatus === 'ready' && playerCountError === null;
  const LobbyOptionsComponent = getLobbyOptionsComponent(room.gameId);
  const canEditProfileInLobby = room.status === 'waiting';
  const mySeat = room.players.find((p) => p.id === myId);
  const myCommittedName = mySeat?.name ?? '';

  const openLobbyProfileModal = () => {
    setProfileModalError(null);
    setMyNameDraft(mySeat?.name ?? playerName);
    setAvatarDraft(mySeat?.avatar ?? playerAvatar);
    setAvatarUrlDraft(mySeat?.avatarUrl ?? profile?.avatar_url ?? null);
    setAvatarDisplayDraft(
      normalizePlayerAvatarDisplay(mySeat?.avatarDisplay ?? profile?.avatar_display),
    );
    setProfileModalOpen(true);
  };

  const persistLobbyProfile = async () => {
    const normalized = normalizePlayerDisplayName(myNameDraft);
    if (!normalized) {
      setProfileModalError(
        getPlayerDisplayNameValidationError(myNameDraft) ?? 'กรุณาใส่ชื่อที่ถูกต้อง',
      );
      return;
    }
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileModalError(null);

    try {
      const nameChanged = normalized !== myCommittedName.trim();
      const avatarChanged = JSON.stringify(avatarDraft) !== JSON.stringify(mySeat?.avatar ?? null);
      const avatarUrlChanged = (avatarUrlDraft ?? null) !== (mySeat?.avatarUrl ?? null);
      const avatarDisplayChanged =
        avatarDisplayDraft !== normalizePlayerAvatarDisplay(mySeat?.avatarDisplay);

      if (nameChanged) {
        const res = await updatePlayerName(normalized);
        if (!res.success) {
          setProfileModalError(res.error ?? 'เปลี่ยนชื่อไม่สำเร็จ');
          return;
        }
        setPlayerName(normalized);
        writeGlobalPlayerNameToStorage(normalized);
        if (code) setStoredPlayerName(normalizeRoomCode(code), normalized);
      }

      if (avatarChanged || avatarUrlChanged || avatarDisplayChanged) {
        const res = await updatePlayerAvatar(
          avatarDraft,
          avatarUrlChanged || avatarDisplayChanged
            ? avatarDisplayDraft === 'photo'
              ? avatarUrlDraft
              : null
            : undefined,
          avatarDisplayChanged ? avatarDisplayDraft : undefined,
        );
        if (!res.success) {
          setProfileModalError(res.error ?? 'เปลี่ยน avatar ไม่สำเร็จ');
          return;
        }
        setPlayerAvatar(avatarDraft);
        writeGlobalPlayerAvatarToStorage(avatarDraft);
        if (code) setStoredPlayerAvatar(normalizeRoomCode(code), avatarDraft);
      }

      if (user && (nameChanged || avatarChanged || avatarUrlChanged || avatarDisplayChanged)) {
        void updateOwnProfile(user.id, {
          ...(nameChanged ? { display_name: normalized } : {}),
          ...(avatarChanged ? { avatar_config: avatarDraft } : {}),
          ...(avatarUrlChanged ? { avatar_url: avatarUrlDraft } : {}),
          ...(avatarDisplayChanged ? { avatar_display: avatarDisplayDraft } : {}),
        }).then(async (result) => {
          if (!result.ok) {
            console.error('sync profile to account', result.error);
            toast.error('บันทึกขึ้นบัญชีไม่สำเร็จ — โปรไฟล์ในห้องเปลี่ยนแล้ว');
            return;
          }
          await refreshProfile();
        });
      }

      setProfileModalOpen(false);
    } finally {
      setProfileSaving(false);
    }
  };

  const syncingGameView =
    (room.status === 'playing' || room.status === 'finished' || socket.gameStarted) && !gameState;

  if (syncingGameView) {
    return (
      <div className="page app-night-page room-state-page grid min-h-svh place-content-center gap-6 p-6 text-center">
        <div className="waiting-indicator">
          <p>กำลังโหลดเกม...</p>
          <div className="waiting-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  const inActiveGame =
    (socket.gameStarted || room.status === 'playing' || room.status === 'finished') && gameState;

  // Game is active — leave/restart confirmations live in this page (shared by all games)
  if (inActiveGame) {
    const activeGame = renderActiveGame(room.gameId, {
      gameState,
      myId,
      sendAction: socket.sendAction,
      onLeave: requestLeaveFromGame,
      onRestart: isHost ? requestRestartToLobby : undefined,
      isHost,
      remoteError: socketError,
      onClearRemoteError: clearError,
    });

    if (activeGame) {
      return (
        <>
          {activeGame}
          {gameLeaveConfirmOpen && (
            <div
              className="modal-overlay game-session-confirm-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-leave-modal-title"
            >
              <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
                <h2 id="game-leave-modal-title">ออกจากเกม?</h2>
                <p className="game-session-confirm-text">
                  คุณจะออกจากห้องและกลับไปที่เมนู — การกระทำนี้ไม่สามารถย้อนกลับได้จากที่นี่
                </p>
                <div className="game-session-confirm-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    block
                    onClick={() => setGameLeaveConfirmOpen(false)}
                  >
                    ยกเลิก
                  </Button>
                  <Button type="button" variant="danger" block onClick={performLeaveRoom}>
                    <LogOut size={16} aria-hidden />
                    ออกจากห้อง
                  </Button>
                </div>
              </div>
            </div>
          )}
          {restartToLobbyConfirmOpen && isHost && (
            <div
              className="modal-overlay game-session-confirm-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-restart-modal-title"
            >
              <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
                <h2 id="game-restart-modal-title">กลับไปล็อบบี้?</h2>
                <p className="game-session-confirm-text">
                  ทุกคนในห้องจะกลับไปหน้ารอ (รหัสห้องเดิม) —
                  หัวห้องสามารถกดเริ่มเกมใหม่ได้เมื่อพร้อม
                </p>
                <div className="game-session-confirm-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    block
                    onClick={() => setRestartToLobbyConfirmOpen(false)}
                  >
                    ยกเลิก
                  </Button>
                  <Button type="button" variant="primary" block onClick={confirmRestartToLobby}>
                    <RotateCcw size={16} aria-hidden />
                    กลับไปล็อบบี้
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }
    return (
      <div className="page app-night-page room-state-page grid min-h-svh place-content-center gap-6 p-6 text-center">
        <p className="mb-6 text-ink-2">โหลดเกมนี้ไม่สำเร็จ</p>
        <Button type="button" onClick={performLeaveRoom}>
          ออกจากห้อง
        </Button>
      </div>
    );
  }

  // Lobby / Waiting Room
  const handleChangeGame = async (gameId: string) => {
    if (changingGame || gameId === room.gameId) return;
    setChangingGame(true);
    const res = await updateRoomGame(gameId);
    setChangingGame(false);
    if (res.success) {
      setStartOptions(undefined);
      setGamePickerOpen(false);
      return;
    }
    setKickAlertMessage(res.error ?? 'เปลี่ยนเกมไม่สำเร็จ');
  };

  return (
    <div className="page app-night-page room-page--hallmark">
      <div className="mx-auto w-full max-w-shell px-4 py-10 pb-32 sm:px-6 lg:px-16 lg:py-16 lg:pb-32">
        <header className="mb-10 flex flex-col items-stretch gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
              ล็อบบี้เกม
            </span>
            <h1 className="mt-3 mb-2 max-w-[18ch] [overflow-wrap:anywhere] font-display text-[clamp(1.953rem,4vw,2.441rem)] leading-[1.08] font-extrabold tracking-[-0.045em] text-ink">
              {room.gameMeta.name}
            </h1>
            <p className="m-0 max-w-[58ch] leading-7 text-ink-2">
              {room.players.length}/{room.gameMeta.maxPlayers} คนบนโต๊ะ
              {room.players.length < room.gameMeta.minPlayers
                ? ` · ต้องการอย่างน้อย ${room.gameMeta.minPlayers} คน`
                : ' · พร้อมจัดโต๊ะ'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 lg:flex-row lg:items-center">
            {isHost && (
              <Button
                type="button"
                variant="secondary"
                className="w-full lg:w-auto"
                onClick={() => setGamePickerOpen(true)}
                disabled={changingGame}
              >
                <Shuffle size={16} aria-hidden />
                เปลี่ยนเกม
              </Button>
            )}
            <button
              type="button"
              className="inline-flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-pill border border-pear bg-pear px-4 py-2 font-label text-xl font-bold tracking-[0.12em] text-accent-ink transition duration-150 ease-out motion-safe:hover:-translate-y-px motion-safe:active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-inverse)] lg:w-auto"
              onClick={copyCode}
              title="คลิกเพื่อคัดลอกรหัสห้อง"
              aria-label={`คัดลอกรหัสห้อง ${room.code}`}
            >
              <span>{room.code}</span>
              {copied ? (
                <Check size={17} strokeWidth={2.25} aria-hidden />
              ) : (
                <Copy size={17} strokeWidth={2.25} aria-hidden />
              )}
            </button>
          </div>
        </header>

        {kickAlertMessage && (
          <Alert variant="destructive" className="mb-4" onDismiss={() => setKickAlertMessage(null)}>
            {kickAlertMessage}
          </Alert>
        )}

        <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(19rem,5fr)]">
          <main className="grid min-w-0 gap-6">
            <section
              className="min-w-0 rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
              aria-labelledby="room-share-heading"
            >
              <div className="mb-6">
                <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
                  ส่งคำเชิญ
                </span>
                <h2
                  className="mt-2 mb-0 font-display text-lg md:text-2xl font-extrabold tracking-[-0.035em] text-ink"
                  id="room-share-heading"
                >
                  ชวนเพื่อนมาที่โต๊ะ
                </h2>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row">
                <Input value={window.location.href} readOnly aria-label="ลิงก์เชิญเข้าห้อง" />
                <Button
                  variant="secondary"
                  type="button"
                  className="w-full lg:w-auto"
                  onClick={copyLink}
                >
                  {copied ? (
                    <>
                      <Check size={18} strokeWidth={2.25} aria-hidden />
                      คัดลอกแล้ว
                    </>
                  ) : (
                    <>
                      <Copy size={18} strokeWidth={2.25} aria-hidden />
                      คัดลอก
                    </>
                  )}
                </Button>
              </div>
              {isHost && user && room.status === 'waiting' ? (
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full lg:w-auto"
                    onClick={() => setInviteFriendsOpen(true)}
                  >
                    <UserPlus size={18} aria-hidden />
                    เชิญเพื่อนที่ล็อกอินแล้ว
                  </Button>
                </div>
              ) : null}
            </section>

            <section
              className="min-w-0 rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
              aria-labelledby="room-players-heading"
            >
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
                    ที่นั่งบนโต๊ะ
                  </span>
                  <h2
                    className="mt-2 mb-0 font-display text-lg md:text-2xl font-extrabold tracking-[-0.035em] text-ink"
                    id="room-players-heading"
                  >
                    ผู้เล่น
                  </h2>
                </div>
                <strong className="font-label text-lg md:text-xl text-pear">
                  {room.players.length}/{room.gameMeta.maxPlayers}
                </strong>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
                {room.players.map((player) => {
                  const isMe = player.id === myId;
                  return (
                    <div
                      className="relative flex min-w-0 items-start gap-3 overflow-visible rounded-input border border-rule bg-paper-3 p-3 text-ink whitespace-normal"
                      key={player.id}
                    >
                      {isHost && player.id !== room.hostId && room.status === 'waiting' && (
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-error bg-paper-2 p-0 text-error transition duration-150 hover:bg-paper-4 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                          title={`เตะ ${player.name} ออกจากห้อง`}
                          aria-label={`เตะ ${player.name} ออกจากห้อง`}
                          onClick={() => setKickConfirm({ id: player.id, name: player.name })}
                        >
                          <X size={14} strokeWidth={2.75} aria-hidden />
                        </button>
                      )}
                      {isMe && canEditProfileInLobby ? (
                        <button
                          type="button"
                          className="relative grid size-12 shrink-0 place-items-center rounded-input outline-2 outline-transparent outline-offset-2 focus-visible:outline-focus active:translate-y-px motion-reduce:transform-none"
                          onClick={openLobbyProfileModal}
                          aria-label="แก้โปรไฟล์ของคุณ"
                        >
                          <PlayerAvatar
                            playerId={player.id}
                            name={player.name}
                            avatar={player.avatar}
                            avatarUrl={player.avatarUrl}
                            avatarDisplay={player.avatarDisplay}
                            size={44}
                            decorative
                            className="size-11"
                          />
                          <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-pill border border-rule bg-paper-2 text-pear">
                            <Palette size={11} aria-hidden />
                          </span>
                        </button>
                      ) : (
                        <PlayerAvatar
                          playerId={player.id}
                          name={player.name}
                          avatar={player.avatar}
                          avatarUrl={player.avatarUrl}
                          avatarDisplay={player.avatarDisplay}
                          size={44}
                          decorative
                          className="size-11"
                        />
                      )}
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="min-w-0 truncate font-bold text-ink" title={player.name}>
                          {player.name}
                        </span>
                        {isMe && <span className="shrink-0 text-sm text-ink-2">(คุณ)</span>}
                      </div>
                      {player.id === room.hostId && (
                        <Badge
                          variant="warning"
                          size="sm"
                          className="ml-auto shrink-0 border-rule! bg-paper-2! text-pear!"
                        >
                          <Crown size={13} aria-hidden />
                          Host
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {playerCountError && (
                <div className="waiting-indicator mt-6 text-ink-2">
                  <p>{playerCountError}</p>
                  {room.players.length < room.gameMeta.minPlayers && (
                    <div className="waiting-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                </div>
              )}
            </section>
          </main>

          <aside className="grid min-w-0 gap-6 lg:sticky lg:top-10">
            <section
              className="room-options-panel min-w-0 rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
              aria-label="ตัวเลือกเกม"
            >
              <div className="mb-6">
                <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
                  ตั้งค่าโต๊ะ
                </span>
                <h2 className="mt-2 mb-0 font-display text-lg md:text-2xl font-extrabold tracking-[-0.035em] text-ink">
                  ตัวเลือกก่อนเริ่ม
                </h2>
              </div>
              <LobbyOptionsComponent
                key={`${room.gameId}:${room.code}`}
                isHost={isHost}
                playerCount={room.players.length}
                players={room.players.map((p) => ({ id: p.id, name: p.name }))}
                lobbyOptions={room.lobbyOptions}
                onChange={handleLobbyOptionsChange}
              />
            </section>

            <div className="grid gap-3 rounded-card border border-rule bg-paper-2 p-4">
              {isHost && (
                <Button
                  size="lg"
                  onClick={() => socket.startGame(room.lobbyOptions ?? startOptions)}
                  disabled={!canStart}
                  title={playerCountError ?? undefined}
                  block
                >
                  <Rocket size={18} strokeWidth={2.25} aria-hidden /> เริ่มเกม
                </Button>
              )}
              <Button
                variant="danger"
                type="button"
                block
                onClick={() => (isHost ? setLeaveModalOpen(true) : performLeaveRoom())}
              >
                <LogOut size={18} strokeWidth={2.25} aria-hidden />
                ออกจากห้อง
              </Button>
            </div>
          </aside>
        </div>

        <LobbyGamePicker
          open={gamePickerOpen}
          onOpenChange={setGamePickerOpen}
          currentGameId={room.gameId}
          playerCount={room.players.length}
          changing={changingGame}
          onSelect={(gameId) => void handleChangeGame(gameId)}
        />

        <PlayerProfileModal
          open={profileModalOpen}
          mode="edit"
          playerName={myNameDraft}
          playerAvatar={avatarDraft}
          onChangeName={(name) => {
            setMyNameDraft(name);
            setProfileModalError(null);
          }}
          onChangeAvatar={(avatar) => {
            setAvatarDraft(avatar);
            setProfileModalError(null);
          }}
          onSubmit={() => void persistLobbyProfile()}
          onDismiss={() => {
            if (!profileSaving) setProfileModalOpen(false);
          }}
          externalError={profileModalError}
          submitDisabled={profileSaving}
          photoUpload={
            user
              ? {
                  userId: user.id,
                  avatarUrl: avatarUrlDraft,
                  avatarDisplay: avatarDisplayDraft,
                  onAvatarUrlChange: (url) => {
                    setAvatarUrlDraft(url);
                    void refreshProfile();
                  },
                  onAvatarDisplayChange: setAvatarDisplayDraft,
                }
              : null
          }
        />

        <Dialog
          open={kickConfirm !== null}
          onOpenChange={(open) => {
            if (!open) setKickConfirm(null);
          }}
          className="max-w-lg room-night-dialog"
          overlayClassName="room-night-dialog-overlay"
          aria-labelledby="kick-dialog-title"
          aria-describedby="kick-dialog-desc"
        >
          {kickConfirm && (
            <>
              <DialogTitle id="kick-dialog-title">เตะออกจากห้อง?</DialogTitle>
              <DialogDescription id="kick-dialog-desc">
                เตะ &quot;{kickConfirm.name}&quot; ออกจากห้อง — ผู้เล่นจะถูกตัดการเชื่อมต่อทันที
              </DialogDescription>
              <DialogFooter>
                <div className="flex gap-3 w-full">
                  <Button
                    type="button"
                    variant="danger"
                    block
                    onClick={() => void confirmKickPlayer()}
                  >
                    เตะออก
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    block
                    onClick={() => setKickConfirm(null)}
                  >
                    ยกเลิก
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </Dialog>

        {leaveModalOpen && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-modal-title"
          >
            <div className="modal max-w-lg">
              <h2 id="leave-modal-title">ออกจากห้อง?</h2>
              <p>
                {room.players.length <= 1
                  ? 'คุณเป็นหัวห้องและเป็นผู้เล่นคนเดียว การออกจะลบห้องนี้ — ลิงก์เดิมจะใช้เข้าห้องไม่ได้อีก'
                  : 'คุณเป็นหัวห้อง การออกจะโยกสิทธิ์หัวห้องให้ผู้เล่นคนอื่น ห้องจะยังอยู่'}
              </p>
              <div className="mt-6 flex flex-col gap-3 lg:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  block
                  onClick={() => setLeaveModalOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button type="button" variant="danger" block onClick={performLeaveRoom}>
                  ออกจากห้อง
                </Button>
              </div>
            </div>
          </div>
        )}

        {user ? (
          <InviteFriendsDialog
            open={inviteFriendsOpen}
            onClose={() => setInviteFriendsOpen(false)}
            myUserId={user.id}
            roomCode={room.code}
            gameId={room.gameId}
          />
        ) : null}
      </div>
    </div>
  );
}
