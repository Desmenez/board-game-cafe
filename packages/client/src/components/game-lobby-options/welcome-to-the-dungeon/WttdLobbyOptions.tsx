import { useEffect, useState } from 'react';
import type { WttdHeroPickMode, WttdLobbyOptions as WttdOpts } from 'shared';
import { WTTD_HERO_PICK_MODES } from 'shared';
import { Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

const DEFAULTS: WttdOpts = { heroPickMode: 'normal' };

const MODE_LABEL: Record<WttdHeroPickMode, string> = {
  normal: 'ปกติ — เลือกแล้วสุ่มแก้ชน (ไม่ซ้ำ)',
  random_unique: 'สุ่มฮีโร่ไม่ซ้ำทันที',
  same_host: 'ฮีโร่เหมือนกัน — หัวห้องเลือกหรือสุ่ม',
  free: 'อิสระ — เลือกซ้ำกันได้',
};

function optsFromUnknown(opts: unknown): WttdOpts {
  let heroPickMode: WttdHeroPickMode = DEFAULTS.heroPickMode;
  if (opts && typeof opts === 'object') {
    const m = (opts as Record<string, unknown>).heroPickMode;
    if (typeof m === 'string' && (WTTD_HERO_PICK_MODES as readonly string[]).includes(m)) {
      heroPickMode = m as WttdHeroPickMode;
    }
  }
  return { heroPickMode };
}

export function WttdLobbyOptions({ isHost, onChange, lobbyOptions }: LobbyOptionsProps) {
  const initial = optsFromUnknown(lobbyOptions);
  const [heroPickMode, setHeroPickMode] = useState<WttdHeroPickMode>(initial.heroPickMode);

  useEffect(() => {
    if (isHost) return;
    setHeroPickMode(optsFromUnknown(lobbyOptions).heroPickMode);
  }, [isHost, lobbyOptions]);

  useEffect(() => {
    if (!isHost) return;
    onChange({ heroPickMode });
  }, [isHost, onChange, heroPickMode]);

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>Welcome to the Dungeon — โหมดฮีโร่</h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 14 }}>
        กำหนดว่าจะเลือกฮีโร่อย่างไรหลังเริ่มเกม (การ์ดกลางโต๊ะ / สุ่ม / หัวห้องตัดสิน)
      </p>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">โหมด</span>
        {isHost ? (
          <Select
            className="w-full"
            value={heroPickMode}
            onChange={(e) => setHeroPickMode(e.target.value as WttdHeroPickMode)}
          >
            {WTTD_HERO_PICK_MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABEL[m]}
              </option>
            ))}
          </Select>
        ) : (
          <span>{MODE_LABEL[heroPickMode]}</span>
        )}
      </label>
    </div>
  );
}
