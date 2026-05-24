import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GameMeta } from 'shared';
import type { SocketState } from '../types';
import { ArrowLeft, Gamepad2, Search, Users } from 'lucide-react';
import { Badge, Input } from '../components/ui';
import { PlayerNameModal } from '../components/PlayerNameModal';
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
    showNameModal,
    setShowNameModal,
    nameModalError,
    clearNameModalError,
    loading,
    handleAction,
    handleNameSubmit,
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
    <div className="page container games-catalog-page">
      <header className="games-catalog-header">
        <Link to="/" className="games-catalog-back link-back-board">
          <ArrowLeft size={20} aria-hidden />
          กลับหน้าแรก
        </Link>
        <div className="games-catalog-hero">
          <h1>คลังเกมทั้งหมด</h1>
          <p>ค้นหาชื่อเกม แล้วกดการ์ดเพื่อเปิดห้องใหม่</p>
        </div>
      </header>

      <div className="games-catalog-toolbar card">
        <label className="games-catalog-search" htmlFor="game-search-input">
          <Search size={20} className="games-catalog-search-icon" aria-hidden />
          <Input
            id="game-search-input"
            type="search"
            className="games-catalog-search-input"
            placeholder="ค้นหาชื่อเกม…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </label>
        {query && (
          <p className="games-catalog-count">
            พบ {filtered.length} เกม
            {filtered.length !== games.length ? ` จากทั้งหมด ${games.length}` : ''}
          </p>
        )}
      </div>

      <div className="game-grid games-catalog-grid">
        {filtered.map((game) => {
          const thumb = getCatalogThumb(game);
          return (
            <div
              key={game.id}
              className="card game-card games-catalog-card"
              onClick={() =>
                handleAction({ type: 'create', gameId: game.id, playerToken: createPlayerToken() })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleAction({
                    type: 'create',
                    gameId: game.id,
                    playerToken: createPlayerToken(),
                  });
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="game-card-thumb">
                {thumb ? (
                  <img src={thumb} alt="" />
                ) : (
                  <Gamepad2 size={48} strokeWidth={1.25} className="game-card-thumb-icon" />
                )}
              </div>
              <h3>{game.name}</h3>
              <p className="line-clamp-3">{game.description}</p>
              <div className="game-card-meta">
                <Badge variant="accent" size="sm" className="spotlight-players-badge">
                  <Users size={14} aria-hidden />
                  {game.minPlayers}-{game.maxPlayers} คน
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && games.length > 0 && (
        <p className="games-catalog-empty">ไม่พบเกมที่ตรงกับ &ldquo;{query}&rdquo;</p>
      )}

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
