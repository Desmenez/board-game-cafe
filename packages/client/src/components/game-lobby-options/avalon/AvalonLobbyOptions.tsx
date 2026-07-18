import { useEffect, useRef, useState } from 'react';
import { Badge, Checkbox } from '../../ui';
import type { LobbyOptionsProps } from '../types';

function avalonFromOpts(opts: unknown): { lady: boolean; lancelot: boolean } {
  const d = { lady: false, lancelot: false };
  if (opts && typeof opts === 'object') {
    const o = opts as Record<string, unknown>;
    if (typeof o.ladyOfTheLake === 'boolean') d.lady = o.ladyOfTheLake;
    if (typeof o.lancelot === 'boolean') d.lancelot = o.lancelot;
  }
  return d;
}

export function AvalonLobbyOptions({
  isHost,
  onChange,
  playerCount = 0,
  lobbyOptions,
}: LobbyOptionsProps) {
  const initial = avalonFromOpts(lobbyOptions);
  const [ladyEnabled, setLadyEnabled] = useState(initial.lady);
  const [lancelotEnabled, setLancelotEnabled] = useState(initial.lancelot);

  const lancelotOk = playerCount >= 8;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (isHost) return;
    const next = avalonFromOpts(lobbyOptions);
    setLadyEnabled(next.lady);
    setLancelotEnabled(next.lancelot);
  }, [isHost, lobbyOptions]);

  useEffect(() => {
    if (!isHost) return;
    onChangeRef.current({
      ladyOfTheLake: ladyEnabled,
      lancelot: lancelotOk && lancelotEnabled,
    });
  }, [isHost, ladyEnabled, lancelotEnabled, lancelotOk]);

  return (
    <div style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'Avalon Setup' : 'Avalon Setup (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 10 }}>
          เฉพาะหัวห้องเท่านั้นที่แก้ตัวเลือกได้
        </p>
      )}
      <p style={{ color: 'var(--text-secondary)', marginBottom: 10 }}>
        ตอนนี้ใช้กติกาพื้นฐานอัตโนมัติตามจำนวนผู้เล่น (Role distribution + เงื่อนไข Quest
        ตามมาตรฐาน)
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
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

      <div
        style={{
          marginTop: 10,
          marginBottom: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <Checkbox
          checked={ladyEnabled}
          disabled={!isHost}
          onChange={(e) => setLadyEnabled(e.target.checked)}
          label="เปิดใช้ Lady of the Lake"
          description="เริ่มเกม: โทเคน Lady อยู่ที่ผู้เล่นถัดจากหัวหน้าคนแรก (ทางขวา/ลำดับถัดไป) — หลัง Quest 2, 3 และ 4 จบ ผู้ถือ Lady เลือกผู้อื่น 1 คน (ห้ามเลือกคนที่เคยถือ Lady มาก่อน) จะเห็นฝ่ายจริง แล้วส่งโทเคนต่อให้คนที่ถูกเลือก"
        />
        <Checkbox
          checked={lancelotEnabled && lancelotOk}
          disabled={!isHost || !lancelotOk}
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
