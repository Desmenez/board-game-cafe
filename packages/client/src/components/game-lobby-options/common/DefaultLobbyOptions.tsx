import { useEffect } from 'react';
import type { LobbyOptionsProps } from '../types';

export function DefaultLobbyOptions({ onChange }: LobbyOptionsProps) {
  useEffect(() => {
    onChange(undefined);
  }, [onChange]);

  return (
    <div className="card mb-0">
      <h3 className="mb-1.5">การตั้งค่าก่อนเริ่มเกม</h3>
      <p className="text-[var(--text-secondary)]">
        เกมนี้ยังไม่มีโหมดพิเศษเพิ่มเติม ระบบจะใช้ค่าเริ่มต้นอัตโนมัติ
      </p>
    </div>
  );
}
