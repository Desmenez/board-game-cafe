import { useMemo } from 'react';
import type { TtrMapDefinition } from 'shared';
import type { TtrBoardLayout } from '../boardGeometry';

type Props = {
  map: TtrMapDefinition;
  layout: TtrBoardLayout;
  a: string;
  b: string;
};

/** Mini map for a destination ticket: faint network plus the two endpoints. */
export function TtrTicketPreview({ map, layout, a, b }: Props) {
  const guide = useMemo(() => {
    const aspect = layout.aspectRatio;
    const at = (cityId: string): { x: number; y: number } | null => {
      const p = layout.cities[cityId];
      return p ? { x: p.left, y: p.top / aspect } : null;
    };
    return {
      height: 100 / aspect,
      lines: map.routes.flatMap((r) => {
        const pa = at(r.a);
        const pb = at(r.b);
        return pa && pb ? [{ id: r.id, x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y }] : [];
      }),
      pa: at(a),
      pb: at(b),
    };
  }, [a, b, layout, map]);

  if (!guide.pa || !guide.pb) {
    return (
      <div className="ttr-ticket-preview-fallback" aria-hidden>
        <span className="ttr-ticket-preview-fallback-city">{a}</span>
        <span className="ttr-ticket-preview-fallback-gap">· · ·</span>
        <span className="ttr-ticket-preview-fallback-city">{b}</span>
      </div>
    );
  }

  return (
    <svg className="ttr-ticket-preview-svg" viewBox={`0 0 100 ${guide.height}`} aria-hidden>
      <rect
        className="ttr-ticket-preview-bg"
        x="0"
        y="0"
        width="100"
        height={guide.height}
        rx="4"
      />
      <g className="ttr-ticket-preview-guide">
        {guide.lines.map((l) => (
          <line
            key={l.id}
            className="ttr-ticket-preview-guide-line"
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
          />
        ))}
      </g>
      <line
        className="ttr-ticket-preview-line"
        x1={guide.pa.x}
        y1={guide.pa.y}
        x2={guide.pb.x}
        y2={guide.pb.y}
      />
      {[guide.pa, guide.pb].map((p, i) => (
        <g key={i}>
          <circle
            className="ttr-ticket-preview-dot ttr-ticket-preview-dot--halo"
            cx={p.x}
            cy={p.y}
            r="2.6"
          />
          <circle className="ttr-ticket-preview-dot" cx={p.x} cy={p.y} r="1.8" />
        </g>
      ))}
    </svg>
  );
}
