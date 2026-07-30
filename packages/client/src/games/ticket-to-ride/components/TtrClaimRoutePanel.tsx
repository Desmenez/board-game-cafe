import type { TtrClaimOption, TtrMapDefinition, TtrRouteView, TtrTrainColor } from 'shared';
import { ttrCityName } from 'shared';
import { Badge, Button } from '../../../components/ui';
import { imageMap } from '../../../imageMap';
import { TTR_ROUTE_COLOR_LABEL, TTR_TRAIN_COLOR_LABEL } from '../ttrLabels';

type Props = {
  map: TtrMapDefinition;
  route: TtrRouteView;
  options: TtrClaimOption[];
  myHand: Record<TtrTrainColor, number>;
  ownerName?: string;
  canAct: boolean;
  onClaim: (option: TtrClaimOption) => void;
  onClose: () => void;
};

function optionLabel(option: TtrClaimOption): string {
  const parts = [`${TTR_TRAIN_COLOR_LABEL[option.color]} ×${option.colorCards}`];
  if (option.locomotives > 0)
    parts.push(`${TTR_TRAIN_COLOR_LABEL.locomotive} ×${option.locomotives}`);
  return parts.join(' + ');
}

export function TtrClaimRoutePanel({
  map,
  route,
  options,
  myHand,
  ownerName,
  canAct,
  onClaim,
  onClose,
}: Props) {
  const { def } = route;
  const title = `${ttrCityName(map, def.a)} – ${ttrCityName(map, def.b)}`;
  const points = map.routePoints[def.length] ?? 0;

  return (
    <section className="card ttr-panel space-y-3 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex flex-wrap items-center gap-2 text-base font-bold">
            {title}
            {def.tunnel ? (
              <Badge size="sm" variant="warning">
                อุโมงค์
              </Badge>
            ) : null}
            {def.ferryLocomotives ? (
              <Badge size="sm" variant="info">
                เรือข้ามฟาก ×{def.ferryLocomotives}
              </Badge>
            ) : null}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {def.length} คัน · {TTR_ROUTE_COLOR_LABEL[def.color]} · {points} แต้ม
            {def.ferryLocomotives
              ? ` · เรือข้ามฟาก: ต้องใช้หัวรถจักร ×${def.ferryLocomotives}`
              : ''}
            {def.tunnel ? ' · อุโมงค์: อาจต้องจ่ายการ์ดเพิ่ม' : ''}
          </p>
        </div>
        <Button type="button" size="xs" variant="ghost" onClick={onClose}>
          ปิด
        </Button>
      </div>

      {route.ownerId != null ? (
        <p className="text-sm">ยึดแล้วโดย {ownerName ?? route.ownerId}</p>
      ) : options.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={`${option.color}-${option.locomotives}`}
              type="button"
              className="flex items-center gap-2 rounded-input border border-white/15 bg-white/5 px-2.5 py-2 text-sm hover:border-white/40 disabled:opacity-50"
              disabled={!canAct}
              onClick={() => onClaim(option)}
            >
              <img
                className="h-6 w-10 rounded-sm object-cover"
                src={imageMap.ticketToRide.trainCards[option.color]}
                alt=""
                loading="lazy"
              />
              <span>{optionLabel(option)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          {canAct
            ? `ยังลงเส้นนี้ไม่ได้ — ต้องใช้ ${def.length} ใบ${
                def.color === 'gray' ? ' (สีเดียวกัน)' : ` สี${TTR_TRAIN_COLOR_LABEL[def.color]}`
              }${
                def.ferryLocomotives
                  ? ` โดยต้องเป็น${TTR_TRAIN_COLOR_LABEL.locomotive} ${def.ferryLocomotives} ใบ`
                  : ''
              } · บนมือมี ${def.color === 'gray' ? '—' : myHand[def.color]} ใบ และหัวรถจักร ${myHand.locomotive} ใบ`
            : 'รอถึงตาคุณก่อนจึงจะลงเส้นทางได้'}
        </p>
      )}
    </section>
  );
}
