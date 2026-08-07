import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ExplodingKittensExpansionId,
  ExplodingKittensExpansionsEnabled,
  ExplodingKittensMode,
} from 'shared';
import {
  clampEkDeckCopies,
  countEnabledExpansions,
  EK_DECK_COPIES_MAX,
  EK_DECK_COPIES_MIN,
  explodingKittensDeckPreview,
  parseExplodingKittensLobbyOptions,
  suggestedEkDeckCopies,
} from 'shared';
import { Button } from '../../ui';
import type { LobbyOptionsProps } from '../types';
import { CARD_IMAGE, CARD_LABEL } from '../../../games/exploding-kittens/lib/cardMeta';
import '../../../games/exploding-kittens/exploding-kittens.css';

const modeMeta: Record<ExplodingKittensMode, { title: string; subtitle: string }> = {
  original: {
    title: 'Original Edition',
    subtitle: 'กติกาคลาสสิก เล่นง่ายสุด',
  },
  party_pack: {
    title: 'Party Pack Edition',
    subtitle: 'โหมดใหญ่ การ์ดใหม่หลากหลาย',
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

const DECK_COPY_OPTIONS = Array.from(
  { length: EK_DECK_COPIES_MAX - EK_DECK_COPIES_MIN + 1 },
  (_, i) => EK_DECK_COPIES_MIN + i,
);

export function ExplodingKittensLobbyOptions({
  isHost,
  onChange,
  lobbyOptions,
  playerCount = 0,
}: LobbyOptionsProps) {
  const parsedInit = parseExplodingKittensLobbyOptions(lobbyOptions);
  const [selectedMode, setSelectedMode] = useState<ExplodingKittensMode>(() => parsedInit.mode);
  const [expansions, setExpansions] = useState<ExplodingKittensExpansionsEnabled>(
    () => parsedInit.expansions,
  );
  const [deckCopies, setDeckCopies] = useState(() => parsedInit.deckCopies);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (isHost) return;
    const { mode, expansions: next, deckCopies: nextCopies } =
      parseExplodingKittensLobbyOptions(lobbyOptions);
    setSelectedMode(mode);
    setExpansions(next);
    setDeckCopies(nextCopies);
  }, [isHost, lobbyOptions]);

  useEffect(() => {
    if (!isHost) return;
    onChangeRef.current({ mode: selectedMode, expansions, deckCopies });
  }, [isHost, selectedMode, expansions, deckCopies]);

  const expansionCount = countEnabledExpansions(expansions);
  const suggestedCopies = suggestedEkDeckCopies(playerCount);
  const deckPreview = useMemo(
    () => explodingKittensDeckPreview(selectedMode, expansions, playerCount, deckCopies),
    [selectedMode, expansions, playerCount, deckCopies],
  );
  const roomPlayers = Math.max(2, playerCount || 2);

  return (
    <div className="ek-mode-selector-card">
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

      <div className="ek-deck-copies-block">
        <h4 className="ek-expansion-heading">
          {isHost ? 'ทบสำรับฐาน' : 'ทบสำรับฐาน (ตั้งโดยหัวห้อง)'}
        </h4>
        <p className="ek-expansion-lead">
          คูณชุดการ์ดฐานของโหมด (Attack, Skip, แมว ฯลฯ) — ไม่สเกลอัตโนมัติตามจำนวนคน
          {suggestedCopies > 1
            ? ` · แนะนำ ×${suggestedCopies} สำหรับโต๊ะประมาณ ${roomPlayers} คน`
            : ''}
        </p>
        {isHost ? (
          <div className="ek-deck-copies-controls" role="group" aria-label="จำนวนชุดสำรับ">
            <Button
              type="button"
              variant="secondary"
              disabled={deckCopies <= EK_DECK_COPIES_MIN}
              onClick={() => setDeckCopies((c) => clampEkDeckCopies(c - 1))}
              aria-label="ลดจำนวนชุด"
            >
              −
            </Button>
            <div className="ek-deck-copies-value" aria-live="polite">
              ×{deckCopies}
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={deckCopies >= EK_DECK_COPIES_MAX}
              onClick={() => setDeckCopies((c) => clampEkDeckCopies(c + 1))}
              aria-label="เพิ่มจำนวนชุด"
            >
              +
            </Button>
            <div className="ek-deck-copies-presets">
              {DECK_COPY_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`ek-deck-copies-chip ${deckCopies === n ? 'selected' : ''}`}
                  onClick={() => setDeckCopies(n)}
                >
                  ×{n}
                </button>
              ))}
            </div>
            {suggestedCopies !== deckCopies && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeckCopies(suggestedCopies)}
              >
                ใช้ค่าแนะนำ ×{suggestedCopies}
              </Button>
            )}
          </div>
        ) : (
          <p className="ek-deck-copies-readonly">สำรับฐาน ×{deckCopies}</p>
        )}
      </div>

      <div className="ek-expansion-block">
        <h4 className="ek-expansion-heading">
          {isHost ? 'Expansion (เลือกได้หลายกล่อง)' : 'Expansion (ตั้งโดยหัวห้อง)'}
        </h4>
        <p className="ek-expansion-lead">
          Barking + Streaking: การ์ดและกฎหลักพร้อมในเกม — Imploding ยังไม่มีการ์ด
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

      <div className="ek-mode-deck-preview">
        <p className="ek-mode-cards-label">การ์ดในสำรับ (ตามโหมด + ทบสำรับ + expansion)</p>
        <p className="ek-mode-cards-meta">
          รวม {deckPreview.total} ใบ · สำรับฐาน ×{deckCopies} · Defuse/EK คิดจาก {roomPlayers} คนในห้อง
        </p>
        <div className="ek-mode-card-grid" role="list">
          {deckPreview.entries.map(({ type, count }) => (
            <div key={type} className="ek-mode-card-tile" role="listitem" title={CARD_LABEL[type]}>
              <div className="ek-mode-card-art">
                <img src={CARD_IMAGE[type]} alt="" />
                <span className="ek-mode-card-count" aria-label={`จำนวน ${count}`}>
                  ×{count}
                </span>
              </div>
              <span className="ek-mode-card-name">{CARD_LABEL[type]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
