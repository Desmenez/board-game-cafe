import type { CSSProperties } from 'react';
import {
  HEY_THATS_MY_FISH_CELLS,
  type HeyThatsMyFishArtKey,
  type HeyThatsMyFishColor,
} from 'shared';
import { cn } from '../../../utils/cn';
import { htmfPenguinSrc, htmfTileSrc } from '../art';
import {
  DEFAULT_HEY_THATS_MY_FISH_LAYOUT,
  HTMF_PENGUIN_ASPECT,
  HTMF_TILE_ASPECT,
  heyThatsMyFishCellCenter,
  type HeyThatsMyFishBoardLayout,
} from '../boardLayout';
import '../hey-thats-my-fish.css';

export type HeyThatsMyFishBoardHex = {
  id: number;
  fish: number;
  artKey: HeyThatsMyFishArtKey | null;
  penguinColor?: HeyThatsMyFishColor | null;
};

type Props = {
  layout?: HeyThatsMyFishBoardLayout;
  seaUrl: string;
  hexes: readonly HeyThatsMyFishBoardHex[];
  selectedHexId?: number | null;
  legalHexIds?: readonly number[];
  showLabels?: boolean;
  watermark?: string | null;
  onHexClick?: (hexId: number) => void;
};

function overlayStyle(left: number, top: number, width: number): CSSProperties {
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
  };
}

export function HeyThatsMyFishBoard({
  layout = DEFAULT_HEY_THATS_MY_FISH_LAYOUT,
  seaUrl,
  hexes,
  selectedHexId = null,
  legalHexIds = [],
  showLabels = false,
  watermark = null,
  onHexClick,
}: Props) {
  const legal = new Set(legalHexIds);
  const penguinByHex = new Map(
    hexes.flatMap((hex) => (hex.penguinColor ? ([[hex.id, hex.penguinColor]] as const) : [])),
  );

  return (
    <div
      className="htmf-board"
      style={seaUrl.trim() ? { backgroundImage: `url("${seaUrl.trim()}")` } : undefined}
    >
      {seaUrl.trim() ? null : (
        <div className="htmf-board__watermark">
          {watermark ?? 'Paste a sea image URL to calibrate the board'}
        </div>
      )}

      <div className="htmf-board__field">
        {HEY_THATS_MY_FISH_CELLS.map((cell) => {
          const hex = hexes[cell.id];
          const point = heyThatsMyFishCellCenter(layout, cell);
          const fish = hex?.fish ?? 0;
          const water = fish === 0;
          const selected = cell.id === selectedHexId;
          const isLegal = legal.has(cell.id);
          const src = htmfTileSrc(hex?.artKey ?? null, fish);
          return (
            <button
              key={cell.id}
              type="button"
              className={cn(
                'htmf-hex',
                water && 'htmf-hex--water',
                selected && 'htmf-hex--selected',
                isLegal && 'htmf-hex--legal',
              )}
              style={{
                ...overlayStyle(point.left, point.top, layout.tileWidth),
                aspectRatio: HTMF_TILE_ASPECT,
              }}
              disabled={!onHexClick}
              onClick={() => onHexClick?.(cell.id)}
              aria-pressed={selected}
              aria-label={
                water ? `น้ำ ช่อง ${cell.id + 1}` : `แผ่น ${fish} ปลา ช่อง ${cell.id + 1}`
              }
            >
              <img className="htmf-hex__image" src={src} alt="" />
              {isLegal ? <span className="htmf-hex__legal" aria-hidden /> : null}
              {showLabels ? <span className="htmf-hex__label">{cell.id + 1}</span> : null}
            </button>
          );
        })}

        {HEY_THATS_MY_FISH_CELLS.flatMap((cell) => {
          const color = penguinByHex.get(cell.id);
          if (!color) return [];
          const point = heyThatsMyFishCellCenter(layout, cell);
          return (
            <img
              key={`penguin-${cell.id}`}
              className={cn(
                'htmf-penguin',
                cell.id === selectedHexId && 'htmf-penguin--selected',
                onHexClick && 'htmf-penguin--clickable',
              )}
              style={{
                ...overlayStyle(point.left, point.top, layout.penguinSize),
                aspectRatio: HTMF_PENGUIN_ASPECT,
              }}
              src={htmfPenguinSrc(color)}
              alt=""
              onClick={onHexClick ? () => onHexClick(cell.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
