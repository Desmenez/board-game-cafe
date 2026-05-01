import { useEffect, useState } from 'react';
import type { WttdHeroPickMode, WttdLobbyOptions as WttdOpts } from 'shared';
import { WTTD_HERO_PICK_MODES } from 'shared';
import { Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

const DEFAULTS: WttdOpts = { heroPickMode: 'choose' };

const MODE_LABEL: Record<WttdHeroPickMode, string> = {
  random: 'สุ่มฮีโร่ — ทั้งโต๊ะได้คลาสเดียวกันทันที',
  choose:
    'เลือกฮีโร่ — ทุกคนเลือกคลาสที่อยากได้ ถ้าไม่ตรงกันจะสุ่มจากคลาสที่มีคนเลือก แล้วทุกคนใช้คลาสนั้นร่วมกัน',
};

const LEGACY_HERO_MODE: Record<string, WttdHeroPickMode> = {
  normal: 'choose',
  free: 'choose',
  random_unique: 'random',
  same_host: 'random',
};

function optsFromUnknown(opts: unknown): WttdOpts {
  let heroPickMode: WttdHeroPickMode = DEFAULTS.heroPickMode;
  if (opts && typeof opts === 'object') {
    const m = (opts as Record<string, unknown>).heroPickMode;
    if (typeof m === 'string') {
      if ((WTTD_HERO_PICK_MODES as readonly string[]).includes(m)) {
        heroPickMode = m as WttdHeroPickMode;
      } else {
        const legacy = LEGACY_HERO_MODE[m];
        if (legacy) heroPickMode = legacy;
      }
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
        ทุกคนใช้ฮีโร่คลาสเดียวกันเสมอ — เลือกว่าจะสุ่มตั้งแต่ต้นหรือให้ทุกคนโหวตแล้วสุ่มเมื่อไม่ตรงกัน
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
