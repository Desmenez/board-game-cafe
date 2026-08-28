import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Slider } from '../components/ui';
import { imageMap } from '../imageMap';
import {
  DEFAULT_SURVIVE_THE_ISLAND_LAYOUT,
  type SurviveTheIslandBoardLayout,
} from '../games/survive-the-island/boardLayout';
import { SurviveTheIslandBoard } from '../games/survive-the-island/components/SurviveTheIslandBoardDemo';
import { type DemoTileAssets, type DemoTileFace } from '../games/survive-the-island/tilePreview';
import '../games/survive-the-island/survive-the-island-layout-demo.css';

type ScalarField = Exclude<keyof SurviveTheIslandBoardLayout, 'gridOrigin'>;
type EditTarget = 'originLeft' | 'originTop' | ScalarField;

const TARGETS: ReadonlyArray<{ id: EditTarget; label: string; min: number; max: number }> = [
  { id: 'originLeft', label: 'Grid origin left', min: 25, max: 75 },
  { id: 'originTop', label: 'Grid origin top', min: 25, max: 75 },
  { id: 'columnPitch', label: 'Column pitch', min: 5, max: 16 },
  { id: 'rowPitch', label: 'Row pitch', min: 5, max: 16 },
  { id: 'tileWidth', label: 'Tile width', min: 5, max: 18 },
  { id: 'adventurerSize', label: 'Adventurer size', min: 2, max: 10 },
  { id: 'raftSize', label: 'Raft size', min: 3, max: 14 },
  { id: 'creatureSize', label: 'Creature size', min: 3, max: 16 },
];

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function scalarValue(layout: SurviveTheIslandBoardLayout, target: EditTarget): number {
  if (target === 'originLeft') return layout.gridOrigin.left;
  if (target === 'originTop') return layout.gridOrigin.top;
  return layout[target];
}

function withScalar(
  layout: SurviveTheIslandBoardLayout,
  target: EditTarget,
  value: number,
): SurviveTheIslandBoardLayout {
  const next = round(value);
  if (target === 'originLeft') {
    return { ...layout, gridOrigin: { ...layout.gridOrigin, left: next } };
  }
  if (target === 'originTop') {
    return { ...layout, gridOrigin: { ...layout.gridOrigin, top: next } };
  }
  return { ...layout, [target]: next };
}

