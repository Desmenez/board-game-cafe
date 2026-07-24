import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApproachBase, SkyTeamPlayerView, SkyTeamSlotId, SkyTeamSlotView } from 'shared';
import { ALTITUDE_TRACK, SKY_TEAM_SLOT_DEFS, YUL_APPROACH_SCENARIO } from 'shared';
import { Button } from '../components/ui';
import {
  ALL_SLOT_IDS,
  ALL_SWITCH_KEYS,
  DEFAULT_BOARD_LAYOUT,
  type PercentPos,
  type SkyTeamBoardLayout,
  type SkyTeamSwitchKey,
} from '../games/sky-team/boardLayout';
import {
  ApproachCard,
  type ApproachDie,
  type ApproachDieWell,
  type ApproachTopMark,
} from '../games/sky-team/components/ApproachCard';
import { SkyTeamBoard } from '../games/sky-team/components/SkyTeamBoard';
import '../games/sky-team/sky-team.css';
import './sky-team-layout-demo.css';

const APPROACH_MARK_OPTIONS: ApproachTopMark[] = ['ban', 'arrow-down', 'arrow-right'];

const DEFAULT_APPROACH_TOP: ApproachTopMark[] = [
  'ban',
  'ban',
  'arrow-down',
  'arrow-right',
  'ban',
];

const SAMPLE_DICE: ApproachDie[] = [
  { color: 'blue', value: 4 },
  { color: 'orange', value: 2 },
  { color: 'blue', value: 6 },
];

type EditTarget =
  | { kind: 'slot'; id: SkyTeamSlotId }
  | { kind: 'aero'; value: number }
  | { kind: 'brake'; value: number }
  | { kind: 'axis'; field: 'left' | 'top' | 'width' | 'baseRotation' | 'stepDegrees' }
  | {
      kind: 'size';
      field: 'slotSize' | 'markSize' | 'tokenSize' | 'rerollTokenSize' | 'switchSize';
    }
  | { kind: 'coffee'; index: 0 | 1 | 2 }
  | { kind: 'reroll' }
  | { kind: 'switch'; key: SkyTeamSwitchKey; side: 'off' | 'on' };

function cloneLayout(layout: SkyTeamBoardLayout): SkyTeamBoardLayout {
  return {
    slots: { ...layout.slots },
    aeroTrack: { ...layout.aeroTrack },
    brakeTrack: { ...layout.brakeTrack },
    axis: { ...layout.axis },
    tokens: {
      coffee: [...layout.tokens.coffee],
      reroll: { ...layout.tokens.reroll },
      switches: Object.fromEntries(
        ALL_SWITCH_KEYS.map((key) => [
          key,
          {
            off: { ...layout.tokens.switches[key].off },
            on: { ...layout.tokens.switches[key].on },
          },
        ]),
      ) as SkyTeamBoardLayout['tokens']['switches'],
    },
    approachBay: { ...layout.approachBay },
    altitudeBay: { ...layout.altitudeBay },
    slotSize: layout.slotSize,
    markSize: layout.markSize,
    tokenSize: layout.tokenSize,
    rerollTokenSize: layout.rerollTokenSize,
    switchSize: layout.switchSize,
  };
}

function buildDemoView(
  blueAerodynamic: number,
  orangeAerodynamic: number,
  brakeLevel: number,
  axisPosition: number,
  coffeeTokens: number,
  rerollTokens: number,
  switchesOn: boolean,
): SkyTeamPlayerView {
  const slots: SkyTeamSlotView[] = ALL_SLOT_IDS.map((id) => ({
    id,
    occupied: null,
    canPlace: true,
  }));

  const switches = Object.fromEntries(
    ALL_SWITCH_KEYS.map((k) => [k, switchesOn]),
  ) as unknown as SkyTeamPlayerView['switches'];

  return {
    phase: 'dice_placement',
    round: 1,
    myId: 'demo-pilot',
    myRole: 'pilot',
    pilotId: 'demo-pilot',
    copilotId: 'demo-copilot',
    players: [
      { id: 'demo-pilot', name: 'Pilot', role: 'pilot' },
      { id: 'demo-copilot', name: 'Co-Pilot', role: 'copilot' },
    ],
    scenarioId: YUL_APPROACH_SCENARIO.id,
    scenarioName: YUL_APPROACH_SCENARIO.name,
    approach: YUL_APPROACH_SCENARIO.spaces.map((s) => ({
      index: s.index,
      base: s.base,
      planes: s.traffic,
      printedPlanes: s.traffic,
    })),
    approachPosition: 0,
    altitudeFeet: ALTITUDE_TRACK[0]!.feet,
    altitudeIndex: 0,
    isAirplaneAltitude: false,
    firstPlayerRole: 'pilot',
    axisPosition,
    blueAerodynamic,
    orangeAerodynamic,
    brakeLevel,
    switches,
    coffeeTokens,
    rerollTokens,
    myDice: [
      { id: 'p0', color: 'blue', value: 3, inHand: true },
      { id: 'p1', color: 'blue', value: 4, inHand: true },
      { id: 'p2', color: 'blue', value: 5, inHand: true },
      { id: 'p3', color: 'blue', value: 6, inHand: true },
    ],
    placedDice: [],
    currentPlayerId: 'demo-pilot',
    isMyTurn: true,
    strategyReady: {},
    strategyEndsAtMs: null,
    rerollPending: null,
    lastSpeed: null,
    isFinalRound: false,
    atAirport: false,
    slots,
    loseReason: null,
    winReason: null,
    eventLog: ['Layout demo'],
    silentPhase: true,
    enabledModules: [],
    selectedSpecialAbilityIds: [],
    moduleState: {},
    specialAbilityState: {},
  };
}

