import { useEffect, useState } from 'react';
import type {
  ExplodingKittensExpansionId,
  ExplodingKittensExpansionsEnabled,
  ExplodingKittensMode,
} from 'shared';
import { countEnabledExpansions, parseExplodingKittensLobbyOptions } from 'shared';
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

const expansionList: {
  id: ExplodingKittensExpansionId;
  title: string;
  subtitle: string;
}[] = [
  { id: 'barking', title: 'Barking Kittens', subtitle: 'Expansion' },
  { id: 'streaking', title: 'Streaking Kittens', subtitle: 'Expansion' },
  { id: 'imploding', title: 'Imploding Kittens', subtitle: 'Expansion' },
];

export function ExplodingKittensLobbyOptions({
  isHost,
  onChange,
  lobbyOptions,
}: LobbyOptionsProps) {
  const [selectedMode, setSelectedMode] = useState<ExplodingKittensMode>(
    () => parseExplodingKittensLobbyOptions(lobbyOptions).mode,
  );
  const [expansions, setExpansions] = useState<ExplodingKittensExpansionsEnabled>(
    () => parseExplodingKittensLobbyOptions(lobbyOptions).expansions,
  );

  useEffect(() => {
    if (isHost) return;
    const { mode, expansions: next } = parseExplodingKittensLobbyOptions(lobbyOptions);
    setSelectedMode(mode);
    setExpansions(next);
  }, [isHost, lobbyOptions]);

  useEffect(() => {
    if (!isHost) return;
    onChange({ mode: selectedMode, expansions });
  }, [isHost, selectedMode, expansions, onChange]);

  const expansionCount = countEnabledExpansions(expansions);

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

      <div className="ek-expansion-block">
        <h4 className="ek-expansion-heading">
          {isHost ? 'Expansion (เลือกได้หลายกล่อง)' : 'Expansion (ตั้งโดยหัวห้อง)'}
        </h4>
        <p className="ek-expansion-lead">
          Barking Kittens: การ์ดและกฎหลักพร้อมในเกม — expansion อื่นยังไม่มีการ์ด
        </p>
        <ul className="ek-expansion-list">
          {expansionList.map(({ id, title, subtitle }) => (
            <li key={id}>
              {isHost ? (
                <label className="ek-expansion-row">
                  <input
                    type="checkbox"
                    checked={expansions[id]}
                    onChange={() => setExpansions((prev) => ({ ...prev, [id]: !prev[id] }))}
                  />
                  <span className="ek-expansion-row-text">
                    <span className="ek-expansion-row-title">{title}</span>
                    <span className="ek-expansion-row-sub">{subtitle}</span>
                  </span>
                </label>
              ) : (
                <div
                  className={`ek-expansion-row ek-expansion-row--readonly ${expansions[id] ? 'is-on' : ''}`}
                >
                  <span className="ek-expansion-pill" aria-hidden>
                    {expansions[id] ? 'เปิด' : 'ปิด'}
                  </span>
                  <span className="ek-expansion-row-text">
                    <span className="ek-expansion-row-title">{title}</span>
                    <span className="ek-expansion-row-sub">{subtitle}</span>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>

        {expansionCount >= 1 && (
          <div className="ek-expansion-warn ek-expansion-warn--info" role="status">
            <strong>สมดุล:</strong> เมื่อใส่การ์ด expansion จริง
            สำรับจะหนาขึ้นและเกมมักใช้เวลานานขึ้น
          </div>
        )}
        {expansionCount >= 2 && (
          <div className="ek-expansion-warn ek-expansion-warn--strong" role="status">
            เปิดหลาย expansion พร้อมกัน — กฎซ้อนกันและจั่วนานขึ้น แนะนำให้โต๊ะคุ้นเคยกติกาก่อน
          </div>
        )}
      </div>
    </div>
  );
}
