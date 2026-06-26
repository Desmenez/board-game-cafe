import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { SocketState } from '../types';
import {
  MAX_PLAYER_DISPLAY_NAME_LENGTH,
  PLAYER_DISPLAY_NAME_HINT,
  getPlayerDisplayNameValidationError,
  normalizePlayerDisplayName,
  sanitizePlayerDisplayNameInput,
} from 'shared';
import type {
  AvalonPlayerView,
  ExplodingKittensPlayerView,
  SheriffPlayerView,
  SplendorPlayerView,
  NameItPlayerView,
  InsiderPlayerView,
  HuesAndCuesPlayerView,
  WttdPlayerView,
  TtrPlayerView,
  Flip7PlayerView,
  AbracaPlayerView,
  CodenamesPlayerView,
  OnuwPlayerView,
  PowsPlayerView,
  CupTheCrabPlayerView,
  SimiloPlayerView,
  CamelUpPlayerView,
  FugitivePlayerView,
  LoveLetterPlayerView,
  SpyfallPlayerView,
} from 'shared';
import { AvalonGame } from '../games/avalon/AvalonGame';
import { ExplodingKittensGame } from '../games/exploding-kittens';
import { SheriffGame } from '../games/sheriff-of-nottingham/SheriffGame';
import { SplendorGame } from '../games/splendor/SplendorGame';
import { NameItGame } from '../games/name-it/NameItGame';
import { InsiderGame } from '../games/insider/InsiderGame';
import { HuesAndCuesGame } from '../games/hues-and-cues/HuesAndCuesGame';
import { WelcomeToTheDungeonGame } from '../games/welcome-to-the-dungeon/WelcomeToTheDungeonGame';
import { TicketToRideGame } from '../games/ticket-to-ride/TicketToRideGame';
import { Flip7Game } from '../games/flip7/Flip7Game';
import { AbracawhatGame } from '../games/abracawhat/AbracawhatGame';
import { CodenamesGame } from '../games/codenames/CodenamesGame';
import { OneNightUltimateWerewolfGame } from '../games/one-night-werewolf/OneNightUltimateWerewolfGame';
import { PanicOnWallStreetGame } from '../games/panic-on-wall-street/PanicOnWallStreetGame';
import { CupTheCrabGame } from '../games/cup-the-crab/CupTheCrabGame';
import { SimiloGame } from '../games/similo/SimiloGame';
import { CamelUpGame } from '../games/camel-up/CamelUpGame';
import { FugitiveGame } from '../games/fugitive/FugitiveGame';
import { LoveLetterGame } from '../games/love-letter/LoveLetterGame';
import { SpyfallGame } from '../games/spyfall/SpyfallGame';
import { Check, Copy, LogOut, RotateCcw, Rocket, X } from 'lucide-react';
import { getLobbyOptionsComponent } from '../components/game-lobby-options';
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

interface Props {
  socket: SocketState;
}

