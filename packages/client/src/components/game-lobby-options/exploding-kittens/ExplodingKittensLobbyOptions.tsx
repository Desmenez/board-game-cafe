import { useEffect, useState } from 'react';
import type { ExplodingKittensMode } from 'shared';
import type { LobbyOptionsProps } from '../types';
import '../../../games/exploding-kittens/exploding-kittens.css';

const modeMeta: Record<ExplodingKittensMode, { title: string; subtitle: string; cards: string[] }> =
  {
    original: {
      title: 'Original Edition',
      subtitle: 'กติกาคลาสสิก เล่นง่ายสุด',
      cards: ['Attack', 'Skip', 'Shuffle', 'See the Future', 'Favor', 'Nope', 'Cat cards 5 ชนิด'],
    },
    party_pack: {
      title: 'Party Pack Edition',
      subtitle: 'โหมดใหญ่ การ์ดใหม่หลากหลาย',
      cards: [
        'Attack + Targeted Attack',
        'Skip',
        'Shuffle',
        'See the Future + Alter the Future',
        'Draw from the Bottom',
        'Favor',
        'Nope',
        'Feral Cat + Cat cards 5 ชนิด',
      ],
    },
  };

function modeFromOpts(opts: unknown): ExplodingKittensMode | null {
  if (opts && typeof opts === 'object' && 'mode' in opts) {
    const m = (opts as { mode: string }).mode;
    if (m === 'original' || m === 'party_pack') return m;
  }
  return null;
}

export function ExplodingKittensLobbyOptions({
  isHost,
  onChange,
  lobbyOptions,
}: LobbyOptionsProps) {
  const [selectedMode, setSelectedMode] = useState<ExplodingKittensMode>(
    () => modeFromOpts(lobbyOptions) ?? 'original',
  );

  useEffect(() => {
    if (isHost) return;
    const m = modeFromOpts(lobbyOptions);
    if (m) setSelectedMode(m);
  }, [isHost, lobbyOptions]);

  useEffect(() => {
    if (!isHost) return;
    onChange({ mode: selectedMode });
  }, [isHost, selectedMode, onChange]);

  return (
    <div className="card ek-mode-selector-card">
      <h3 style={{ marginBottom: 10 }}>
        {isHost ? 'เลือกโหมด Exploding Kittens' : 'โหมด Exploding Kittens (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนโหมดได้
        </p>
      )}
      <div className="ek-mode-grid">
        {(Object.keys(modeMeta) as ExplodingKittensMode[]).map((mode) =>
          isHost ? (
            <button
              key={mode}
              type="button"
              className={`ek-mode-option ${selectedMode === mode ? 'selected' : ''}`}
              onClick={() => setSelectedMode(mode)}
            >
              <div className="ek-mode-option-title">{modeMeta[mode].title}</div>
              <div className="ek-mode-option-subtitle">{modeMeta[mode].subtitle}</div>
            </button>
          ) : (
            <div
              key={mode}
              className={`ek-mode-option ek-mode-option--readonly ${selectedMode === mode ? 'selected' : ''}`}
              aria-current={selectedMode === mode ? 'true' : undefined}
            >
              <div className="ek-mode-option-title">{modeMeta[mode].title}</div>
              <div className="ek-mode-option-subtitle">{modeMeta[mode].subtitle}</div>
            </div>
          ),
        )}
      </div>
      <p className="ek-mode-cards-label">การ์ดที่ใช้ในโหมดนี้</p>
      <div className="ek-mode-chip-list">
        {modeMeta[selectedMode].cards.map((item) => (
          <span key={item} className="quest-history-chip">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
