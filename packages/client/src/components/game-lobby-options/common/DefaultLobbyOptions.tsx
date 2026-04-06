import { useEffect } from 'react';
import type { LobbyOptionsProps } from '../types';

export function DefaultLobbyOptions({ isHost, onChange }: LobbyOptionsProps) {
  useEffect(() => {
    if (isHost) onChange(undefined);
  }, [isHost, onChange]);

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 6 }}>
        {isHost ? 'การตั้งค่าก่อนเริ่มเกม' : 'การตั้งค่าก่อนเริ่มเกม (หัวห้อง)'}
      </h3>
      <p style={{ color: 'var(--text-secondary)' }}>
        {isHost
          ? 'เกมนี้ยังไม่มีโหมดพิเศษเพิ่มเติม ระบบจะใช้ค่าเริ่มต้นอัตโนมัติ'
          : 'เกมนี้ไม่มีตัวเลือกพิเศษในห้อง — หัวห้องจะเริ่มเกมด้วยค่าเริ่มต้น'}
      </p>
    </div>
  );
}
