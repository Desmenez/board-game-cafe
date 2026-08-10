import type { HuesAndCuesPlayerView } from 'shared';
import { huesAndCuesCellLabel } from 'shared';

/** สีเป้าหมาย + รหัสช่อง — แถวเดียวสำหรับผู้ใบ้ */
export function HuesCueTargetHero({ gs }: { gs: HuesAndCuesPlayerView }) {
  if (!gs.amCueGiver || gs.phase !== 'playing' || !gs.target || !gs.targetHex) return null;
  const code = huesAndCuesCellLabel(gs.target.col, gs.target.row);
  return (
    <div
      className="hac-cue-target"
      role="region"
      aria-label={`เป้าหมายของคุณ ช่อง ${code} สี ${gs.targetHex}`}
    >
      <div
        className="hac-cue-target__swatch"
        style={{ backgroundColor: gs.targetHex }}
        title="สีเป้าหมายของรอบนี้"
      />
      <span className="hac-cue-target__label">เป้าหมาย · ซ่อนจากผู้ทาย</span>
      <span className="hac-cue-target__code" lang="en">
        {code}
      </span>
      <code className="hac-cue-target__hex">{gs.targetHex}</code>
    </div>
  );
}
