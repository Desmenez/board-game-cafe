import { useEffect, useMemo, useState } from 'react';
import type { FugitiveLobbyOptions } from 'shared';
import { parseFugitiveLobbyOptions } from 'shared';
import { Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

function emitOptions(onChange: LobbyOptionsProps['onChange'], next: FugitiveLobbyOptions): void {
  onChange(next);
}

export function FugitiveLobbyOptions({
  isHost,
  onChange,
  lobbyOptions,
  players = [],
}: LobbyOptionsProps) {
  const initial = useMemo(() => parseFugitiveLobbyOptions(lobbyOptions), [lobbyOptions]);
  const [fugitiveMode, setFugitiveMode] = useState<'random' | 'manual'>(initial.fugitiveMode);
  const [fugitivePlayerId, setFugitivePlayerId] = useState(initial.fugitivePlayerId ?? '');

  useEffect(() => {
    if (isHost) return;
    const next = parseFugitiveLobbyOptions(lobbyOptions);
    setFugitiveMode(next.fugitiveMode);
    setFugitivePlayerId(next.fugitivePlayerId ?? '');
  }, [isHost, lobbyOptions]);

  const build = (overrides: Partial<FugitiveLobbyOptions> = {}): FugitiveLobbyOptions => {
    const mode = overrides.fugitiveMode ?? fugitiveMode;
    const playerId =
      overrides.fugitivePlayerId !== undefined ? overrides.fugitivePlayerId : fugitivePlayerId;
    return {
      fugitiveMode: mode,
      fugitivePlayerId: mode === 'manual' ? playerId || undefined : undefined,
    };
  };

  return (
    <div style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตั้งค่า Fugitive' : 'ตั้งค่า Fugitive (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          <span style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem' }}>Fugitive</span>
          <Select
            disabled={!isHost}
            value={fugitiveMode}
            onChange={(e) => {
              const v = e.target.value === 'manual' ? 'manual' : 'random';
              setFugitiveMode(v);
              if (v === 'random') setFugitivePlayerId('');
              if (isHost)
                emitOptions(onChange, build({ fugitiveMode: v, fugitivePlayerId: undefined }));
            }}
          >
            <option value="random">สุ่มเมื่อเริ่มเกม</option>
            <option value="manual">เลือกผู้เล่น (ต้องมี 2 คนในห้อง)</option>
          </Select>
        </label>

        {fugitiveMode === 'manual' && (
          <label>
            <span style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem' }}>
              ผู้เล่น Fugitive
            </span>
            <Select
              disabled={!isHost || players.length === 0}
              value={fugitivePlayerId}
              onChange={(e) => {
                const id = e.target.value;
                setFugitivePlayerId(id);
                if (isHost) {
                  emitOptions(onChange, build({ fugitivePlayerId: id || undefined }));
                }
              }}
            >
              <option value="">— เลือกผู้เล่น —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>
    </div>
  );
}
