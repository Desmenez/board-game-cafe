import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createWavelengthTarget } from 'shared';
import { Button, Slider } from '../components/ui';
import { imageMap } from '../imageMap';
import {
  DEFAULT_WAVELENGTH_LAYOUT,
  type WavelengthBoardLayout,
} from '../games/wavelength/boardLayout';
import { WavelengthDevice } from '../games/wavelength/components/WavelengthDevice';

type NestedField =
  | 'dialLeft'
  | 'dialTop'
  | 'cardLeft'
  | 'cardTop'
  | 'cardWidth'
  | 'cardHeight'
  | 'scoreLeft'
  | 'scoreTop'
  | 'scoreWidth'
  | 'scoreHeight';
type ScalarField = 'dialRadius' | 'needleSize';
type EditTarget = NestedField | ScalarField;

const TARGETS: ReadonlyArray<{ id: EditTarget; label: string; min: number; max: number }> = [
  { id: 'dialLeft', label: 'Dial origin left', min: 20, max: 80 },
  { id: 'dialTop', label: 'Dial origin top', min: 20, max: 85 },
  { id: 'dialRadius', label: 'Dial radius', min: 12, max: 48 },
  { id: 'needleSize', label: 'Needle size', min: 10, max: 50 },
  { id: 'cardLeft', label: 'Card slot left', min: 20, max: 80 },
  { id: 'cardTop', label: 'Card slot top', min: 6, max: 40 },
  { id: 'cardWidth', label: 'Card slot width', min: 24, max: 80 },
  { id: 'cardHeight', label: 'Card slot height', min: 8, max: 28 },
  { id: 'scoreLeft', label: 'Score track left', min: 20, max: 80 },
  { id: 'scoreTop', label: 'Score track top', min: 70, max: 96 },
  { id: 'scoreWidth', label: 'Score track width', min: 40, max: 90 },
  { id: 'scoreHeight', label: 'Score track height', min: 6, max: 22 },
];

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function scalarValue(layout: WavelengthBoardLayout, target: EditTarget): number {
  switch (target) {
    case 'dialLeft':
      return layout.dialOrigin.left;
    case 'dialTop':
      return layout.dialOrigin.top;
    case 'dialRadius':
      return layout.dialRadius;
    case 'needleSize':
      return layout.needleSize;
    case 'cardLeft':
      return layout.cardSlot.left;
    case 'cardTop':
      return layout.cardSlot.top;
    case 'cardWidth':
      return layout.cardSlot.width;
    case 'cardHeight':
      return layout.cardSlot.height;
    case 'scoreLeft':
      return layout.scoreTrack.left;
    case 'scoreTop':
      return layout.scoreTrack.top;
    case 'scoreWidth':
      return layout.scoreTrack.width;
    case 'scoreHeight':
      return layout.scoreTrack.height;
  }
}

function withScalar(
  layout: WavelengthBoardLayout,
  target: EditTarget,
  value: number,
): WavelengthBoardLayout {
  const next = round(value);
  switch (target) {
    case 'dialLeft':
      return { ...layout, dialOrigin: { ...layout.dialOrigin, left: next } };
    case 'dialTop':
      return { ...layout, dialOrigin: { ...layout.dialOrigin, top: next } };
    case 'dialRadius':
      return { ...layout, dialRadius: next };
    case 'needleSize':
      return { ...layout, needleSize: next };
    case 'cardLeft':
      return { ...layout, cardSlot: { ...layout.cardSlot, left: next } };
    case 'cardTop':
      return { ...layout, cardSlot: { ...layout.cardSlot, top: next } };
    case 'cardWidth':
      return { ...layout, cardSlot: { ...layout.cardSlot, width: next } };
    case 'cardHeight':
      return { ...layout, cardSlot: { ...layout.cardSlot, height: next } };
    case 'scoreLeft':
      return { ...layout, scoreTrack: { ...layout.scoreTrack, left: next } };
    case 'scoreTop':
      return { ...layout, scoreTrack: { ...layout.scoreTrack, top: next } };
    case 'scoreWidth':
      return { ...layout, scoreTrack: { ...layout.scoreTrack, width: next } };
    case 'scoreHeight':
      return { ...layout, scoreTrack: { ...layout.scoreTrack, height: next } };
  }
}

