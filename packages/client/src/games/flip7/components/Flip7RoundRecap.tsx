import type { Flip7LastRoundSummary, Flip7PlayerView } from 'shared';
import { ClipboardList } from 'lucide-react';
import { PlayerAvatar } from '../../../components/player-avatar';
import { Button } from '../../../components/ui';
import { flip7RecapStatusPill } from '../lib/flip7Ui';

type Props = {
  recap: Flip7LastRoundSummary;
  phase: Flip7PlayerView['phase'];
  onClose: () => void;
};

export function Flip7RoundRecap({ recap, phase, onClose }: Props) {
  return (
    <div
      className="modal-overlay f7-round-recap-overlay f7-round-recap-overlay--sheet"
      role="dialog"
      aria-modal
      aria-labelledby="f7-round-recap-title"
    >
      <div
        className="modal f7-round-recap-modal f7-round-recap-modal--sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="f7-round-recap__header">
          <ClipboardList
            className="f7-round-recap__header-icon"
            aria-hidden
            strokeWidth={1.5}
            size={40}
          />
          <span className="f7-round-recap__round-pill">รอบที่ {recap.endedRoundNo}</span>
          <h2 id="f7-round-recap-title" className="f7-round-recap__title">
            จบรอบ
          </h2>
        </div>
        <p className="f7-round-recap__lead">สรุปแต้มที่ได้ในรอบนี้</p>
        {phase === 'playing' && recap.nextDealerName ? (
          <p className="f7-round-recap__dealer">
            <span className="f7-round-recap__dealer-label">Dealer รอบหน้า</span>
            <span className="f7-round-recap__dealer-who">
              <PlayerAvatar
                playerId={recap.nextDealerId}
                name={recap.nextDealerName}
                size={28}
                decorative
                className="f7-player-avatar"
              />
              <strong className="f7-round-recap__dealer-name">{recap.nextDealerName}</strong>
            </span>
          </p>
        ) : null}
        <div className="f7-round-recap__table-wrap">
          <table className="f7-round-recap__table">
            <thead>
              <tr>
                <th scope="col">ผู้เล่น</th>
                <th scope="col" className="f7-round-recap__th-num">
                  แต้มรอบ
                </th>
                <th scope="col" className="f7-round-recap__th-status">
                  สถานะ
                </th>
              </tr>
            </thead>
            <tbody>
              {recap.rows.map((r) => {
                const st = flip7RecapStatusPill(r);
                return (
                  <tr key={r.id} className="f7-round-recap__row">
                    <td className="f7-round-recap__name">
                      <span className="f7-table-who">
                        <PlayerAvatar
                          playerId={r.id}
                          name={r.name}
                          size={28}
                          decorative
                          className="f7-player-avatar"
                        />
                        <span>{r.name}</span>
                      </span>
                    </td>
                    <td className="f7-round-recap__pts f7-round-recap__pts-cell">
                      {r.roundPoints}
                    </td>
                    <td className="f7-round-recap__status-cell">
                      <span className={`f7-round-recap__pill f7-round-recap__pill--${st.mod}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="secondary" block onClick={onClose}>
          ปิด
        </Button>
      </div>
    </div>
  );
}
