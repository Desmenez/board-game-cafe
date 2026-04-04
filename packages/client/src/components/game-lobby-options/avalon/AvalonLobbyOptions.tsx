import { useEffect, useState } from 'react';
import { Badge, Checkbox } from '../../ui';
import type { LobbyOptionsProps } from '../types';

export function AvalonLobbyOptions({ onChange, playerCount = 0 }: LobbyOptionsProps) {
  const [ladyEnabled, setLadyEnabled] = useState(false);
  const [lancelotEnabled, setLancelotEnabled] = useState(false);

  const lancelotOk = playerCount >= 8;

  useEffect(() => {
    onChange({
      ladyOfTheLake: ladyEnabled,
      lancelot: lancelotOk && lancelotEnabled,
    });
  }, [onChange, ladyEnabled, lancelotEnabled, lancelotOk]);

  return (
    <div className="card mb-0">
      <h3 className="mb-2">Avalon Setup</h3>
      <p className="text-[var(--text-secondary)] mb-2.5">
        ตอนนี้ใช้กติกาพื้นฐานอัตโนมัติตามจำนวนผู้เล่น (Role distribution + เงื่อนไข Quest
        ตามมาตรฐาน)
      </p>

      <div className="flex gap-2 flex-wrap mb-2">
        <Badge variant="outline" size="sm">
          Merlin / Percival / Assassin
        </Badge>
        <Badge variant="outline" size="sm">
          Morgana + (7-8: Minion/Mordred/Oberon สุ่ม, 9: Mordred/Oberon)
        </Badge>
        <Badge variant="outline" size="sm">
          Quest 4 ต้อง Fail 2 ใบเมื่อผู้เล่น 7+
        </Badge>
      </div>

      <div className="flex flex-col gap-3.5 my-2.5">
        <Checkbox
          checked={ladyEnabled}
          onChange={(e) => setLadyEnabled(e.target.checked)}
          label="เปิดใช้ Lady of the Lake"
          description="เริ่มเกม: โทเคน Lady อยู่ที่ผู้เล่นถัดจากหัวหน้าคนแรก (ทางขวา/ลำดับถัดไป) — หลัง Quest 2, 3 และ 4 จบ ผู้ถือ Lady เลือกผู้อื่น 1 คน (ห้ามเลือกคนที่เคยถือ Lady มาก่อน) จะเห็นฝ่ายจริง แล้วส่งโทเคนต่อให้คนที่ถูกเลือก"
        />
        <Checkbox
          checked={lancelotEnabled && lancelotOk}
          disabled={!lancelotOk}
          onChange={(e) => setLancelotEnabled(e.target.checked)}
          label="โหมด Lancelot (Sir Lancelot + Evil Lancelot)"
          description={
            lancelotOk
              ? 'แทนที่ Loyal Servant 1 คนและตัวชั่ว 1 คน (ลำดับ: Minion → Oberon → Mordred) — สองฝ่ายรู้ว่าใครเป็น Lancelot คู่กัน กติกา Quest/โหวตเหมือนเดิม (ยังไม่มีสำรับพลิกฝั่ง)'
              : 'ต้องมีผู้เล่นอย่างน้อย 8 คนในห้องถึงจะเปิดได้'
          }
        />
      </div>
    </div>
  );
}
