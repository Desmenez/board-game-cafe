import type { TtrMapDefinition, TtrPlayerView } from 'shared';
import { ttrCityName } from 'shared';
import { imageMap } from '../../../imageMap';
import { TTR_TRAIN_COLOR_LABEL } from '../ttrLabels';
import { TtrDestinationCard } from './TtrDestinationCard';

type Props = {
  map: TtrMapDefinition;
  /** Setup progress while other players still pick their starting tickets. */
  waitingInitialTickets: TtrPlayerView['initialTicketConfirmProgress'] | null;
  /** Locomotive count that triggered the reshuffle, or null when there is nothing to show. */
  faceUpReset: number | null;
  destinationComplete: TtrPlayerView['destinationCompleteNotice'];
};

export function TtrNoticeModals({
  map,
  waitingInitialTickets,
  faceUpReset,
  destinationComplete,
}: Props) {
  return (
    <>
      {waitingInitialTickets ? (
        <div className="modal-overlay" role="dialog" aria-modal>
          <div className="modal ttr-ticket-modal ttr-ticket-modal--waiting">
            <h2>รอผู้เล่นเลือกตั๋วเริ่มต้น</h2>
            <p className="ttr-ticket-waiting-copy">
              ยืนยันแล้ว {waitingInitialTickets.done}/{waitingInitialTickets.total} คน
            </p>
            <p className="muted">เมื่อครบทุกคน เกมจะเริ่มอัตโนมัติ</p>
          </div>
        </div>
      ) : null}

      {faceUpReset != null ? (
        <div className="modal-overlay" role="dialog" aria-modal>
          <div className="modal ttr-ticket-modal ttr-ticket-modal--waiting ttr-faceup-reset-modal">
            <h2>สับไพ่หงายใหม่</h2>
            <div
              className="ttr-faceup-reset-loco-visual"
              role="img"
              aria-label={`ไพ่หงายมี${TTR_TRAIN_COLOR_LABEL.locomotive} ${faceUpReset} ใบ`}
            >
              <div className="ttr-faceup-reset-loco-visual__row" aria-hidden>
                {Array.from({ length: faceUpReset }, (_, i) => (
                  <div key={i} className="ttr-faceup-reset-loco-visual__card">
                    <img
                      src={imageMap.ticketToRide.trainCards.locomotive}
                      alt=""
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                ))}
              </div>
              <p className="ttr-faceup-reset-loco-visual__tag">
                {TTR_TRAIN_COLOR_LABEL.locomotive}
                <span className="ttr-faceup-reset-loco-visual__times">×{faceUpReset}</span>
              </p>
            </div>
            <p className="ttr-ticket-waiting-copy ttr-faceup-reset-copy">
              ไพ่หงายมีหัวรถจักร {faceUpReset} ใบ ระบบจึงทิ้งและเปิดไพ่หงายใหม่อัตโนมัติ
            </p>
          </div>
        </div>
      ) : null}

      {destinationComplete ? (
        <div className="modal-overlay" role="dialog" aria-modal>
          <div className="modal ttr-ticket-modal ttr-ticket-modal--waiting">
            <h2>เชื่อมตั๋วปลายทางสำเร็จ!</h2>
            <TtrDestinationCard
              className="ttr-dest-card--modal"
              map={map}
              a={destinationComplete.a}
              b={destinationComplete.b}
              points={destinationComplete.points}
            />
            <p className="ttr-ticket-waiting-copy">
              {destinationComplete.playerName} เชื่อม {ttrCityName(map, destinationComplete.a)} -{' '}
              {ttrCityName(map, destinationComplete.b)} สำเร็จ
            </p>
            <p className="muted">ตั๋วนี้มูลค่า {destinationComplete.points} แต้ม</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
