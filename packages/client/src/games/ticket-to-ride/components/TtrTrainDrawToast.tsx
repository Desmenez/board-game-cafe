import type { TtrTrainDrawNotice } from 'shared';
import { imageMap } from '../../../imageMap';
import { TTR_TRAIN_COLOR_LABEL } from '../ttrLabels';

type Props = {
  notice: TtrTrainDrawNotice;
  visible: boolean;
};

export function TtrTrainDrawToast({ notice, visible }: Props) {
  const cardDescription = notice.cards
    .map((card) => (card.source === 'face_up' ? TTR_TRAIN_COLOR_LABEL[card.color] : 'จากกองจั่ว'))
    .join(', ');

  return (
    <div
      className={`ttr-draw-toast${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${notice.playerName} หยิบการ์ดรถไฟ ${cardDescription}`}
    >
      <div className="ttr-draw-toast__cards" aria-hidden>
        {notice.cards.map((card, index) => (
          <img
            key={`${card.source}-${card.source === 'face_up' ? card.color : 'deck'}-${index}`}
            className="ttr-draw-toast__card"
            src={
              card.source === 'face_up'
                ? imageMap.ticketToRide.trainCards[card.color]
                : imageMap.ticketToRide.trainCardBack
            }
            alt=""
          />
        ))}
      </div>
      <div className="ttr-draw-toast__copy">
        <strong>{notice.playerName}</strong>
        <span>{notice.cards.length > 1 ? `หยิบ ${notice.cards.length} ใบ` : 'หยิบการ์ดรถไฟ'}</span>
        <span className="ttr-draw-toast__detail">{cardDescription}</span>
      </div>
    </div>
  );
}
