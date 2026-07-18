import { useEffect, useRef, useState } from 'react';
import type { SheriffLobbyOptions as SheriffOpts } from 'shared';
import { Checkbox } from '../../ui';
import type { LobbyOptionsProps } from '../types';

const DEFAULTS: SheriffOpts = { includeSpecialCards: true };

function optsFromUnknown(opts: unknown): SheriffOpts {
  if (opts && typeof opts === 'object' && 'includeSpecialCards' in opts) {
    const v = (opts as { includeSpecialCards?: unknown }).includeSpecialCards;
    if (typeof v === 'boolean') return { includeSpecialCards: v };
  }
  return DEFAULTS;
}

export function SheriffLobbyOptions({ isHost, onChange, lobbyOptions }: LobbyOptionsProps) {
  const initial = optsFromUnknown(lobbyOptions);
  const [includeSpecialCards, setIncludeSpecialCards] = useState(initial.includeSpecialCards);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (isHost) return;
    setIncludeSpecialCards(optsFromUnknown(lobbyOptions).includeSpecialCards);
  }, [isHost, lobbyOptions]);

  useEffect(() => {
    if (!isHost) return;
    onChangeRef.current({ includeSpecialCards });
  }, [isHost, includeSpecialCards]);

  return (
    <div style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตัวเลือก Sheriff' : 'ตัวเลือก Sheriff (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}
      <Checkbox
        checked={includeSpecialCards}
        disabled={!isHost}
        onChange={(e) => setIncludeSpecialCards(e.target.checked)}
        label="ใช้การ์ดพิเศษในสำรับ"
        description="เมื่อเปิดและโต๊ะมี 5 คน จะสุ่มการ์ดเสริม (ชุดพิเศษ) เข้าไปในสำรับ — ปิดหากต้องการเล่นแบบไม่มีการ์ดกลุ่มนี้"
      />
    </div>
  );
}
