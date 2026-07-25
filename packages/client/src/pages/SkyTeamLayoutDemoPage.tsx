import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApproachBase, SkyTeamPlayerView, SkyTeamSlotId, SkyTeamSlotView } from 'shared';
import {
  ALTITUDE_TRACK,
  SKY_TEAM_SLOT_DEFS,
  WIND_MAX_POSITION,
  WIND_MIN_POSITION,
  YUL_APPROACH_SCENARIO,
  skyTeamWindModifier,
} from 'shared';
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
import { SkyTeamInternBoard } from '../games/sky-team/components/SkyTeamInternBoard';
import { SkyTeamKeroseneTrack } from '../games/sky-team/components/SkyTeamKeroseneTrack';
import { SkyTeamWindRing } from '../games/sky-team/components/SkyTeamWindRing';
import {
  DEFAULT_ICE_BRAKES_LAYOUT,
  ICE_BRAKE_LEVEL_LIST,
  type SkyTeamIceBrakesLayout,
} from '../games/sky-team/iceBrakesLayout';
import { DEFAULT_INTERN_LAYOUT, type SkyTeamInternLayout } from '../games/sky-team/internLayout';
import {
  DEFAULT_KEROSENE_LAYOUT,
  type SkyTeamKeroseneLayout,
} from '../games/sky-team/keroseneLayout';
import { DEFAULT_WIND_LAYOUT, type SkyTeamWindLayout } from '../games/sky-team/windLayout';
import {
  DEFAULT_MODULES_ASSEMBLY_LAYOUT,
  type SkyTeamModulesAssemblyLayout,
} from '../games/sky-team/modulesAssemblyLayout';
import '../games/sky-team/sky-team.css';
import './sky-team-layout-demo.css';

const APPROACH_MARK_OPTIONS: ApproachTopMark[] = ['ban', 'arrow-down', 'arrow-right'];

