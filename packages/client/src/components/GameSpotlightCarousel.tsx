import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameMeta } from 'shared';
import { ChevronLeft, ChevronRight, Gamepad2, Users } from 'lucide-react';
import { Badge } from './ui';
import { getCatalogThumb } from '../gameCatalogDisplay';

function pickSpotlightGames(games: GameMeta[], count: number): GameMeta[] {
  if (games.length <= count) return [...games];
  const shuffled = [...games];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

interface GameSpotlightCarouselProps {
  games: GameMeta[];
  onPickGame: (game: GameMeta) => void;
  autoAdvanceMs?: number;
}

export function GameSpotlightCarousel({
  games,
  onPickGame,
  autoAdvanceMs = 5200,
}: GameSpotlightCarouselProps) {
  const spotlight = useMemo(() => pickSpotlightGames(games, 5), [games]);
  const [index, setIndex] = useState(0);
  const len = spotlight.length;

  const go = useCallback(
    (delta: number) => {
      if (len === 0) return;
      setIndex((i) => (i + delta + len) % len);
    },
    [len],
  );

  useEffect(() => {
    setIndex(0);
  }, [spotlight]);

  useEffect(() => {
    if (len <= 1) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % len);
    }, autoAdvanceMs);
    return () => window.clearInterval(id);
  }, [len, autoAdvanceMs]);

  if (len === 0) {
    return (
      <div className="spotlight-empty card">
        <p className="text-white">กำลังโหลดรายการเกม…</p>
      </div>
    );
  }

  return (
    <div className="spotlight-carousel" aria-roledescription="carousel" aria-label="เกมแนะนำ">
      <div className="spotlight-carousel-frame">
        <div
          className="spotlight-carousel-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {spotlight.map((game, slideIndex) => {
            const thumb = getCatalogThumb(game);
            return (
              <article
                key={game.id}
                className="spotlight-slide card"
                aria-hidden={slideIndex !== index}
                onClick={() => onPickGame(game)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPickGame(game);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="spotlight-slide-inner">
                  <div className="spotlight-thumb">
                    {thumb ? (
                      <img src={thumb} alt="" />
                    ) : (
                      <Gamepad2 size={56} strokeWidth={1.25} className="spotlight-thumb-fallback" />
                    )}
                  </div>
                  <div className="spotlight-copy">
                    <h3>{game.name}</h3>
                    <p className="spotlight-desc">{game.description}</p>
                    <div className="spotlight-meta">
                      <Badge variant="accent" size="sm" className="spotlight-players-badge">
                        <Users size={14} aria-hidden />
                        {game.minPlayers}-{game.maxPlayers} คน
                      </Badge>
                    </div>
                    <p className="spotlight-cta-hint">กดเพื่อสร้างห้อง</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {len > 1 && (
          <>
            <button
              type="button"
              className="spotlight-nav spotlight-nav-prev"
              aria-label="สไลด์ก่อนหน้า"
              onClick={() => go(-1)}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className="spotlight-nav spotlight-nav-next"
              aria-label="สไลด์ถัดไป"
              onClick={() => go(1)}
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {len > 1 && (
        <div className="spotlight-dots" role="tablist" aria-label="เลือกสไลด์">
          {spotlight.map((game, i) => (
            <button
              key={game.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`แสดง ${game.name}`}
              className={`spotlight-dot${i === index ? ' is-active' : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
