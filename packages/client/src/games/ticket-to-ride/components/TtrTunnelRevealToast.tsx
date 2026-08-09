import type { TtrTunnelRevealNotice } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { imageMap } from '../../../imageMap';
import { TTR_TRAIN_COLOR_LABEL } from '../ttrLabels';

type Props = {
  notice: TtrTunnelRevealNotice;
  cityA: string;
  cityB: string;
  visible: boolean;
};

/** Toast when a tunnel claim succeeds with no matching reveal cards. */
export function TtrTunnelRevealToast({ notice, cityA, cityB, visible }: Props) {
  return (
    <div
      className={`ttr-draw-toast ttr-tunnel-reveal-toast${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${notice.playerName} ผ่านอุโมงค์ ${cityA} – ${cityB} โดยไม่ต้องจ่ายเพิ่ม`}
    >
      <PlayerAvatar
        playerId={notice.playerId}
        name={notice.playerName}
        size={36}
        decorative
        className="ttr-draw-toast__avatar"
      />
      <div className="ttr-draw-toast__cards" aria-hidden>
        {notice.revealed.map((color, index) => (
          <img
            key={`${color}-${index}`}
            className="ttr-draw-toast__card"
            src={imageMap.ticketToRide.trainCards[color]}
            alt={TTR_TRAIN_COLOR_LABEL[color]}
          />
        ))}
      </div>
      <div className="ttr-draw-toast__copy">
        <strong>{notice.playerName}</strong>
        <span>
          ผ่านอุโมงค์ {cityA} – {cityB}
        </span>
        <span className="ttr-draw-toast__detail">ไม่ตรงสี · ลงได้เลย</span>
      </div>
    </div>
  );
}
