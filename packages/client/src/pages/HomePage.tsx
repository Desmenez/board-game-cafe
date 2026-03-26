import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameMeta } from 'shared';
import type { SocketState } from '../types';
import avalonCover from '../assets/avalon/cover.jpg';
import explodingKittensCover from '../assets/exploding-kittens/cover.jpg';
import {
  clearStoredRoomSession,
  createPlayerToken,
  getStoredPlayerToken,
  listStoredRoomSessions,
  normalizeRoomCode,
  setStoredPlayerName,
  setStoredPlayerToken,
} from '../utils/playerToken';
import { Dices, DoorOpen, Unplug } from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface Props {
  socket: SocketState;
}

export function HomePage({ socket }: Props) {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameMeta[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'create'; gameId: string; playerToken: string }
    | { type: 'join'; code: string; playerToken: string }
    | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [savedRooms, setSavedRooms] = useState(() => listStoredRoomSessions());

  const refreshSavedRooms = useCallback(() => {
    setSavedRooms(listStoredRoomSessions());
  }, []);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/games`)
      .then((r) => r.json())
      .then(setGames)
      .catch(console.error);
  }, []);

  useEffect(() => {
    refreshSavedRooms();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshSavedRooms();
    };
    window.addEventListener('focus', refreshSavedRooms);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refreshSavedRooms);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshSavedRooms]);

  const handleAction = async (
    action:
      | { type: 'create'; gameId: string; playerToken: string }
      | { type: 'join'; code: string; playerToken: string },
  ) => {
    const name = playerName.trim();
    if (!name) {
      setPendingAction(action);
      setShowNameModal(true);
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
        }
      } else {
        const code = normalizeRoomCode(action.code);
        const res = await socket.joinRoom(code, name, action.playerToken);
        if (res.success) {
          setStoredPlayerToken(code, action.playerToken);
          setStoredPlayerName(code, name);
          navigate(`/room/${code}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = () => {
    const name = playerName.trim();
    if (!name) return;
    localStorage.setItem('playerName', name);
    setShowNameModal(false);
    if (pendingAction) {
      handleAction(pendingAction);
      setPendingAction(null);
    }
  };

  const gameCovers: Record<string, string> = {
    avalon: avalonCover,
    'exploding-kittens': explodingKittensCover,
  };

  const gameEmojis: Record<string, string> = {};

  return (
    <div className="page container">
      <div className="page-header flex flex-col items-center justify-center">
        <div>
          <Dices size={40} className="text-accent" />
          <h1>Board Game Cafe</h1>
        </div>
        <p>เลือกเกมแล้วสร้างห้องเล่นกับเพื่อน</p>
      </div>

      {savedRooms.length > 0 && (
        <section className="saved-rooms-section" aria-labelledby="saved-rooms-heading">
          <h2 id="saved-rooms-heading">ห้องที่คุณเคยเข้า</h2>
          <p>กดเพื่อกลับเข้าห้องเดิมด้วยชื่อและตัวตนเดิม (จากเครื่องนี้)</p>
          <ul className="saved-rooms-list">
            {savedRooms.map((session) => (
              <li key={session.code}>
                <div className="saved-room-row">
                  <div className="saved-room-meta">
                    <div className="saved-room-code">{session.code}</div>
                    <div className="saved-room-name">เล่นในชื่อ {session.displayName}</div>
                  </div>
                  <div className="saved-room-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-saved-rejoin"
                      onClick={() => navigate(`/room/${session.code}`)}
                    >
                      <DoorOpen size={18} aria-hidden />
                      เข้าต่อ
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-saved-disconnect"
                      onClick={() => {
                        clearStoredRoomSession(session.code);
                        refreshSavedRooms();
                      }}
                      aria-label={`ตัดการจำห้อง ${session.code} ออกจากเครื่องนี้`}
                      title="ลบ token ของห้องนี้ — จะไม่กลับเข้าอัตโนมัติในชื่อเดิม"
                    >
                      <Unplug size={18} aria-hidden />
                      ตัดการจำ
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Game Catalog */}
      <div className="game-grid">
        {games.map((game) => (
          <div
            key={game.id}
            className="card game-card"
            onClick={() =>
              handleAction({ type: 'create', gameId: game.id, playerToken: createPlayerToken() })
            }
          >
            <div className="game-card-thumb">
              {gameCovers[game.id] ? (
                <img src={gameCovers[game.id]} alt={`${game.name} cover`} />
              ) : (
                gameEmojis[game.id] || '🎮'
              )}
            </div>
            <h3>{game.name}</h3>
            <p className="line-clamp-3">{game.description}</p>
            <div className="game-card-meta">
              <span className="badge">
                👥 {game.minPlayers}-{game.maxPlayers} คน
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Join Room */}
      <div className="divider">หรือเข้าร่วมห้อง</div>

      <div className="join-section">
        <h2>เข้าร่วมห้องเกม</h2>
        <p>กรอกรหัสห้อง 6 ตัวอักษร</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            className="input input-code"
            type="text"
            placeholder="ABC123"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          <button
            className="btn btn-primary"
            disabled={joinCode.length !== 6 || loading}
            onClick={() => {
              const code = normalizeRoomCode(joinCode);
              const token = getStoredPlayerToken(code) ?? createPlayerToken();
              handleAction({ type: 'join', code, playerToken: token });
            }}
          >
            เข้าห้อง
          </button>
        </div>
      </div>

      {/* Name Modal */}
      {showNameModal && (
        <div className="modal-overlay" onClick={() => setShowNameModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>👋 ใส่ชื่อของคุณ</h2>
            <p>ชื่อนี้จะแสดงให้ผู้เล่นคนอื่นเห็น</p>
            <div className="form-group">
              <input
                className="input"
                type="text"
                placeholder="ชื่อของคุณ"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                autoFocus
              />
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={handleNameSubmit}
              disabled={!playerName.trim()}
            >
              เริ่มเลย!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
