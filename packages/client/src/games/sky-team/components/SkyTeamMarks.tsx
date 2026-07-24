import type { CSSProperties } from 'react';

type MarkTone = 'blue' | 'orange' | 'red';

const FILL: Record<MarkTone, string> = {
  blue: '#2f6fed',
  orange: '#f07a1a',
  red: '#e11d2e',
};

/**
 * Chevron / home-plate mark (reference image 2) — points right by default.
 */
export function SkyTeamTrackMark({
  tone,
  className,
  style,
  title,
  rotate = 0,
}: {
  tone: MarkTone;
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Degrees clockwise. */
  rotate?: number;
}) {
  return (
    <div
      className={['st-track-mark', className].filter(Boolean).join(' ')}
      style={{ ...style, ['--st-mark-rot' as string]: `${rotate}deg` }}
      title={title}
      aria-hidden={!title}
    >
      <svg viewBox="0 0 40 36" className="st-track-mark__svg" aria-hidden>
        <path
          d="M3 2.5 H21 L37 18 L21 33.5 H3 Q1.5 33.5 1.5 32 V4 Q1.5 2.5 3 2.5 Z"
          fill={FILL[tone]}
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
