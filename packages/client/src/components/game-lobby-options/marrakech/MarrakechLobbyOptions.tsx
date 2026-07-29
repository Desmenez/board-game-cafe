import { useEffect, useMemo, useState } from 'react';
import type { MarrakechDirectionMode, MarrakechLobbyOptions } from 'shared';
import { parseMarrakechLobbyOptions } from 'shared';
import { Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

export function MarrakechLobbyOptions({ isHost, onChange, lobbyOptions }: LobbyOptionsProps) {
  const initial = useMemo(() => parseMarrakechLobbyOptions(lobbyOptions), [lobbyOptions]);
  const [directionMode, setDirectionMode] = useState<MarrakechDirectionMode>(initial.directionMode);

  useEffect(() => {
    if (isHost) return;
    setDirectionMode(parseMarrakechLobbyOptions(lobbyOptions).directionMode);
  }, [isHost, lobbyOptions]);

  return (
    <div style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตั้งค่า Marrakech' : 'ตั้งค่า Marrakech (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}

      <label>
        <span style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem' }}>
          ใครเลือกทิศทาง Assam
        </span>
        <Select
          disabled={!isHost}
          value={directionMode}
          onChange={(e) => {
            const v: MarrakechDirectionMode =
              e.target.value === 'previous-player' ? 'previous-player' : 'self';
            setDirectionMode(v);
            if (isHost) {
              const next: MarrakechLobbyOptions = { directionMode: v };
              onChange(next);
            }
          }}
        >
          <option value="self">ผู้เล่นในตาเลือกเอง (กฎมาตรฐาน)</option>
          <option value="previous-player">ผู้เล่นก่อนหน้าตั้งทิศทางให้คนถัดไป</option>
        </Select>
      </label>
    </div>
  );
}
