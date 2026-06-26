import { useEffect, useMemo, useState } from 'react';
import type { LoveLetterEdition, LoveLetterLobbyOptions as LoveLetterLobbyOptionsType } from 'shared';
import { loveLetterEditionPlayerBounds, parseLoveLetterLobbyOptions } from 'shared';
import { Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

function emitOptions(
  onChange: LobbyOptionsProps['onChange'],
  next: LoveLetterLobbyOptionsType,
): void {
  onChange(next);
}

export function LoveLetterLobbyOptions({
  isHost,
  onChange,
  lobbyOptions,
  playerCount = 0,
}: LobbyOptionsProps) {
  const initial = useMemo(() => parseLoveLetterLobbyOptions(lobbyOptions), [lobbyOptions]);
  const [edition, setEdition] = useState<LoveLetterEdition>(initial.edition);

  useEffect(() => {
    if (isHost) return;
    setEdition(parseLoveLetterLobbyOptions(lobbyOptions).edition);
  }, [isHost, lobbyOptions]);

  const bounds = loveLetterEditionPlayerBounds(edition);
  const classicOverCapacity = edition === 'classic' && playerCount > bounds.max;
  const classicUnderCapacity = edition === 'classic' && playerCount > 0 && playerCount < bounds.min;

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตั้งค่า Love Letter' : 'ตั้งค่า Love Letter (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          <span style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem' }}>โหมดเกม</span>
          <Select
            disabled={!isHost}
            value={edition}
            onChange={(e) => {
              const v = e.target.value === 'premium' ? 'premium' : 'classic';
              setEdition(v);
              if (isHost) emitOptions(onChange, { edition: v });
            }}
          >
            <option value="classic">Classic — 2–4 คน, 16 การ์ด</option>
            <option value="premium">Premium — 5–8 คน, 32 การ์ด (เร็วๆ นี้)</option>
          </Select>
        </label>

        {edition === 'classic' ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            ชนะเมื่อได้โทเคนครบตามจำนวนผู้เล่น (2 คน = 7, 3 คน = 5, 4 คน = 4)
          </p>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            โหมด Premium ยังเล่นไม่ได้ — รออัปเดต
          </p>
        )}

        {classicOverCapacity ? (
          <p style={{ color: 'var(--warning, #c9a227)', fontSize: '0.85rem', margin: 0 }}>
            Classic รองรับสูงสุด {bounds.max} คน — ตอนนี้มี {playerCount} คนในห้อง
          </p>
        ) : null}

        {classicUnderCapacity ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Classic ต้องมีอย่างน้อย {bounds.min} คน (ตอนนี้มี {playerCount} คน)
          </p>
        ) : null}

        {edition === 'premium' ? (
          <p style={{ color: 'var(--warning, #c9a227)', fontSize: '0.85rem', margin: 0 }}>
            ยังไม่สามารถเริ่มเกมโหมด Premium ได้ — เลือก Classic เพื่อเล่นตอนนี้
          </p>
        ) : null}
      </div>
    </div>
  );
}
