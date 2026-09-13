import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createHeyThatsMyFishDeck, HEY_THATS_MY_FISH_COLORS } from 'shared';
import { Button, Slider } from '../components/ui';
import { imageMap } from '../imageMap';
import {
  DEFAULT_HEY_THATS_MY_FISH_LAYOUT,
  type HeyThatsMyFishBoardLayout,
} from '../games/hey-thats-my-fish/boardLayout';
import { HeyThatsMyFishBoard } from '../games/hey-thats-my-fish/components/HeyThatsMyFishBoard';

type ScalarField = Exclude<keyof HeyThatsMyFishBoardLayout, 'gridOrigin'>;
type EditTarget = 'originLeft' | 'originTop' | ScalarField;

const TARGETS: ReadonlyArray<{ id: EditTarget; label: string; min: number; max: number }> = [
  { id: 'originLeft', label: 'Grid origin left', min: 25, max: 75 },
  { id: 'originTop', label: 'Grid origin top', min: 25, max: 75 },
  { id: 'columnPitch', label: 'Column pitch', min: 4, max: 16 },
  { id: 'rowPitch', label: 'Row pitch', min: 4, max: 16 },
  { id: 'tileWidth', label: 'Tile width', min: 4, max: 18 },
  { id: 'penguinSize', label: 'Penguin size', min: 2, max: 12 },
];

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function scalarValue(layout: HeyThatsMyFishBoardLayout, target: EditTarget): number {
  if (target === 'originLeft') return layout.gridOrigin.left;
  if (target === 'originTop') return layout.gridOrigin.top;
  return layout[target];
}

function withScalar(
  layout: HeyThatsMyFishBoardLayout,
  target: EditTarget,
  value: number,
): HeyThatsMyFishBoardLayout {
  const next = round(value);
  if (target === 'originLeft') {
    return { ...layout, gridOrigin: { ...layout.gridOrigin, left: next } };
  }
  if (target === 'originTop') {
    return { ...layout, gridOrigin: { ...layout.gridOrigin, top: next } };
  }
  return { ...layout, [target]: next };
}

export function HeyThatsMyFishLayoutDemoPage() {
  const [layout, setLayout] = useState<HeyThatsMyFishBoardLayout>(() =>
    structuredClone(DEFAULT_HEY_THATS_MY_FISH_LAYOUT),
  );
  const [target, setTarget] = useState<EditTarget>('originLeft');
  const [boardImageUrl, setBoardImageUrl] = useState(() => imageMap.heyThatsMyFish.sea);
  const [shuffleSeed, setShuffleSeed] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [showPenguins, setShowPenguins] = useState(true);
  const [selectedHexId, setSelectedHexId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const activeTarget = useMemo(
    () => TARGETS.find((candidate) => candidate.id === target) ?? TARGETS[0]!,
    [target],
  );

  const hexes = useMemo(() => {
    let cursor = shuffleSeed;
    const random = () => {
      cursor = (cursor * 16807) % 2147483647;
      return (cursor - 1) / 2147483646;
    };
    const deck = createHeyThatsMyFishDeck(random);
    if (!showPenguins) return deck;
    const ones = deck.filter((hex) => hex.fish === 1).slice(0, 4);
    return deck.map((hex) => {
      const sample = ones.findIndex((tile) => tile.id === hex.id);
      if (sample < 0) return hex;
      return { ...hex, penguinColor: HEY_THATS_MY_FISH_COLORS[sample]! };
    });
  }, [shuffleSeed, showPenguins]);

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
      `export const DEFAULT_HEY_THATS_MY_FISH_LAYOUT: HeyThatsMyFishBoardLayout = ${JSON.stringify(layout, null, 2)};\n`,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const selected = hexes.find((hex) => hex.id === selectedHexId);

  return (
    <div className="page app-night-page min-h-dvh p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs opacity-60">
              <Link to="/" className="underline">
                Home
              </Link>{' '}
              · /dev/hey-thats-my-fish-layout
            </p>
            <h1 className="text-xl font-bold">Hey, That's My Fish! layout lab</h1>
            <p className="mt-1 text-sm opacity-75">
              Tune hex origin / pitch / tile size over the sea art, then copy the layout JSON.
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
              onClick={() => setLayout(structuredClone(DEFAULT_HEY_THATS_MY_FISH_LAYOUT))}
            >
              Reset layout
            </Button>
          </div>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="card p-3 md:p-4">
            <HeyThatsMyFishBoard
              layout={layout}
              seaUrl={boardImageUrl}
              hexes={hexes}
              showLabels={showLabels}
              selectedHexId={selectedHexId}
              onHexClick={setSelectedHexId}
            />
            <p className="mt-3 text-sm opacity-75">
              {selectedHexId == null
                ? 'Click a hex to inspect its stable cell ID.'
                : `Selected tile ${selectedHexId + 1}${
                    selected ? ` · ${selected.fish === 0 ? 'water' : `${selected.fish}-fish`}` : ''
                  }.`}
            </p>
          </section>

          <aside className="card space-y-5 p-4 text-sm">
            <label className="grid gap-1.5">
              <span className="font-semibold">Sea image URL</span>
              <input
                className="rounded-md border border-current/25 bg-transparent px-3 py-2"
                value={boardImageUrl}
                onChange={(event) => setBoardImageUrl(event.target.value)}
                placeholder="https://res.cloudinary.com/.../sea"
              />
              <span className="text-xs opacity-65">
                Session-only preview; final URL goes into imageMap.ts.
              </span>
            </label>

            <fieldset className="space-y-2">
              <legend className="font-semibold">Preview</legend>
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
                  checked={showPenguins}
                  onChange={(event) => setShowPenguins(event.target.checked)}
                />
                Show penguin-size samples
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
                Official deck only: 1-fish ×30 (grey), 2-fish ×20 (gold), 3-fish ×10 (red). Artwork
                is randomized inside each pile. Water / empty hexes are not shuffled.
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
