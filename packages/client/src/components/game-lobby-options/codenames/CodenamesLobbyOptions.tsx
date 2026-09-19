import { useEffect, useMemo, useState } from 'react';
import type { CodenamesBoardVariant, CodenamesLobbyOptions as CodenamesOpts } from 'shared';
import { parseCodenamesLobbyOptions } from 'shared';
import { Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

export function CodenamesLobbyOptions({ isHost, onChange, lobbyOptions }: LobbyOptionsProps) {
  const initial = useMemo(() => parseCodenamesLobbyOptions(lobbyOptions), [lobbyOptions]);
  const [boardVariant, setBoardVariant] = useState<CodenamesBoardVariant>(initial.boardVariant);

  useEffect(() => {
    if (isHost) return;
    setBoardVariant(parseCodenamesLobbyOptions(lobbyOptions).boardVariant);
  }, [isHost, lobbyOptions]);

  const emit = (next: CodenamesBoardVariant) => {
    const options: CodenamesOpts = { boardVariant: next };
    setBoardVariant(next);
    if (isHost) onChange(options);
  };

  return (
    <div style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตั้งค่า Codenames' : 'ตั้งค่า Codenames (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 14 }}>
        เลือกกระดานคำไทย 5×5 หรือโหมดรูปภาพ 5×4
      </p>
      <Select
        label="โหมดกระดาน"
        disabled={!isHost}
        value={boardVariant}
        onChange={(e) => {
          emit(e.target.value === 'pictures' ? 'pictures' : 'words');
        }}
      >
        <option value="words">คำ (Words) — ตาราง 5×5 คำไทย</option>
        <option value="pictures">รูปภาพ (Pictures) — ตาราง 5×4</option>
      </Select>
    </div>
  );
}
