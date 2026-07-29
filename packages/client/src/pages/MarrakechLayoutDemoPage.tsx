import { useCallback, useMemo, useState } from 'react';
import {
  MARRAKECH_SWIRLS,
  cellOf,
  moveAssam,
  type MarrakechAssam,
  type MarrakechEdge,
  type MarrakechExit,
  type MarrakechFacing,
  type MarrakechRug,
} from 'shared';
import { Link } from 'react-router-dom';
import { Button, Slider } from '../components/ui';
import {
  DEFAULT_MARRAKECH_LAYOUT,
  type MarrakechBoardLayout,
} from '../games/marrakech/boardLayout';
import { MarrakechBoard } from '../games/marrakech/components/MarrakechBoard';
import '../games/marrakech/marrakech.css';

type EditTarget = 'originLeft' | 'originTop' | 'cellPitch' | 'cellSize' | 'assamSize';

/** Slider bounds per knob — wide enough to reach any sane value for a 1000x1000 board. */
const TARGETS: { id: EditTarget; label: string; min: number; max: number }[] = [
  { id: 'originLeft', label: 'Origin left %', min: 0, max: 40 },
  { id: 'originTop', label: 'Origin top %', min: 0, max: 40 },
  { id: 'cellPitch', label: 'Cell pitch %', min: 4, max: 20 },
  { id: 'cellSize', label: 'Cell size %', min: 2, max: 22 },
  { id: 'assamSize', label: 'Assam size %', min: 2, max: 20 },
];

function getScalar(layout: MarrakechBoardLayout, target: EditTarget): number {
  switch (target) {
    case 'originLeft':
      return layout.gridOrigin.left;
    case 'originTop':
      return layout.gridOrigin.top;
    case 'cellPitch':
      return layout.cellPitch;
    case 'cellSize':
      return layout.cellSize;
    case 'assamSize':
      return layout.assamSize;
  }
}

function setScalar(layout: MarrakechBoardLayout, target: EditTarget, value: number): MarrakechBoardLayout {
  const v = Math.round(value * 10) / 10;
  switch (target) {
    case 'originLeft':
      return { ...layout, gridOrigin: { ...layout.gridOrigin, left: v } };
    case 'originTop':
      return { ...layout, gridOrigin: { ...layout.gridOrigin, top: v } };
    case 'cellPitch':
      return { ...layout, cellPitch: v };
    case 'cellSize':
      return { ...layout, cellSize: v };
    case 'assamSize':
      return { ...layout, assamSize: v };
  }
}

const DEMO_RUGS: MarrakechRug[] = [
  { id: 1, ownerId: 'a', color: 'rug-1', cells: [cellOf(2, 2), cellOf(2, 3)] },
  { id: 2, ownerId: 'b', color: 'rug-2', cells: [cellOf(3, 4), cellOf(4, 4)] },
  { id: 3, ownerId: 'c', color: 'rug-3', cells: [cellOf(5, 1), cellOf(5, 2)] },
];

