import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { GameMeta } from 'shared';
import type { SocketState } from '../types';
import {
  clearAllStoredRoomSessions,
  clearStoredRoomSession,
  createPlayerToken,
  getStoredPlayerToken,
  listStoredRoomSessions,
  normalizeRoomCode,
} from '../utils/playerToken';
import { Dices, DoorOpen, LayoutGrid, Trash2, Unplug } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { GameSpotlightCarousel } from '../components/GameSpotlightCarousel';
import { PlayerNameModal } from '../components/PlayerNameModal';
import { usePlayerRoomFlow } from '../hooks/usePlayerRoomFlow';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface Props {
  socket: SocketState;
}

export function HomePage({ socket }: Props) {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameMeta[]>([]);
  const {
    joinCode,
    setJoinCode,
    playerName,
    setPlayerName,
    showNameModal,
    setShowNameModal,
    nameModalError,
    clearNameModalError,
    loading,
    handleAction,
    handleNameSubmit,
    adminJoinInputMaxLength,
    isAdminJoinCode,
  } = usePlayerRoomFlow(socket);
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

  return (
    <div className="page container home-page">
      <div className="home-board-bg" aria-hidden />

      <div className="page-header home-page-header flex flex-col items-center justify-center mt-10!">
        <div className="home-title-row">
          <Dices size={40} className="text-accent home-title-icon" aria-hidden />
          <h1>Board Game Cafe</h1>
        </div>
        <p>เลือกเกมจากไฮไลต์ หรือดูเกมทั้งหมด แล้วสร้างห้องเล่นกับเพื่อน</p>
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

      <section
        className="home-spotlight-section flex flex-col items-center justify-center gap-4"
        aria-labelledby="spotlight-heading"
      >
        <div className="home-spotlight-heading-row">
          <h2 id="spotlight-heading">เกมไฮไลต์</h2>
        </div>
        <GameSpotlightCarousel
          games={games}
          onPickGame={(game) =>
            handleAction({ type: 'create', gameId: game.id, playerToken: createPlayerToken() })
          }
        />
        <Link to="/games" className="home-catalog-cta btn btn-secondary">
          <LayoutGrid size={20} aria-hidden />
          ดูเกมทั้งหมด
        </Link>
      </section>

      <div className="home-join-dock" role="search" aria-label="เข้าร่วมห้องด้วยรหัส">
        <div className="home-join-dock-inner">
          <p className="home-join-dock-label">หรือเข้าร่วมห้อง · รหัส 6 ตัวอักษร</p>
          <div className="home-join-dock-row">
            <Input
              className="input-code"
              type="text"
              placeholder="ABC123"
              size="lg"
              maxLength={adminJoinInputMaxLength}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              aria-label="รหัสห้อง 6 ตัวอักษร หรือรหัสแอดมินจาก VITE_ADMIN_SECRET"
            />
            <Button
              size="lg"
              disabled={loading || !(joinCode.length === 6 || isAdminJoinCode(joinCode))}
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

      <PlayerNameModal
        open={showNameModal}
        playerName={playerName}
        onChangeName={(name) => {
          clearNameModalError();
          setPlayerName(name);
        }}
        onSubmit={handleNameSubmit}
        onDismiss={() => {
          clearNameModalError();
          setShowNameModal(false);
        }}
        externalError={nameModalError}
        submitDisabled={loading}
      />
    </div>
  );
}
