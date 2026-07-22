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
import { ArrowRight, Dices, DoorOpen, LayoutGrid, Trash2, Unplug } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { GameSpotlightCarousel } from '../components/GameSpotlightCarousel';
import { PlayerAvatar } from '../components/player-avatar';
import { PlayerProfileModal } from '../components/PlayerProfileModal';
import { usePlayerRoomFlow } from '../hooks/usePlayerRoomFlow';
import { AuthNavControls } from '../components/AuthNavControls';

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
    playerAvatar,
    setPlayerAvatar,
    playerAvatarUrl,
    setPlayerAvatarUrl,
    playerAvatarDisplay,
    setPlayerAvatarDisplay,
    showProfileModal,
    profileModalMode,
    profileModalError,
    clearProfileModalError,
    loading,
    handleAction,
    openProfileEditor,
    dismissProfileModal,
    handleProfileSubmit,
    profileUserId,
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
    <div className="page home-page home-page--hallmark">
      <header className="home-nav" aria-label="เมนูหลัก">
        <Link to="/" className="home-wordmark" aria-label="Board Game Cafe หน้าหลัก">
          <Dices size={25} aria-hidden />
          <span>Board Game Cafe</span>
        </Link>
        <div className="home-nav-actions">
          <AuthNavControls />
        </div>
      </header>

      <main className="home-shell">
        <section className="home-intro" aria-labelledby="home-heading">
          <div className="home-intro-copy text-2xl md:text-4xl">
            <h1 id="home-heading">
              คืนนี้
              <br />
              เล่นเกมอะไรดี?
            </h1>
            <p>เลือกเกมเด่นแล้วสร้างห้องได้เลย จากนั้นส่งรหัสให้เพื่อนเข้ามาร่วมโต๊ะ</p>
          </div>
          <figure className="home-table-vignette">
            <div className="home-table-tilt" aria-hidden>
              <div className="home-table-light">
                <span className="home-table-card home-table-card--one" />
                <span className="home-table-card home-table-card--two" />
                <span className="home-table-die">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="home-table-pawn home-table-pawn--one" />
                <span className="home-table-pawn home-table-pawn--two" />
              </div>
            </div>
            <figcaption>โต๊ะคืนนี้ · พร้อมเปิดห้อง</figcaption>
          </figure>
        </section>

        <section className="home-bento home-workbench" aria-label="เลือกเกมเพื่อเริ่มเล่น">
          <div className="home-workbench-main">
            <div className="home-section-heading">
              <h2 id="spotlight-heading">เกมเด่นสำหรับโต๊ะนี้</h2>
              <span>กดการ์ดเพื่อสร้างห้อง</span>
            </div>
            <GameSpotlightCarousel
              games={games}
              onPickGame={(game) =>
                handleAction({ type: 'create', gameId: game.id, playerToken: createPlayerToken() })
              }
            />
          </div>

          <Link to="/games" className="home-bento-catalog">
            <span className="home-bento-icon">
              <LayoutGrid size={24} aria-hidden />
            </span>
            <span>
              <strong>ดูชั้นเกมทั้งหมด</strong>
              <small>เลือกจากทุกเกมที่เปิดโต๊ะได้</small>
            </span>
            <ArrowRight size={22} aria-hidden />
          </Link>

          <button
            type="button"
            className="home-bento-friends flex flex-col gap-4"
            onClick={openProfileEditor}
            aria-label="แก้ไขชื่อและ avatar"
          >
            <PlayerAvatar
              playerId="home-profile"
              name={playerName.trim() || 'คุณ'}
              avatar={playerAvatar}
              avatarUrl={playerAvatarUrl}
              avatarDisplay={playerAvatarDisplay}
              size={64}
              decorative
              className="home-bento-friends-avatar"
            />
            <strong>{playerName.trim() || 'ตั้งโปรไฟล์ของคุณ'}</strong>
            <span>แก้ชื่อและ avatar ได้ก่อนเข้าเกม</span>
          </button>
        </section>

        {savedRooms.length > 0 && (
          <section className="saved-rooms-section" aria-labelledby="saved-rooms-heading">
            <div className="saved-rooms-heading-row">
              <div>
                <p>กลับไปที่โต๊ะเดิม</p>
                <h2 id="saved-rooms-heading">ห้องที่คุณเคยเข้า</h2>
                <span>กลับเข้าห้องด้วยชื่อและตัวตนเดิมจากเครื่องนี้</span>
              </div>
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
      </main>

      <div className="home-join-dock" role="search" aria-label="เข้าร่วมห้องด้วยรหัส">
        <div className="home-join-dock-inner">
          <label className="home-join-dock-label" htmlFor="home-room-code">
            มีรหัสห้องแล้ว? ใส่รหัส 6 ตัวอักษร
          </label>
          <div className="home-join-dock-row">
            <Input
              id="home-room-code"
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
              aria-busy={loading}
              onClick={() => {
                const code = normalizeRoomCode(joinCode);
                const token = getStoredPlayerToken(code) ?? createPlayerToken();
                handleAction({ type: 'join', code, playerToken: token });
              }}
            >
              {loading ? 'กำลังเข้าห้อง…' : 'เข้าห้อง'}
            </Button>
          </div>
          <span className="home-join-helper mt-2!" aria-live="polite">
            {loading ? 'กำลังเชื่อมต่อกับห้อง…' : 'ใช้รหัสที่เพื่อนส่งให้คุณ'}
          </span>
        </div>
      </div>

      <PlayerProfileModal
        open={showProfileModal}
        mode={profileModalMode}
        playerName={playerName}
        playerAvatar={playerAvatar}
        onChangeName={(name) => {
          clearProfileModalError();
          setPlayerName(name);
        }}
        onChangeAvatar={setPlayerAvatar}
        onSubmit={handleProfileSubmit}
        onDismiss={dismissProfileModal}
        externalError={profileModalError}
        submitDisabled={loading}
        photoUpload={
          profileUserId
            ? {
                userId: profileUserId,
                avatarUrl: playerAvatarUrl,
                avatarDisplay: playerAvatarDisplay,
                onAvatarUrlChange: setPlayerAvatarUrl,
                onAvatarDisplayChange: setPlayerAvatarDisplay,
              }
            : null
        }
      />
    </div>
  );
}