function getPos(layout: SkyTeamBoardLayout, target: EditTarget): number | PercentPos | null {
  if (target.kind === 'slot') return layout.slots[target.id];
  if (target.kind === 'aero') return layout.aeroTrack[target.value] ?? null;
  if (target.kind === 'brake') return layout.brakeTrack[target.value] ?? null;
  if (target.kind === 'axis') return layout.axis[target.field];
  if (target.kind === 'size') return layout[target.field];
  if (target.kind === 'coffee') return layout.tokens.coffee[target.index];
  if (target.kind === 'reroll') return layout.tokens.reroll;
  if (target.kind === 'switch') return layout.tokens.switches[target.key][target.side];
  return null;
}

export function SkyTeamLayoutDemoPage() {
  const [layout, setLayout] = useState<SkyTeamBoardLayout>(() =>
    cloneLayout(DEFAULT_BOARD_LAYOUT),
  );
  const [target, setTarget] = useState<EditTarget>({ kind: 'slot', id: 'axis_pilot' });
  const [blueAero, setBlueAero] = useState(4);
  const [orangeAero, setOrangeAero] = useState(8);
  const [brakeLevel, setBrakeLevel] = useState(0);
  const [axisTilt, setAxisTilt] = useState(0);
  const [coffeeTokens, setCoffeeTokens] = useState(3);
  const [rerollTokens, setRerollTokens] = useState(1);
  const [switchesOn, setSwitchesOn] = useState(true);
  const [selectedDieId, setSelectedDieId] = useState<string | null>('p0');
  const [showLabels, setShowLabels] = useState(true);
  const [showTokenGhosts, setShowTokenGhosts] = useState(true);
  const [copied, setCopied] = useState(false);

  const [cardBase, setCardBase] = useState<ApproachBase>('cloud');
  const [cardPrintedPlanes, setCardPrintedPlanes] = useState(2);
  const [cardPlanes, setCardPlanes] = useState(1);
  const [cardTopMarks, setCardTopMarks] = useState<ApproachTopMark[]>(DEFAULT_APPROACH_TOP);
  const [cardDieSlots, setCardDieSlots] = useState<0 | 1 | 2 | 3>(1);
  const [cardDiceCount, setCardDiceCount] = useState(0);

  const cardDieWell: ApproachDieWell =
    cardDieSlots === 0
      ? false
      : {
          slots: cardDieSlots,
          dice: SAMPLE_DICE.slice(0, Math.min(cardDiceCount, cardDieSlots)),
        };

  const view = useMemo(
    () =>
      buildDemoView(
        blueAero,
        orangeAero,
        brakeLevel,
        axisTilt,
        coffeeTokens,
        rerollTokens,
        switchesOn,
      ),
    [axisTilt, blueAero, brakeLevel, coffeeTokens, orangeAero, rerollTokens, switchesOn],
  );

  const nudge = useCallback(
    (dx: number, dy: number) => {
      setLayout((prev) => {
        const next = cloneLayout(prev);
        if (target.kind === 'slot') {
          const p = next.slots[target.id];
          next.slots[target.id] = {
            left: Math.round((p.left + dx) * 10) / 10,
            top: Math.round((p.top + dy) * 10) / 10,
          };
        } else if (target.kind === 'aero') {
          const p = next.aeroTrack[target.value];
          if (!p) return prev;
          next.aeroTrack[target.value] = {
            left: Math.round((p.left + dx) * 10) / 10,
            top: Math.round((p.top + dy) * 10) / 10,
          };
        } else if (target.kind === 'brake') {
          const p = next.brakeTrack[target.value];
          if (!p) return prev;
          next.brakeTrack[target.value] = {
            left: Math.round((p.left + dx) * 10) / 10,
            top: Math.round((p.top + dy) * 10) / 10,
          };
        } else if (target.kind === 'axis') {
          const delta =
            target.field === 'top'
              ? dy
              : target.field === 'baseRotation' || target.field === 'stepDegrees'
                ? dx !== 0
                  ? dx
                  : dy
                : dx;
          next.axis[target.field] =
            Math.round((next.axis[target.field] + delta) * 10) / 10;
        } else if (target.kind === 'size') {
          next[target.field] = Math.round((next[target.field] + dx) * 10) / 10;
        } else if (target.kind === 'coffee') {
          const p = next.tokens.coffee[target.index];
          next.tokens.coffee[target.index] = {
            left: Math.round((p.left + dx) * 10) / 10,
            top: Math.round((p.top + dy) * 10) / 10,
          };
        } else if (target.kind === 'reroll') {
          const p = next.tokens.reroll;
          next.tokens.reroll = {
            left: Math.round((p.left + dx) * 10) / 10,
            top: Math.round((p.top + dy) * 10) / 10,
          };
        } else if (target.kind === 'switch') {
          const p = next.tokens.switches[target.key][target.side];
          next.tokens.switches[target.key][target.side] = {
            left: Math.round((p.left + dx) * 10) / 10,
            top: Math.round((p.top + dy) * 10) / 10,
          };
        }
        return next;
      });
    },
    [target],
  );

  const setField = (axis: 'left' | 'top', raw: number) => {
    setLayout((prev) => {
      const next = cloneLayout(prev);
      if (target.kind === 'slot') {
        next.slots[target.id] = { ...next.slots[target.id], [axis]: raw };
      } else if (target.kind === 'aero') {
        const p = next.aeroTrack[target.value] ?? { left: 50, top: 50 };
        next.aeroTrack[target.value] = { ...p, [axis]: raw };
      } else if (target.kind === 'brake') {
        const p = next.brakeTrack[target.value] ?? { left: 50, top: 50 };
        next.brakeTrack[target.value] = { ...p, [axis]: raw };
      } else if (target.kind === 'coffee') {
        next.tokens.coffee[target.index] = {
          ...next.tokens.coffee[target.index],
          [axis]: raw,
        };
      } else if (target.kind === 'reroll') {
        next.tokens.reroll = { ...next.tokens.reroll, [axis]: raw };
      } else if (target.kind === 'switch') {
        next.tokens.switches[target.key][target.side] = {
          ...next.tokens.switches[target.key][target.side],
          [axis]: raw,
        };
      }
      return next;
    });
  };

  const setScalar = (raw: number) => {
    setLayout((prev) => {
      const next = cloneLayout(prev);
      if (target.kind === 'axis') {
        next.axis[target.field] = raw;
      } else if (target.kind === 'size') {
        next[target.field] = raw;
      }
      return next;
    });
  };

  const exportJson = async () => {
    const text = JSON.stringify(layout, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const currentPos = getPos(layout, target);

  return (
    <div className="st-demo app-night-page">
      <header className="st-demo__header">
        <div>
          <p className="st-demo__eyebrow">
            <Link to="/">← Home</Link> · dev only
          </p>
          <h1>Sky Team — Layout Lab</h1>
          <p className="st-demo__hint">
            เลือกเป้าหมาย → ลูกศร/ช่องตัวเลขจูน % · Copy JSON แล้ววางกลับใน{' '}
            <code>boardLayout.ts</code>
          </p>
        </div>
        <div className="st-demo__header-actions">
          <Button type="button" size="sm" variant="secondary" onClick={() => setLayout(cloneLayout(DEFAULT_BOARD_LAYOUT))}>
            Reset
          </Button>
          <Button type="button" size="sm" onClick={() => void exportJson()}>
            {copied ? 'Copied!' : 'Copy layout JSON'}
          </Button>
        </div>
      </header>

      <div className="st-demo__grid">
        <section className="st-demo__board-wrap card">
          <div className="st-demo__board-stage">
            <SkyTeamBoard
              view={view}
              selectedDieId={selectedDieId}
              onSlotClick={(id) => {
                setTarget({ kind: 'slot', id });
                setSelectedDieId((prev) => prev ?? 'p0');
              }}
              layout={layout}
              showSlotLabels={showLabels}
              forceShowSlots
              forceShowTokens={showTokenGhosts}
            />
            <div className="st-demo__mark-pickers" aria-hidden>
              {Object.keys(layout.aeroTrack).map((k) => {
                const v = Number(k);
                const p = layout.aeroTrack[v]!;
                return (
                  <button
                    key={`aero-${v}`}
                    type="button"
                    className="st-demo__ghost"
                    style={{ left: `${p.left}%`, top: `${p.top}%` }}
                    onClick={() => setTarget({ kind: 'aero', value: v })}
                    title={`aero ${v}`}
                  />
                );
              })}
              {Object.keys(layout.brakeTrack).map((k) => {
                const v = Number(k);
                const p = layout.brakeTrack[v]!;
                return (
                  <button
                    key={`brake-${v}`}
                    type="button"
                    className="st-demo__ghost"
                    style={{ left: `${p.left}%`, top: `${p.top}%` }}
                    onClick={() => setTarget({ kind: 'brake', value: v })}
                    title={`brake ${v}`}
                  />
                );
              })}
              {layout.tokens.coffee.map((p, i) => (
                <button
                  key={`coffee-${i}`}
                  type="button"
                  className="st-demo__ghost st-demo__ghost--token"
                  style={{ left: `${p.left}%`, top: `${p.top}%` }}
                  onClick={() => setTarget({ kind: 'coffee', index: i as 0 | 1 | 2 })}
                  title={`coffee ${i + 1}`}
                />
              ))}
              <button
                type="button"
                className="st-demo__ghost st-demo__ghost--token"
                style={{
                  left: `${layout.tokens.reroll.left}%`,
                  top: `${layout.tokens.reroll.top}%`,
                }}
                onClick={() => setTarget({ kind: 'reroll' })}
                title="reroll"
              />
              {ALL_SWITCH_KEYS.map((key) => {
                const well = layout.tokens.switches[key];
                return (
                  <span key={`sw-${key}`}>
                    <button
                      type="button"
                      className="st-demo__ghost st-demo__ghost--switch"
                      style={{ left: `${well.off.left}%`, top: `${well.off.top}%` }}
                      onClick={() => setTarget({ kind: 'switch', key, side: 'off' })}
                      title={`${key} OFF (right)`}
                    />
                    <button
                      type="button"
                      className="st-demo__ghost st-demo__ghost--switch st-demo__ghost--switch-on"
                      style={{ left: `${well.on.left}%`, top: `${well.on.top}%` }}
                      onClick={() => setTarget({ kind: 'switch', key, side: 'on' })}
                      title={`${key} ON (left)`}
                    />
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="st-demo__panel card">
          <h2>Target</h2>
          <label className="st-demo__field">
            Die slot
            <select
              value={target.kind === 'slot' ? target.id : ''}
              onChange={(e) =>
                setTarget({ kind: 'slot', id: e.target.value as SkyTeamSlotId })
              }
            >
              <option value="" disabled>
                — pick slot —
              </option>
              {ALL_SLOT_IDS.map((id) => (
                <option key={id} value={id}>
                  {id} ({SKY_TEAM_SLOT_DEFS[id].section})
                </option>
              ))}
            </select>
          </label>

          <label className="st-demo__field">
            Token — coffee / reroll
            <select
              value={
                target.kind === 'coffee'
                  ? `coffee-${target.index}`
                  : target.kind === 'reroll'
                    ? 'reroll'
                    : ''
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'reroll') setTarget({ kind: 'reroll' });
                else if (v.startsWith('coffee-')) {
                  setTarget({
                    kind: 'coffee',
                    index: Number(v.slice('coffee-'.length)) as 0 | 1 | 2,
                  });
                }
              }}
            >
              <option value="" disabled>
                — coffee / reroll —
              </option>
              <option value="coffee-0">coffee 1 (top)</option>
              <option value="coffee-1">coffee 2 (bottom-left)</option>
              <option value="coffee-2">coffee 3 (bottom-right)</option>
              <option value="reroll">reroll</option>
            </select>
          </label>

          <label className="st-demo__field">
            Switch marker (OFF right / ON left)
            <select
              value={
                target.kind === 'switch' ? `${target.key}:${target.side}` : ''
              }
              onChange={(e) => {
                const [key, side] = e.target.value.split(':') as [
                  SkyTeamSwitchKey,
                  'off' | 'on',
                ];
                setTarget({ kind: 'switch', key, side });
              }}
            >
              <option value="" disabled>
                — plane switch —
              </option>
              {ALL_SWITCH_KEYS.flatMap((key) => [
                <option key={`${key}-off`} value={`${key}:off`}>
                  {key} OFF (right)
                </option>,
                <option key={`${key}-on`} value={`${key}:on`}>
                  {key} ON (left)
                </option>,
              ])}
            </select>
          </label>

          <label className="st-demo__field">
            Aero track value
            <select
              value={target.kind === 'aero' ? String(target.value) : ''}
              onChange={(e) => setTarget({ kind: 'aero', value: Number(e.target.value) })}
            >
              <option value="" disabled>
                — blue/orange path —
              </option>
              {Object.keys(layout.aeroTrack).map((k) => (
                <option key={k} value={k}>
                  aero @{k}
                </option>
              ))}
            </select>
          </label>

          <label className="st-demo__field">
            Brake track value
            <select
              value={target.kind === 'brake' ? String(target.value) : ''}
              onChange={(e) => setTarget({ kind: 'brake', value: Number(e.target.value) })}
            >
              <option value="" disabled>
                — brake path —
              </option>
              {Object.keys(layout.brakeTrack).map((k) => (
                <option key={k} value={k}>
                  brake @{k}
                </option>
              ))}
            </select>
          </label>

          <div className="st-demo__row">
            <Button type="button" size="sm" variant="secondary" onClick={() => setTarget({ kind: 'axis', field: 'left' })}>
              Axis L
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setTarget({ kind: 'axis', field: 'top' })}>
              Axis T
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setTarget({ kind: 'axis', field: 'width' })}>
              Axis W
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setTarget({ kind: 'axis', field: 'baseRotation' })}>
              Axis rot
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setTarget({ kind: 'axis', field: 'stepDegrees' })}>
              Axis °/step
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setTarget({ kind: 'size', field: 'slotSize' })}>
              Slot size
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setTarget({ kind: 'size', field: 'markSize' })}>
              Mark size
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setTarget({ kind: 'size', field: 'tokenSize' })}>
              Coffee size
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setTarget({ kind: 'size', field: 'rerollTokenSize' })}>
              Reroll size
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setTarget({ kind: 'size', field: 'switchSize' })}>
              Switch size
            </Button>
          </div>

          <h2>Nudge</h2>
          <div className="st-demo__nudge">
            <span />
            <Button type="button" size="sm" onClick={() => nudge(0, -0.5)}>
              ↑
            </Button>
            <span />
            <Button type="button" size="sm" onClick={() => nudge(-0.5, 0)}>
              ←
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled>
              ·
            </Button>
            <Button type="button" size="sm" onClick={() => nudge(0.5, 0)}>
              →
            </Button>
            <span />
            <Button type="button" size="sm" onClick={() => nudge(0, 0.5)}>
              ↓
            </Button>
            <span />
          </div>

          {typeof currentPos === 'number' ? (
            <label className="st-demo__field">
              Value
              <input
                type="number"
                step={0.1}
                value={currentPos}
                onChange={(e) => setScalar(Number(e.target.value))}
              />
            </label>
          ) : currentPos ? (
            <div className="st-demo__row">
              <label className="st-demo__field">
                left %
                <input
                  type="number"
                  step={0.1}
                  value={currentPos.left}
                  onChange={(e) => setField('left', Number(e.target.value))}
                />
              </label>
              <label className="st-demo__field">
                top %
                <input
                  type="number"
                  step={0.1}
                  value={currentPos.top}
                  onChange={(e) => setField('top', Number(e.target.value))}
                />
              </label>
            </div>
          ) : null}

          <h2>Live state</h2>
          <label className="st-demo__field">
            Blue aero ({blueAero})
            <input
              type="range"
              min={2}
              max={12}
              value={blueAero}
              onChange={(e) => setBlueAero(Number(e.target.value))}
            />
          </label>
          <label className="st-demo__field">
            Orange aero ({orangeAero})
            <input
              type="range"
              min={2}
              max={12}
              value={orangeAero}
              onChange={(e) => setOrangeAero(Number(e.target.value))}
            />
          </label>
          <label className="st-demo__field">
            Brake ({brakeLevel})
            <input
              type="range"
              min={0}
              max={6}
              step={1}
              value={brakeLevel}
              onChange={(e) => setBrakeLevel(Number(e.target.value))}
            />
          </label>
          <label className="st-demo__field">
            Axis tilt ({axisTilt})
            <input
              type="range"
              min={-3}
              max={3}
              value={axisTilt}
              onChange={(e) => setAxisTilt(Number(e.target.value))}
            />
          </label>
          <label className="st-demo__field">
            Coffee tokens ({coffeeTokens})
            <input
              type="range"
              min={0}
              max={3}
              value={coffeeTokens}
              onChange={(e) => setCoffeeTokens(Number(e.target.value))}
            />
          </label>
          <label className="st-demo__field">
            Reroll tokens ({rerollTokens})
            <input
              type="range"
              min={0}
              max={3}
              value={rerollTokens}
              onChange={(e) => setRerollTokens(Number(e.target.value))}
            />
          </label>

          <label className="st-demo__check">
            <input
              type="checkbox"
              checked={switchesOn}
              onChange={(e) => setSwitchesOn(e.target.checked)}
            />
            All switches ON
          </label>
          <label className="st-demo__check">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            Show slot labels
          </label>
          <label className="st-demo__check">
            <input
              type="checkbox"
              checked={showTokenGhosts}
              onChange={(e) => setShowTokenGhosts(e.target.checked)}
            />
            Show empty token anchors
          </label>
        </aside>
      </div>

      <section className="card mt-4 p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-semibold">ApproachCard lab</h2>
            <p className="mt-1 mb-0 text-sm opacity-75">
              จูน overlay บน base art (top marks · planes · die well) — ใช้ซ้ำใน bay / track modal
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setCardBase('cloud');
              setCardPrintedPlanes(2);
              setCardPlanes(1);
              setCardTopMarks([...DEFAULT_APPROACH_TOP]);
              setCardDieSlots(1);
              setCardDiceCount(0);
            }}
          >
            Reset card
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
          <div className="mx-auto w-full max-w-[22rem]">
            <ApproachCard
              base={cardBase}
              printedPlanes={cardPrintedPlanes}
              planes={cardPlanes}
              topMarks={cardTopMarks}
              dieWell={cardDieWell}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="st-demo__field">
              Base art
              <select
                value={cardBase}
                onChange={(e) => setCardBase(e.target.value as ApproachBase)}
              >
                <option value="sky">sky</option>
                <option value="cloud">cloud</option>
                <option value="airport">airport</option>
              </select>
            </label>

            <label className="st-demo__field">
              Printed left ({cardPrintedPlanes})
              <input
                type="range"
                min={0}
                max={3}
                value={cardPrintedPlanes}
                onChange={(e) => setCardPrintedPlanes(Number(e.target.value))}
              />
            </label>

            <label className="st-demo__field">
              Airplane tokens ({cardPlanes})
              <input
                type="range"
                min={0}
                max={9}
                value={cardPlanes}
                onChange={(e) => setCardPlanes(Number(e.target.value))}
              />
            </label>

            <label className="st-demo__field">
              Die slots ({cardDieSlots || 'off'})
              <input
                type="range"
                min={0}
                max={3}
                value={cardDieSlots}
                onChange={(e) => {
                  const slots = Number(e.target.value) as 0 | 1 | 2 | 3;
                  setCardDieSlots(slots);
                  setCardDiceCount((n) => Math.min(n, slots));
                }}
              />
            </label>

            <label className="st-demo__field">
              Dice placed ({cardDiceCount}/{cardDieSlots || 0})
              <input
                type="range"
                min={0}
                max={cardDieSlots || 0}
                value={cardDiceCount}
                disabled={cardDieSlots === 0}
                onChange={(e) => setCardDiceCount(Number(e.target.value))}
              />
            </label>

            <div className="sm:col-span-2">
              <p className="mb-1.5 text-sm font-medium">Top marks (−2 → +2)</p>
              <div className="flex flex-wrap gap-1.5">
                {([0, 1, 2, 3, 4] as const).map((index) => (
                  <select
                    key={`mark-${index}`}
                    className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-sm"
                    value={cardTopMarks[index] ?? 'ban'}
                    onChange={(e) => {
                      const next: ApproachTopMark[] = [0, 1, 2, 3, 4].map(
                        (i) => cardTopMarks[i] ?? 'ban',
                      );
                      next[index] = e.target.value as ApproachTopMark;
                      setCardTopMarks(next);
                    }}
                  >
                    {APPROACH_MARK_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setCardTopMarks([...DEFAULT_APPROACH_TOP])}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
