import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTtrMap, ttrCityName } from 'shared';
import { Button, Slider } from '../components/ui';
import { TtrDestinationCard } from '../games/ticket-to-ride/components/TtrDestinationCard';
import '../games/ticket-to-ride/ticket-to-ride.css';
import {
  UNITED_STATES_DESTINATION_CARD_LAYOUT,
  type TtrDestinationCardLayout,
  ttrMapPresentation,
} from '../games/ticket-to-ride/maps';

const MAP = getTtrMap('united-states');
const PRESENTATION = ttrMapPresentation('united-states');
const DEFAULT_LAYOUT = UNITED_STATES_DESTINATION_CARD_LAYOUT;

type Target = 'route' | 'points';

const PREVIEW_WIDTHS = [
  { id: 'dock', label: 'Dock 168px', width: 168 },
  { id: 'panel', label: 'Panel 240px', width: 240 },
  { id: 'modal', label: 'Modal 520px', width: 520 },
] as const;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatLayoutExport(layout: TtrDestinationCardLayout): string {
  return `export const UNITED_STATES_DESTINATION_CARD_LAYOUT: TtrDestinationCardLayout = ${JSON.stringify(
    layout,
    null,
    2,
  ).replace(/"([^"]+)":/g, '$1:')};\n`;
}

