import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { SocketState } from '../types';
import type { AvalonPlayerView, ExplodingKittensPlayerView, SheriffPlayerView } from 'shared';
import { AvalonGame } from '../games/avalon/AvalonGame';
import { ExplodingKittensGame } from '../games/exploding-kittens/ExplodingKittensGame';
import { SheriffGame } from '../games/sheriff-of-nottingham/SheriffGame';
import { Check, Copy } from 'lucide-react';
import { getLobbyOptionsComponent } from '../components/game-lobby-options';
import { Badge, Button, Input } from '../components/ui';
import {
  clearStoredRoomSession,
  createPlayerToken,
  getStoredPlayerName,
  getStoredPlayerToken,
  normalizeRoomCode,
  setStoredPlayerName,
  setStoredPlayerToken,
} from '../utils/playerToken';

interface Props {
  socket: SocketState;
}

export function RoomPage({ socket }: Props) {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room: socketRoom, joinRoom, connected } = socket;
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [startOptions, setStartOptions] = useState<unknown>(undefined);

  // Keep token in sync with localStorage when URL has a room code (e.g. after create-room, room
  // may already be in socket state so the auto-join effect never runs — without this, myId would
  // fall back to socket.id and never match hostId).
  useEffect(() => {
    if (!code) return;
    const stored = getStoredPlayerToken(normalizeRoomCode(code));
    if (stored) setPlayerToken(stored);
  }, [code]);

  // Auto-join if navigating via URL (e.g., shared link)
  useEffect(() => {
    if (!code) return;
    if (socketRoom) return;
    if (!connected) return;

    const normalized = normalizeRoomCode(code);
    const storedToken = getStoredPlayerToken(normalized);
    const storedName = getStoredPlayerName(normalized) ?? localStorage.getItem('playerName') ?? '';

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
  }, [code, socketRoom, joinRoom, connected]);

  const handleJoin = async () => {
    const name = playerName.trim();
    if (!name || !code) return;

    const normalized = normalizeRoomCode(code);
    const tokenToUse = playerToken ?? createPlayerToken();
    localStorage.setItem('playerName', name);

    setJoinError(null);
    const res = await socket.joinRoom(normalized, name, tokenToUse);
    if (res.success) {
      setStoredPlayerToken(normalized, tokenToUse);
      setStoredPlayerName(normalized, name);
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

  const handleLeave = () => {
    setLeaveModalOpen(false);
    if (code) clearStoredRoomSession(normalizeRoomCode(code));
    socket.leaveRoom();
    navigate('/');
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

  // Name input for link-shared joins
  if (needsJoin) {
    return (
      <div className="page container">
        <div className="modal-overlay">
          <div className="modal">
            <h2>👋 เข้าร่วมห้อง {code}</h2>
            <p>ใส่ชื่อของคุณเพื่อเข้าร่วมเกม</p>
            <div className="form-group">
              <Input
                label="ชื่อที่แสดงในเกม"
                type="text"
                placeholder="ชื่อของคุณ"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                error={joinError ?? undefined}
                autoFocus
              />
            </div>
            <Button block onClick={handleJoin} disabled={!playerName.trim()}>
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

  // Game is active
  if (socket.gameStarted && socket.gameState) {
    if (room.gameId === 'avalon') {
      return (
        <AvalonGame
          gameState={socket.gameState as AvalonPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={handleLeave}
          onRestart={isHost ? socket.restartGame : undefined}
          isHost={isHost}
        />
      );
    }
    if (room.gameId === 'exploding-kittens') {
      return (
        <ExplodingKittensGame
          gameState={socket.gameState as ExplodingKittensPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={handleLeave}
        />
      );
    }
    if (room.gameId === 'sheriff-of-nottingham') {
      return (
        <SheriffGame
          gameState={socket.gameState as SheriffPlayerView}
          myId={myId}
          sendAction={socket.sendAction}
          onLeave={handleLeave}
        />
      );
    }
  }

  // Lobby / Waiting Room
  return (
    <div className="page container">
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
          <Input
            value={window.location.href}
            readOnly
            aria-label="ลิงก์เชิญเข้าห้อง"
          />
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

      {/* Players */}
      <h3 style={{ marginBottom: '16px' }}>ผู้เล่น ({room.players.length})</h3>
      <div className="player-list">
        {room.players.map((player) => (
          <div className="player-item" key={player.id}>
            <div className="player-avatar">{player.name.charAt(0).toUpperCase()}</div>
            <span>{player.name}</span>
            {player.id === room.hostId && (
              <Badge variant="warning" size="sm" className="host-badge">
                👑 Host
              </Badge>
            )}
          </div>
        ))}
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

      {isHost && (
        <LobbyOptionsComponent
          key={`${room.gameId}:${room.code}`}
          playerCount={room.players.length}
          onChange={setStartOptions}
        />
      )}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
        {isHost && (
          <Button size="lg" onClick={() => socket.startGame(startOptions)} disabled={!canStart}>
            🚀 เริ่มเกม
          </Button>
        )}
        <Button
          variant="danger"
          type="button"
          onClick={() => (isHost ? setLeaveModalOpen(true) : handleLeave())}
        >
          ออกจากห้อง
        </Button>
      </div>

      {leaveModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
        >
          <div className="modal">
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
              <Button type="button" variant="danger" block onClick={handleLeave}>
                ออกจากห้อง
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
