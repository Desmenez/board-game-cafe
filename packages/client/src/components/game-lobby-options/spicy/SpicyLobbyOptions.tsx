import { useEffect, useState } from 'react';
import type { SpicyLobbyOptions } from 'shared';
import { defaultSpicyLobbyOptions, parseSpicyLobbyOptions } from 'shared';
import { Checkbox } from '../../ui';
import type { LobbyOptionsProps } from '../types';

export function SpicyLobbyOptions({ isHost, onChange, lobbyOptions }: LobbyOptionsProps) {
  const initial = parseSpicyLobbyOptions(lobbyOptions ?? defaultSpicyLobbyOptions());
  const [useSpecialCards, setUseSpecialCards] = useState(initial.useSpecialCards);

  useEffect(() => {
    if (isHost) return;
    setUseSpecialCards(parseSpicyLobbyOptions(lobbyOptions).useSpecialCards);
  }, [isHost, lobbyOptions]);

  return (
    <div style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตั้งค่า Spicy' : 'ตั้งค่า Spicy (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}
      <Checkbox
        checked={useSpecialCards}
        disabled={!isHost}
        onChange={(e) => {
          if (!isHost) return;
          const next = e.target.checked;
          setUseSpecialCards(next);
          onChange({ useSpecialCards: next } satisfies SpicyLobbyOptions);
        }}
        label="ใช้การ์ด SPICE IT UP (สุ่ม 1 ใบ)"
        description="เมื่อเปิด จะสุ่มการ์ดกฎพิเศษ 1 ใบหงายข้างกองจั่วตลอดทั้งเกม — ปิดเพื่อเล่นแบบมาตรฐาน"
      />
    </div>
  );
}
