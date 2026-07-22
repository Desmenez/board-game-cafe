import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GameMeta } from 'shared';
import type { SocketState } from '../types';
import { ArrowLeft, Gamepad2, Search, Trophy, Users } from 'lucide-react';
import { Badge, Input } from '../components/ui';
import { PlayerProfileModal } from '../components/PlayerProfileModal';
import { usePlayerRoomFlow } from '../hooks/usePlayerRoomFlow';
import { createPlayerToken } from '../utils/playerToken';
import { getCatalogThumb } from '../gameCatalogDisplay';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface Props {
  socket: SocketState;
}

function normalizeSearch(s: string) {
  return s.trim().toLowerCase();
}

export function GamesCatalogPage({ socket }: Props) {
  const [games, setGames] = useState<GameMeta[]>([]);
  const [query, setQuery] = useState('');
  const {
    playerName,
    setPlayerName,
    playerAvatar,
    setPlayerAvatar,
    showProfileModal,
    profileModalMode,
    profileModalError,
    clearProfileModalError,
    loading,
    handleAction,
    dismissProfileModal,
    handleProfileSubmit,
  } = usePlayerRoomFlow(socket);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/games`)
      .then((r) => r.json())
      .then(setGames)
      .catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return games;
    return games.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q),
    );
  }, [games, query]);

  return (
    <div className="page app-night-page">
      <div className="mx-auto w-full max-w-shell px-4 pt-10 pb-32 sm:px-6 lg:px-16 lg:pt-16">
        <header className="mb-10">
          <Link
            to="/"
            className="mb-6 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-ink-2 no-underline transition duration-150 ease-out hover:text-ink motion-safe:hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
          >
            <ArrowLeft size={20} aria-hidden />
            กลับหน้าแรก
          </Link>
          <div>
            <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
              ทุกเกมบนชั้น
            </span>
            <h1 className="mt-3 mb-2 max-w-[18ch] [overflow-wrap:anywhere] font-display text-[clamp(1.953rem,4vw,2.441rem)] leading-[1.08] font-extrabold tracking-[-0.045em] text-ink">
              เลือกเกมสำหรับโต๊ะคืนนี้
            </h1>
            <p className="m-0 max-w-[58ch] leading-7 text-ink-2">
              ค้นหาชื่อเกม ดูจำนวนผู้เล่น แล้วเปิดห้องใหม่จากการ์ดได้ทันที
            </p>
          </div>
        </header>

        <div className="mb-10 grid gap-3 rounded-card border border-rule bg-paper-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <label className="flex min-w-0 items-center gap-3" htmlFor="game-search-input">
            <Search size={20} className="shrink-0 text-pear" aria-hidden />
            <Input
              id="game-search-input"
              type="search"
              className="min-w-0"
              placeholder="ค้นหาชื่อเกม คำอธิบาย หรือรหัสเกม…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </label>
          <p className="m-0 font-label text-xs text-ink-2 sm:text-right" aria-live="polite">
            แสดง {filtered.length} จาก {games.length} เกม
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {filtered.map((game, index) => {
            const thumb = getCatalogThumb(game);
            return (
              <div
                key={game.id}
                className="flex min-h-full min-w-0 flex-col overflow-hidden rounded-card border border-rule bg-paper-2 transition duration-150 ease-out hover:border-rule-2 hover:bg-paper-3 motion-safe:hover:-translate-y-px"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 appearance-none flex-col items-stretch p-3 text-left font-body text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                  onClick={() =>
                    handleAction({
                      type: 'create',
                      gameId: game.id,
                      playerToken: createPlayerToken(),
                    })
                  }
                >
                  <div className="relative mb-4 flex aspect-4/3 h-auto w-full items-center justify-center overflow-hidden rounded-input bg-paper-3">
                    {thumb ? (
                      <img
                        className="h-full w-full object-cover"
                        src={thumb}
                        alt=""
                        draggable={false}
                      />
                    ) : (
                      <Gamepad2 size={48} strokeWidth={1.25} className="game-card-thumb-icon" />
                    )}
                    <span
                      className="absolute top-3 left-3 rounded-pill bg-paper-overlay px-2 py-1 font-label text-xs text-ink"
                      aria-hidden
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="block min-w-0 flex-1">
                    <h3 className="mt-0 mb-2 font-display text-base md:text-xl leading-[1.15] font-extrabold tracking-[-0.03em] text-ink">
                      {game.name}
                    </h3>
                    <p className="m-0 line-clamp-3 text-xs md:text-sm leading-6 text-ink-2">
                      {game.description}
                    </p>
                  </span>
                  <span className="mt-4 flex items-center justify-between gap-3 border-t border-rule pt-3">
                    <Badge
                      variant="accent"
                      size="sm"
                      className="border-rule! bg-paper-3! text-ink!"
                    >
                      <Users size={14} aria-hidden />
                      {game.minPlayers}-{game.maxPlayers} คน
                    </Badge>
                    <span className="font-label text-xs font-bold text-pear">เปิดห้อง</span>
                  </span>
                </button>
                <div className="border-t border-rule px-3 py-2">
                  <Link
                    to={`/games/${game.id}/leaderboard`}
                    className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-ink-2 no-underline hover:text-ink"
                  >
                    <Trophy size={16} aria-hidden />
                    อันดับ
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && games.length > 0 && (
          <p className="mt-10 rounded-card border border-dashed border-rule-2 bg-paper-2 p-10 text-center text-ink-2">
            ไม่พบเกมที่ตรงกับ &ldquo;{query}&rdquo;
          </p>
        )}
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
      />
    </div>
  );
}
