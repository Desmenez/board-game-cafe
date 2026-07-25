import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react';
import {
  SKY_TEAM_MODULE_META,
  SKY_TEAM_SCENARIOS,
  SKY_TEAM_SPECIAL_ABILITY_DEFS,
  getSkyTeamLobbyValidationErrors,
  getSkyTeamScenario,
  parseSkyTeamLobbyOptions,
  type SkyTeamApproachSpaceState,
  type SkyTeamLobbyOptions as SkyTeamOpts,
  type SkyTeamScenarioDefinition,
  type SkyTeamScenarioTier,
} from 'shared';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { BookOpen } from 'lucide-react';
import { SkyTeamApproachTrackPanel } from '../../../games/sky-team/components/SkyTeamTracksPanel';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { Button, Dialog, DialogTitle, Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';
import './sky-team-lobby-options.css';

function optsFromUnknown(opts: unknown): SkyTeamOpts {
  return parseSkyTeamLobbyOptions(opts);
}

type FlagSvgProps = SVGProps<SVGSVGElement>;
type FlagComponent = ComponentType<FlagSvgProps>;

function ScenarioCountryFlag({ countryCode }: { countryCode: string }) {
  const code = countryCode.trim().toUpperCase();
  const Flag = (FlagIcons as Record<string, FlagComponent | undefined>)[code];
  if (!Flag) return <span className="st-scenario-card__flag-fallback" />;
  return <Flag className="st-scenario-card__flag" />;
}

function HowToPlayDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogTitle>วิธีเล่น Sky Team</DialogTitle>
      <div className="grid max-h-[70vh] gap-3 overflow-y-auto text-sm leading-relaxed">
        <p>Co-op 2 คน: Pilot (น้ำเงิน) กับ Co-Pilot (ส้ม) ต้องลงจอดเครื่องบินด้วยกัน</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Strategy: คุยแผนได้ไม่จำกัดเวลา แล้วทั้งคู่กด Finish — ห้ามคุยค่าลูกเต๋า</li>
          <li>Server ทอยลูกเต๋า — เห็นเฉพาะของตัวเอง</li>
          <li>SILENT PHASE: ผลัดกันวางทีละลูกบนแผงควบคุม</li>
          <li>Axis / Engine / Radio / Gear / Flaps / Brakes มีผลทันทีเมื่อวาง</li>
          <li>วางครบ 8 ลูก → ลด altitude → รอบใหม่</li>
          <li>ชนะเมื่อเคลียร์เครื่องบิน, Gear+Flaps ครบ, Axis ตรง, ความเร็ว &lt; เบรก</li>
        </ol>
        <p className="text-ink-2">
          เลือกสนามบิน / บทในล็อบบี้ — โมดูลและความสามารถพิเศษถูกกำหนดตามบทนั้น (โมดูล Real-Time
          จะจับเวลาหลังทอยลูกเต๋าเมื่อบทนั้นเปิดใช้)
        </p>
      </div>
    </Dialog>
  );
}

const SCENARIO_LIST = Object.values(SKY_TEAM_SCENARIOS);

const APPROACH_TIER_HEADER: Record<SkyTeamScenarioTier, string> = {
  green: 'bg-gradient-to-b from-[#a8c86a] to-[#7a9c3f] text-white',
  yellow: 'bg-gradient-to-b from-[#efc65a] to-[#c9951f] text-amber-950',
  red: 'bg-gradient-to-b from-[#d86a6a] to-[#a83a3a] text-white',
};

function approachFromScenario(scenario: SkyTeamScenarioDefinition): SkyTeamApproachSpaceState[] {
  return scenario.spaces.map((s) => ({
    index: s.index,
    base: s.base,
    planes: s.traffic,
    printedPlanes: s.traffic,
    ...(s.trafficDieRolls != null && s.trafficDieRolls > 0
      ? { trafficDieRolls: s.trafficDieRolls }
      : {}),
    ...(s.allowedAxisPositions && s.allowedAxisPositions.length > 0
      ? { allowedAxisPositions: [...s.allowedAxisPositions] }
      : {}),
  }));
}

function ScenarioPreviewCard({
  scenario,
  onOpenApproach,
}: {
  scenario: SkyTeamScenarioDefinition;
  onOpenApproach: () => void;
}) {
  const art = imageMap.skyTeam.scenarios[scenario.id];
  const moduleNames = scenario.modules.map((id) => SKY_TEAM_MODULE_META[id]?.name ?? id);
  const abilityNames = scenario.specialAbilityIds.map(
    (id) => SKY_TEAM_SPECIAL_ABILITY_DEFS[id]?.name ?? id,
  );

  return (
    <button
      type="button"
      className={cn(
        'st-scenario-card st-scenario-card--button',
        `st-scenario-card--${scenario.tier}`,
      )}
      aria-label={`ดู Approach track ของ ${scenario.code} ${scenario.shortName}`}
      onClick={onOpenApproach}
    >
      <header className="st-scenario-card__header">
        <span className="st-scenario-card__dot" aria-hidden />
        <div className="st-scenario-card__titles">
          <span className="st-scenario-card__code">{scenario.code}</span>
          <span className="st-scenario-card__short">{scenario.shortName}</span>
        </div>
        <span className="st-scenario-card__stamp" aria-hidden>
          <span className="st-scenario-card__stamp-ring">
            <ScenarioCountryFlag countryCode={scenario.countryCode} />
          </span>
        </span>
      </header>

      <div className="st-scenario-card__body">
        <div className="st-scenario-card__art">
          {art ? (
            <img src={art} alt="" draggable={false} />
          ) : (
            <div className="st-scenario-card__art-fallback" />
          )}
        </div>
        <div className="st-scenario-card__copy">
          <p className="st-scenario-card__blurb">{scenario.blurb}</p>
          <dl className="st-scenario-card__meta">
            <div>
              <dt>Modules</dt>
              <dd>{moduleNames.length === 0 ? 'Base game' : moduleNames.join(', ')}</dd>
            </div>
            <div>
              <dt>Abilities</dt>
              <dd>{abilityNames.length === 0 ? 'None' : abilityNames.join(', ')}</dd>
            </div>
          </dl>
          <p className="st-scenario-card__hint">แตะเพื่อดู Approach track</p>
        </div>
      </div>
    </button>
  );
}

