import type { TtrFinalScoreRow, TtrMapDefinition, TtrStationAssignment } from 'shared';
import { ttrCityName } from 'shared';

type Props = {
  titleId: string;
  map: TtrMapDefinition;
  iWon: boolean;
  reason: string;
  rows: TtrFinalScoreRow[];
  winners: ReadonlySet<string>;
  myId: string;
};

function assignmentLabel(map: TtrMapDefinition, assignment: TtrStationAssignment): string {
  const city = ttrCityName(map, assignment.cityId);
  if (!assignment.routeId) return `${city} (ไม่ได้ใช้)`;
  const route = map.routes.find((r) => r.id === assignment.routeId);
  if (!route) return `${city} (ยืมเส้นทาง)`;
  return `${city} → ยืม ${ttrCityName(map, route.a)} – ${ttrCityName(map, route.b)}`;
}

export function TtrGameOverBody({ titleId, map, iWon, reason, rows, winners, myId }: Props) {
  const showStations = rows.some(
    (row) => row.stationBonus > 0 || row.stationsUsed > 0 || row.stationAssignments.length > 0,
  );
  const showMandala = Boolean(map.rules.mandalaBonus);
  const longestLabel = map.id === 'india' ? 'Express' : 'Longest';
  const assignmentRows = showStations
    ? rows.filter((row) => row.stationAssignments.length > 0)
    : [];

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
                <th>{longestLabel}</th>
                {showMandala ? <th>Mandala</th> : null}
                {showStations ? <th>สถานี</th> : null}
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
                  <td>
                    +{row.completedTicketPoints}
                    <span className="ttr-end-subvalue"> ({row.completedTicketCount} ใบ)</span>
                  </td>
                  <td>{row.failedTicketPenalty}</td>
                  <td>{row.longestPathBonus > 0 ? `+${row.longestPathBonus}` : '0'}</td>
                  {showMandala ? (
                    <td>
                      {row.mandalaBonus > 0 ? `+${row.mandalaBonus}` : '0'}
                      <span className="ttr-end-subvalue"> ({row.mandalaTicketCount} ใบ)</span>
                    </td>
                  ) : null}
                  {showStations ? (
                    <td>
                      {row.stationBonus > 0 ? `+${row.stationBonus}` : '0'}
                      <span className="ttr-end-subvalue"> (ใช้ {row.stationsUsed} หลัง)</span>
                    </td>
                  ) : null}
                  <td className="ttr-end-total">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {assignmentRows.length > 0 ? (
        <div className="ttr-end-stations">
          <h3 className="ttr-end-stations__title">สถานีที่วางไว้</h3>
          <ul className="ttr-end-stations__list">
            {assignmentRows.map((row) => (
              <li key={`stations-${row.playerId}`}>
                <span className="ttr-end-stations__name">{row.playerName}</span>{' '}
                {row.stationAssignments.map((a) => assignmentLabel(map, a)).join(' · ')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
