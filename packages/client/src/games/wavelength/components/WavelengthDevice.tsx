import {
  useCallback,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { WavelengthTarget, WavelengthTeam } from 'shared';
import { wavelengthNeedleDegrees } from 'shared';
import { cn } from '../../../utils/cn';
import { DEFAULT_WAVELENGTH_LAYOUT, type WavelengthBoardLayout } from '../boardLayout';
import '../wavelength.css';

type Props = {
  layout?: WavelengthBoardLayout;
  deviceUrl?: string;
  leftLabel?: string | null;
  rightLabel?: string | null;
  dial?: number | null;
  target?: WavelengthTarget | null;
  screenOpen?: boolean;
  scores?: Record<WavelengthTeam, number>;
  interactive?: boolean;
  showGuides?: boolean;
  onDialChange?: (position: number) => void;
};

const FACE_R = 41.2;
const WEDGE_R = 40.4;
const LABEL_R = 31.8;
const SCALLOP_R = 45.2;
const SCALLOP_TEETH = 30;
const SCALLOP_DEPTH = 3.8;

const BOWL_STARS: ReadonlyArray<{ x: number; y: number; r: number }> = [
  { x: 28, y: 64, r: 0.55 },
  { x: 36, y: 72, r: 0.4 },
  { x: 44, y: 66, r: 0.7 },
  { x: 52, y: 78, r: 0.45 },
  { x: 58, y: 69, r: 0.35 },
  { x: 66, y: 74, r: 0.6 },
  { x: 73, y: 63, r: 0.4 },
  { x: 33, y: 81, r: 0.3 },
  { x: 48, y: 86, r: 0.5 },
  { x: 61, y: 83, r: 0.32 },
  { x: 70, y: 80, r: 0.38 },
  { x: 40, y: 60, r: 0.28 },
];

function overlayBox(box: {
  left: number;
  top: number;
  width: number;
  height: number;
}): CSSProperties {
  return {
    left: `${box.left}%`,
    top: `${box.top}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
  };
}

function polar(pos: number, radius: number): { x: number; y: number } {
  const theta = Math.PI * (1 - pos);
  return { x: 50 + radius * Math.cos(theta), y: 50 - radius * Math.sin(theta) };
}

function pieSlice(from: number, to: number, radius: number): string {
  const start = Math.min(1, Math.max(0, from));
  const end = Math.min(1, Math.max(0, to));
  if (end <= start) return '';
  const a = polar(start, radius);
  const b = polar(end, radius);
  const large = end - start > 0.5 ? 1 : 0;
  return `M 50 50 L ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
}

function scallopPath(cx: number, cy: number, radius: number, teeth: number, depth: number): string {
  const parts: string[] = [];
  for (let i = 0; i < teeth; i += 1) {
    const a0 = (i / teeth) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / teeth) * Math.PI * 2 - Math.PI / 2;
    const mid = (a0 + a1) / 2;
    const x0 = cx + radius * Math.cos(a0);
    const y0 = cy + radius * Math.sin(a0);
    const xm = cx + (radius + depth) * Math.cos(mid);
    const ym = cy + (radius + depth) * Math.sin(mid);
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy + radius * Math.sin(a1);
    if (i === 0) parts.push(`M ${x0.toFixed(2)} ${y0.toFixed(2)}`);
    parts.push(`Q ${xm.toFixed(2)} ${ym.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

function lowerBowlPath(radius: number): string {
  const left = polar(0, radius);
  const right = polar(1, radius);
  return `M ${left.x.toFixed(2)} ${left.y.toFixed(2)} A ${radius} ${radius} 0 0 0 ${right.x.toFixed(2)} ${right.y.toFixed(2)} Z`;
}

function upperRimPath(radius: number): string {
  const left = polar(0, radius);
  const right = polar(1, radius);
  return `M ${left.x.toFixed(2)} ${left.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${right.x.toFixed(2)} ${right.y.toFixed(2)}`;
}

function upperFacePath(radius: number): string {
  return `${upperRimPath(radius)} L 50 50 Z`;
}

function pointerToDial(
  clientX: number,
  clientY: number,
  board: HTMLElement,
  layout: WavelengthBoardLayout,
): number {
  const rect = board.getBoundingClientRect();
  const originX = rect.left + (layout.dialOrigin.left / 100) * rect.width;
  const originY = rect.top + (layout.dialOrigin.top / 100) * rect.height;
  const deg = (Math.atan2(clientX - originX, -(clientY - originY)) * 180) / Math.PI;
  const clamped = Math.min(90, Math.max(-90, deg));
  return (clamped + 90) / 180;
}

export function WavelengthDevice({
  layout = DEFAULT_WAVELENGTH_LAYOUT,
  deviceUrl = '',
  leftLabel,
  rightLabel,
  dial,
  target,
  screenOpen = false,
  scores = { orange: 0, purple: 1 },
  interactive = false,
  showGuides = false,
  onDialChange,
}: Props) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const uid = useId().replace(/:/g, '');
  const clipId = `wl-face-${uid}`;
  const needleFillId = `wl-needle-${uid}`;

  const emitDial = useCallback(
    (clientX: number, clientY: number) => {
      if (!onDialChange || !fieldRef.current) return;
      onDialChange(pointerToDial(clientX, clientY, fieldRef.current, layout));
    },
    [layout, onDialChange],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || !onDialChange) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    emitDial(event.clientX, event.clientY);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    emitDial(event.clientX, event.clientY);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const frame = useMemo(
    () => ({
      scallop: scallopPath(50, 50, SCALLOP_R, SCALLOP_TEETH, SCALLOP_DEPTH),
      bowl: lowerBowlPath(FACE_R),
      rim: upperRimPath(FACE_R),
      upperFace: upperFacePath(FACE_R),
    }),
    [],
  );

  const wedges = useMemo(() => {
    if (!target || !screenOpen) return null;
    const { center, halfWidth2, halfWidth3, halfWidth4 } = target;
    const slices = [
      {
        id: '2',
        d: pieSlice(center - halfWidth2, center + halfWidth2, WEDGE_R),
        fill: 'var(--wl-band-2)',
      },
      {
        id: '3',
        d: pieSlice(center - halfWidth3, center + halfWidth3, WEDGE_R),
        fill: 'var(--wl-band-3)',
      },
      {
        id: '4',
        d: pieSlice(center - halfWidth4, center + halfWidth4, WEDGE_R),
        fill: 'var(--wl-band-4)',
      },
    ].filter((slice) => slice.d);
    const labels = [
      { id: '2l', score: 2, from: center - halfWidth2, to: center - halfWidth3 },
      { id: '3l', score: 3, from: center - halfWidth3, to: center - halfWidth4 },
      { id: '4', score: 4, from: center - halfWidth4, to: center + halfWidth4 },
      { id: '3r', score: 3, from: center + halfWidth4, to: center + halfWidth3 },
      { id: '2r', score: 2, from: center + halfWidth3, to: center + halfWidth2 },
    ].flatMap((band) => {
      const from = Math.min(1, Math.max(0, band.from));
      const to = Math.min(1, Math.max(0, band.to));
      if (to - from < 0.012) return [];
      return [{ id: band.id, score: band.score, ...polar((from + to) / 2, LABEL_R) }];
    });
    return { slices, labels };
  }, [target, screenOpen]);

  const needleVisible = dial != null;
  const wheelSize = layout.dialRadius * 2;
  const needleWidth = layout.needleSize * 0.13;
  const orangeSlot = Math.min(10, scores.orange);
  const purpleSlot = Math.min(10, scores.purple);
  const tiedOnTrack = orangeSlot === purpleSlot;

  return (
    <div
      className={cn('wl-device', interactive && 'cursor-crosshair')}
      style={deviceUrl.trim() ? { backgroundImage: `url("${deviceUrl.trim()}")` } : undefined}
    >
      <div
        ref={fieldRef}
        className="wl-device__field"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="wl-overlay wl-wheel"
          style={{
            left: `${layout.dialOrigin.left}%`,
            top: `${layout.dialOrigin.top}%`,
            width: `${wheelSize}%`,
          }}
        >
          <svg viewBox="0 0 100 100" aria-hidden>
            <defs>
              <clipPath id={clipId}>
                <path d={frame.upperFace} />
              </clipPath>
            </defs>
            <path d={frame.scallop} fill="var(--wl-navy)" />
            <circle cx="50" cy="50" r={FACE_R} fill="var(--wl-cream)" />
            <g clipPath={`url(#${clipId})`}>
              {wedges?.slices.map((slice) => (
                <path key={slice.id} d={slice.d} fill={slice.fill} />
              ))}
            </g>
            <path d={frame.bowl} fill="var(--wl-navy)" />
            {BOWL_STARS.map((star) => (
              <circle
                key={`${star.x}-${star.y}`}
                cx={star.x}
                cy={star.y}
                r={star.r}
                fill="var(--wl-star)"
              />
            ))}
            <path
              d={frame.rim}
              fill="none"
              stroke="var(--wl-navy)"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            {wedges?.labels.map((label) => (
              <text
                key={label.id}
                className="wl-wedge-label"
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="6.2"
              >
                {label.score}
              </text>
            ))}
          </svg>
        </div>

        {needleVisible ? (
          <div
            className="wl-overlay wl-needle"
            style={
              {
                left: `${layout.dialOrigin.left}%`,
                top: `${layout.dialOrigin.top}%`,
                width: `${needleWidth}%`,
                height: `${layout.needleSize}%`,
                '--wl-deg': `${wavelengthNeedleDegrees(dial)}deg`,
              } as CSSProperties
            }
          >
            <svg className="wl-needle__shaft" viewBox="0 0 24 104" aria-hidden>
              <defs>
                <linearGradient id={needleFillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff6b6b" />
                  <stop offset="42%" stopColor="#e23b3b" />
                  <stop offset="100%" stopColor="#c81f32" />
                </linearGradient>
              </defs>
              <polygon className="wl-needle__outline" points="12,3 23,102 1,102" />
              <polygon
                className="wl-needle__body"
                fill={`url(#${needleFillId})`}
                points="12,3 23,102 1,102"
              />
            </svg>
          </div>
        ) : null}

        <div
          className="wl-overlay wl-hub"
          style={{
            left: `${layout.dialOrigin.left}%`,
            top: `${layout.dialOrigin.top}%`,
          }}
          aria-hidden
        />

        <div className="wl-overlay wl-card" style={overlayBox(layout.cardSlot)}>
          <span className="wl-card__end">{leftLabel ?? '—'}</span>
          <span className="wl-card__vs" aria-hidden>
            ↔
          </span>
          <span className="wl-card__end">{rightLabel ?? '—'}</span>
        </div>

        <div className="wl-overlay wl-score" style={overlayBox(layout.scoreTrack)}>
          <div className="wl-score__plate" />
          <div className="wl-score__rail" />
          <div className="wl-score__marks">
            {Array.from({ length: 11 }, (_, point) => (
              <span
                key={point}
                className="wl-score__tick"
                style={{ left: `${(point / 10) * 100}%` }}
              >
                {point}
              </span>
            ))}
            <span
              className={cn(
                'wl-score__pawn',
                'wl-score__pawn--orange',
                tiedOnTrack && 'wl-score__pawn--shift-left',
              )}
              style={{ left: `${(orangeSlot / 10) * 100}%` }}
              title={`ส้ม ${scores.orange}`}
            />
            <span
              className={cn(
                'wl-score__pawn',
                'wl-score__pawn--purple',
                tiedOnTrack && 'wl-score__pawn--shift-right',
              )}
              style={{ left: `${(purpleSlot / 10) * 100}%` }}
              title={`ม่วง ${scores.purple}`}
            />
          </div>
        </div>

        {showGuides ? (
          <>
            <div
              className="wl-overlay wl-guide wl-guide--circle"
              style={{
                left: `${layout.dialOrigin.left}%`,
                top: `${layout.dialOrigin.top}%`,
                width: `${wheelSize}%`,
              }}
            />
            <div
              className="wl-overlay wl-guide--origin"
              style={{
                left: `${layout.dialOrigin.left}%`,
                top: `${layout.dialOrigin.top}%`,
              }}
            />
            <div className="wl-overlay wl-guide" style={overlayBox(layout.cardSlot)} />
            <div className="wl-overlay wl-guide" style={overlayBox(layout.scoreTrack)} />
          </>
        ) : null}
      </div>
    </div>
  );
}