export function SkyTeamLobbyOptions({
  isHost,
  onChange,
  lobbyOptions,
  players = [],
}: LobbyOptionsProps) {
  const [opts, setOpts] = useState(() => optsFromUnknown(lobbyOptions));
  const [howto, setHowto] = useState(false);
  const [approachOpen, setApproachOpen] = useState(false);

  useEffect(() => {
    setOpts(optsFromUnknown(lobbyOptions));
  }, [lobbyOptions]);

  const validationErrors = useMemo(() => getSkyTeamLobbyValidationErrors(opts), [opts]);
  const scenario = getSkyTeamScenario(opts.scenarioId);
  const approachSpaces = useMemo(() => approachFromScenario(scenario), [scenario]);

  const update = (patch: Partial<SkyTeamOpts>) => {
    const next = parseSkyTeamLobbyOptions({ ...opts, ...patch });
    setOpts(next);
    onChange(next);
  };

  const copilotPreview =
    opts.pilotMode === 'manual' && opts.pilotPlayerId
      ? players.find((p) => p.id !== opts.pilotPlayerId)
      : null;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-2">Sky Team — Pilot + Co-Pilot (2 คน)</p>
        <Button type="button" size="sm" variant="ghost" onClick={() => setHowto(true)}>
          <BookOpen className="size-4" /> วิธีเล่น
        </Button>
      </div>

      <label className="grid gap-1 text-sm">
        <span>Airport / Scenario</span>
        <Select
          disabled={!isHost}
          value={opts.scenarioId}
          onChange={(e) => update({ scenarioId: e.target.value })}
        >
          {SCENARIO_LIST.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.shortName} ({s.tierLabel})
            </option>
          ))}
        </Select>
      </label>

      <ScenarioPreviewCard scenario={scenario} onOpenApproach={() => setApproachOpen(true)} />

      <label className="grid gap-1 text-sm">
        <span>Pilot</span>
        <Select
          disabled={!isHost}
          value={opts.pilotMode}
          onChange={(e) => {
            const v = e.target.value === 'manual' ? 'manual' : 'random';
            update({
              pilotMode: v,
              pilotPlayerId: v === 'manual' ? opts.pilotPlayerId : undefined,
            });
          }}
        >
          <option value="random">สุ่มเมื่อเริ่มเกม</option>
          <option value="manual">เลือกผู้เล่น</option>
        </Select>
      </label>

      {opts.pilotMode === 'manual' && (
        <label className="grid gap-1 text-sm">
          <span>ผู้เล่นที่เป็น Pilot (น้ำเงิน)</span>
          <Select
            disabled={!isHost || players.length === 0}
            value={opts.pilotPlayerId ?? ''}
            onChange={(e) =>
              update({
                pilotMode: 'manual',
                pilotPlayerId: e.target.value || undefined,
              })
            }
          >
            <option value="">— เลือก —</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          {copilotPreview && (
            <span className="text-xs text-ink-2">Co-Pilot (ส้ม): {copilotPreview.name}</span>
          )}
        </label>
      )}

      {validationErrors.length > 0 && (
        <ul className="m-0 list-disc space-y-1 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {validationErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <HowToPlayDialog open={howto} onClose={() => setHowto(false)} />

      <Dialog
        open={approachOpen}
        onOpenChange={setApproachOpen}
        contentClassName="!w-[min(36rem,92vw)] !max-w-[36rem] !overflow-hidden !p-0"
      >
        <header
          className={cn(
            'px-5 pt-4 pb-3',
            APPROACH_TIER_HEADER[scenario.tier] ?? APPROACH_TIER_HEADER.green,
          )}
        >
          <DialogTitle className="mb-0! text-sm! md:text-base! !text-inherit">
            Approach — {scenario.name}
          </DialogTitle>
          <p className="mt-1 mb-0 text-xs opacity-90 md:text-sm !text-inherit">
            {scenario.tierLabel}
          </p>
        </header>
        <div className="px-5 pb-5 pt-1">
          <SkyTeamApproachTrackPanel approach={approachSpaces} enabledModules={scenario.modules} />
        </div>
      </Dialog>
    </div>
  );
}
