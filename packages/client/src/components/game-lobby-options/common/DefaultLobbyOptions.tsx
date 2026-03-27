import { useEffect } from 'react';
import type { LobbyOptionsProps } from '../types';

export function DefaultLobbyOptions({ onChange }: LobbyOptionsProps) {
  useEffect(() => {
    onChange(undefined);
  }, [onChange]);

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 6 }}>การตั้งค่าก่อนเริ่มเกม</h3>
      <p style={{ color: 'var(--text-secondary)' }}>
        เกมนี้ยังไม่มีโหมดพิเศษเพิ่มเติม ระบบจะใช้ค่าเริ่มต้นอัตโนมัติ
      </p>
    </div>
  );
}

