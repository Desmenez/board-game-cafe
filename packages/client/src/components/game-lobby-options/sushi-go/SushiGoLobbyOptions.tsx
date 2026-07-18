import { useEffect, useState } from 'react';
import type { SushiGoLobbyOptions } from 'shared';
import { defaultSushiGoLobbyOptions, parseSushiGoLobbyOptions } from 'shared';
import type { LobbyOptionsProps } from '../types';

export function SushiGoLobbyOptions({ isHost, onChange, lobbyOptions }: LobbyOptionsProps) {
  const initial = parseSushiGoLobbyOptions(lobbyOptions ?? defaultSushiGoLobbyOptions());
  const [passBothWays, setPassBothWays] = useState(initial.passBothWays);

  useEffect(() => {
    if (isHost) return;
    setPassBothWays(parseSushiGoLobbyOptions(lobbyOptions).passBothWays);
  }, [isHost, lobbyOptions]);

  return (
    <div style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตั้งค่า Sushi Go!' : 'ตั้งค่า Sushi Go! (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}
      <label className="flex items-center gap-2" style={{ cursor: isHost ? 'pointer' : 'default' }}>
        <input
          type="checkbox"
          checked={passBothWays}
          disabled={!isHost}
          onChange={(e) => {
            if (!isHost) return;
            const next = e.target.checked;
            setPassBothWays(next);
            onChange({ passBothWays: next } satisfies SushiGoLobbyOptions);
          }}
        />
        <span>สลับทิศส่งมือ (รอบ 1,3 ซ้าย · รอบ 2 ขวา)</span>
      </label>
    </div>
  );
}