export function TicketToRideDestinationCardDemoPage() {
  const [layout, setLayout] = useState<TtrDestinationCardLayout>(() =>
    structuredClone(DEFAULT_LAYOUT),
  );
  const [ticketId, setTicketId] = useState(MAP.destinationTickets[0]?.id ?? '');
  const [target, setTarget] = useState<Target>('route');
  const [showOutlines, setShowOutlines] = useState(true);
  const [copied, setCopied] = useState(false);

  const tickets = MAP.destinationTickets;
  const selected = tickets.find((t) => t.id === ticketId) ??
    tickets[0] ?? {
      id: 'demo',
      a: 'seattle',
      b: 'new-york',
      points: 22,
    };

  const longestTicketId = useMemo(() => {
    let best = tickets[0]?.id ?? '';
    let bestLen = 0;
    for (const t of tickets) {
      const label = `${ttrCityName(MAP, t.a)} - ${ttrCityName(MAP, t.b)}`;
      if (label.length > bestLen) {
        bestLen = label.length;
        best = t.id;
      }
    }
    return best;
  }, [tickets]);

  const nudge = useCallback(
    (dx: number, dy: number) => {
      setLayout((prev) => {
        if (target === 'route') {
          return {
            ...prev,
            route: {
              ...prev.route,
              left: round1(prev.route.left + dx),
              top: round1(prev.route.top + dy),
            },
          };
        }
        return {
          ...prev,
          points: {
            ...prev.points,
            left: round1(prev.points.left + dx),
            top: round1(prev.points.top + dy),
          },
        };
      });
    },
    [target],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const step = e.shiftKey ? 0.5 : 0.1;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudge(-step, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudge(step, 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nudge(0, -step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nudge(0, step);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudge]);

  const copy = async () => {
    await navigator.clipboard.writeText(formatLayoutExport(layout));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const currentPos = target === 'route' ? layout.route : layout.points;

  return (
    <div className="page app-night-page ttr-dest-card-lab min-h-dvh p-4 md:p-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs opacity-60">
              <Link to="/" className="underline">
                Home
              </Link>{' '}
              · /dev/ticket-to-ride-destination-card ·{' '}
              <Link to="/dev/ticket-to-ride-layout" className="underline">
                Board layout lab
              </Link>
            </p>
            <h1 className="text-xl font-bold">Ticket to Ride destination card lab</h1>
            <p className="mt-1 text-sm opacity-70">
              Tune route text + points % on the printed template, then Copy JSON into{' '}
              <code>maps/destinationCardLayout.ts</code>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void copy()}>
              {copied ? 'Copied!' : 'Copy layout JSON'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setLayout(structuredClone(DEFAULT_LAYOUT))}
            >
              Reset
            </Button>
          </div>
        </header>

        <div className="card flex flex-wrap items-end gap-4 p-4">
          {PREVIEW_WIDTHS.map((p) => (
            <div key={p.id} className="flex flex-col gap-2">
              <p className="text-xs opacity-60">{p.label}</p>
              <div style={{ width: p.width }}>
                <TtrDestinationCard
                  map={MAP}
                  a={selected.a}
                  b={selected.b}
                  points={selected.points}
                  cardLayout={layout}
                  imageSrc={PRESENTATION.destinationCard.image}
                  showOutlines={showOutlines}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[1fr_340px]">
          <div className="card space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="opacity-70">Ticket</span>
                <select
                  className="rounded border border-white/20 bg-transparent px-2 py-1.5"
                  value={selected.id}
                  onChange={(e) => setTicketId(e.target.value)}
                >
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {ttrCityName(MAP, t.a)} - {ttrCityName(MAP, t.b)} ({t.points})
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setTicketId(longestTicketId)}
              >
                Longest city names
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOutlines}
                  onChange={(e) => setShowOutlines(e.target.checked)}
                />
                Show outlines
              </label>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold">Edit target</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={target === 'route' ? 'primary' : 'secondary'}
                  onClick={() => setTarget('route')}
                >
                  Route box
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={target === 'points' ? 'primary' : 'secondary'}
                  onClick={() => setTarget('points')}
                >
                  Points
                </Button>
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold">Nudge (arrows · Shift = 0.5%)</h2>
              <div className="inline-grid grid-cols-3 gap-1">
                <span />
                <Button type="button" size="sm" onClick={() => nudge(0, -0.1)}>
                  ↑
                </Button>
                <span />
                <Button type="button" size="sm" onClick={() => nudge(-0.1, 0)}>
                  ←
                </Button>
                <Button type="button" size="sm" onClick={() => nudge(0, 0.1)}>
                  ↓
                </Button>
                <Button type="button" size="sm" onClick={() => nudge(0.1, 0)}>
                  →
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="opacity-70">left %</span>
                <input
                  type="number"
                  step={0.1}
                  className="rounded border border-white/20 bg-transparent px-2 py-1.5"
                  value={currentPos.left}
                  onChange={(e) => {
                    const v = round1(Number(e.target.value));
                    setLayout((prev) =>
                      target === 'route'
                        ? { ...prev, route: { ...prev.route, left: v } }
                        : { ...prev, points: { ...prev.points, left: v } },
                    );
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="opacity-70">top %</span>
                <input
                  type="number"
                  step={0.1}
                  className="rounded border border-white/20 bg-transparent px-2 py-1.5"
                  value={currentPos.top}
                  onChange={(e) => {
                    const v = round1(Number(e.target.value));
                    setLayout((prev) =>
                      target === 'route'
                        ? { ...prev, route: { ...prev.route, top: v } }
                        : { ...prev, points: { ...prev.points, top: v } },
                    );
                  }}
                />
              </label>
            </div>
          </div>

          <div className="card space-y-4 p-4">
            <h2 className="text-sm font-semibold">Size knobs</h2>
            <Slider
              label="Route fontSize"
              valueLabel={`${layout.route.fontSize} cqw`}
              min={2}
              max={8}
              step={0.1}
              value={layout.route.fontSize}
              onChange={(e) =>
                setLayout((prev) => ({
                  ...prev,
                  route: { ...prev.route, fontSize: round1(Number(e.target.value)) },
                }))
              }
            />
            <Slider
              label="Route width"
              valueLabel={`${layout.route.width}%`}
              min={40}
              max={95}
              step={0.5}
              value={layout.route.width}
              onChange={(e) =>
                setLayout((prev) => ({
                  ...prev,
                  route: { ...prev.route, width: round1(Number(e.target.value)) },
                }))
              }
            />
            <Slider
              label="Points fontSize"
              valueLabel={`${layout.points.fontSize} cqw`}
              min={3}
              max={14}
              step={0.1}
              value={layout.points.fontSize}
              onChange={(e) =>
                setLayout((prev) => ({
                  ...prev,
                  points: { ...prev.points, fontSize: round1(Number(e.target.value)) },
                }))
              }
            />
            <pre className="overflow-auto rounded bg-black/30 p-3 text-xs leading-relaxed">
              {JSON.stringify(layout, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
