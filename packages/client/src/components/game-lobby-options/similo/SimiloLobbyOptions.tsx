import { useEffect, useMemo, useState } from 'react';
import type { SimiloGameMode, SimiloLobbyOptions } from 'shared';
import { parseSimiloLobbyOptions } from 'shared';
import { Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

function emitOptions(onChange: LobbyOptionsProps['onChange'], next: SimiloLobbyOptions): void {
  onChange(next);
}

export function SimiloLobbyOptions({
  isHost,
  onChange,
  lobbyOptions,
  players = [],
}: LobbyOptionsProps) {
  const initial = useMemo(() => parseSimiloLobbyOptions(lobbyOptions), [lobbyOptions]);
  const [clueGiverMode, setClueGiverMode] = useState<'random' | 'manual'>(initial.clueGiverMode);
  const [clueGiverPlayerId, setClueGiverPlayerId] = useState(initial.clueGiverPlayerId ?? '');
  const [gameMode, setGameMode] = useState<SimiloGameMode>(initial.gameMode);

  useEffect(() => {
    if (isHost) return;
    const next = parseSimiloLobbyOptions(lobbyOptions);
    setClueGiverMode(next.clueGiverMode);
    setClueGiverPlayerId(next.clueGiverPlayerId ?? '');
    setGameMode(next.gameMode);
  }, [isHost, lobbyOptions]);

  const build = (overrides: Partial<SimiloLobbyOptions> = {}): SimiloLobbyOptions => {
    const mode = overrides.clueGiverMode ?? clueGiverMode;
    const playerId =
      overrides.clueGiverPlayerId !== undefined ? overrides.clueGiverPlayerId : clueGiverPlayerId;
    return {
      clueGiverMode: mode,
      clueGiverPlayerId: mode === 'manual' ? playerId || undefined : undefined,
      gameMode: overrides.gameMode ?? gameMode,
    };
  };

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตั้งค่า Similo' : 'ตั้งค่า Similo (ตั้งโดยหัวห้อง)'}
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
            value={gameMode}
            onChange={(e) => {
              const v = e.target.value === 'competitive' ? 'competitive' : 'team';
              setGameMode(v);
              if (isHost) emitOptions(onChange, build({ gameMode: v }));
            }}
          >
            <option value="team">ทีม — เลือกชุดการ์ดร่วมกัน (1→4→1 ใบ/รอบ) ชนะ/แพ้หมด</option>
            <option value="competitive">แข่งขัน — ทายผิดถูกคัดออก</option>
          </Select>
        </label>

        <label>
          <span style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem' }}>Clue Giver</span>
          <Select
            disabled={!isHost}
            value={clueGiverMode}
            onChange={(e) => {
              const v = e.target.value === 'manual' ? 'manual' : 'random';
              setClueGiverMode(v);
              if (v === 'random') setClueGiverPlayerId('');
              if (isHost)
                emitOptions(onChange, build({ clueGiverMode: v, clueGiverPlayerId: undefined }));
            }}
          >
            <option value="random">สุ่มเมื่อเริ่มเกม</option>
            <option value="manual">เลือกผู้เล่น (ต้องมีรายชื่อในห้อง)</option>
          </Select>
        </label>

        {clueGiverMode === 'manual' && (
          <label>
            <span style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem' }}>
              Clue Giver
            </span>
            <Select
              disabled={!isHost || players.length === 0}
              value={clueGiverPlayerId}
              onChange={(e) => {
                const id = e.target.value;
                setClueGiverPlayerId(id);
                if (isHost) {
                  emitOptions(onChange, build({ clueGiverPlayerId: id || undefined }));
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
