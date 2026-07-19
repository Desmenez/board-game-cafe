import { Flag } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import type { CamelUpLegScoringSummary, CamelUpPlayerView } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { Badge, Button, Dialog } from '../../../components/ui';
import { fireCamelUpLegEndConfetti } from '../../../utils/winCelebration';
import { CAMEL_COLOR_LABEL } from '../lib/camelMeta';

type Props = {
  summary: CamelUpLegScoringSummary;
  players: CamelUpPlayerView['players'];
  myId: string;
  onContinue: () => void;
};

export function CamelUpLegEndModal({ summary, players, myId, onContinue }: Props) {
  useEffect(() => {
    fireCamelUpLegEndConfetti();
  }, [summary.endedLeg]);

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
        if (b.totalEp !== a.totalEp) return b.totalEp - a.totalEp;
        return a.name.localeCompare(b.name, 'th');
      });
  }, [myId, players, summary.rows]);

  const topGain = rows[0]?.totalLegGain ?? 0;

  return (
    <Dialog
      open
      onOpenChange={() => undefined}
      dismissible={false}
      aria-labelledby="camel-up-leg-end-title"
      overlayClassName="game-over-modal-overlay room-night-dialog-overlay camel-up-leg-end-overlay"
      className="game-over-modal room-night-dialog rounded-card border border-rule bg-paper-2 text-ink camel-up-leg-end-modal"
    >
      <div className="game-over-modal__body">
        <div className="camel-up-leg-end-hero">
          <Flag className="camel-up-leg-end-icon" size={40} strokeWidth={1.5} aria-hidden />
          <Badge size="sm" variant="warning">
            Leg {summary.endedLeg}
          </Badge>
          <h2 id="camel-up-leg-end-title" className="camel-up-leg-end-title">
            จบ Leg {summary.endedLeg}
          </h2>
          <p className="camel-up-leg-end-lead">
            ลูก Pyramid หมด — อูฐนำ:{' '}
            <span className={`camel-up-leg-end-camel-chip camel-up-camel--${summary.winningColor}`}>
              {CAMEL_COLOR_LABEL[summary.winningColor]}
            </span>
          </p>
        </div>

        <div className="camel-up-leg-end-table-wrap">
          <table className="camel-up-leg-end-table" aria-label="สรุปคะแนน Leg">
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
                const isTop = wonLeg && row.totalLegGain === topGain && topGain > 0;

                return (
                  <tr
                    key={row.playerId}
                    className={[
                      'camel-up-leg-end-table__row',
                      row.isMe ? 'camel-up-leg-end-table__row--me' : '',
                      wonLeg ? 'camel-up-leg-end-table__row--scored' : '',
                      isTop ? 'camel-up-leg-end-table__row--top' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td className="camel-up-leg-end-table__name">
                      <span className="camel-up-leg-end-who">
                        <PlayerAvatar
                          playerId={row.playerId}
                          name={row.name}
                          size={28}
                          decorative
                          className="camel-up-leg-end-avatar"
                        />
                        <span className="camel-up-leg-end-who__text">
                          <span className="camel-up-leg-end-who__name">{row.name}</span>
                          {row.isMe ? (
                            <Badge size="sm" variant="accent">
                              คุณ
                            </Badge>
                          ) : null}
                        </span>
                      </span>
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
                    <td className="camel-up-leg-end-table__total">
                      <strong>{row.totalEp}</strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="camel-up-leg-end-actions">
        <Button type="button" variant="primary" block onClick={onContinue}>
          เริ่ม Leg {summary.endedLeg + 1}
        </Button>
      </div>
    </Dialog>
  );
}
