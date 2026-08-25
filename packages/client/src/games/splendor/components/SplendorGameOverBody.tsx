import type { SplendorFinalScoreRow } from 'shared';
import { cn } from '../../../utils/cn';

type Props = {
  titleId: string;
  iWon: boolean;
  reason: string;
  rows: SplendorFinalScoreRow[];
  winners: ReadonlySet<string>;
  myId: string;
};

export function SplendorGameOverBody({ titleId, iWon, reason, rows, winners, myId }: Props) {
  return (
    <div className="splendor-end-body">
      <h2 id={titleId} className="splendor-end-title">
        {iWon ? 'คุณชนะ!' : 'เกมจบ'}
      </h2>
      <p className="splendor-end-reason">{reason}</p>
      {rows.length > 0 ? (
        <div className="splendor-end-table-wrap">
          <table className="splendor-end-table">
            <thead>
              <tr>
                <th>อันดับ</th>
                <th>ผู้เล่น</th>
                <th>การ์ด</th>
                <th>โนเบิล</th>
                <th>รวม</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.playerId} className={cn(winners.has(row.playerId) && 'is-winner')}>
                  <td className="splendor-end-place">{row.place}</td>
                  <td className="splendor-end-name">
                    {row.playerName}
                    {row.playerId === myId ? ' (คุณ)' : ''}
                  </td>
                  <td>
                    +{row.cardPrestige}
                    <span className="splendor-end-subvalue"> ({row.purchasedCount} ใบ)</span>
                  </td>
                  <td>
                    +{row.noblePrestige}
                    <span className="splendor-end-subvalue"> ({row.nobleCount} คน)</span>
                  </td>
                  <td className="splendor-end-total">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
