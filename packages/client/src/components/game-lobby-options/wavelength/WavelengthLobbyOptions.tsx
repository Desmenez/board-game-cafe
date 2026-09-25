import { useEffect, useMemo, useState } from 'react';
import type { WavelengthLobbyOptions as WavelengthOpts, WavelengthPlayMode } from 'shared';
import { parseWavelengthLobbyOptions } from 'shared';
import { Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

export function WavelengthLobbyOptions({ isHost, onChange, lobbyOptions }: LobbyOptionsProps) {
  const initial = useMemo(() => parseWavelengthLobbyOptions(lobbyOptions), [lobbyOptions]);
  const [mode, setMode] = useState<WavelengthPlayMode>(initial.mode);

  useEffect(() => {
    if (isHost) return;
    setMode(parseWavelengthLobbyOptions(lobbyOptions).mode);
  }, [isHost, lobbyOptions]);

  const emit = (next: WavelengthPlayMode) => {
    const options: WavelengthOpts = { mode: next };
    setMode(next);
    if (isHost) onChange(options);
  };

  return (
    <div style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตั้งค่า Wavelength' : 'ตั้งค่า Wavelength (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 14 }}>
        ทีมแข่งถึง 10 แต้ม หรือผลัดกันใบ้กับคนถัดไป แล้วแชร์คะแนนถ้าเข็มเข้าโซน
      </p>
      <Select
        label="รูปแบบการเล่น"
        disabled={!isHost}
        value={mode}
        onChange={(e) => {
          emit(e.target.value === 'pairs' ? 'pairs' : 'teams');
        }}
      >
        <option value="teams">ทีม — ส้มกับม่วง ฝั่งตรงข้ามทายซ้าย/ขวา (4–12 คน)</option>
        <option value="pairs">
          ผลัดกัน — คนถัดไปหมุนเข็ม คนใบ้กับคนทายได้คะแนนเท่ากัน (2–12 คน)
        </option>
      </Select>
    </div>
  );
}
