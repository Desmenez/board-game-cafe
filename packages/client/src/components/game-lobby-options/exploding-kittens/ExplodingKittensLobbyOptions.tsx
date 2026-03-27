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

export function ExplodingKittensLobbyOptions({ onChange }: LobbyOptionsProps) {
  const [selectedMode, setSelectedMode] = useState<ExplodingKittensMode>('original');

  useEffect(() => {
    onChange({ mode: selectedMode });
  }, [selectedMode, onChange]);

  return (
    <div className="card ek-mode-selector-card">
      <h3 style={{ marginBottom: 10 }}>เลือกโหมด Exploding Kittens</h3>
      <div className="ek-mode-grid">
        {(Object.keys(modeMeta) as ExplodingKittensMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`ek-mode-option ${selectedMode === mode ? 'selected' : ''}`}
            onClick={() => setSelectedMode(mode)}
          >
            <div className="ek-mode-option-title">{modeMeta[mode].title}</div>
            <div className="ek-mode-option-subtitle">{modeMeta[mode].subtitle}</div>
          </button>
        ))}
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
