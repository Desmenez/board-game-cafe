import { Flag } from 'lucide-react';
import { useMemo } from 'react';
import type { CamelUpLegScoringSummary, CamelUpPlayerView } from 'shared';
import { Button } from '../../components/ui';
import { CAMEL_COLOR_LABEL } from './camelMeta';

type Props = {
  summary: CamelUpLegScoringSummary;
  players: CamelUpPlayerView['players'];
  myId: string;
  onContinue: () => void;
};

export function CamelUpLegEndModal({ summary, players, myId, onContinue }: Props) {
  const rows = useMemo(() => {
    const nameById = new Map(players.map((p) => [p.id, p.name]));
    const epById = new Map(players.map((p) => [p.id, p.ep]));

    return [...summary.rows]
      .map((row) => ({
        ...row,
        name: nameById.get(row.playerId) ?? row.playerId,
        totalEp: epById.get(row.playerId) ?? 0,
        isMe: row.playerId === myId,
      }))
      .sort((a, b) => {
        if (b.totalLegGain !== a.totalLegGain) return b.totalLegGain - a.totalLegGain;
        return a.name.localeCompare(b.name, 'th');
      });
  }, [myId, players, summary.rows]);

  return (
    <div
      className="modal-overlay camel-up-leg-end-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camel-up-leg-end-title"
    >
      <div
        className="modal camel-up-leg-end-modal max-w-xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="camel-up-leg-end-hero">
          <Flag className="camel-up-leg-end-icon" size={40} strokeWidth={1.5} aria-hidden />
          <span className="camel-up-leg-end-pill">Leg {summary.endedLeg}</span>
          <h2 id="camel-up-leg-end-title" className="camel-up-leg-end-title">
            จบ Leg
          </h2>
          <p className="camel-up-leg-end-lead">
            ลูก Pyramid หมด — อูฐนำใน Leg นี้:{' '}
            <strong>{CAMEL_COLOR_LABEL[summary.winningColor]}</strong>
          </p>
        </div>

        <div className="camel-up-leg-end-table-wrap">
          <table className="camel-up-leg-end-table">
            <thead>
              <tr>
                <th scope="col">ผู้เล่น</th>
                <th scope="col">เดิมพัน Leg</th>
                <th scope="col" className="camel-up-leg-end-table__th-num">
                  จาก tile
                </th>
                <th scope="col" className="camel-up-leg-end-table__th-num">
                  โบนัส
                </th>
                <th scope="col" className="camel-up-leg-end-table__th-num">
                  ได้ EP
                </th>
                <th scope="col" className="camel-up-leg-end-table__th-num">
                  EP รวม
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const betLabel =
                  row.legBetColor !== undefined && row.legBetValue !== undefined
                    ? `${CAMEL_COLOR_LABEL[row.legBetColor]} (${row.legBetValue})`
                    : '—';
                const wonLeg = row.totalLegGain > 0;

                return (
                  <tr
                    key={row.playerId}
                    className={[
                      'camel-up-leg-end-table__row',
                      row.isMe ? 'camel-up-leg-end-table__row--me' : '',
                      wonLeg ? 'camel-up-leg-end-table__row--scored' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td className="camel-up-leg-end-table__name">
                      {row.name}
                      {row.isMe ? <span className="camel-up-leg-end-table__you">คุณ</span> : null}
                    </td>
                    <td className="camel-up-leg-end-table__bet">{betLabel}</td>
                    <td className="camel-up-leg-end-table__num">
                      {row.legPayout > 0 ? row.legPayout : '—'}
                    </td>
                    <td className="camel-up-leg-end-table__num">
                      {row.legFirstBonus > 0 ? `+${row.legFirstBonus}` : '—'}
                    </td>
                    <td className="camel-up-leg-end-table__gain">
                      {row.totalLegGain > 0 ? (
                        <strong>+{row.totalLegGain}</strong>
                      ) : (
                        <span className="camel-up-leg-end-table__zero">0</span>
                      )}
                    </td>
                    <td className="camel-up-leg-end-table__total">{row.totalEp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="camel-up-leg-end-actions">
          <Button type="button" variant="primary" onClick={onContinue}>
            เริ่ม Leg {summary.endedLeg + 1}
          </Button>
        </div>
      </div>
    </div>
  );
}
