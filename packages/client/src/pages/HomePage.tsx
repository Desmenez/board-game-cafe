import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameMeta } from 'shared';
import type { SocketState } from '../types';
import { imageMap } from '../imageMap';
import {
  clearAllStoredRoomSessions,
  clearStoredRoomSession,
  createPlayerToken,
  getStoredPlayerToken,
  listStoredRoomSessions,
  normalizeRoomCode,
  setStoredPlayerName,
  setStoredPlayerToken,
} from '../utils/playerToken';
import { Dices, DoorOpen, Trash2, Unplug } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Input } from '../components/ui';
import { adminJoinInputMaxLength, isAdminJoinCode } from '../constants/admin';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface Props {
  socket: SocketState;
}

export function HomePage({ socket }: Props) {
  const { connected } = socket;
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

  useEffect(() => {
    document.body.classList.add('home-fixed-join');
    return () => document.body.classList.remove('home-fixed-join');
  }, []);

  const handleAction = async (
    action:
      | { type: 'create'; gameId: string; playerToken: string }
      | { type: 'join'; code: string; playerToken: string },
  ) => {
    if (action.type === 'join' && isAdminJoinCode(action.code)) {
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
    avalon: imageMap.avalon.cover,
    'exploding-kittens': imageMap.explodingKittens.cover,
    'sheriff-of-nottingham': imageMap.sheriffOfNottingham.cover,
    'name-it': imageMap.nameIt.cover,
    insider: imageMap.insider.cover,
    'hues-and-cues': imageMap.huesAndCues.cover,
  };

  const gameEmojis: Record<string, string> = {
    'sheriff-of-nottingham': '🛡️',
    splendor: '💎',
    insider: '🕵️',
  };

  return (
    <div className="page container home-page">
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
          <div className="saved-rooms-clear-all-wrap">
            <Button
              type="button"
              variant="danger"
              className="btn-saved-clear-all"
              onClick={() => {
                clearAllStoredRoomSessions();
                refreshSavedRooms();
              }}
              aria-label="ตัดการจำห้องทั้งหมดออกจากเครื่องนี้"
              title="ลบ token และชื่อที่เก็บไว้ทุกห้องในเบราว์เซอร์นี้"
            >
              <Trash2 size={18} aria-hidden />
              ตัดการจำทั้งหมด
            </Button>
          </div>
          <div
            className="saved-rooms-list-scroll"
            role="region"
            aria-label="รายการห้องที่บันทึกไว้"
          >
            <ul className="saved-rooms-list">
              {savedRooms.map((session) => (
                <li key={session.code}>
                  <div className="saved-room-row">
                    <div className="saved-room-meta">
                      <div className="saved-room-code">{session.code}</div>
                      <div className="saved-room-name">เล่นในชื่อ {session.displayName}</div>
                    </div>
                    <div className="saved-room-actions">
                      <Button
                        type="button"
                        variant="primary"
                        className="btn-saved-rejoin"
                        onClick={() => navigate(`/room/${session.code}`)}
                      >
                        <DoorOpen size={18} aria-hidden />
                        เข้าต่อ
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="btn-saved-disconnect"
                        onClick={() => {
                          clearStoredRoomSession(session.code);
                          refreshSavedRooms();
                        }}
                        aria-label={`ตัดการจำห้อง ${session.code} ออกจากเครื่องนี้`}
                        title="ลบ token ของห้องนี้ — จะไม่กลับเข้าอัตโนมัติในชื่อเดิม"
                      >
                        <Unplug size={18} aria-hidden />
                        ตัดการจำ
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
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
              <Badge variant="accent" size="sm">
                👥 {game.minPlayers}-{game.maxPlayers} คน
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Join Room — fixed dock so catalog can scroll without losing join UI */}
      <div className="home-join-dock" role="search" aria-label="เข้าร่วมห้องด้วยรหัส">
        <div className="home-join-dock-inner">
          <p className="home-join-dock-label">หรือเข้าร่วมห้อง · รหัส 6 ตัวอักษร</p>
          <div className="home-join-dock-row">
            <Input
              className="input-code"
              type="text"
              placeholder="ABC123"
              maxLength={adminJoinInputMaxLength()}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              aria-label="รหัสห้อง 6 ตัวอักษร หรือรหัสแอดมินจาก VITE_ADMIN_SECRET"
            />
            <Button
              size="lg"
              disabled={
                loading ||
                !(joinCode.length === 6 || isAdminJoinCode(joinCode))
              }
              onClick={() => {
                const code = normalizeRoomCode(joinCode);
                const token = getStoredPlayerToken(code) ?? createPlayerToken();
                handleAction({ type: 'join', code, playerToken: token });
              }}
            >
              เข้าห้อง
            </Button>
          </div>
        </div>
      </div>

      {/* Name Modal */}
      {showNameModal && (
        <div className="modal-overlay" onClick={() => setShowNameModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>👋 ใส่ชื่อของคุณ</h2>
            <p>ชื่อนี้จะแสดงให้ผู้เล่นคนอื่นเห็น</p>
            <div className="form-group">
              <Input
                label="ชื่อที่แสดงในเกม"
                type="text"
                placeholder="ชื่อของคุณ"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                autoFocus
              />
            </div>
            <Button block onClick={handleNameSubmit} disabled={!playerName.trim()}>
              เริ่มเลย!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
