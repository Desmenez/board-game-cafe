import type { TtrClaimOption, TtrMapDefinition } from 'shared';
import { ttrCityName } from 'shared';
import { Button } from '../../../components/ui';
import { imageMap } from '../../../imageMap';
import { TTR_TRAIN_COLOR_LABEL } from '../ttrLabels';

type Props = {
  map: TtrMapDefinition;
  cityId: string;
  options: TtrClaimOption[];
  /** Stations this player still has in stock. */
  stationsLeft: number;
  canAct: boolean;
  onBuild: (option: TtrClaimOption) => void;
  onClose: () => void;
};

function optionLabel(option: TtrClaimOption): string {
  const parts: string[] = [];
  if (option.colorCards > 0)
    parts.push(`${TTR_TRAIN_COLOR_LABEL[option.color]} ×${option.colorCards}`);
  if (option.locomotives > 0)
    parts.push(`${TTR_TRAIN_COLOR_LABEL.locomotive} ×${option.locomotives}`);
  return parts.join(' + ');
}

export function TtrBuildStationPanel({
  map,
  cityId,
  options,
  stationsLeft,
  canAct,
  onBuild,
  onClose,
}: Props) {
  const cost = options[0] ? options[0].colorCards + options[0].locomotives : 0;

  return (
    <section className="card ttr-panel space-y-3 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold">สร้างสถานีที่ {ttrCityName(map, cityId)}</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            ราคา {cost} ใบสีเดียวกัน · สถานีคงเหลือ {stationsLeft} หลัง · เหลือไม่ได้ใช้ 1 หลัง ={' '}
            {map.unplacedStationBonus} แต้ม
          </p>
        </div>
        <Button type="button" size="xs" variant="ghost" onClick={onClose}>
          ปิด
        </Button>
      </div>

      {options.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={`${option.color}-${option.locomotives}`}
              type="button"
              className="flex items-center gap-2 rounded-input border border-white/15 bg-white/5 px-2.5 py-2 text-sm hover:border-white/40 disabled:opacity-50"
              disabled={!canAct}
              onClick={() => onBuild(option)}
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
        <p className="text-sm text-[var(--text-secondary)]">การ์ดบนมือไม่พอสร้างสถานีที่เมืองนี้</p>
      )}
    </section>
  );
}
