import type {
  TtrCardColor,
  TtrClaimOption,
  TtrMapDefinition,
  TtrPendingTunnel,
  TtrTrainColor,
} from 'shared';
import { ttrCityName } from 'shared';
import { Button } from '../../../components/ui';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { TTR_TRAIN_COLOR_LABEL } from '../ttrLabels';

type Props = {
  map: TtrMapDefinition;
  tunnel: TtrPendingTunnel;
  /** Seat that may accept/refuse (the player who attempted the claim). */
  myId: string;
  playerNameById: Record<string, string>;
  onAccept: (option: TtrClaimOption | null) => void;
  onRefuse: () => void;
};

function optionLabel(option: TtrClaimOption): string {
  const parts: string[] = [];
  if (option.colorCards > 0)
    parts.push(`${TTR_TRAIN_COLOR_LABEL[option.color]} ×${option.colorCards}`);
  if (option.locomotives > 0)
    parts.push(`${TTR_TRAIN_COLOR_LABEL.locomotive} ×${option.locomotives}`);
  return parts.join(' + ');
}

function paidSummary(tunnel: TtrPendingTunnel): string {
  const parts = [`${TTR_TRAIN_COLOR_LABEL[tunnel.color]} ×${tunnel.colorCards}`];
  if (tunnel.locomotivesUsed > 0) {
    parts.push(`${TTR_TRAIN_COLOR_LABEL.locomotive} ×${tunnel.locomotivesUsed}`);
  }
  return parts.join(' + ');
}

function isTunnelMatch(
  revealed: TtrTrainColor,
  paidColor: TtrCardColor,
  colorCardsInAttempt: number,
): boolean {
  if (colorCardsInAttempt === 0) return revealed === 'locomotive';
  return revealed === paidColor || revealed === 'locomotive';
}

/** Europe tunnels: three cards are revealed and matching colours raise the price. */
export function TtrTunnelModal({
  map,
  tunnel,
  myId,
  playerNameById,
  onAccept,
  onRefuse,
}: Props) {
  const route = map.routes.find((r) => r.id === tunnel.routeId);
  const title = route ? `${ttrCityName(map, route.a)} – ${ttrCityName(map, route.b)}` : 'อุโมงค์';
  const needsExtra = tunnel.extraRequired > 0;
  const canPay = tunnel.extraOptions.length > 0;
  const isActor = tunnel.playerId === myId;
  const actorName = playerNameById[tunnel.playerId] ?? tunnel.playerId;

  return (
    <div className="modal-overlay" role="dialog" aria-modal aria-label={`อุโมงค์ ${title}`}>
      <div className="modal ttr-tunnel-modal">
        <header className="ttr-tunnel-modal__header">
          <p className="ttr-tunnel-modal__eyebrow">อุโมงค์</p>
          <h2 className="ttr-tunnel-modal__title">{title}</h2>
          <p className="ttr-tunnel-modal__actor">
            {isActor ? 'ตาคุณต้องตอบรับ' : `รอ ${actorName} ตอบรับ`}
          </p>
          <p
            className={cn(
              'ttr-tunnel-modal__status',
              needsExtra ? 'ttr-tunnel-modal__status--warn' : 'ttr-tunnel-modal__status--ok',
            )}
          >
            {needsExtra
              ? `ตรงสี ${tunnel.extraRequired} ใบ · ต้องจ่ายเพิ่ม ${tunnel.extraRequired} ใบ`
              : 'ไม่ตรงสี · ลงอุโมงค์ได้เลย'}
          </p>
        </header>

        <section className="ttr-tunnel-modal__reveal" aria-label="ไพ่ที่เปิดจากกองอุโมงค์">
          {tunnel.revealed.map((color, i) => {
            const matched = isTunnelMatch(color, tunnel.color, tunnel.colorCards);
            return (
              <div
                key={`${color}-${i}`}
                className={cn('ttr-tunnel-modal__card', matched && 'is-match')}
              >
                <img
                  src={imageMap.ticketToRide.trainCards[color]}
                  alt={TTR_TRAIN_COLOR_LABEL[color]}
                  loading="eager"
                  decoding="async"
                />
                {matched ? <span className="ttr-tunnel-modal__card-badge">ตรง</span> : null}
              </div>
            );
          })}
        </section>

        <div className="ttr-tunnel-modal__ledger" aria-label="สรุปการจ่าย">
          <div className="ttr-tunnel-modal__ledger-row">
            <span className="ttr-tunnel-modal__ledger-label">จ่ายไปแล้ว</span>
            <span className="ttr-tunnel-modal__ledger-value">{paidSummary(tunnel)}</span>
          </div>
          {needsExtra ? (
            <div className="ttr-tunnel-modal__ledger-row ttr-tunnel-modal__ledger-row--extra">
              <span className="ttr-tunnel-modal__ledger-label">ต้องจ่ายเพิ่ม</span>
              <span className="ttr-tunnel-modal__ledger-value">{tunnel.extraRequired} ใบ</span>
            </div>
          ) : null}
        </div>

        {isActor ? (
          needsExtra ? (
            canPay ? (
              <div className="ttr-tunnel-modal__options" aria-label="เลือกวิธีจ่ายเพิ่ม">
                {tunnel.extraOptions.map((option) => (
                  <button
                    key={`${option.color}-${option.locomotives}`}
                    type="button"
                    className="ttr-tunnel-modal__option"
                    onClick={() => onAccept(option)}
                  >
                    <img
                      className="ttr-tunnel-modal__option-art"
                      src={
                        imageMap.ticketToRide.trainCards[
                          option.colorCards > 0 ? option.color : 'locomotive'
                        ]
                      }
                      alt=""
                      loading="lazy"
                    />
                    <span className="ttr-tunnel-modal__option-copy">
                      <strong>จ่ายเพิ่ม</strong>
                      <span>{optionLabel(option)}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="ttr-tunnel-modal__broke">การ์ดบนมือไม่พอจ่ายเพิ่ม — ต้องยกเลิก</p>
            )
          ) : (
            <div className="ttr-tunnel-modal__options">
              <Button
                type="button"
                size="lg"
                className="ttr-tunnel-modal__confirm"
                onClick={() => onAccept(null)}
              >
                ลงอุโมงค์
              </Button>
            </div>
          )
        ) : (
          <p className="ttr-tunnel-modal__waiting">รอผู้เล่นคนนั้นเลือกจ่ายเพิ่มหรือยกเลิก</p>
        )}

        {isActor ? (
          <div className="ttr-tunnel-modal__footer">
            <Button type="button" variant="ghost" size="sm" onClick={onRefuse}>
              ยกเลิก — ไม่ลงเส้นนี้และจบตา
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
