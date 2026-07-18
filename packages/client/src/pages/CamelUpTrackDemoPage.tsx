import { useCallback, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { CAMEL_UP_TRACK_LENGTH } from 'shared';
import { camelUpMapUrl } from '../games/camel-up/lib/assetMeta';
import { CAMEL_UP_MAP_SPACE_POSITIONS } from '../games/camel-up/lib/trackPositions';
import { Button } from '../components/ui';
import '../games/camel-up/camel-up.css';

type Positions = Record<number, { x: number; y: number }>;

const ALL_SPACES = Array.from({ length: CAMEL_UP_TRACK_LENGTH }, (_, i) => i + 1);

function clonePositions(source: Positions): Positions {
  return Object.fromEntries(ALL_SPACES.map((space) => [space, { ...source[space]! }])) as Positions;
}

function pointerToPercent(
  board: DOMRect,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const x = ((clientX - board.left) / board.width) * 100;
  const y = ((clientY - board.top) / board.height) * 100;
  return {
    x: Math.round(Math.min(100, Math.max(0, x)) * 10) / 10,
    y: Math.round(Math.min(100, Math.max(0, y)) * 10) / 10,
  };
}

function formatPositionsTs(positions: Positions): string {
  const lines = ALL_SPACES.map((space) => {
    const p = positions[space]!;
    return `  ${space}: { x: ${p.x}, y: ${p.y} },`;
  });
  return `export const CAMEL_UP_MAP_SPACE_POSITIONS = {\n${lines.join('\n')}\n};`;
}

export function CamelUpTrackDemoPage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Positions>(() =>
    clonePositions(CAMEL_UP_MAP_SPACE_POSITIONS),
  );
  const [dragSpace, setDragSpace] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const sortedRows = useMemo(
    () => ALL_SPACES.map((space) => ({ space, ...positions[space]! })),
    [positions],
  );

  const onPointerDown = useCallback(
    (space: number) => (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragSpace(space);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (dragSpace === null || !boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const next = pointerToPercent(rect, e.clientX, e.clientY);
      setPositions((prev) => ({
        ...prev,
        [dragSpace]: next,
      }));
    },
    [dragSpace],
  );

  const onPointerUp = useCallback(() => {
    setDragSpace(null);
  }, []);

  const reset = useCallback(() => {
    setPositions(clonePositions(CAMEL_UP_MAP_SPACE_POSITIONS));
  }, []);

  const copySnippet = useCallback(async () => {
    await navigator.clipboard.writeText(formatPositionsTs(positions));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [positions]);

  const mapUrl = camelUpMapUrl();

  return (
    <main className="page container camel-up-track-demo">
      <header className="camel-up-track-demo__header">
        <div>
          <p className="camel-up-track-demo__kicker">Dev only</p>
          <h1>Camel Up — จำลองตำแหน่งช่อง 1–16</h1>
          <p className="camel-up-track-demo__lead">
            ลาก marker เพื่อจัดตำแหน่ง แล้ว copy ค่าไปวางใน <code>trackPositions.ts</code>
          </p>
        </div>
        <Link to="/">← กลับหน้าแรก</Link>
      </header>

      <div className="camel-up-track-demo__toolbar">
        <Button type="button" variant="secondary" onClick={reset}>
          รีเซ็ต
        </Button>
        <Button type="button" variant="primary" onClick={copySnippet}>
          {copied ? 'คัดลอกแล้ว!' : 'Copy เป็น TypeScript'}
        </Button>
      </div>

      <div
        ref={boardRef}
        className="camel-up-track__board camel-up-track__board--debug camel-up-track-demo__board"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img src={mapUrl} alt="" className="camel-up-track__map" loading="eager" decoding="async" />
        <div className="camel-up-track__overlay">
          {ALL_SPACES.map((space) => {
            const pos = positions[space]!;
            return (
              <button
                key={space}
                type="button"
                className={[
                  'camel-up-track__marker',
                  space === 1 ? 'camel-up-track__marker--start' : '',
                  dragSpace === space ? 'camel-up-track__marker--dragging' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onPointerDown={onPointerDown(space)}
                aria-label={`ช่อง ${space}`}
              >
                {space}
              </button>
            );
          })}
        </div>
      </div>

      <section className="card camel-up-track-demo__table-wrap">
        <h2>ค่าปัจจุบัน (% ของแผนที่)</h2>
        <div className="camel-up-track-demo__table-scroll">
          <table className="camel-up-track-demo__table">
            <thead>
              <tr>
                <th>ช่อง</th>
                <th>x</th>
                <th>y</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.space}>
                  <td>{row.space === 1 ? '1 (start/finish)' : row.space}</td>
                  <td>
                    <code>{row.x}</code>
                  </td>
                  <td>
                    <code>{row.y}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card camel-up-track-demo__snippet">
        <h2>Snippet สำหรับ trackPositions.ts</h2>
        <pre className="camel-up-track-demo__pre">{formatPositionsTs(positions)}</pre>
      </section>
    </main>
  );
}
