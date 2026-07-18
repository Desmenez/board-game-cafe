import { useEffect, useState } from 'react';
import type { Salem1692LobbyOptions } from 'shared';
import { defaultSalem1692LobbyOptions, parseSalem1692LobbyOptions } from 'shared';
import type { LobbyOptionsProps } from '../types';

export function Salem1692LobbyOptions({
  isHost,
  onChange,
  lobbyOptions,
  playerCount,
}: LobbyOptionsProps) {
  const initial = parseSalem1692LobbyOptions(lobbyOptions ?? defaultSalem1692LobbyOptions());
  const [twoTownHallChoice, setTwoTownHallChoice] = useState(initial.twoTownHallChoice);
  const canChooseTwo = (playerCount ?? 0) <= 7;

  useEffect(() => {
    if (isHost) return;
    setTwoTownHallChoice(parseSalem1692LobbyOptions(lobbyOptions).twoTownHallChoice);
  }, [isHost, lobbyOptions]);

  return (
    <div style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตั้งค่า Salem 1692' : 'ตั้งค่า Salem 1692 (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}
      <label
        className="flex items-center gap-2"
        style={{
          cursor: isHost && canChooseTwo ? 'pointer' : 'default',
          opacity: canChooseTwo ? 1 : 0.5,
        }}
      >
        <input
          type="checkbox"
          checked={twoTownHallChoice}
          disabled={!isHost || !canChooseTwo}
          onChange={(e) => {
            if (!isHost || !canChooseTwo) return;
            const next = e.target.checked;
            setTwoTownHallChoice(next);
            onChange({ twoTownHallChoice: next } satisfies Salem1692LobbyOptions);
          }}
        />
        <span>เลือก Town Hall 2 ใบ (≤7 คน — ตาม rulebook)</span>
      </label>
      {!canChooseTwo && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 8 }}>
          ตัวเลือกนี้ใช้ได้เมื่อมีผู้เล่นไม่เกิน 7 คน
        </p>
      )}
    </div>
  );
}
