import type { CSSProperties } from 'react';
import type { HuesAndCuesAction, HuesAndCuesPlayerView } from 'shared';
import { huesAndCuesCellLabel } from 'shared';
import { GamePhasePanel } from '../../../components/game-shell';
import { Button } from '../../../components/ui';
import { formatRevealPts } from '../lib/phaseCopy';

type Props = {
  gs: HuesAndCuesPlayerView;
  send: (a: HuesAndCuesAction) => void;
};

export function HuesRevealPanel({ gs, send }: Props) {
  if (gs.subPhase !== 'reveal' || !gs.revealBreakdown || !gs.target) return null;

  return (
    <GamePhasePanel
      title="เปิดเฉลย"
      description="คะแนนผู้ทายต่อมาร์กเกอร์: +3 ตรงช่อง · +2 ในกรอบ 3×3 (ห่างสูงสุด 1 ช่อง) · +1 ห่าง 2 ช่อง"
      actionsPlacement="footer"
      actions={
        <Button type="button" onClick={() => send({ type: 'continue_after_reveal' })}>
          {gs.roundIndex + 1 >= gs.totalRounds ? 'จบเกม' : 'ไปรอบถัดไป'}
        </Button>
      }
    >
      <div
        className="hac-reveal-target"
        aria-label={`สีเป้าหมาย ช่อง ${huesAndCuesCellLabel(gs.target.col, gs.target.row)}${gs.targetHex ? ` ${gs.targetHex}` : ''}`}
      >
        <div
          className="hac-reveal-target__swatch"
          style={gs.targetHex ? ({ backgroundColor: gs.targetHex } as CSSProperties) : undefined}
          role="img"
          aria-hidden
        />
        <div className="hac-reveal-target__meta">
          <span className="hac-reveal-target__kicker">สีเป้าหมายของรอบนี้</span>
          <span className="hac-reveal-target__code" lang="en">
            {huesAndCuesCellLabel(gs.target.col, gs.target.row)}
          </span>
          {gs.targetHex ? <code className="hac-reveal-target__hex">{gs.targetHex}</code> : null}
          <span className="hac-reveal-target__hint">เทียบกับกระดานด้านบน</span>
        </div>
      </div>

      <div className="hac-reveal-table-wrap mt-4">
        <table className="hac-reveal-table">
          <thead>
            <tr>
              <th scope="col">ผู้เล่น</th>
              <th scope="col">รอบ 1</th>
              <th scope="col">รอบ 2</th>
              <th scope="col">รวมรอบ</th>
            </tr>
          </thead>
          <tbody>
            {gs.playerOrder
              .filter((id) => id !== gs.cueGiverId)
              .map((id) => {
                const b = gs.revealBreakdown!.byPlayer[id];
                return (
                  <tr key={id}>
                    <th scope="row" className="hac-reveal-table__name">
                      {gs.playerNames[id]}
                    </th>
                    <td className="hac-reveal-table__pts">{formatRevealPts(b?.guess1)}</td>
                    <td className="hac-reveal-table__pts">{formatRevealPts(b?.guess2)}</td>
                    <td className="hac-reveal-table__pts hac-reveal-table__pts--total">
                      {b?.roundTotal !== undefined ? formatRevealPts(b.roundTotal) : '—'}
                    </td>
                  </tr>
                );
              })}
          </tbody>
          <tfoot>
            <tr className="hac-reveal-table__cue-row">
              <th scope="row" className="hac-reveal-table__name">
                {gs.playerNames[gs.cueGiverId]}
                <span className="hac-reveal-table__cue-badge">ผู้ให้คำใบ้</span>
              </th>
              <td colSpan={2} className="hac-reveal-table__cue-rule">
                คะแนน = มาร์กเกอร์ในกรอบ 3×3
                {gs.playerOrder.length === 3 ? ' × 2 (เกม 3 คน)' : ''}
              </td>
              <td className="hac-reveal-table__pts hac-reveal-table__pts--cue">
                +{gs.revealBreakdown.cueGiverRoundGain}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </GamePhasePanel>
  );
}
