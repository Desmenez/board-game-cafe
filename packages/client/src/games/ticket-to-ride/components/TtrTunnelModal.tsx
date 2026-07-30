import type { TtrClaimOption, TtrMapDefinition, TtrPendingTunnel } from 'shared';
import { ttrCityName } from 'shared';
import { Button } from '../../../components/ui';
import { imageMap } from '../../../imageMap';
import { TTR_TRAIN_COLOR_LABEL } from '../ttrLabels';

type Props = {
  map: TtrMapDefinition;
  tunnel: TtrPendingTunnel;
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

/** Europe tunnels: three cards are revealed and matching colours raise the price. */
export function TtrTunnelModal({ map, tunnel, onAccept, onRefuse }: Props) {
  const route = map.routes.find((r) => r.id === tunnel.routeId);
  const title = route ? `${ttrCityName(map, route.a)} – ${ttrCityName(map, route.b)}` : 'อุโมงค์';
  const needsExtra = tunnel.extraRequired > 0;
  const canPay = tunnel.extraOptions.length > 0;

  return (
    <div className="modal-overlay" role="dialog" aria-modal aria-label={`อุโมงค์ ${title}`}>
      <div className="modal ttr-ticket-modal ttr-ticket-modal--waiting ttr-tunnel-modal">
        <h2>อุโมงค์ {title}</h2>
        <p className="ttr-ticket-waiting-copy">
          {needsExtra
            ? `เปิดไพ่ตรงกับสีที่จ่าย ${tunnel.extraRequired} ใบ — ต้องจ่ายเพิ่มอีก ${tunnel.extraRequired} ใบ`
            : 'ไม่มีไพ่ที่เปิดตรงกับสีที่จ่าย — ลงอุโมงค์ได้เลย'}
        </p>

        <div className="ttr-tunnel-modal__reveal" aria-label="ไพ่ที่เปิดจากกองอุโมงค์">
          {tunnel.revealed.map((color, i) => (
            <div key={`${color}-${i}`} className="ttr-tunnel-modal__card">
              <img
                src={imageMap.ticketToRide.trainCards[color]}
                alt={TTR_TRAIN_COLOR_LABEL[color]}
                loading="eager"
                decoding="async"
              />
            </div>
          ))}
        </div>

        <p className="muted">
          จ่ายไปแล้ว {TTR_TRAIN_COLOR_LABEL[tunnel.color]} ×{tunnel.colorCards}
          {tunnel.locomotivesUsed > 0
            ? ` + ${TTR_TRAIN_COLOR_LABEL.locomotive} ×${tunnel.locomotivesUsed}`
            : ''}
        </p>

        {needsExtra ? (
          canPay ? (
            <div className="ttr-tunnel-modal__options">
              {tunnel.extraOptions.map((option) => (
                <button
                  key={`${option.color}-${option.locomotives}`}
                  type="button"
                  className="flex items-center gap-2 rounded-input border border-white/15 bg-white/5 px-2.5 py-2 text-sm hover:border-white/40"
                  onClick={() => onAccept(option)}
                >
                  <img
                    className="h-6 w-10 rounded-sm object-cover"
                    src={imageMap.ticketToRide.trainCards[option.color]}
                    alt=""
                    loading="lazy"
                  />
                  <span>จ่ายเพิ่ม {optionLabel(option)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">การ์ดบนมือไม่พอจ่ายเพิ่ม — ต้องยกเลิกการลงอุโมงค์</p>
          )
        ) : (
          <div className="ttr-tunnel-modal__options">
            <Button type="button" onClick={() => onAccept(null)}>
              ลงอุโมงค์
            </Button>
          </div>
        )}

        <div className="ttr-tunnel-modal__footer">
          <Button type="button" variant="ghost" onClick={onRefuse}>
            ยกเลิก — ไม่ลงเส้นทางนี้และจบตา
          </Button>
        </div>
      </div>
    </div>
  );
}
