import { useEffect, useState } from 'react';
import type { LobbyOptionsProps } from '../types';

export function AvalonLobbyOptions({ onChange }: LobbyOptionsProps) {
  const [ladyEnabled, setLadyEnabled] = useState(false);

  useEffect(() => {
    onChange({ ladyOfTheLake: ladyEnabled });
  }, [onChange, ladyEnabled]);

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>Avalon Setup</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 10 }}>
        ตอนนี้ใช้กติกาพื้นฐานอัตโนมัติตามจำนวนผู้เล่น (Role distribution + เงื่อนไข Quest
        ตามมาตรฐาน)
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span className="quest-history-chip">Merlin / Percival / Assassin</span>
        <span className="quest-history-chip">Morgana + (7-8: Minion/Mordred/Oberon สุ่ม, 9: Mordred/Oberon)</span>
        <span className="quest-history-chip">Quest 4 ต้อง Fail 2 ใบเมื่อผู้เล่น 7+</span>
      </div>

      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={ladyEnabled}
            onChange={(e) => setLadyEnabled(e.target.checked)}
          />
          <span>เปิดใช้ Lady of the Lake</span>
        </label>
        <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
          เมื่อจบแต่ละ Quest (ตั้งแต่ก่อน Quest 2) ผู้ถือ Lady จะเลือกตรวจฝ่ายของผู้เล่น 1 คนได้
        </p>
      </div>
    </div>
  );
}
