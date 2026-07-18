import { useEffect, useRef } from 'react';
import type { LobbyOptionsProps } from '../types';

export function DefaultLobbyOptions({ isHost, onChange }: LobbyOptionsProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (isHost) onChangeRef.current(undefined);
  }, [isHost]);

  return (
    <div style={{ marginBottom: 0 }}>
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