const DEFAULT_APPROACH_TOP: ApproachTopMark[] = ['ban', 'ban', 'arrow-down', 'arrow-right', 'ban'];

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
    scenarioTier: YUL_APPROACH_SCENARIO.tier,
    scenarioTierLabel: YUL_APPROACH_SCENARIO.tierLabel,
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
  const [layout, setLayout] = useState<SkyTeamBoardLayout>(() => cloneLayout(DEFAULT_BOARD_LAYOUT));
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

  const [keroseneLayout, setKeroseneLayout] = useState<SkyTeamKeroseneLayout>(() =>
    structuredClone(DEFAULT_KEROSENE_LAYOUT),
  );
  const [keroseneRemaining, setKeroseneRemaining] = useState(20);
  const [keroseneMarkerLevel, setKeroseneMarkerLevel] = useState(20);
  const [keroseneShowDie, setKeroseneShowDie] = useState(false);
  const [keroseneCopied, setKeroseneCopied] = useState(false);

  const [internLayout, setInternLayout] = useState<SkyTeamInternLayout>(() =>
    structuredClone(DEFAULT_INTERN_LAYOUT),
  );
  const [internTokenCount, setInternTokenCount] = useState(6);
  const [internShowPilotDie, setInternShowPilotDie] = useState(false);
  const [internTokenEditIndex, setInternTokenEditIndex] = useState(0);
  const [internCopied, setInternCopied] = useState(false);

  const [windLayout, setWindLayout] = useState<SkyTeamWindLayout>(() =>
    structuredClone(DEFAULT_WIND_LAYOUT),
  );
  const [windPosition, setWindPosition] = useState(0);
  const [windCopied, setWindCopied] = useState(false);

  const [iceBrakesLayout, setIceBrakesLayout] = useState<SkyTeamIceBrakesLayout>(() =>
    structuredClone(DEFAULT_ICE_BRAKES_LAYOUT),
  );
  const [iceBrakesMarker, setIceBrakesMarker] = useState(0);
  const [iceBrakesEditLevel, setIceBrakesEditLevel] = useState(0);
  const [iceBrakesEditRow, setIceBrakesEditRow] = useState<'pilot' | 'copilot'>('pilot');
  const [iceBrakesShowDie, setIceBrakesShowDie] = useState(false);
  const [iceBrakesCopied, setIceBrakesCopied] = useState(false);

  const [leakRemaining, setLeakRemaining] = useState(16);
  const [leakCopied, setLeakCopied] = useState(false);

  const [assemblyLayout, setAssemblyLayout] = useState<SkyTeamModulesAssemblyLayout>(() =>
    structuredClone(DEFAULT_MODULES_ASSEMBLY_LAYOUT),
  );
  const [assemblyShowKerosene, setAssemblyShowKerosene] = useState(true);
  const [assemblyShowLeak, setAssemblyShowLeak] = useState(false);
  const [assemblyShowWind, setAssemblyShowWind] = useState(true);
  const [assemblyShowIntern, setAssemblyShowIntern] = useState(true);
  const [assemblyShowIceBrakes, setAssemblyShowIceBrakes] = useState(true);
  const [assemblyCopied, setAssemblyCopied] = useState(false);

  const demoInternWells = useMemo(
    () =>
      ([1, 2, 3, 4, 5, 6] as const).map((value, i) =>
        i < internTokenCount ? { id: `demo-intern-${value}`, value } : null,
      ),
    [internTokenCount],
  );

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

  const iceBrakesView = useMemo(() => {
    const base = buildDemoView(
      blueAero,
      orangeAero,
      Math.max(
        brakeLevel,
        iceBrakesMarker === 0
          ? 0
          : iceBrakesMarker >= 4
            ? 5
            : ([2, 3, 4, 5] as const)[iceBrakesMarker - 1]!,
      ),
      axisTilt,
      coffeeTokens,
      rerollTokens,
      switchesOn,
    );
    const iceSlots = ALL_SLOT_IDS.filter((id) => id.startsWith('ice_brake_')).map((id) => ({
      id,
      occupied:
        iceBrakesShowDie && id === 'ice_brake_pilot_2'
          ? {
              dieId: 'demo',
              slotId: 'ice_brake_pilot_2' as const,
              color: 'blue' as const,
              value: 2,
              ownerId: 'x',
            }
          : null,
      canPlace: true,
    }));
    return {
      ...base,
      enabledModules: ['ice-brakes' as const],
      moduleState: { iceBrakes: { markerPosition: iceBrakesMarker } },
      slots: [
        ...base.slots.filter(
          (s) =>
            s.id !== 'brake_2' &&
            s.id !== 'brake_4' &&
            s.id !== 'brake_6' &&
            !s.id.startsWith('ice_brake_'),
        ),
        ...iceSlots,
      ],
    };
  }, [
    axisTilt,
    blueAero,
    brakeLevel,
    coffeeTokens,
    iceBrakesMarker,
    iceBrakesShowDie,
    orangeAero,
    rerollTokens,
    switchesOn,
  ]);

  const assemblyView = useMemo(() => {
    const enabledModules = [
      ...(assemblyShowKerosene && !assemblyShowLeak ? (['kerosene'] as const) : []),
      ...(assemblyShowLeak ? (['kerosene-leak'] as const) : []),
      ...(assemblyShowWind ? (['wind'] as const) : []),
      ...(assemblyShowIntern ? (['intern'] as const) : []),
      ...(assemblyShowIceBrakes ? (['ice-brakes'] as const) : []),
    ];

    const base = buildDemoView(
      blueAero,
      orangeAero,
      assemblyShowIceBrakes
        ? Math.max(
            brakeLevel,
            iceBrakesMarker === 0
              ? 0
              : iceBrakesMarker >= 4
                ? 5
                : ([2, 3, 4, 5] as const)[iceBrakesMarker - 1]!,
          )
        : brakeLevel,
      axisTilt,
      coffeeTokens,
      rerollTokens,
      switchesOn,
    );

    let slots = base.slots;
    if (assemblyShowIceBrakes) {
      const iceSlots = ALL_SLOT_IDS.filter((id) => id.startsWith('ice_brake_')).map((id) => ({
        id,
        occupied: null,
        canPlace: true,
      }));
      slots = [
        ...slots.filter(
          (s) =>
            s.id !== 'brake_2' &&
            s.id !== 'brake_4' &&
            s.id !== 'brake_6' &&
            !s.id.startsWith('ice_brake_'),
        ),
        ...iceSlots,
      ];
    }

    return {
      ...base,
      enabledModules: [...enabledModules],
      moduleState: {
        ...(assemblyShowKerosene && !assemblyShowLeak
          ? { kerosene: { remaining: keroseneRemaining, diePlacedThisRound: false } }
          : {}),
        ...(assemblyShowLeak ? { keroseneLeak: { remaining: leakRemaining } } : {}),
        ...(assemblyShowWind
          ? {
              wind: {
                position: windPosition,
                modifier: skyTeamWindModifier(windPosition),
              },
            }
          : {}),
        ...(assemblyShowIntern ? { intern: { wells: demoInternWells } } : {}),
        ...(assemblyShowIceBrakes ? { iceBrakes: { markerPosition: iceBrakesMarker } } : {}),
      },
      slots,
    };
  }, [
    assemblyShowIceBrakes,
    assemblyShowIntern,
    assemblyShowKerosene,
    assemblyShowLeak,
    assemblyShowWind,
    axisTilt,
    blueAero,
    brakeLevel,
    coffeeTokens,
    demoInternWells,
    iceBrakesMarker,
    keroseneRemaining,
    leakRemaining,
    orangeAero,
    rerollTokens,
    switchesOn,
    windPosition,
  ]);

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
          next.axis[target.field] = Math.round((next.axis[target.field] + delta) * 10) / 10;
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
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setLayout(cloneLayout(DEFAULT_BOARD_LAYOUT))}
          >
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
              onChange={(e) => setTarget({ kind: 'slot', id: e.target.value as SkyTeamSlotId })}
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
              value={target.kind === 'switch' ? `${target.key}:${target.side}` : ''}
              onChange={(e) => {
                const [key, side] = e.target.value.split(':') as [SkyTeamSwitchKey, 'off' | 'on'];
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
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTarget({ kind: 'axis', field: 'left' })}
            >
              Axis L
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTarget({ kind: 'axis', field: 'top' })}
            >
              Axis T
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTarget({ kind: 'axis', field: 'width' })}
            >
              Axis W
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTarget({ kind: 'axis', field: 'baseRotation' })}
            >
              Axis rot
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTarget({ kind: 'axis', field: 'stepDegrees' })}
            >
              Axis °/step
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTarget({ kind: 'size', field: 'slotSize' })}
            >
              Slot size
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTarget({ kind: 'size', field: 'markSize' })}
            >
              Mark size
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTarget({ kind: 'size', field: 'tokenSize' })}
            >
              Coffee size
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTarget({ kind: 'size', field: 'rerollTokenSize' })}
            >
              Reroll size
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTarget({ kind: 'size', field: 'switchSize' })}
            >
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
          <div className="mx-auto w-full max-w-88">
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

      <section className="card mt-4 p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-semibold">Modules assembly lab</h2>
            <p className="mt-1 mb-0 text-sm opacity-75">
              ประกอบร่าง modules ทั้งชุด — จูน width / offset / gap — Copy JSON แล้ววางใน{' '}
              <code>modulesAssemblyLayout.ts</code> (Ice Brakes overlay ใช้ค่าจาก Ice Brakes lab)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setAssemblyLayout(structuredClone(DEFAULT_MODULES_ASSEMBLY_LAYOUT))}
            >
              Reset layout
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `export const DEFAULT_MODULES_ASSEMBLY_LAYOUT: SkyTeamModulesAssemblyLayout = ${JSON.stringify(assemblyLayout, null, 2)};\n`,
                );
                setAssemblyCopied(true);
                window.setTimeout(() => setAssemblyCopied(false), 1500);
              }}
            >
              {assemblyCopied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] xl:items-start">
          <div
            className="st-board-row mx-auto w-full overflow-x-auto"
            style={{ gap: `${assemblyLayout.rowGapRem}rem` }}
          >
            {assemblyShowKerosene && !assemblyShowLeak && (
              <SkyTeamKeroseneTrack
                remaining={keroseneRemaining}
                occupied={null}
                canPlace={false}
                selectedDieId={null}
                onSlotClick={() => undefined}
                layout={keroseneLayout}
                forceShowSlot
                style={{
                  width: `${assemblyLayout.keroseneWidthRem}rem`,
                  marginTop: assemblyLayout.keroseneOffsetYPx,
                }}
              />
            )}
            {assemblyShowLeak && (
              <SkyTeamKeroseneTrack
                mode="leak"
                remaining={leakRemaining}
                occupied={null}
                canPlace={false}
                selectedDieId={null}
                onSlotClick={() => undefined}
                layout={keroseneLayout}
                style={{
                  width: `${assemblyLayout.keroseneWidthRem}rem`,
                  marginTop: assemblyLayout.keroseneOffsetYPx,
                }}
              />
            )}
            <div
              className="st-board-stack"
              style={{
                gap: `${assemblyLayout.internGapRem}rem`,
                maxWidth: assemblyLayout.boardMaxWidthPx,
                minWidth: assemblyLayout.boardMinWidthPx,
                flex: `1 1 ${assemblyLayout.boardMaxWidthPx}px`,
              }}
            >
              <div className="st-board-stack__main" style={{ width: '100%' }}>
                <SkyTeamBoard
                  view={assemblyView}
                  selectedDieId={null}
                  onSlotClick={() => undefined}
                  layout={layout}
                  iceBrakesLayout={iceBrakesLayout}
                  forceShowSlots
                  forceShowTokens
                />
              </div>
              {assemblyShowIntern && (
                <SkyTeamInternBoard
                  wells={demoInternWells}
                  pilotOccupied={null}
                  copilotOccupied={null}
                  pilotCanPlace
                  copilotCanPlace
                  selectedDieId={null}
                  onSlotClick={() => undefined}
                  layout={internLayout}
                  forceShowSlots
                  style={{ width: `${assemblyLayout.internWidthPercent}%` }}
                />
              )}
            </div>
            {assemblyShowWind && (
              <SkyTeamWindRing
                position={windPosition}
                modifier={skyTeamWindModifier(windPosition)}
                layout={windLayout}
                style={{
                  width: `${assemblyLayout.windWidthRem}rem`,
                  marginTop: assemblyLayout.windOffsetYPx,
                }}
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide opacity-60 sm:col-span-2 xl:col-span-1">
              Toggle modules
            </p>
            <label className="st-demo__check">
              <input
                type="checkbox"
                checked={assemblyShowKerosene && !assemblyShowLeak}
                onChange={(e) => {
                  setAssemblyShowKerosene(e.target.checked);
                  if (e.target.checked) setAssemblyShowLeak(false);
                }}
              />
              Kerosene
            </label>
            <label className="st-demo__check">
              <input
                type="checkbox"
                checked={assemblyShowLeak}
                onChange={(e) => {
                  setAssemblyShowLeak(e.target.checked);
                  if (e.target.checked) setAssemblyShowKerosene(true);
                }}
              />
              Kerosene Leak (แทน Kerosene)
            </label>
            <label className="st-demo__check">
              <input
                type="checkbox"
                checked={assemblyShowWind}
                onChange={(e) => setAssemblyShowWind(e.target.checked)}
              />
              Wind
            </label>
            <label className="st-demo__check">
              <input
                type="checkbox"
                checked={assemblyShowIntern}
                onChange={(e) => setAssemblyShowIntern(e.target.checked)}
              />
              Intern
            </label>
            <label className="st-demo__check">
              <input
                type="checkbox"
                checked={assemblyShowIceBrakes}
                onChange={(e) => setAssemblyShowIceBrakes(e.target.checked)}
              />
              Ice Brakes
            </label>

            <p className="m-0 text-xs font-semibold uppercase tracking-wide opacity-60 sm:col-span-2 xl:col-span-1">
              Assembly size / position
            </p>

            <label className="st-demo__field">
              Row gap ({assemblyLayout.rowGapRem} rem)
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={assemblyLayout.rowGapRem}
                onChange={(e) =>
                  setAssemblyLayout((prev) => ({
                    ...prev,
                    rowGapRem: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Board max width ({assemblyLayout.boardMaxWidthPx} px)
              <input
                type="range"
                min={420}
                max={960}
                step={10}
                value={assemblyLayout.boardMaxWidthPx}
                onChange={(e) =>
                  setAssemblyLayout((prev) => ({
                    ...prev,
                    boardMaxWidthPx: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Board min width ({assemblyLayout.boardMinWidthPx} px)
              <input
                type="range"
                min={360}
                max={820}
                step={10}
                value={assemblyLayout.boardMinWidthPx}
                onChange={(e) =>
                  setAssemblyLayout((prev) => ({
                    ...prev,
                    boardMinWidthPx: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Kerosene width ({assemblyLayout.keroseneWidthRem} rem)
              <input
                type="range"
                min={2.5}
                max={9}
                step={0.05}
                value={assemblyLayout.keroseneWidthRem}
                onChange={(e) =>
                  setAssemblyLayout((prev) => ({
                    ...prev,
                    keroseneWidthRem: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Kerosene offset Y ({assemblyLayout.keroseneOffsetYPx} px)
              <input
                type="range"
                min={-80}
                max={120}
                step={1}
                value={assemblyLayout.keroseneOffsetYPx}
                onChange={(e) =>
                  setAssemblyLayout((prev) => ({
                    ...prev,
                    keroseneOffsetYPx: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Wind width ({assemblyLayout.windWidthRem} rem)
              <input
                type="range"
                min={4}
                max={28}
                step={0.1}
                value={assemblyLayout.windWidthRem}
                onChange={(e) =>
                  setAssemblyLayout((prev) => ({
                    ...prev,
                    windWidthRem: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Wind offset Y ({assemblyLayout.windOffsetYPx} px)
              <input
                type="range"
                min={-80}
                max={120}
                step={1}
                value={assemblyLayout.windOffsetYPx}
                onChange={(e) =>
                  setAssemblyLayout((prev) => ({
                    ...prev,
                    windOffsetYPx: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Intern gap ({assemblyLayout.internGapRem} rem)
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={assemblyLayout.internGapRem}
                onChange={(e) =>
                  setAssemblyLayout((prev) => ({
                    ...prev,
                    internGapRem: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Intern width ({assemblyLayout.internWidthPercent}%)
              <input
                type="range"
                min={60}
                max={100}
                step={1}
                value={assemblyLayout.internWidthPercent}
                onChange={(e) =>
                  setAssemblyLayout((prev) => ({
                    ...prev,
                    internWidthPercent: Number(e.target.value),
                  }))
                }
              />
            </label>

            <p className="m-0 text-xs font-semibold uppercase tracking-wide opacity-60 sm:col-span-2 xl:col-span-1">
              Ice Brakes overlay (จาก iceBrakesLayout)
            </p>

            <label className="st-demo__field">
              Overlay left ({iceBrakesLayout.overlay.left}%)
              <input
                type="range"
                min={20}
                max={80}
                step={0.5}
                value={iceBrakesLayout.overlay.left}
                onChange={(e) =>
                  setIceBrakesLayout((prev) => ({
                    ...prev,
                    overlay: { ...prev.overlay, left: Number(e.target.value) },
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Overlay top ({iceBrakesLayout.overlay.top}%)
              <input
                type="range"
                min={50}
                max={95}
                step={0.5}
                value={iceBrakesLayout.overlay.top}
                onChange={(e) =>
                  setIceBrakesLayout((prev) => ({
                    ...prev,
                    overlay: { ...prev.overlay, top: Number(e.target.value) },
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Overlay width ({iceBrakesLayout.overlay.width}%)
              <input
                type="range"
                min={25}
                max={90}
                step={0.5}
                value={iceBrakesLayout.overlay.width}
                onChange={(e) =>
                  setIceBrakesLayout((prev) => ({
                    ...prev,
                    overlay: { ...prev.overlay, width: Number(e.target.value) },
                  }))
                }
              />
            </label>
          </div>
        </div>
      </section>

      <section className="card mt-4 p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-semibold">Kerosene track lab</h2>
            <p className="mt-1 mb-0 text-sm opacity-75">
              จูน die slot + marker บน track — Copy JSON แล้ววางใน <code>keroseneLayout.ts</code>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setKeroseneLayout(structuredClone(DEFAULT_KEROSENE_LAYOUT))}
            >
              Reset layout
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `export const DEFAULT_KEROSENE_LAYOUT: SkyTeamKeroseneLayout = ${JSON.stringify(keroseneLayout, null, 2)};\n`,
                );
                setKeroseneCopied(true);
                window.setTimeout(() => setKeroseneCopied(false), 1500);
              }}
            >
              {keroseneCopied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,8rem)_minmax(0,1fr)] lg:items-start">
          <div className="mx-auto w-[5.5rem]">
            <SkyTeamKeroseneTrack
              remaining={keroseneRemaining}
              occupied={
                keroseneShowDie
                  ? {
                      dieId: 'demo',
                      slotId: 'kerosene',
                      color: 'blue',
                      value: 3,
                      ownerId: 'x',
                    }
                  : null
              }
              canPlace
              selectedDieId={null}
              onSlotClick={() => undefined}
              layout={keroseneLayout}
              forceShowSlot
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="st-demo__field">
              Remaining ({keroseneRemaining})
              <input
                type="range"
                min={-1}
                max={20}
                value={keroseneRemaining}
                onChange={(e) => setKeroseneRemaining(Number(e.target.value))}
              />
            </label>

            <label className="st-demo__check mt-6">
              <input
                type="checkbox"
                checked={keroseneShowDie}
                onChange={(e) => setKeroseneShowDie(e.target.checked)}
              />
              Show sample die on slot
            </label>

            <label className="st-demo__field">
              Edit marker level ({keroseneMarkerLevel})
              <input
                type="range"
                min={0}
                max={20}
                value={keroseneMarkerLevel}
                onChange={(e) => setKeroseneMarkerLevel(Number(e.target.value))}
              />
            </label>

            <label className="st-demo__field">
              Marker top @ {keroseneMarkerLevel} (
              {keroseneLayout.markerTopByLevel[keroseneMarkerLevel]}%)
              <input
                type="range"
                min={5}
                max={98}
                step={0.5}
                value={keroseneLayout.markerTopByLevel[keroseneMarkerLevel] ?? 50}
                onChange={(e) => {
                  const top = Number(e.target.value);
                  setKeroseneLayout((prev) => ({
                    ...prev,
                    markerTopByLevel: {
                      ...prev.markerTopByLevel,
                      [keroseneMarkerLevel]: top,
                    },
                  }));
                }}
              />
            </label>

            <label className="st-demo__field">
              Fail (X) top ({keroseneLayout.failMarkerTop}%)
              <input
                type="range"
                min={85}
                max={99}
                step={0.5}
                value={keroseneLayout.failMarkerTop}
                onChange={(e) =>
                  setKeroseneLayout((prev) => ({
                    ...prev,
                    failMarkerTop: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Die left ({keroseneLayout.dieSlot.left}%)
              <input
                type="range"
                min={20}
                max={80}
                step={0.5}
                value={keroseneLayout.dieSlot.left}
                onChange={(e) =>
                  setKeroseneLayout((prev) => ({
                    ...prev,
                    dieSlot: { ...prev.dieSlot, left: Number(e.target.value) },
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Die top ({keroseneLayout.dieSlot.top}%)
              <input
                type="range"
                min={2}
                max={20}
                step={0.5}
                value={keroseneLayout.dieSlot.top}
                onChange={(e) =>
                  setKeroseneLayout((prev) => ({
                    ...prev,
                    dieSlot: { ...prev.dieSlot, top: Number(e.target.value) },
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Die size ({keroseneLayout.dieSlotSize}%)
              <input
                type="range"
                min={20}
                max={60}
                step={0.5}
                value={keroseneLayout.dieSlotSize}
                onChange={(e) =>
                  setKeroseneLayout((prev) => ({
                    ...prev,
                    dieSlotSize: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Marker left ({keroseneLayout.markerLeft}%)
              <input
                type="range"
                min={30}
                max={80}
                step={0.5}
                value={keroseneLayout.markerLeft}
                onChange={(e) =>
                  setKeroseneLayout((prev) => ({
                    ...prev,
                    markerLeft: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field sm:col-span-2">
              Marker width ({keroseneLayout.markerWidth}%)
              <input
                type="range"
                min={12}
                max={45}
                step={0.5}
                value={keroseneLayout.markerWidth}
                onChange={(e) =>
                  setKeroseneLayout((prev) => ({
                    ...prev,
                    markerWidth: Number(e.target.value),
                  }))
                }
              />
            </label>
          </div>
        </div>
      </section>

      <section className="card mt-4 p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-semibold">Intern board lab</h2>
            <p className="mt-1 mb-0 text-sm opacity-75">
              จูน die slots + token wells — Copy JSON แล้ววางใน <code>internLayout.ts</code>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setInternLayout(structuredClone(DEFAULT_INTERN_LAYOUT))}
            >
              Reset layout
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `export const DEFAULT_INTERN_LAYOUT: SkyTeamInternLayout = ${JSON.stringify(internLayout, null, 2)};\n`,
                );
                setInternCopied(true);
                window.setTimeout(() => setInternCopied(false), 1500);
              }}
            >
              {internCopied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
          <div className="mx-auto w-full max-w-[22rem]">
            <SkyTeamInternBoard
              wells={demoInternWells}
              pilotOccupied={
                internShowPilotDie
                  ? {
                      dieId: 'demo',
                      slotId: 'intern_pilot',
                      color: 'blue',
                      value: 5,
                      ownerId: 'x',
                    }
                  : null
              }
              copilotOccupied={null}
              pilotCanPlace
              copilotCanPlace
              selectedDieId={null}
              onSlotClick={() => undefined}
              layout={internLayout}
              forceShowSlots
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="st-demo__field">
              Tokens shown ({internTokenCount})
              <input
                type="range"
                min={0}
                max={6}
                value={internTokenCount}
                onChange={(e) => setInternTokenCount(Number(e.target.value))}
              />
            </label>

            <label className="st-demo__check mt-6">
              <input
                type="checkbox"
                checked={internShowPilotDie}
                onChange={(e) => setInternShowPilotDie(e.target.checked)}
              />
              Show sample pilot die
            </label>

            <label className="st-demo__field">
              Pilot die left ({internLayout.pilotDieSlot.left}%)
              <input
                type="range"
                min={2}
                max={20}
                step={0.5}
                value={internLayout.pilotDieSlot.left}
                onChange={(e) =>
                  setInternLayout((prev) => ({
                    ...prev,
                    pilotDieSlot: {
                      ...prev.pilotDieSlot,
                      left: Number(e.target.value),
                    },
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Copilot die left ({internLayout.copilotDieSlot.left}%)
              <input
                type="range"
                min={80}
                max={98}
                step={0.5}
                value={internLayout.copilotDieSlot.left}
                onChange={(e) =>
                  setInternLayout((prev) => ({
                    ...prev,
                    copilotDieSlot: {
                      ...prev.copilotDieSlot,
                      left: Number(e.target.value),
                    },
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Die size ({internLayout.dieSlotSize}%)
              <input
                type="range"
                min={4}
                max={14}
                step={0.5}
                value={internLayout.dieSlotSize}
                onChange={(e) =>
                  setInternLayout((prev) => ({
                    ...prev,
                    dieSlotSize: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Token width ({internLayout.tokenWidth}%)
              <input
                type="range"
                min={4}
                max={14}
                step={0.5}
                value={internLayout.tokenWidth}
                onChange={(e) =>
                  setInternLayout((prev) => ({
                    ...prev,
                    tokenWidth: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Edit token slot ({internTokenEditIndex})
              <input
                type="range"
                min={0}
                max={5}
                value={internTokenEditIndex}
                onChange={(e) => setInternTokenEditIndex(Number(e.target.value))}
              />
            </label>

            <label className="st-demo__field">
              Token {internTokenEditIndex} left (
              {internLayout.tokenSlots[internTokenEditIndex]?.left}%)
              <input
                type="range"
                min={10}
                max={90}
                step={0.5}
                value={internLayout.tokenSlots[internTokenEditIndex]?.left ?? 50}
                onChange={(e) => {
                  const left = Number(e.target.value);
                  setInternLayout((prev) => {
                    const tokenSlots = prev.tokenSlots.map((s, i) =>
                      i === internTokenEditIndex ? { ...s, left } : s,
                    );
                    return { ...prev, tokenSlots };
                  });
                }}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="card mt-4 p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-semibold">Wind ring lab</h2>
            <p className="mt-1 mb-0 text-sm opacity-75">
              จูน plane / rotation บน ring — Copy JSON แล้ววางใน <code>windLayout.ts</code>{' '}
              (ในเกมอยู่ด้านขวาของ main board แบบ sibling)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setWindLayout(structuredClone(DEFAULT_WIND_LAYOUT))}
            >
              Reset layout
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `export const DEFAULT_WIND_LAYOUT: SkyTeamWindLayout = ${JSON.stringify(windLayout, null, 2)};\n`,
                );
                setWindCopied(true);
                window.setTimeout(() => setWindCopied(false), 1500);
              }}
            >
              {windCopied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] lg:items-start">
          <div className="mx-auto w-[8.5rem]">
            <SkyTeamWindRing position={windPosition} modifier={windPosition} layout={windLayout} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="st-demo__field">
              Position ({windPosition}/20) · mod{' '}
              {(() => {
                const v = skyTeamWindModifier(windPosition);
                return v > 0 ? `+${v}` : `${v}`;
              })()}
              <input
                type="range"
                min={WIND_MIN_POSITION}
                max={WIND_MAX_POSITION}
                value={windPosition}
                onChange={(e) => setWindPosition(Number(e.target.value))}
              />
            </label>

            <label className="st-demo__field">
              Step degrees ({windLayout.stepDegrees}°)
              <input
                type="range"
                min={5}
                max={30}
                step={0.5}
                value={windLayout.stepDegrees}
                onChange={(e) =>
                  setWindLayout((prev) => ({
                    ...prev,
                    stepDegrees: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Plane size ({windLayout.planeSize}%)
              <input
                type="range"
                min={20}
                max={70}
                step={0.5}
                value={windLayout.planeSize}
                onChange={(e) =>
                  setWindLayout((prev) => ({
                    ...prev,
                    planeSize: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Base rotation ({windLayout.baseRotation}°)
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={windLayout.baseRotation}
                onChange={(e) =>
                  setWindLayout((prev) => ({
                    ...prev,
                    baseRotation: Number(e.target.value),
                  }))
                }
              />
            </label>
          </div>
        </div>
      </section>

      <section className="card mt-4 p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-semibold">Ice Brakes lab</h2>
            <p className="mt-1 mb-0 text-sm opacity-75">
              แสดงบน main board จริง — จูน overlay + ตำแหน่ง marker / die — Copy JSON แล้ววางใน{' '}
              <code>iceBrakesLayout.ts</code>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setIceBrakesLayout(structuredClone(DEFAULT_ICE_BRAKES_LAYOUT))}
            >
              Reset layout
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `export const DEFAULT_ICE_BRAKES_LAYOUT: SkyTeamIceBrakesLayout = ${JSON.stringify(iceBrakesLayout, null, 2)};\n`,
                );
                setIceBrakesCopied(true);
                window.setTimeout(() => setIceBrakesCopied(false), 1500);
              }}
            >
              {iceBrakesCopied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
          <div className="mx-auto w-full max-w-[36rem]">
            <SkyTeamBoard
              view={iceBrakesView}
              selectedDieId={null}
              onSlotClick={() => undefined}
              layout={layout}
              iceBrakesLayout={iceBrakesLayout}
              forceShowSlots
              forceShowTokens
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide opacity-60 sm:col-span-2 lg:col-span-1">
              Overlay (บน main board)
            </p>

            <label className="st-demo__field">
              Overlay left ({iceBrakesLayout.overlay.left}%)
              <input
                type="range"
                min={20}
                max={80}
                step={0.5}
                value={iceBrakesLayout.overlay.left}
                onChange={(e) =>
                  setIceBrakesLayout((prev) => ({
                    ...prev,
                    overlay: { ...prev.overlay, left: Number(e.target.value) },
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Overlay top ({iceBrakesLayout.overlay.top}%)
              <input
                type="range"
                min={50}
                max={95}
                step={0.5}
                value={iceBrakesLayout.overlay.top}
                onChange={(e) =>
                  setIceBrakesLayout((prev) => ({
                    ...prev,
                    overlay: { ...prev.overlay, top: Number(e.target.value) },
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Overlay width ({iceBrakesLayout.overlay.width}%)
              <input
                type="range"
                min={25}
                max={90}
                step={0.5}
                value={iceBrakesLayout.overlay.width}
                onChange={(e) =>
                  setIceBrakesLayout((prev) => ({
                    ...prev,
                    overlay: { ...prev.overlay, width: Number(e.target.value) },
                  }))
                }
              />
            </label>

            <p className="m-0 text-xs font-semibold uppercase tracking-wide opacity-60 sm:col-span-2 lg:col-span-1">
              Marker track (จูนจุดที่ marker อยู่ตอนนี้)
            </p>

            <label className="st-demo__field">
              Marker stop ({iceBrakesMarker}/4)
              <input
                type="range"
                min={0}
                max={4}
                value={iceBrakesMarker}
                onChange={(e) => setIceBrakesMarker(Number(e.target.value))}
              />
            </label>

            <label className="st-demo__field">
              Marker left ({iceBrakesLayout.markerTrack[iceBrakesMarker]?.left}%)
              <input
                type="range"
                min={4}
                max={96}
                step={0.5}
                value={iceBrakesLayout.markerTrack[iceBrakesMarker]?.left ?? 50}
                onChange={(e) => {
                  const left = Number(e.target.value);
                  setIceBrakesLayout((prev) => {
                    const markerTrack = prev.markerTrack.map((p, i) =>
                      i === iceBrakesMarker ? { ...p, left } : p,
                    ) as SkyTeamIceBrakesLayout['markerTrack'];
                    return { ...prev, markerTrack };
                  });
                }}
              />
            </label>

            <label className="st-demo__field">
              Marker top ({iceBrakesLayout.markerTrack[iceBrakesMarker]?.top}%)
              <input
                type="range"
                min={8}
                max={92}
                step={0.5}
                value={iceBrakesLayout.markerTrack[iceBrakesMarker]?.top ?? 50}
                onChange={(e) => {
                  const top = Number(e.target.value);
                  setIceBrakesLayout((prev) => {
                    const markerTrack = prev.markerTrack.map((p, i) =>
                      i === iceBrakesMarker ? { ...p, top } : p,
                    ) as SkyTeamIceBrakesLayout['markerTrack'];
                    return { ...prev, markerTrack };
                  });
                }}
              />
            </label>

            <label className="st-demo__field">
              Marker width ({iceBrakesLayout.markerWidth}%)
              <input
                type="range"
                min={5}
                max={20}
                step={0.5}
                value={iceBrakesLayout.markerWidth}
                onChange={(e) =>
                  setIceBrakesLayout((prev) => ({
                    ...prev,
                    markerWidth: Number(e.target.value),
                  }))
                }
              />
            </label>

            <p className="m-0 text-xs font-semibold uppercase tracking-wide opacity-60 sm:col-span-2 lg:col-span-1">
              Die slots
            </p>

            <label className="st-demo__check">
              <input
                type="checkbox"
                checked={iceBrakesShowDie}
                onChange={(e) => setIceBrakesShowDie(e.target.checked)}
              />
              Show sample pilot die (2)
            </label>

            <label className="st-demo__field">
              Die size ({iceBrakesLayout.dieSlotSize}%)
              <input
                type="range"
                min={8}
                max={24}
                step={0.5}
                value={iceBrakesLayout.dieSlotSize}
                onChange={(e) =>
                  setIceBrakesLayout((prev) => ({
                    ...prev,
                    dieSlotSize: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Edit row
              <select
                value={iceBrakesEditRow}
                onChange={(e) => setIceBrakesEditRow(e.target.value as 'pilot' | 'copilot')}
              >
                <option value="pilot">Pilot (blue)</option>
                <option value="copilot">Co-Pilot (orange)</option>
              </select>
            </label>

            <label className="st-demo__field">
              Edit level ({ICE_BRAKE_LEVEL_LIST[iceBrakesEditLevel]})
              <input
                type="range"
                min={0}
                max={3}
                value={iceBrakesEditLevel}
                onChange={(e) => setIceBrakesEditLevel(Number(e.target.value))}
              />
            </label>

            <label className="st-demo__field">
              Die left (
              {iceBrakesEditRow === 'pilot'
                ? iceBrakesLayout.pilotSlots[ICE_BRAKE_LEVEL_LIST[iceBrakesEditLevel]!]?.left
                : iceBrakesLayout.copilotSlots[ICE_BRAKE_LEVEL_LIST[iceBrakesEditLevel]!]?.left}
              %)
              <input
                type="range"
                min={4}
                max={96}
                step={0.5}
                value={
                  iceBrakesEditRow === 'pilot'
                    ? (iceBrakesLayout.pilotSlots[ICE_BRAKE_LEVEL_LIST[iceBrakesEditLevel]!]
                        ?.left ?? 50)
                    : (iceBrakesLayout.copilotSlots[ICE_BRAKE_LEVEL_LIST[iceBrakesEditLevel]!]
                        ?.left ?? 50)
                }
                onChange={(e) => {
                  const left = Number(e.target.value);
                  const level = ICE_BRAKE_LEVEL_LIST[iceBrakesEditLevel]!;
                  setIceBrakesLayout((prev) =>
                    iceBrakesEditRow === 'pilot'
                      ? {
                          ...prev,
                          pilotSlots: {
                            ...prev.pilotSlots,
                            [level]: { ...prev.pilotSlots[level], left },
                          },
                        }
                      : {
                          ...prev,
                          copilotSlots: {
                            ...prev.copilotSlots,
                            [level]: { ...prev.copilotSlots[level], left },
                          },
                        },
                  );
                }}
              />
            </label>

            <label className="st-demo__field">
              Die top (
              {iceBrakesEditRow === 'pilot'
                ? iceBrakesLayout.pilotSlots[ICE_BRAKE_LEVEL_LIST[iceBrakesEditLevel]!]?.top
                : iceBrakesLayout.copilotSlots[ICE_BRAKE_LEVEL_LIST[iceBrakesEditLevel]!]?.top}
              %)
              <input
                type="range"
                min={8}
                max={92}
                step={0.5}
                value={
                  iceBrakesEditRow === 'pilot'
                    ? (iceBrakesLayout.pilotSlots[ICE_BRAKE_LEVEL_LIST[iceBrakesEditLevel]!]?.top ??
                      50)
                    : (iceBrakesLayout.copilotSlots[ICE_BRAKE_LEVEL_LIST[iceBrakesEditLevel]!]
                        ?.top ?? 50)
                }
                onChange={(e) => {
                  const top = Number(e.target.value);
                  const level = ICE_BRAKE_LEVEL_LIST[iceBrakesEditLevel]!;
                  setIceBrakesLayout((prev) =>
                    iceBrakesEditRow === 'pilot'
                      ? {
                          ...prev,
                          pilotSlots: {
                            ...prev.pilotSlots,
                            [level]: { ...prev.pilotSlots[level], top },
                          },
                        }
                      : {
                          ...prev,
                          copilotSlots: {
                            ...prev.copilotSlots,
                            [level]: { ...prev.copilotSlots[level], top },
                          },
                        },
                  );
                }}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="card mt-4 p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-semibold">Kerosene Leak lab</h2>
            <p className="mt-1 mb-0 text-sm opacity-75">
              โหมด leak — จูนตำแหน่ง X marker (ใช้ layout เดียวกับ Kerosene)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setKeroseneLayout(structuredClone(DEFAULT_KEROSENE_LAYOUT))}
            >
              Reset layout
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `export const DEFAULT_KEROSENE_LAYOUT: SkyTeamKeroseneLayout = ${JSON.stringify(keroseneLayout, null, 2)};\n`,
                );
                setLeakCopied(true);
                window.setTimeout(() => setLeakCopied(false), 1500);
              }}
            >
              {leakCopied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,8rem)_minmax(0,1fr)] lg:items-start">
          <div className="mx-auto w-[5.5rem]">
            <SkyTeamKeroseneTrack
              mode="leak"
              remaining={leakRemaining}
              occupied={null}
              canPlace={false}
              selectedDieId={null}
              onSlotClick={() => undefined}
              layout={keroseneLayout}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="st-demo__field">
              Remaining ({leakRemaining})
              <input
                type="range"
                min={-1}
                max={20}
                value={leakRemaining}
                onChange={(e) => setLeakRemaining(Number(e.target.value))}
              />
            </label>

            <label className="st-demo__field">
              Leak marker left ({keroseneLayout.leakMarker.left}%)
              <input
                type="range"
                min={20}
                max={80}
                step={0.5}
                value={keroseneLayout.leakMarker.left}
                onChange={(e) =>
                  setKeroseneLayout((prev) => ({
                    ...prev,
                    leakMarker: {
                      ...prev.leakMarker,
                      left: Number(e.target.value),
                    },
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Leak marker top ({keroseneLayout.leakMarker.top}%)
              <input
                type="range"
                min={2}
                max={20}
                step={0.5}
                value={keroseneLayout.leakMarker.top}
                onChange={(e) =>
                  setKeroseneLayout((prev) => ({
                    ...prev,
                    leakMarker: {
                      ...prev.leakMarker,
                      top: Number(e.target.value),
                    },
                  }))
                }
              />
            </label>

            <label className="st-demo__field">
              Leak marker width ({keroseneLayout.leakMarkerWidth}%)
              <input
                type="range"
                min={20}
                max={60}
                step={0.5}
                value={keroseneLayout.leakMarkerWidth}
                onChange={(e) =>
                  setKeroseneLayout((prev) => ({
                    ...prev,
                    leakMarkerWidth: Number(e.target.value),
                  }))
                }
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
