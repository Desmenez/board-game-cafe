import { useEffect, useMemo, useState } from 'react';
import type { GameMeta } from 'shared';
import { getRoomPlayerCountError } from 'shared';
import { Gamepad2, Search, Users } from 'lucide-react';
import { Badge, Button, Dialog, DialogDescription, DialogTitle, Input } from './ui';
import { getCatalogThumb } from '../gameCatalogDisplay';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGameId: string;
  playerCount: number;
  changing: boolean;
  onSelect: (gameId: string) => void;
}

function normalizeSearch(s: string) {
  return s.trim().toLowerCase();
}

function playerFitLabel(game: GameMeta, playerCount: number): string {
  const err = getRoomPlayerCountError(playerCount, game.minPlayers, game.maxPlayers);
  if (!err) return 'พร้อมเล่น';
  if (playerCount < game.minPlayers) {
    return `ต้องเพิ่มอีก ${game.minPlayers - playerCount} คน`;
  }
  return `มากเกินไป ${playerCount - game.maxPlayers} คน`;
}

export function LobbyGamePicker({
  open,
  onOpenChange,
  currentGameId,
  playerCount,
  changing,
  onSelect,
}: Props) {
  const [games, setGames] = useState<GameMeta[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    fetch(`${SERVER_URL}/api/games`)
      .then((r) => r.json())
      .then(setGames)
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

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
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-2xl lobby-game-picker-dialog"
      aria-labelledby="lobby-game-picker-title"
      aria-describedby="lobby-game-picker-desc"
    >
      <DialogTitle id="lobby-game-picker-title">เปลี่ยนเกม</DialogTitle>
      <DialogDescription id="lobby-game-picker-desc">
        เลือกเกมใหม่สำหรับห้องนี้ — ผู้เล่นทุกคนจะเห็นการเปลี่ยนแปลงทันที
      </DialogDescription>

      <label className="lobby-game-picker-search" htmlFor="lobby-game-search">
        <Search size={18} className="lobby-game-picker-search-icon" aria-hidden />
        <Input
          id="lobby-game-search"
          type="search"
          placeholder="ค้นหาชื่อเกม…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </label>

      <div className="lobby-game-picker-grid" role="list">
        {filtered.map((game) => {
          const thumb = getCatalogThumb(game);
          const isCurrent = game.id === currentGameId;
          const fit = getRoomPlayerCountError(playerCount, game.minPlayers, game.maxPlayers);
          const fitLabel = playerFitLabel(game, playerCount);

          return (
            <button
              key={game.id}
              type="button"
              role="listitem"
              className={`card game-card lobby-game-picker-card${isCurrent ? ' is-current' : ''}`}
              disabled={changing || isCurrent}
              onClick={() => onSelect(game.id)}
            >
              <div className="game-card-thumb">
                {thumb ? (
                  <img src={thumb} alt="" loading="lazy" />
                ) : (
                  <Gamepad2 size={40} strokeWidth={1.25} className="game-card-thumb-icon" />
                )}
              </div>
              <h3>{game.name}</h3>
              <p>{game.description}</p>
              <div className="game-card-meta">
                <Badge variant="outline" size="sm">
                  <Users size={12} aria-hidden />
                  {game.minPlayers}–{game.maxPlayers}
                </Badge>
                <Badge variant={fit ? 'warning' : 'success'} size="sm">
                  {fitLabel}
                </Badge>
                {isCurrent && (
                  <Badge variant="warning" size="sm">
                    เกมปัจจุบัน
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="lobby-game-picker-empty">ไม่พบเกมที่ตรงกับคำค้น</p>
      )}

      <div className="lobby-game-picker-footer">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={changing}>
          ปิด
        </Button>
      </div>
    </Dialog>
  );
}
