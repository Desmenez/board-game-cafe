import type { CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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

export type HeyThatsMyFishBoardPenguin = {
  id: string;
  hexId: number;
  color: HeyThatsMyFishColor;
  mine?: boolean;
};

type Props = {
  layout?: HeyThatsMyFishBoardLayout;
  seaUrl: string;
  hexes: readonly HeyThatsMyFishBoardHex[];
  penguins?: readonly HeyThatsMyFishBoardPenguin[];
  selectedHexId?: number | null;
  legalHexIds?: readonly number[];
  showLabels?: boolean;
  watermark?: string | null;
  onHexClick?: (hexId: number) => void;
};

const TOKEN_EASE = [0.22, 1, 0.36, 1] as const;

function overlayStyle(left: number, top: number, width: number): CSSProperties {
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
  };
}

function tokensFromHexes(hexes: readonly HeyThatsMyFishBoardHex[]): HeyThatsMyFishBoardPenguin[] {
  return hexes.flatMap((hex) =>
    hex.penguinColor ? [{ id: `hex-${hex.id}`, hexId: hex.id, color: hex.penguinColor }] : [],
  );
}

export function HeyThatsMyFishBoard({
  layout = DEFAULT_HEY_THATS_MY_FISH_LAYOUT,
  seaUrl,
  hexes,
  penguins,
  selectedHexId = null,
  legalHexIds = [],
  showLabels = false,
  watermark = null,
  onHexClick,
}: Props) {
  const reduceMotion = useReducedMotion();
  const legal = new Set(legalHexIds);
  const tokens = penguins ?? tokensFromHexes(hexes);
  const tokenMs = reduceMotion ? 0 : 0.48;

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

        <AnimatePresence initial={false}>
          {tokens.map((penguin) => {
            const cell = HEY_THATS_MY_FISH_CELLS[penguin.hexId];
            if (!cell) return null;
            const point = heyThatsMyFishCellCenter(layout, cell);
            const selected = penguin.hexId === selectedHexId;
            return (
              <motion.img
                key={penguin.id}
                className={cn(
                  'htmf-penguin',
                  penguin.mine && 'htmf-penguin--mine',
                  selected && 'htmf-penguin--selected',
                  onHexClick && 'htmf-penguin--clickable',
                )}
                style={{
                  width: `${layout.penguinSize}%`,
                  aspectRatio: HTMF_PENGUIN_ASPECT,
                  left: `${point.left}%`,
                  top: `${point.top}%`,
                }}
                src={htmfPenguinSrc(penguin.color)}
                alt=""
                draggable={false}
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, scale: 0.42, left: `${point.left}%`, top: `${point.top}%` }
                }
                animate={{
                  opacity: 1,
                  scale: selected ? 1.06 : 1,
                  left: `${point.left}%`,
                  top: `${point.top}%`,
                }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.45 }}
                transition={{ duration: tokenMs, ease: TOKEN_EASE }}
                onClick={onHexClick ? () => onHexClick(penguin.hexId) : undefined}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
