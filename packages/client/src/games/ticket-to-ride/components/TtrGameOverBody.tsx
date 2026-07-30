import type { TtrFinalScoreRow } from 'shared';

type Props = {
  titleId: string;
  iWon: boolean;
  reason: string;
  rows: TtrFinalScoreRow[];
  winners: ReadonlySet<string>;
  myId: string;
};

export function TtrGameOverBody({ titleId, iWon, reason, rows, winners, myId }: Props) {
  return (
    <div className="ttr-end-body">
      <h2 id={titleId} className="ttr-end-title">
        {iWon ? 'คุณชนะ!' : 'เกมจบ'}
      </h2>
      <p className="ttr-end-reason">{reason}</p>
      {rows.length > 0 ? (
        <div className="ttr-end-table-wrap">
          <table className="ttr-end-table">
            <thead>
              <tr>
                <th>ผู้เล่น</th>
                <th>เส้นทาง</th>
                <th>ตั๋วสำเร็จ</th>
                <th>ตั๋วไม่สำเร็จ</th>
                <th>Longest</th>
                <th>รวม</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.playerId}
                  className={winners.has(row.playerId) ? 'is-winner' : undefined}
                >
                  <td>
                    {row.playerName}
                    {row.playerId === myId ? ' (คุณ)' : ''}
                  </td>
                  <td>+{row.routePoints}</td>
                  <td>+{row.completedTicketPoints}</td>
                  <td>{row.failedTicketPenalty}</td>
                  <td>{row.longestPathBonus > 0 ? `+${row.longestPathBonus}` : '0'}</td>
                  <td className="ttr-end-total">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
