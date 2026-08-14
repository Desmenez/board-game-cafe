import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { SocketState } from '../types';
import {
  getPlayerDisplayNameValidationError,
  normalizeChipId,
  normalizeIconId,
  normalizeNameplateId,
  normalizePlayerAvatar,
  normalizePlayerAvatarDisplay,
  normalizePlayerDisplayName,
  normalizeTitleId,
} from 'shared';
import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import { GamePlaySessionProvider } from '../components/game-shell';
import { renderActiveGame } from '../games/playRegistry';
import {
  RoomActiveGameSession,
  RoomConnectingScreen,
  RoomGameLoadFailedScreen,
  RoomJoinGate,
  RoomKickedScreen,
  RoomLobby,
  RoomSyncingGameScreen,
} from '../components/room';
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
    signInWithGoogle,
  } = useAuth();
  const {
    room: socketRoom,
    gameState,
    resumeRoom,
    leaveRoom,
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
    sendRoomSticker,
    error: socketError,
    clearError,
    resumeGeneration,
  } = socket;
  const [playerName, setPlayerName] = useState(readGlobalPlayerNameFromStorage);
  const [playerAvatar, setPlayerAvatar] = useState(readGlobalPlayerAvatarFromStorage);
  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [needsJoin, setNeedsJoin] = useState(false);
  const autoJoinAttemptedRef = useRef(false);
  /** Blocks join/resume while leave-room is in flight (leave clears room before navigate). */
  const leavingRoomRef = useRef(false);
  /** Prevents re-entrant leave while switching from another lobby into this URL code. */
  const switchingFromRoomRef = useRef<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [gameLeaveConfirmOpen, setGameLeaveConfirmOpen] = useState(false);
  const [restartToLobbyConfirmOpen, setRestartToLobbyConfirmOpen] = useState(false);
  const [avatarUrlDraft, setAvatarUrlDraft] = useState<string | null>(null);
  const [avatarDisplayDraft, setAvatarDisplayDraft] = useState<PlayerAvatarDisplay>('character');
  /** Dedupes lobby seat ↔ account profile cosmetics sync. */
  const lobbyProfileSyncRef = useRef<string | null>(null);

  /** Re-bind socket ↔ player after reconnect, refresh, background resume, or missing game-state. */
  const prevConnectedRef = useRef<boolean | null>(null);
  const prevResumeGenerationRef = useRef(0);
  useEffect(() => {
    if (!code || !connected || kickedMessage) return;
    if (leavingRoomRef.current) return;

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
    const roomMatchesTarget = room != null && normalizeRoomCode(room.code) === normalized;
    const needsRoom = !roomMatchesTarget;
    const needsGameView =
      roomMatchesTarget &&
      room != null &&
      (room.status === 'playing' || room.status === 'finished') &&
      !gameState;

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

  // Seat may lag account profile (photo / nameplate / title). Push into the lobby seat.
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
    const profileNameplate = normalizeNameplateId(profile.equipped_nameplate_id);
    const profileTitle = normalizeTitleId(profile.equipped_title_id);
    const profileIcon = normalizeIconId(profile.equipped_icon_id);
    const profileChip = normalizeChipId(profile.equipped_chip_id);

    const seatDisplay = normalizePlayerAvatarDisplay(seat.avatarDisplay);
    const seatBase = seat.avatarUrl?.split('?')[0] ?? '';
    const profileBase = profileUrl?.split('?')[0] ?? '';
    const urlMatch =
      profileDisplay !== 'photo' ||
      (Boolean(seatBase) && Boolean(profileBase) && seatBase === profileBase);
    const displayMatch = seatDisplay === profileDisplay;
    const seatNameplate = normalizeNameplateId(seat.equippedNameplateId);
    const seatTitle = normalizeTitleId(seat.equippedTitleId);
    const seatIcon = normalizeIconId(seat.equippedIconId);
    const seatChip = normalizeChipId(seat.equippedChipId);
    const nameplateMatch = seatNameplate === profileNameplate;
    const titleMatch = seatTitle === profileTitle;
    const iconMatch = seatIcon === profileIcon;
    const chipMatch = seatChip === profileChip;

    const profileKey = [
      profileDisplay,
      profileUrl ?? '',
      profileNameplate,
      profileTitle,
      profileIcon,
      profileChip,
    ].join(':');
    const seatKey = [
      seatDisplay,
      seat.avatarUrl ?? '',
      seatNameplate,
      seatTitle,
      seatIcon,
      seatChip,
    ].join(':');

    if (urlMatch && displayMatch && nameplateMatch && titleMatch && iconMatch && chipMatch) {
      lobbyProfileSyncRef.current = `ok:${profileKey}`;
      return;
    }

    // Include seat state so a resume wipe can re-trigger a push for the same profile.
    const pushKey = `push:${profileKey}|${seatKey}`;
    if (lobbyProfileSyncRef.current === pushKey) return;
    lobbyProfileSyncRef.current = pushKey;

    void updatePlayerAvatar(
      seat.avatar,
      urlMatch && displayMatch ? undefined : profileDisplay === 'photo' ? profileUrl : null,
      urlMatch && displayMatch ? undefined : profileDisplay,
      nameplateMatch ? undefined : profileNameplate,
      titleMatch ? undefined : profileTitle,
      iconMatch ? undefined : profileIcon,
      chipMatch ? undefined : profileChip,
    );
  }, [code, playerToken, profile, socket.socket.id, socketRoom, updatePlayerAvatar, user]);

  // First visit via URL — join or show name modal
  useEffect(() => {
    if (!code) return;
    if (leavingRoomRef.current) return;
    if (kickedMessage) return;
    if (!connected) return;

    const normalized = normalizeRoomCode(code);

    // Still seated in another room (e.g. left lobby UI for Profile, then accepted an invite).
    if (socketRoom && normalizeRoomCode(socketRoom.code) !== normalized) {
      const oldCode = normalizeRoomCode(socketRoom.code);
      if (switchingFromRoomRef.current === oldCode) return;
      switchingFromRoomRef.current = oldCode;
      clearStoredRoomSession(oldCode);
      void leaveRoom().finally(() => {
        if (switchingFromRoomRef.current === oldCode) {
          switchingFromRoomRef.current = null;
        }
      });
      return;
    }

    if (socketRoom) return;

    switchingFromRoomRef.current = null;
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
        if (leavingRoomRef.current) return;
        const res = await resumeRoom(normalized, storedToken);
        if (leavingRoomRef.current) return;
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
  }, [code, socketRoom, resumeRoom, leaveRoom, connected, kickedMessage]);

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
    if (leavingRoomRef.current) return;
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
    leavingRoomRef.current = true;
    setNeedsJoin(false);
    setPlayerToken(null);
    setGameLeaveConfirmOpen(false);
    if (code) clearStoredRoomSession(normalizeRoomCode(code));
    void socket.leaveRoom().finally(() => {
      navigate('/');
    });
  };

  const requestLeaveFromGame = () => setGameLeaveConfirmOpen(true);
  const requestRestartToLobby = () => setRestartToLobbyConfirmOpen(true);
  const confirmRestartToLobby = () => {
    setRestartToLobbyConfirmOpen(false);
    socket.restartGame();
  };

  if (kickedMessage) {
    return (
      <RoomKickedScreen message={kickedMessage} code={code} onDismiss={clearKickedMessage} />
    );
  }

  if (needsJoin && code) {
    return (
      <RoomJoinGate
        code={code}
        playerName={playerName}
        playerAvatar={playerAvatar}
        joinError={joinError}
        authConfigured={authConfigured}
        authLoading={authLoading}
        userId={user?.id ?? null}
        profile={profile}
        avatarUrlDraft={avatarUrlDraft}
        avatarDisplayDraft={avatarDisplayDraft}
        onPlayerNameChange={setPlayerName}
        onPlayerAvatarChange={setPlayerAvatar}
        onAvatarUrlChange={setAvatarUrlDraft}
        onAvatarDisplayChange={setAvatarDisplayDraft}
        onJoinErrorClear={() => setJoinError(null)}
        onJoin={(name, avatar) => void handleJoin(name, avatar)}
        onRetryAutoJoin={() => {
          autoJoinAttemptedRef.current = false;
          setJoinError(null);
        }}
        onSignInWithGoogle={signInWithGoogle}
        onRefreshProfile={() => void refreshProfile()}
      />
    );
  }

  // Loading / switching rooms — never render a lobby whose code ≠ the URL.
  if (!socket.room || !code || normalizeRoomCode(socket.room.code) !== normalizeRoomCode(code)) {
    const switching = Boolean(
      socket.room && code && normalizeRoomCode(socket.room.code) !== normalizeRoomCode(code),
    );
    return <RoomConnectingScreen switching={switching} />;
  }

  const room = socket.room;
  // Stable player id must match server (playerToken / stored per room). socket.id changes per
  // connection and is only used by the server when no token is sent — never compare hostId to it.
  const storedIdForRoom = getStoredPlayerToken(normalizeRoomCode(code));
  const myId = playerToken ?? storedIdForRoom ?? socket.socket.id!;
  const isHost = myId === room.hostId;

  const syncingGameView =
    (room.status === 'playing' || room.status === 'finished' || socket.gameStarted) && !gameState;

  if (syncingGameView) {
    return <RoomSyncingGameScreen />;
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
        <GamePlaySessionProvider gameId={room.gameId} coverUrl={room.gameMeta.thumbnail}>
          <RoomActiveGameSession
            activeGame={activeGame}
            players={room.players}
            canSendStickers={room.status === 'playing'}
            socket={socket.socket}
            sendRoomSticker={sendRoomSticker}
            gameLeaveConfirmOpen={gameLeaveConfirmOpen}
            restartToLobbyConfirmOpen={restartToLobbyConfirmOpen}
            isHost={isHost}
            onCloseLeaveConfirm={() => setGameLeaveConfirmOpen(false)}
            onCloseRestartConfirm={() => setRestartToLobbyConfirmOpen(false)}
            onConfirmLeave={performLeaveRoom}
            onConfirmRestart={confirmRestartToLobby}
          />
        </GamePlaySessionProvider>
      );
    }
    return <RoomGameLoadFailedScreen onLeave={performLeaveRoom} />;
  }

  return (
    <RoomLobby
      room={room}
      code={code}
      myId={myId}
      isHost={isHost}
      connected={connected}
      roomConnectionStatus={roomConnectionStatus}
      user={user}
      profile={profile}
      playerName={playerName}
      playerAvatar={playerAvatar}
      onPlayerNameChange={setPlayerName}
      onPlayerAvatarChange={setPlayerAvatar}
      onLobbyOptionsChange={handleLobbyOptionsChange}
      onStartGame={(options) => socket.startGame(options)}
      onUpdateRoomGame={updateRoomGame}
      onUpdatePlayerName={updatePlayerName}
      onUpdatePlayerAvatar={updatePlayerAvatar}
      onKickPlayer={kickPlayer}
      onLeaveRoom={performLeaveRoom}
      onRefreshProfile={refreshProfile}
    />
  );
}