export function SurviveTheIslandLayoutDemoPage() {
  const [layout, setLayout] = useState<SurviveTheIslandBoardLayout>(() =>
    structuredClone(DEFAULT_SURVIVE_THE_ISLAND_LAYOUT),
  );
  const [target, setTarget] = useState<EditTarget>('originLeft');
  const [tileFace, setTileFace] = useState<DemoTileFace>('terrain');
  const [boardImageUrl, setBoardImageUrl] = useState(() => imageMap.surviveTheIsland.board);
  const tileAssets: DemoTileAssets = {
    beach: imageMap.surviveTheIsland.terrain.beach,
    forest: imageMap.surviveTheIsland.terrain.forest,
    mountain: imageMap.surviveTheIsland.terrain.mountain,
    shark: imageMap.surviveTheIsland.effects.shark,
    kaiju: imageMap.surviveTheIsland.effects.kaiju,
    'raft-effect': imageMap.surviveTheIsland.effects.raft,
    whirlpool: imageMap.surviveTheIsland.effects.whirlpool,
    volcano: imageMap.surviveTheIsland.effects.volcano,
    paddle: imageMap.surviveTheIsland.abilities.paddle,
    dolphin: imageMap.surviveTheIsland.abilities.dolphin,
    dive: imageMap.surviveTheIsland.abilities.dive,
    'creature-die': imageMap.surviveTheIsland.abilities.creatureDie,
    repellent: imageMap.surviveTheIsland.abilities.repellent,
  };
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [showLabels, setShowLabels] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const activeTarget = useMemo(
    () => TARGETS.find((candidate) => candidate.id === target) ?? TARGETS[0]!,
    [target],
  );

  const updateScalar = useCallback(
    (value: number) => {
      setLayout((current) => withScalar(current, target, value));
    },
    [target],
  );

  const nudge = useCallback(
    (amount: number) => {
      setLayout((current) => {
        const next = Math.min(
          activeTarget.max,
          Math.max(activeTarget.min, scalarValue(current, target) + amount),
        );
        return withScalar(current, target, next);
      });
    },
    [activeTarget.max, activeTarget.min, target],
  );

  const copyLayout = async () => {
    await navigator.clipboard.writeText(
      `export const DEFAULT_SURVIVE_THE_ISLAND_LAYOUT: SurviveTheIslandBoardLayout = ${JSON.stringify(layout, null, 2)};\n`,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="page app-night-page min-h-dvh p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs opacity-60">
              <Link to="/" className="underline">
                Home
              </Link>{' '}
              · /dev/survive-the-island-layout
            </p>
            <h1 className="text-xl font-bold">Survive the Island layout lab</h1>
            <p className="mt-1 text-sm opacity-75">
              Paste the final board URL, tune the hex grid, then copy the layout JSON.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={copyLayout}>
              {copied ? 'Copied!' : 'Copy layout JSON'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setLayout(structuredClone(DEFAULT_SURVIVE_THE_ISLAND_LAYOUT))}
            >
              Reset layout
            </Button>
          </div>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="card p-3 md:p-4">
            <SurviveTheIslandBoard
              layout={layout}
              boardImageUrl={boardImageUrl}
              tileAssets={tileAssets}
              preview={{ tileFace, shuffleSeed }}
              showLabels={showLabels}
              showMarkers={showMarkers}
              selectedCellId={selectedCellId}
              onCellClick={setSelectedCellId}
            />
            <p className="mt-3 text-sm opacity-75">
              {selectedCellId == null
                ? 'Click a hex to inspect its stable cell ID.'
                : `Selected tile ${selectedCellId + 1}. Assign an asset below; IDs are stable across every game state.`}
            </p>
          </section>

          <aside className="card space-y-5 p-4 text-sm">
            <label className="grid gap-1.5">
              <span className="font-semibold">Board image URL</span>
              <input
                className="rounded-md border border-current/25 bg-transparent px-3 py-2"
                value={boardImageUrl}
                onChange={(event) => setBoardImageUrl(event.target.value)}
                placeholder="https://res.cloudinary.com/.../board-base"
              />
              <span className="text-xs opacity-65">
                Session-only preview; final URL goes into imageMap.ts.
              </span>
            </label>

            <fieldset className="space-y-2">
              <legend className="font-semibold">Tile preview</legend>
              <div className="flex flex-wrap gap-2">
                {(['terrain', 'effects', 'abilities'] as const).map((face) => (
                  <Button
                    key={face}
                    type="button"
                    size="sm"
                    variant={tileFace === face ? 'primary' : 'secondary'}
                    onClick={() => {
                      setTileFace(face);
                    }}
                  >
                    {face}
                  </Button>
                ))}
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(event) => setShowLabels(event.target.checked)}
                />
                Show tile IDs
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showMarkers}
                  onChange={(event) => setShowMarkers(event.target.checked)}
                />
                Show token-size samples
              </label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShuffleSeed(Date.now())}
              >
                Shuffle preview
              </Button>
              <p className="text-xs opacity-65">
                This is a visual shuffle only. The real setup must shuffle the physical tile deck,
                then place its landscape side face up.
              </p>
            </fieldset>

            <section className="space-y-3">
              <h2 className="font-semibold">Calibration</h2>
              <div className="flex flex-wrap gap-1.5">
                {TARGETS.map((candidate) => (
                  <Button
                    key={candidate.id}
                    type="button"
                    size="sm"
                    variant={target === candidate.id ? 'primary' : 'secondary'}
                    onClick={() => setTarget(candidate.id)}
                  >
                    {candidate.label}
                  </Button>
                ))}
              </div>
              <Slider
                label={activeTarget.label}
                min={activeTarget.min}
                max={activeTarget.max}
                step={0.1}
                value={scalarValue(layout, target)}
                valueLabel={`${scalarValue(layout, target)}%`}
                onChange={(event) => updateScalar(Number(event.target.value))}
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => nudge(-0.5)}>
                  − 0.5%
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => nudge(0.5)}>
                  + 0.5%
                </Button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
