import type { TtrMapDefinition, TtrRouteClaimNotice } from 'shared';
import { ttrCityName } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { imageMap } from '../../../imageMap';
import { TTR_TRAIN_COLOR_LABEL } from '../ttrLabels';

type Props = {
  map: TtrMapDefinition;
  notice: TtrRouteClaimNotice;
  visible: boolean;
};

export function TtrRouteClaimToast({ map, notice, visible }: Props) {
  const cityA = ttrCityName(map, notice.a);
  const cityB = ttrCityName(map, notice.b);
  const routeLabel = `${cityA} – ${cityB}`;
  const actionLabel = notice.sharedBulletTrain ? 'สร้าง Bullet Train' : 'ยึดเส้นทาง';
  const detail = notice.sharedBulletTrain
    ? `${routeLabel} · ${notice.length} ขบวนบนแทร็ก`
    : `${routeLabel} · ${notice.length} ขบวน${notice.routePoints > 0 ? ` · +${notice.routePoints}` : ''}`;

  return (
    <div
      className={`ttr-draw-toast${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${notice.playerName} ${actionLabel} ${routeLabel}`}
    >
      <PlayerAvatar
        playerId={notice.playerId}
        name={notice.playerName}
        size={36}
        decorative
        className="ttr-draw-toast__avatar"
      />
      <div className="ttr-draw-toast__cards" aria-hidden>
        <img
          className="ttr-draw-toast__card"
          src={imageMap.ticketToRide.trainCards[notice.payColor]}
          alt=""
        />
      </div>
      <div className="ttr-draw-toast__copy">
        <strong>{notice.playerName}</strong>
        <span>{actionLabel}</span>
        <span className="ttr-draw-toast__detail">
          {detail} · {TTR_TRAIN_COLOR_LABEL[notice.payColor]}
        </span>
      </div>
    </div>
  );
}
