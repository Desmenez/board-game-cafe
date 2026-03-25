import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { SocketState } from '../types';
import type { AvalonPlayerView } from 'shared';
import { AvalonGame } from '../games/avalon/AvalonGame';
import {
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
  const { room: socketRoom, joinRoom } = socket;
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-join if navigating via URL (e.g., shared link)
  useEffect(() => {
    if (!code) return;
    if (socketRoom) return;

    const normalized = normalizeRoomCode(code);
    const storedToken = getStoredPlayerToken(normalized);
    const storedName = getStoredPlayerName(normalized) ?? localStorage.getItem('playerName') ?? '';

    setPlayerToken(storedToken);
    setPlayerName(storedName);

    if (storedToken && storedName.trim()) {
      void (async () => {
        const res = await joinRoom(normalized, storedName, storedToken);
        if (res.success) setNeedsJoin(false);
        else {
          setPlayerToken(null);
          setNeedsJoin(true);
        }
      })();
    } else {
      setNeedsJoin(true);
    }
  }, [code, socketRoom, joinRoom]);

  const handleJoin = async () => {
    const name = playerName.trim();
    if (!name || !code) return;

    const normalized = normalizeRoomCode(code);
    const tokenToUse = playerToken ?? createPlayerToken();
    localStorage.setItem('playerName', name);

    const res = await socket.joinRoom(normalized, name, tokenToUse);
    if (res.success) {
      setStoredPlayerToken(normalized, tokenToUse);
      setStoredPlayerName(normalized, name);
      setPlayerToken(tokenToUse);
      setNeedsJoin(false);
    } else if (playerToken) {
      // Stored token might have expired; force generating a new one.
      setPlayerToken(null);
    }
  };

  const handleLeave = () => {
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
              <input
                className="input"
                type="text"
                placeholder="ชื่อของคุณ"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                autoFocus
              />
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={handleJoin}
              disabled={!playerName.trim()}
            >
              เข้าร่วม
            </button>
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
  const myId = playerToken ?? socket.socket.id!;
  const isHost = myId === room.hostId;
  const canStart = isHost && room.players.length >= room.gameMeta.minPlayers;

  // Game is active
  if (socket.gameStarted && socket.gameState) {
    if (room.gameId === 'avalon') {
      return (
        <AvalonGame
          gameState={socket.gameState as AvalonPlayerView}
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
          <input className="input" value={window.location.href} readOnly />
          <button className="btn btn-secondary" onClick={copyLink}>
            {copied ? '✅ คัดลอกแล้ว' : '📋 คัดลอก'}
          </button>
        </div>
      </div>

      {/* Players */}
      <h3 style={{ marginBottom: '16px' }}>ผู้เล่น ({room.players.length})</h3>
      <div className="player-list">
        {room.players.map((player) => (
          <div className="player-item" key={player.id}>
            <div className="player-avatar">{player.name.charAt(0).toUpperCase()}</div>
            <span>{player.name}</span>
            {player.id === room.hostId && <span className="host-badge">👑 Host</span>}
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

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
        {isHost && (
          <button
            className="btn btn-primary btn-lg"
            onClick={socket.startGame}
            disabled={!canStart}
          >
            🚀 เริ่มเกม
          </button>
        )}
        <button className="btn btn-danger" onClick={handleLeave}>
          ออกจากห้อง
        </button>
      </div>
    </div>
  );
}
