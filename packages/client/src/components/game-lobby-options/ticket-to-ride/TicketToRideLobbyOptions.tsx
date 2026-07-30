import { useEffect, useMemo, useState } from 'react';
import type { TtrLobbyOptions, TtrMapId } from 'shared';
import { getTtrMap, parseTtrLobbyOptions, TTR_MAP_IDS } from 'shared';
import { Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

function emitOptions(onChange: LobbyOptionsProps['onChange'], next: TtrLobbyOptions): void {
  onChange(next);
}

const MAP_LABELS: Record<TtrMapId, string> = {
  'united-states': 'United States — คลาสสิก',
  europe: 'Europe — เรือเฟอร์รี / อุโมงค์ / สถานี',
};

export function TicketToRideLobbyOptions({
  isHost,
  onChange,
  lobbyOptions,
  playerCount = 0,
}: LobbyOptionsProps) {
  const initial = useMemo(() => parseTtrLobbyOptions(lobbyOptions), [lobbyOptions]);
  const [mapId, setMapId] = useState<TtrMapId>(initial.mapId);

  useEffect(() => {
    if (isHost) return;
    setMapId(parseTtrLobbyOptions(lobbyOptions).mapId);
  }, [isHost, lobbyOptions]);

  const map = getTtrMap(mapId);
  const overCapacity = playerCount > map.maxPlayers;
  const underCapacity = playerCount > 0 && playerCount < map.minPlayers;

  return (
    <div style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตั้งค่า Ticket to Ride' : 'ตั้งค่า Ticket to Ride (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          <span style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem' }}>แผนที่</span>
          <Select
            disabled={!isHost}
            value={mapId}
            onChange={(e) => {
              const v = e.target.value as TtrMapId;
              const next: TtrMapId = TTR_MAP_IDS.includes(v) ? v : 'united-states';
              setMapId(next);
              if (isHost) emitOptions(onChange, { mapId: next });
            }}
          >
            {TTR_MAP_IDS.map((id) => (
              <option key={id} value={id}>
                {MAP_LABELS[id]}
              </option>
            ))}
          </Select>
        </label>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
          {map.name}: {map.minPlayers}–{map.maxPlayers} คน · รถไฟคนละ {map.trainsPerPlayer} ขบวน
          {map.stationsPerPlayer > 0 ? ` · สถานีคนละ ${map.stationsPerPlayer}` : ''}
        </p>

        {overCapacity ? (
          <p style={{ color: 'var(--warning, #c9a227)', fontSize: '0.85rem', margin: 0 }}>
            แผนที่นี้รองรับสูงสุด {map.maxPlayers} คน — ตอนนี้มี {playerCount} คนในห้อง
          </p>
        ) : null}

        {underCapacity ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            แผนที่นี้ต้องมีอย่างน้อย {map.minPlayers} คน (ตอนนี้มี {playerCount} คน)
          </p>
        ) : null}
      </div>
    </div>
  );
}