export function MarrakechLayoutDemoPage() {
  const [layout, setLayout] = useState<MarrakechBoardLayout>(() =>
    structuredClone(DEFAULT_MARRAKECH_LAYOUT),
  );
  const [target, setTarget] = useState<EditTarget>('originLeft');
  const [copied, setCopied] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showSwirls, setShowSwirls] = useState(true);
  const [assam, setAssam] = useState<MarrakechAssam>({ cell: 24, facing: 'up' });
  const [walkSteps, setWalkSteps] = useState(1);
  const [swirls, setSwirls] = useState<Record<MarrakechEdge, MarrakechExit[]>>(() =>
    structuredClone(MARRAKECH_SWIRLS),
  );
  const [path, setPath] = useState<MarrakechAssam[]>([]);
  const [assamWalk, setAssamWalk] = useState<{
    from: MarrakechAssam;
    steps: number;
    token: number;
  } | null>(null);

  const activeTarget = TARGETS.find((t) => t.id === target) ?? TARGETS[0]!;

  const nudge = useCallback(
    (delta: number) => {
      setLayout((prev) => {
        const { min, max } = TARGETS.find((t) => t.id === target) ?? TARGETS[0]!;
        const next = Math.min(max, Math.max(min, getScalar(prev, target) + delta));
        return setScalar(prev, target, next);
      });
    },
    [target],
  );

  const exportJson = async () => {
    const text = JSON.stringify(layout, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const exportSwirls = async () => {
    const text = `export const MARRAKECH_SWIRLS = ${JSON.stringify(swirls, null, 2)} as const;`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const walk = () => {
    if (assamWalk) return;
    const from = assam;
    const trail: MarrakechAssam[] = [from];
    let cur = from;
    for (let i = 0; i < walkSteps; i++) {
      cur = moveAssam(cur, 1, swirls);
      trail.push(cur);
    }
    setPath(trail);
    setAssamWalk({ from, steps: walkSteps, token: Date.now() });
    setAssam(cur);
  };

  const setFacing = (facing: MarrakechFacing) => setAssam((a) => ({ ...a, facing }));

  const editSwirlLane = (edge: MarrakechEdge, lane: number, field: 'lane' | 'facing', value: string) => {
    setSwirls((prev) => {
      const next = structuredClone(prev);
      const exit = next[edge][lane]!;
      if (field === 'lane') {
        exit.lane = Math.max(0, Math.min(6, Number(value) || 0));
      } else {
        exit.facing = value as MarrakechFacing;
      }
      return next;
    });
  };

  const pathLabel = useMemo(
    () =>
      path
        .map((p) => {
          const r = Math.floor(p.cell / 7);
          const c = p.cell % 7;
          return `(${r},${c})→${p.facing}`;
        })
        .join(' · '),
    [path],
  );

  return (
    <div className="page app-night-page mk-demo min-h-dvh p-4 md:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs opacity-60">
              <Link to="/" className="underline">
                Home
              </Link>{' '}
              · /dev/marrakech-layout
            </p>
            <h1 className="text-xl font-bold">Marrakech layout lab</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={exportJson}>
              {copied ? 'Copied!' : 'Copy layout JSON'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={exportSwirls}>
              Copy swirls
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setLayout(structuredClone(DEFAULT_MARRAKECH_LAYOUT))}
            >
              Reset layout
            </Button>
          </div>
        </header>

        <div className="grid md:grid-cols-[1fr_320px] gap-4 items-start">
          <MarrakechBoard
            rugs={DEMO_RUGS}
            assam={assam}
            layout={layout}
            swirls={swirls}
            assamWalk={assamWalk}
            onAssamWalkComplete={() => setAssamWalk(null)}
            forceShowGrid={showGrid}
            showCellLabels={showLabels}
            showSwirls={showSwirls}
          />

          <aside className="card p-3 space-y-4 text-sm">
            <section className="space-y-2">
              <h2 className="font-semibold">Grid calibration</h2>
              <div className="flex flex-wrap gap-1">
                {TARGETS.map((t) => (
                  <Button
                    key={t.id}
                    type="button"
                    size="xs"
                    variant={target === t.id ? 'primary' : 'ghost'}
                    onClick={() => setTarget(t.id)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
              <Slider
                label={activeTarget.label}
                valueLabel={`${getScalar(layout, target)}%`}
                hint={`${activeTarget.min} – ${activeTarget.max}`}
                min={activeTarget.min}
                max={activeTarget.max}
                step={0.1}
                value={getScalar(layout, target)}
                onChange={(e) =>
                  setLayout((prev) => setScalar(prev, target, Number(e.target.value)))
                }
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2">
                  Value
                  <input
                    type="number"
                    step={0.1}
                    min={activeTarget.min}
                    max={activeTarget.max}
                    className="input w-20"
                    value={getScalar(layout, target)}
                    onChange={(e) =>
                      setLayout((prev) => setScalar(prev, target, Number(e.target.value)))
                    }
                  />
                </label>
                <Button type="button" size="xs" variant="ghost" onClick={() => nudge(-0.1)}>
                  −0.1
                </Button>
                <Button type="button" size="xs" variant="ghost" onClick={() => nudge(0.1)}>
                  +0.1
                </Button>
                <Button type="button" size="xs" onClick={() => nudge(-0.5)}>
                  −0.5
                </Button>
                <Button type="button" size="xs" onClick={() => nudge(0.5)}>
                  +0.5
                </Button>
              </div>
              <p className="text-xs opacity-60">
                Origin ({layout.gridOrigin.left}, {layout.gridOrigin.top}) · pitch {layout.cellPitch} ·
                size {layout.cellSize}
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                  Grid
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                  />
                  Labels
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={showSwirls}
                    onChange={(e) => setShowSwirls(e.target.checked)}
                  />
                  Swirls
                </label>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold">Assam walk tracer</h2>
              <div className="flex flex-wrap gap-1">
                {(['up', 'right', 'down', 'left'] as const).map((f) => (
                  <Button
                    key={f}
                    type="button"
                    size="xs"
                    variant={assam.facing === f ? 'primary' : 'ghost'}
                    onClick={() => setFacing(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
              <label className="flex items-center gap-2">
                Steps
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="input w-16"
                  value={walkSteps}
                  onChange={(e) => setWalkSteps(Number(e.target.value) || 1)}
                />
              </label>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={walk} disabled={assamWalk != null}>
                  Walk
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAssamWalk(null);
                    setAssam({ cell: 24, facing: 'up' });
                    setPath([]);
                  }}
                >
                  Reset Assam
                </Button>
              </div>
              {pathLabel ? <p className="text-xs opacity-70 break-all">{pathLabel}</p> : null}
            </section>

            <section className="space-y-2 max-h-64 overflow-auto">
              <h2 className="font-semibold">Swirl editor</h2>
              <p className="text-xs opacity-60">
                Confirm pairings against the printed mosaics, then Copy swirls.
              </p>
              {(['top', 'bottom', 'left', 'right'] as const).map((edge) => (
                <div key={edge} className="space-y-1">
                  <p className="text-xs font-semibold uppercase opacity-70">{edge}</p>
                  {swirls[edge].map((exit, lane) => (
                    <div key={lane} className="flex items-center gap-1 text-xs">
                      <span className="w-4 tabular-nums">{lane}</span>
                      <span>→</span>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        className="input w-12"
                        value={exit.lane}
                        onChange={(e) => editSwirlLane(edge, lane, 'lane', e.target.value)}
                      />
                      <select
                        className="input"
                        value={exit.facing}
                        onChange={(e) => editSwirlLane(edge, lane, 'facing', e.target.value)}
                      >
                        {(['up', 'right', 'down', 'left'] as const).map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