export function WavelengthLayoutDemoPage() {
  const [layout, setLayout] = useState<WavelengthBoardLayout>(() =>
    structuredClone(DEFAULT_WAVELENGTH_LAYOUT),
  );
  const [target, setTarget] = useState<EditTarget>('dialLeft');
  const [deviceUrl, setDeviceUrl] = useState(() => imageMap.wavelength.device);
  const [screenOpen, setScreenOpen] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [dial, setDial] = useState(0.42);
  const [copied, setCopied] = useState(false);
  const [scores, setScores] = useState({ orange: 4, purple: 7 });

  const sampleTarget = useMemo(() => createWavelengthTarget(0.62), []);
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
      `export const DEFAULT_WAVELENGTH_LAYOUT: WavelengthBoardLayout = ${JSON.stringify(layout, null, 2)};\n`,
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
              · /dev/wavelength-layout
            </p>
            <h1 className="text-xl font-bold">Wavelength layout lab</h1>
            <p className="mt-1 text-sm opacity-75">
              Tune dial origin / radius / needle / card slot / score track, then copy the layout
              JSON.
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
              onClick={() => setLayout(structuredClone(DEFAULT_WAVELENGTH_LAYOUT))}
            >
              Reset layout
            </Button>
          </div>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="card p-3 md:p-4">
            <WavelengthDevice
              layout={layout}
              deviceUrl={deviceUrl}
              leftLabel="Hot"
              rightLabel="Cold"
              dial={dial}
              target={sampleTarget}
              screenOpen={screenOpen}
              scores={scores}
              interactive
              showGuides={showGuides}
              onDialChange={setDial}
            />
            <p className="mt-3 text-sm opacity-75">
              Drag the wheel or use the needle slider. Guides mark dial origin, radius, card slot,
              and score track.
            </p>
          </section>

          <aside className="card space-y-5 p-4 text-sm">
            <label className="grid gap-1.5">
              <span className="font-semibold">Device image URL</span>
              <input
                className="rounded-md border border-current/25 bg-transparent px-3 py-2"
                value={deviceUrl}
                onChange={(event) => setDeviceUrl(event.target.value)}
                placeholder="https://res.cloudinary.com/.../device"
              />
              <span className="text-xs opacity-65">
                Session-only preview; final URL goes into imageMap.ts. Empty = CSS stub.
              </span>
            </label>

            <fieldset className="space-y-2">
              <legend className="font-semibold">Preview</legend>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={screenOpen}
                  onChange={(event) => setScreenOpen(event.target.checked)}
                />
                Screen open (show 2/3/4 bands)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showGuides}
                  onChange={(event) => setShowGuides(event.target.checked)}
                />
                Show layout guides
              </label>
              <Slider
                label="Needle preview"
                min={0}
                max={1}
                step={0.01}
                value={dial}
                valueLabel={`${Math.round(dial * 100)}%`}
                onChange={(event) => setDial(Number(event.target.value))}
              />
              <Slider
                label="Orange score"
                min={0}
                max={10}
                step={1}
                value={scores.orange}
                valueLabel={String(scores.orange)}
                onChange={(event) =>
                  setScores((current) => ({ ...current, orange: Number(event.target.value) }))
                }
              />
              <Slider
                label="Purple score"
                min={0}
                max={10}
                step={1}
                value={scores.purple}
                valueLabel={String(scores.purple)}
                onChange={(event) =>
                  setScores((current) => ({ ...current, purple: Number(event.target.value) }))
                }
              />
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