export function RoomPage({ socket }: Props) {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    room: socketRoom,
    gameState,
    joinRoom,
    connected,
    kickedMessage,
    kickPlayer,
    clearKickedMessage,
    updateLobbyOptions,
    updatePlayerName,
    syncGameState,
    error: socketError,
    clearError,
  } = socket;
  const [playerName, setPlayerName] = useState(readGlobalPlayerNameFromStorage);
  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [gameLeaveConfirmOpen, setGameLeaveConfirmOpen] = useState(false);
  const [restartToLobbyConfirmOpen, setRestartToLobbyConfirmOpen] = useState(false);
  const [startOptions, setStartOptions] = useState<unknown>(undefined);
  const [kickAlertMessage, setKickAlertMessage] = useState<string | null>(null);
  const [kickConfirm, setKickConfirm] = useState<{ id: string; name: string } | null>(null);
  const [myNameDraft, setMyNameDraft] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSaving, setRenameSaving] = useState(false);

  /** Re-bind socket ↔ player after reconnect, refresh, or missing game-state (e.g. Clue Giver). */
  const prevConnectedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!code || !connected || kickedMessage) return;

    const normalized = normalizeRoomCode(code);
    const storedToken = playerToken ?? getStoredPlayerToken(normalized);
    const storedName = getStoredPlayerName(normalized) ?? readGlobalPlayerNameFromStorage();
    if (!storedToken || !storedName.trim()) return;

    const reconnected = prevConnectedRef.current !== null && !prevConnectedRef.current && connected;
    prevConnectedRef.current = connected;

    const room = socketRoom;
    const needsRoom = !room;
    const needsGameView =
      room != null && (room.status === 'playing' || room.status === 'finished') && !gameState;

    if (!needsRoom && !needsGameView && !reconnected) return;

    void (async () => {
      const res = await joinRoom(normalized, storedName, storedToken);
      if (res.success) {
        setNeedsJoin(false);
        setPlayerToken(storedToken);
      } else if (needsGameView) {
        syncGameState();
      }
    })();
  }, [connected, code, joinRoom, kickedMessage, playerToken, socketRoom, gameState, syncGameState]);

  // Keep token in sync with localStorage when URL has a room code (e.g. after create-room, room
  // may already be in socket state so the auto-join effect never runs — without this, myId would
  // fall back to socket.id and never match hostId).
  useEffect(() => {
    if (!code) return;
    const stored = getStoredPlayerToken(normalizeRoomCode(code));
    if (stored) setPlayerToken(stored);
  }, [code]);

  useEffect(() => {
    const r = socketRoom;
    if (!r || r.status !== 'waiting' || !code) return;
    const myPlayerId =
      playerToken ?? getStoredPlayerToken(normalizeRoomCode(code)) ?? socket.socket.id;
    if (!myPlayerId) return;
    const seat = r.players.find((p) => p.id === myPlayerId);
    if (!seat) return;
    setMyNameDraft((draft) => {
      const committed = seat.name;
      if (!draft.trim()) return committed;
      if (draft.trim() !== committed.trim()) return draft;
      return committed;
    });
  }, [socketRoom, playerToken, code, socket.socket.id]);

  // First visit via URL — join or show name modal
  useEffect(() => {
    if (!code) return;
    if (socketRoom) return;
    if (kickedMessage) return;
    if (!connected) return;

    const normalized = normalizeRoomCode(code);
    const storedToken = getStoredPlayerToken(normalized);
    const storedName = getStoredPlayerName(normalized) ?? readGlobalPlayerNameFromStorage();

    setPlayerToken(storedToken);
    setPlayerName(storedName);
    setJoinError(null);

    if (storedToken && storedName.trim()) {
      void (async () => {
        const res = await joinRoom(normalized, storedName, storedToken);
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
  }, [code, socketRoom, joinRoom, connected, kickedMessage]);

  const handleJoin = async () => {
    if (!code) return;
    const normalizedName = normalizePlayerDisplayName(playerName);
    if (!normalizedName) {
      setJoinError(getPlayerDisplayNameValidationError(playerName) ?? 'กรุณาใส่ชื่อที่ถูกต้อง');
      return;
    }

    const normalized = normalizeRoomCode(code);
    const tokenToUse = playerToken ?? createPlayerToken();
    writeGlobalPlayerNameToStorage(normalizedName);

    setJoinError(null);
    const res = await socket.joinRoom(normalized, normalizedName, tokenToUse);
    if (res.success) {
      setStoredPlayerToken(normalized, tokenToUse);
      setStoredPlayerName(normalized, normalizedName);
      setPlayerToken(tokenToUse);
      setNeedsJoin(false);
    } else {
      setJoinError(res.error ?? 'เข้าห้องไม่สำเร็จ');
    }
    if (!res.success && playerToken) {
      // Stored token might have expired; force generating a new one.
      setPlayerToken(null);
    }
  };

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
      <div className="page container">
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

  // Name input for link-shared joins
  if (needsJoin) {
    const joinNameValidationError = getPlayerDisplayNameValidationError(playerName);
    const canJoin = joinNameValidationError === null;
    const joinInputError =
      joinError ?? (playerName.trim() ? joinNameValidationError : null) ?? undefined;

    return (
      <div className="page container">
        <div className="modal-overlay">
          <div className="modal max-w-lg">
            <h2>👋 เข้าร่วมห้อง {code}</h2>
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
            <Button block onClick={() => void handleJoin()} disabled={!canJoin}>
              เข้าร่วม
            </Button>
            {joinError?.includes('ไม่พบห้อง') && (
              <Button
                variant="secondary"
                block
                onClick={() => navigate('/')}
                style={{ marginTop: 10 }}
              >
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
      <div className="page container" style={{ textAlign: 'center', paddingTop: '120px' }}>
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
  const canStart = isHost && room.players.length >= room.gameMeta.minPlayers;
  const LobbyOptionsComponent = getLobbyOptionsComponent(room.gameId);
  const canRenameInLobby = room.status === 'waiting';
  const mySeat = room.players.find((p) => p.id === myId);

  const myCommittedName = mySeat?.name ?? '';
  const isMyNameDirty = canRenameInLobby && myNameDraft.trim() !== myCommittedName.trim();
  const myNameValidationError = isMyNameDirty
    ? getPlayerDisplayNameValidationError(myNameDraft)
    : null;
  const canSaveMyName = isMyNameDirty && myNameValidationError === null && !renameSaving;

  const cancelRename = () => {
    setRenameError(null);
    setMyNameDraft(myCommittedName);
  };

  const persistMyDisplayName = async () => {
    const normalized = normalizePlayerDisplayName(myNameDraft);
    if (!normalized) {
      setRenameError(getPlayerDisplayNameValidationError(myNameDraft) ?? 'กรุณาใส่ชื่อที่ถูกต้อง');
      return;
    }
    if (normalized === myCommittedName) {
      setRenameError(null);
      setMyNameDraft(myCommittedName);
      return;
    }
    if (renameSaving) return;
    setRenameSaving(true);
    const res = await updatePlayerName(normalized);
    setRenameSaving(false);
    if (res.success) {
      setRenameError(null);
      setMyNameDraft(normalized);
      setPlayerName(normalized);
      writeGlobalPlayerNameToStorage(normalized);
      if (code) setStoredPlayerName(normalizeRoomCode(code), normalized);
      return;
    }
    setRenameError(res.error ?? 'เปลี่ยนชื่อไม่สำเร็จ');
  };

  const syncingGameView =
    (room.status === 'playing' || room.status === 'finished' || socket.gameStarted) && !gameState;

  if (syncingGameView) {
    return (
      <div className="page container" style={{ textAlign: 'center', paddingTop: '120px' }}>
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
    let activeGame: ReactNode = null;
    if (room.gameId === 'avalon') {
      activeGame = (
        <AvalonGame
          gameState={socket.gameState as AvalonPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
          isHost={isHost}
        />
      );
    } else if (room.gameId === 'exploding-kittens') {
      activeGame = (
        <ExplodingKittensGame
          gameState={socket.gameState as ExplodingKittensPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'sheriff-of-nottingham') {
      activeGame = (
        <SheriffGame
          gameState={socket.gameState as SheriffPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'splendor') {
      activeGame = (
        <SplendorGame
          gameState={socket.gameState as SplendorPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'name-it') {
      activeGame = (
        <NameItGame
          gameState={socket.gameState as NameItPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
          remoteError={socketError}
          onClearRemoteError={clearError}
        />
      );
    } else if (room.gameId === 'insider') {
      activeGame = (
        <InsiderGame
          gameState={socket.gameState as InsiderPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'hues-and-cues') {
      activeGame = (
        <HuesAndCuesGame
          gameState={socket.gameState as HuesAndCuesPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'welcome-to-the-dungeon') {
      activeGame = (
        <WelcomeToTheDungeonGame
          gameState={socket.gameState as WttdPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
          isHost={isHost}
        />
      );
    } else if (room.gameId === 'ticket-to-ride') {
      activeGame = (
        <TicketToRideGame
          gameState={socket.gameState as TtrPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'flip7') {
      activeGame = (
        <Flip7Game
          gameState={socket.gameState as Flip7PlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'abracawhat') {
      activeGame = (
        <AbracawhatGame
          gameState={socket.gameState as AbracaPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'codenames') {
      activeGame = (
        <CodenamesGame
          gameState={socket.gameState as CodenamesPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'one-night-ultimate-werewolf') {
      activeGame = (
        <OneNightUltimateWerewolfGame
          gameState={socket.gameState as OnuwPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
          isHost={isHost}
        />
      );
    } else if (room.gameId === 'panic-on-wall-street') {
      activeGame = (
        <PanicOnWallStreetGame
          gameState={socket.gameState as PowsPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
          isHost={isHost}
        />
      );
    } else if (room.gameId === 'cup-the-crab') {
      activeGame = (
        <CupTheCrabGame
          gameState={socket.gameState as CupTheCrabPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'camel-up') {
      activeGame = (
        <CamelUpGame
          gameState={socket.gameState as CamelUpPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'similo') {
      activeGame = (
        <SimiloGame
          gameState={gameState as SimiloPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'fugitive') {
      activeGame = (
        <FugitiveGame
          gameState={gameState as FugitivePlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'love-letter') {
      activeGame = (
        <LoveLetterGame
          gameState={socket.gameState as LoveLetterPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    } else if (room.gameId === 'spyfall') {
      activeGame = (
        <SpyfallGame
          gameState={socket.gameState as SpyfallPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={requestLeaveFromGame}
          onRestart={isHost ? requestRestartToLobby : undefined}
        />
      );
    }

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
      <div className="page container" style={{ textAlign: 'center', padding: '48px 16px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>โหลดเกมนี้ไม่สำเร็จ</p>
        <Button type="button" onClick={performLeaveRoom}>
          ออกจากห้อง
        </Button>
      </div>
    );
  }

  // Lobby / Waiting Room
  return (
    <div className="page container flex flex-col">
      <div className="room-header">
        <div>
          <h1>{room.gameMeta.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            ห้องเกม • {room.players.length}/{room.gameMeta.maxPlayers} คน
          </p>
        </div>
        <div
          className="room-code"
          onClick={copyCode}
          style={{ cursor: 'pointer' }}
          title="คลิกเพื่อคัดลอก"
        >
          {room.code}
        </div>
      </div>

      {/* Share */}
      <div className="share-box">
        <p>แชร์ลิงก์หรือรหัสห้องให้เพื่อน</p>
        <div className="share-link">
          <Input value={window.location.href} readOnly aria-label="ลิงก์เชิญเข้าห้อง" />
          <Button variant="secondary" type="button" onClick={copyLink}>
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
      </div>

      {kickAlertMessage && (
        <Alert variant="destructive" className="mb-4" onDismiss={() => setKickAlertMessage(null)}>
          {kickAlertMessage}
        </Alert>
      )}

      {/* Players */}
      <h3 style={{ marginBottom: '16px' }}>ผู้เล่น ({room.players.length})</h3>
      <div className="player-list">
        {room.players.map((player) => {
          const isMe = player.id === myId;
          const displayName = isMe && canRenameInLobby ? myNameDraft : player.name;
          return (
            <div
              className={
                isMe && isMyNameDirty ? 'player-item player-item--rename-pending' : 'player-item'
              }
              key={player.id}
            >
              {isHost && player.id !== room.hostId && room.status === 'waiting' && (
                <button
                  type="button"
                  className="player-kick-dismiss"
                  title={`เตะ ${player.name} ออกจากห้อง`}
                  aria-label={`เตะ ${player.name} ออกจากห้อง`}
                  onClick={() => setKickConfirm({ id: player.id, name: player.name })}
                >
                  <X size={14} strokeWidth={2.75} aria-hidden />
                </button>
              )}
              <div className="player-avatar">
                {(displayName.trim() || player.name).charAt(0).toUpperCase()}
              </div>
              <div className="player-item-name-wrap">
                {isMe && canRenameInLobby ? (
                  <div className="player-item-rename">
                    <div className="player-item-rename-row">
                      <input
                        type="text"
                        className="player-item-name-input"
                        value={myNameDraft}
                        maxLength={MAX_PLAYER_DISPLAY_NAME_LENGTH}
                        aria-label="ชื่อที่แสดงในเกม"
                        title="แก้ชื่อของคุณ"
                        disabled={renameSaving}
                        onChange={(e) => {
                          setMyNameDraft(sanitizePlayerDisplayNameInput(e.target.value));
                          setRenameError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && canSaveMyName) {
                            e.preventDefault();
                            void persistMyDisplayName();
                          }
                          if (e.key === 'Escape' && isMyNameDirty) {
                            e.preventDefault();
                            cancelRename();
                          }
                        }}
                      />
                      <span className="player-item-you">(คุณ)</span>
                    </div>
                    <p className="ui-hint player-item-rename-hint">{PLAYER_DISPLAY_NAME_HINT}</p>
                    {(renameError || myNameValidationError) && (
                      <p className="ui-field-error" role="alert">
                        {renameError ?? myNameValidationError}
                      </p>
                    )}
                    {isMyNameDirty && (
                      <div className="player-item-rename-actions">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={cancelRename}
                          disabled={renameSaving}
                        >
                          ยกเลิก
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void persistMyDisplayName()}
                          disabled={!canSaveMyName}
                        >
                          บันทึก
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <span className="player-item-name" title={player.name}>
                      {player.name}
                    </span>
                    {isMe && <span className="player-item-you">(คุณ)</span>}
                  </>
                )}
              </div>
              {player.id === room.hostId && (
                <Badge variant="warning" size="sm" className="host-badge">
                  👑 Host
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Waiting / Start */}
      {room.players.length < room.gameMeta.minPlayers && (
        <div className="waiting-indicator">
          <p>
            รอผู้เล่นเพิ่มอีก {room.gameMeta.minPlayers - room.players.length} คน (ต้องมีอย่างน้อย{' '}
            {room.gameMeta.minPlayers} คน)
          </p>
          <div className="waiting-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      <LobbyOptionsComponent
        key={`${room.gameId}:${room.code}`}
        isHost={isHost}
        playerCount={room.players.length}
        players={room.players.map((p) => ({ id: p.id, name: p.name }))}
        lobbyOptions={room.lobbyOptions}
        onChange={(opts) => {
          setStartOptions(opts);
          if (isHost) updateLobbyOptions(opts);
        }}
      />

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
        {isHost && (
          <Button
            size="lg"
            onClick={() => socket.startGame(room.lobbyOptions ?? startOptions)}
            disabled={!canStart}
          >
            <Rocket size={18} strokeWidth={2.25} aria-hidden /> เริ่มเกม
          </Button>
        )}
        <Button
          variant="danger"
          type="button"
          onClick={() => (isHost ? setLeaveModalOpen(true) : performLeaveRoom())}
        >
          <LogOut size={18} strokeWidth={2.25} aria-hidden />
          ออกจากห้อง
        </Button>
      </div>

      <Dialog
        open={kickConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setKickConfirm(null);
        }}
        className="max-w-lg"
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
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
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
    </div>
  );
}
