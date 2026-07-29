import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import {
  MARRAKECH_BOARD_SIZE,
  MARRAKECH_SWIRLS,
  colOf,
  rowOf,
  type MarrakechAssam,
  type MarrakechCell,
  type MarrakechColor,
  type MarrakechEdge,
  type MarrakechExit,
  type MarrakechRug,
  type MarrakechRugCells,
} from 'shared';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import {
  ASSAM_FACING_DEG,
  ASSAM_TURN_DURATION,
  buildAssamMotionSegments,
  type AssamWayPoint,
} from '../assamMotion';
import {
  DEFAULT_MARRAKECH_LAYOUT,
  allCells,
  cellCenter,
  posStyle,
  rugBox,
  type MarrakechBoardLayout,
} from '../boardLayout';
import { AssamToken } from './AssamToken';

type Props = {
  rugs: MarrakechRug[];
  assam: MarrakechAssam;
  layout?: MarrakechBoardLayout;
  /** Optional swirl map (layout lab). Defaults to shared MARRAKECH_SWIRLS. */
  swirls?: Record<MarrakechEdge, MarrakechExit[]>;
  /**
   * When `token` bumps, walk Assam from `from` for `steps` (die face),
   * curving through swirls. Destination should match `assam`.
   */
  assamWalk?: { from: MarrakechAssam; steps: number; token: number } | null;
  onAssamWalkComplete?: () => void;
  /** Highlight cells for first-step placement selection. */
  highlightCells?: MarrakechCell[];
  /** Partner cells after first selection. */
  partnerCells?: MarrakechCell[];
  selectedCell?: MarrakechCell | null;
  onCellClick?: (cell: MarrakechCell) => void;
  ghostPlacement?: MarrakechRugCells | null;
  ghostColor?: MarrakechColor | null;
  forceShowGrid?: boolean;
  showCellLabels?: boolean;
  showSwirls?: boolean;
  className?: string;
};

type AssamPose = { left: number; top: number; rotate: number };

function rugSrc(color: MarrakechColor): string {
  return imageMap.marrakech.rugs[color];
}

function swirlAnchor(
  layout: MarrakechBoardLayout,
  edge: MarrakechEdge,
  lane: number,
): { left: number; top: number } {
  const pitch = layout.cellPitch;
  const origin = layout.gridOrigin;
  const half = layout.cellSize / 2;
  switch (edge) {
    case 'top':
      return { left: origin.left + lane * pitch, top: origin.top - half - 2 };
    case 'bottom':
      return {
        left: origin.left + lane * pitch,
        top: origin.top + (MARRAKECH_BOARD_SIZE - 1) * pitch + half + 2,
      };
    case 'left':
      return { left: origin.left - half - 2, top: origin.top + lane * pitch };
    case 'right':
      return {
        left: origin.left + (MARRAKECH_BOARD_SIZE - 1) * pitch + half + 2,
        top: origin.top + lane * pitch,
      };
  }
}

function poseFromAssam(
  layout: MarrakechBoardLayout,
  a: MarrakechAssam,
  rotateFrom?: number,
): AssamPose {
  const pos = cellCenter(layout, a.cell);
  const target = ASSAM_FACING_DEG[a.facing];
  if (rotateFrom == null) return { left: pos.left, top: pos.top, rotate: target };
  const normalized = ((rotateFrom % 360) + 360) % 360;
  const delta = ((target - normalized + 540) % 360) - 180;
  return { left: pos.left, top: pos.top, rotate: rotateFrom + delta };
}

function segmentTimes(points: AssamWayPoint[]): number[] {
  if (points.length <= 1) return [0];
  const n = points.length - 1;
  return points.map((_, i) => i / n);
}

