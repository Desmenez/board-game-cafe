import { useEffect, useState } from 'react';
import type { SpyfallLobbyOptions as SpyfallOpts } from 'shared';
import {
  SPYFALL_ROUND_COUNT_OPTIONS,
  SPYFALL_ROUND_MINUTES_OPTIONS,
  defaultSpyfallLobbyOptions,
  parseSpyfallLobbyOptions,
} from 'shared';
import { Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

export function SpyfallLobbyOptions({ isHost, onChange, lobbyOptions }: LobbyOptionsProps) {
  const initial = parseSpyfallLobbyOptions(lobbyOptions ?? defaultSpyfallLobbyOptions());
  const [roundCount, setRoundCount] = useState(initial.roundCount);
  const [roundMinutes, setRoundMinutes] = useState(initial.roundMinutes);
  const [useRoles, setUseRoles] = useState(initial.useRoles);

  useEffect(() => {
    if (isHost) return;
    const next = parseSpyfallLobbyOptions(lobbyOptions);
    setRoundCount(next.roundCount);
    setRoundMinutes(next.roundMinutes);
    setUseRoles(next.useRoles);
  }, [isHost, lobbyOptions]);

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตั้งค่า Spyfall' : 'ตั้งค่า Spyfall (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 14 }}>
        จำนวนรอบ ระยะเวลาถาม-ตอบต่อรอบ และการใช้ role บนการ์ด
      </p>
      <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 14 }}>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">จำนวนรอบ</span>
          {isHost ? (
            <Select
              className="w-full"
              value={String(roundCount)}
              onChange={(e) => {
                const next = Number(e.target.value) as SpyfallOpts['roundCount'];
                setRoundCount(next);
                onChange({ roundCount: next, roundMinutes, useRoles });
              }}
            >
              {SPYFALL_ROUND_COUNT_OPTIONS.map((n) => (
                <option key={n} value={String(n)}>
                  {n} รอบ
                </option>
              ))}
            </Select>
          ) : (
            <span>{roundCount} รอบ</span>
          )}
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">เวลาต่อรอบ</span>
          {isHost ? (
            <Select
              className="w-full"
              value={String(roundMinutes)}
              onChange={(e) => {
                const next = Number(e.target.value) as SpyfallOpts['roundMinutes'];
                setRoundMinutes(next);
                onChange({ roundCount, roundMinutes: next, useRoles });
              }}
            >
              {SPYFALL_ROUND_MINUTES_OPTIONS.map((m) => (
                <option key={m} value={String(m)}>
                  {m} นาที
                </option>
              ))}
            </Select>
          ) : (
            <span>{roundMinutes} นาที</span>
          )}
        </label>
      </div>
      <label className="flex items-center gap-2" style={{ cursor: isHost ? 'pointer' : 'default' }}>
        <input
          type="checkbox"
          checked={useRoles}
          disabled={!isHost}
          onChange={(e) => {
            if (!isHost) return;
            const next = e.target.checked;
            setUseRoles(next);
            onChange({ roundCount, roundMinutes, useRoles: next });
          }}
        />
        <span>เล่นตาม role บนการ์ด (นอกจากสถานที่)</span>
      </label>
    </div>
  );
}
