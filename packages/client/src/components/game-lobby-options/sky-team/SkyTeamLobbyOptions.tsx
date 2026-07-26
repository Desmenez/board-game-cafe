import { useEffect, useMemo, useState } from 'react';
import {
  SKY_TEAM_SCENARIOS,
  getSkyTeamLobbyValidationErrors,
  getSkyTeamScenario,
  parseSkyTeamLobbyOptions,
  type SkyTeamApproachSpaceState,
  type SkyTeamLobbyOptions as SkyTeamOpts,
  type SkyTeamScenarioDefinition,
} from 'shared';
import { BookOpen, Star } from 'lucide-react';
import { ScenarioCountryFlag } from '../../../games/sky-team/components/ScenarioCountryFlag';
import { ScenarioModuleIcons } from '../../../games/sky-team/components/ScenarioModuleIcons';
import { SkyTeamApproachTrackPanel } from '../../../games/sky-team/components/SkyTeamTracksPanel';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { Button, Dialog, DialogTitle, Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';
import './sky-team-lobby-options.css';

function optsFromUnknown(opts: unknown): SkyTeamOpts {
  return parseSkyTeamLobbyOptions(opts);
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
          เลือกสนามบินในล็อบบี้ — ถ้าบทมีดาว Special Ability ทั้งสองคนจะเลือกใน modal ตอนกดเริ่มเกม
        </p>
      </div>
    </Dialog>
  );
}

const SCENARIO_LIST = Object.values(SKY_TEAM_SCENARIOS);

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

function ScenarioAbilityStar({ slots }: { slots: number }) {
  if (slots <= 0) return null;
  return (
    <span
      className="st-scenario-card__ability-star"
      title={`Special Abilities: ${slots}`}
      aria-label={`Special Abilities ${slots}`}
    >
      <Star className="st-scenario-card__ability-star-icon" fill="currentColor" aria-hidden />
      <span className="st-scenario-card__ability-star-count">{slots}</span>
    </span>
  );
}

function ScenarioSymbols({ scenario }: { scenario: SkyTeamScenarioDefinition }) {
  const hasModuleArt = scenario.modules.some((id) => Boolean(imageMap.skyTeam.modules[id]));
  if (!hasModuleArt && scenario.specialAbilitySlots <= 0) return null;
  return (
    <div className="st-scenario-card__symbols">
      <ScenarioModuleIcons modules={scenario.modules} />
      <ScenarioAbilityStar slots={scenario.specialAbilitySlots} />
    </div>
  );
}

function ScenarioPreviewCard({
  scenario,
  onOpenApproach,
}: {
  scenario: SkyTeamScenarioDefinition;
  onOpenApproach: () => void;
}) {
  const art = imageMap.skyTeam.scenarios[scenario.id];

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
          <p className="st-scenario-card__blurb line-clamp-5!">{scenario.blurb}</p>
          <ScenarioSymbols scenario={scenario} />
          <p className="st-scenario-card__hint">แตะเพื่อดู Approach track</p>
        </div>
      </div>
    </button>
  );
}

function ScenarioApproachDialog({
  open,
  scenario,
  approachSpaces,
  onOpenChange,
}: {
  open: boolean;
  scenario: SkyTeamScenarioDefinition;
  approachSpaces: SkyTeamApproachSpaceState[];
  onOpenChange: (open: boolean) => void;
}) {
  const art = imageMap.skyTeam.scenarios[scenario.id];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      contentClassName="st-scenario-detail-modal !overflow-hidden !p-0"
    >
      <article
        className={cn('st-scenario-card st-scenario-detail', `st-scenario-card--${scenario.tier}`)}
      >
        <header className="st-scenario-card__header st-scenario-detail__header">
          <span className="st-scenario-card__dot" aria-hidden />
          <div className="st-scenario-card__titles">
            <DialogTitle className="st-scenario-card__code mb-0! text-inherit!">
              {scenario.code}
            </DialogTitle>
            <span className="st-scenario-card__short">{scenario.shortName}</span>
          </div>
          <span className="st-scenario-card__stamp" aria-hidden>
            <span className="st-scenario-card__stamp-ring">
              <ScenarioCountryFlag countryCode={scenario.countryCode} />
            </span>
          </span>
        </header>

        <div className="st-scenario-detail__scroll">
          <div className="st-scenario-detail__hero">
            {art ? (
              <img src={art} alt="" draggable={false} />
            ) : (
              <div className="st-scenario-detail__hero-fallback" />
            )}
          </div>

          <div className="st-scenario-detail__copy">
            <p className="st-scenario-detail__tier">{scenario.tierLabel}</p>
            <p className="st-scenario-detail__blurb">{scenario.blurb}</p>
            <ScenarioSymbols scenario={scenario} />
          </div>

          <section className="st-scenario-detail__track" aria-label="Approach track">
            <h3 className="st-scenario-detail__track-title">Approach track</h3>
            <SkyTeamApproachTrackPanel approach={approachSpaces} />
          </section>
        </div>
      </article>
    </Dialog>
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

  const playerIds = useMemo(() => players.map((p) => p.id), [players]);
  const validationErrors = useMemo(
    () =>
      getSkyTeamLobbyValidationErrors(opts, playerIds).filter((e) => !/Special Ability/.test(e)),
    [opts, playerIds],
  );
  const scenario = getSkyTeamScenario(opts.scenarioId);
  const approachSpaces = useMemo(() => approachFromScenario(scenario), [scenario]);

  const update = (patch: Partial<SkyTeamOpts>) => {
    const next = parseSkyTeamLobbyOptions({
      ...opts,
      ...patch,
      ...(patch.scenarioId && patch.scenarioId !== opts.scenarioId
        ? { specialAbilityPicksByPlayerId: {}, abilityPickOpen: false }
        : {}),
    });
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

      {scenario.specialAbilitySlots > 0 && (
        <p className="m-0 rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink-2">
          Special Abilities ×{scenario.specialAbilitySlots} — ทั้งสองคนจะเลือกหลังเริ่มเกม
          (ก่อนคุยแผน Strategy)
        </p>
      )}

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

      <ScenarioApproachDialog
        open={approachOpen}
        scenario={scenario}
        approachSpaces={approachSpaces}
        onOpenChange={setApproachOpen}
      />
    </div>
  );
}