export function MarrakechBoard({
  rugs,
  assam,
  layout = DEFAULT_MARRAKECH_LAYOUT,
  swirls = MARRAKECH_SWIRLS,
  assamWalk = null,
  onAssamWalkComplete,
  highlightCells = [],
  partnerCells = [],
  selectedCell = null,
  onCellClick,
  ghostPlacement = null,
  ghostColor = null,
  forceShowGrid = false,
  showCellLabels = false,
  showSwirls = false,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();
  const highlightSet = new Set(highlightCells);
  const partnerSet = new Set(partnerCells);

  const wrapRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<AssamPose>(() => poseFromAssam(layout, assam));
  const poseRef = useRef(pose);
  poseRef.current = pose;

  const prevAssamRef = useRef(assam);
  const lastWalkTokenRef = useRef<number | null>(null);
  const walkingRef = useRef(false);
  const animGen = useRef(0);
  const onCompleteRef = useRef(onAssamWalkComplete);
  onCompleteRef.current = onAssamWalkComplete;

  // Recenter when layout knobs change during a quiet moment (lab).
  useEffect(() => {
    if (walkingRef.current) return;
    setPose((prev) => poseFromAssam(layout, assam, prev.rotate));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only layout geometry
  }, [
    layout.gridOrigin.left,
    layout.gridOrigin.top,
    layout.cellPitch,
    layout.cellSize,
    layout.assamSize,
  ]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const token = tokenRef.current;
    const prev = prevAssamRef.current;

    const applyPose = (next: AssamPose) => {
      setPose(next);
      if (wrap) {
        wrap.style.left = `${next.left}%`;
        wrap.style.top = `${next.top}%`;
      }
      if (token) token.style.transform = `rotate(${next.rotate}deg)`;
    };

    // --- Walk along die path (incl. swirl arcs) ---
    if (assamWalk && assamWalk.token !== lastWalkTokenRef.current) {
      lastWalkTokenRef.current = assamWalk.token;
      prevAssamRef.current = assam;
      const gen = ++animGen.current;

      const finish = () => {
        walkingRef.current = false;
        applyPose(poseFromAssam(layout, assam, poseRef.current.rotate));
        onCompleteRef.current?.();
      };

      if (!wrap || !token || reduceMotion || assamWalk.steps <= 0) {
        finish();
        return;
      }

      walkingRef.current = true;
      const segments = buildAssamMotionSegments(assamWalk.from, assamWalk.steps, layout, swirls);
      if (segments.length === 0) {
        finish();
        return;
      }

      let cancelled = false;
      const run = async () => {
        const start = poseFromAssam(layout, assamWalk.from);
        applyPose(start);

        for (const seg of segments) {
          if (cancelled || gen !== animGen.current) return;
          const lefts = seg.points.map((p) => `${p.left}%`);
          const tops = seg.points.map((p) => `${p.top}%`);
          const rotates = seg.points.map((p) => p.rotate);
          const times = segmentTimes(seg.points);
          await Promise.all([
            animate(
              wrap,
              { left: lefts, top: tops },
              { duration: seg.duration, times, ease: 'linear' },
            ),
            animate(
              token,
              { rotate: rotates },
              { duration: seg.duration, times, ease: 'easeInOut' },
            ),
          ]);
          const last = seg.points[seg.points.length - 1]!;
          applyPose({ left: last.left, top: last.top, rotate: last.rotate });
        }

        if (cancelled || gen !== animGen.current) return;
        finish();
      };

      void run();
      return () => {
        cancelled = true;
        walkingRef.current = false;
      };
    }

    // --- No walk: react to assam prop changes (facing / snap) ---
    if (walkingRef.current) return;
    if (prev.cell === assam.cell && prev.facing === assam.facing) return;
    prevAssamRef.current = assam;

    const next = poseFromAssam(layout, assam, poseRef.current.rotate);
    if (prev.cell !== assam.cell || reduceMotion || !token) {
      applyPose(next);
      return;
    }

    // In-place facing turn
    const gen = ++animGen.current;
    const from = poseRef.current.rotate;
    void animate(
      token,
      { rotate: [from, next.rotate] },
      { duration: ASSAM_TURN_DURATION, ease: 'easeOut' },
    ).then(() => {
      if (gen !== animGen.current) return;
      applyPose(next);
    });
  }, [assam, assamWalk, layout, swirls, reduceMotion]);

  return (
    <div className={cn('mk-board', className)}>
      <img
        src={imageMap.marrakech.board}
        alt="กระดาน Marrakech"
        className="mk-board__art"
        draggable={false}
      />

      {rugs.map((rug) => {
        const box = rugBox(layout, rug.cells);
        const src = rugSrc(rug.color);
        return (
          <div
            key={rug.id}
            className={cn(
              'mk-rug',
              !box.horizontal && 'mk-rug--vert',
              rug.ownerId === '' && 'mk-rug--neutral',
            )}
            style={{
              left: `${box.left}%`,
              top: `${box.top}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
            }}
            title={`${rug.color}${rug.ownerId === '' ? ' (neutral)' : ''}`}
          >
            <img src={src} alt="" draggable={false} />
          </div>
        );
      })}

      {ghostPlacement && ghostColor
        ? (() => {
            const box = rugBox(layout, ghostPlacement);
            return (
              <div
                className={cn('mk-rug', 'mk-rug--ghost', !box.horizontal && 'mk-rug--vert')}
                style={{
                  left: `${box.left}%`,
                  top: `${box.top}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                }}
              >
                <img src={rugSrc(ghostColor)} alt="" draggable={false} />
              </div>
            );
          })()
        : null}

      {(forceShowGrid || onCellClick || showCellLabels) &&
        allCells().map((cell) => {
          const pos = cellCenter(layout, cell);
          const isHi = highlightSet.has(cell);
          const isPartner = partnerSet.has(cell);
          const isSel = selectedCell === cell;
          return (
            <button
              key={cell}
              type="button"
              className={cn(
                'mk-cell',
                forceShowGrid && 'mk-cell--grid',
                isHi && 'mk-cell--hi',
                isPartner && 'mk-cell--partner',
                isSel && 'mk-cell--sel',
              )}
              style={{
                ...posStyle(pos),
                width: `${layout.cellSize}%`,
              }}
              disabled={!onCellClick || (!isHi && !isPartner && !isSel)}
              onClick={() => onCellClick?.(cell)}
              aria-label={
                isSel
                  ? `ช่อง ${rowOf(cell)},${colOf(cell)} — กดอีกครั้งเพื่อยกเลิก`
                  : `ช่อง ${rowOf(cell)},${colOf(cell)}`
              }
            >
              {showCellLabels ? (
                <span className="mk-cell__label">
                  {rowOf(cell)},{colOf(cell)}
                </span>
              ) : null}
            </button>
          );
        })}

      {showSwirls
        ? (['top', 'bottom', 'left', 'right'] as const).map((edge) =>
            (swirls[edge] ?? MARRAKECH_SWIRLS[edge]).map((exit, lane) => {
              const pos = swirlAnchor(layout, edge, lane);
              return (
                <div
                  key={`${edge}-${lane}`}
                  className="mk-swirl"
                  style={posStyle(pos)}
                  title={`${edge}[${lane}] → ${exit.lane} ${exit.facing}`}
                >
                  {lane}→{exit.lane}
                </div>
              );
            }),
          )
        : null}

      <div
        ref={wrapRef}
        className="mk-assam-wrap"
        style={{
          left: `${pose.left}%`,
          top: `${pose.top}%`,
          width: `${layout.assamSize}%`,
        }}
      >
        <div
          ref={tokenRef}
          className="mk-assam-spin"
          style={{ transform: `rotate(${pose.rotate}deg)` }}
        >
          <AssamToken label={`Assam หัน${assam.facing}`} />
        </div>
      </div>
    </div>
  );
}
