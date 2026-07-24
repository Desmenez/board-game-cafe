import { useEffect, useMemo, useState } from 'react';
import {
  MAX_SPECIAL_ABILITIES,
  SKY_TEAM_MODULE_IDS,
  SKY_TEAM_MODULE_META,
  SKY_TEAM_SPECIAL_ABILITY_DEFS,
  SKY_TEAM_SPECIAL_ABILITY_IDS,
  getSkyTeamLobbyValidationErrors,
  parseSkyTeamLobbyOptions,
  type SkyTeamLobbyOptions as SkyTeamOpts,
  type SkyTeamModuleId,
  type SkyTeamSpecialAbilityId,
} from 'shared';
import { BookOpen } from 'lucide-react';
import { Button, Checkbox, Dialog, DialogTitle, Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

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
          <li>Strategy: คุยแผนได้ แล้วกด Finish (หรือรอหมดเวลา) — ห้ามคุยค่าลูกเต๋า</li>
          <li>Server ทอยลูกเต๋า — เห็นเฉพาะของตัวเอง</li>
          <li>SILENT PHASE: ผลัดกันวางทีละลูกบนแผงควบคุม</li>
          <li>Axis / Engine / Radio / Gear / Flaps / Brakes มีผลทันทีเมื่อวาง</li>
          <li>วางครบ 8 ลูก → ลด altitude → รอบใหม่</li>
          <li>ชนะเมื่อเคลียร์เครื่องบิน, Gear+Flaps ครบ, Axis ตรง, ความเร็ว &lt; เบรก</li>
        </ol>
        <p className="text-ink-2">
          Expansion modules และ Special Abilities เลือกได้ด้านล่าง (โฮสต์เท่านั้น) — ไม่เปิด = เล่นกติกาพื้นฐาน
        </p>
      </div>
    </Dialog>
  );
}

export function SkyTeamLobbyOptions({ isHost, onChange, lobbyOptions }: LobbyOptionsProps) {
  const [opts, setOpts] = useState(() => optsFromUnknown(lobbyOptions));
  const [howto, setHowto] = useState(false);

  useEffect(() => {
    setOpts(optsFromUnknown(lobbyOptions));
  }, [lobbyOptions]);

  const validationErrors = useMemo(() => getSkyTeamLobbyValidationErrors(opts), [opts]);

  const update = (patch: Partial<SkyTeamOpts>) => {
    const next = parseSkyTeamLobbyOptions({ ...opts, ...patch });
    setOpts(next);
    onChange(next);
  };

  const toggleModule = (id: SkyTeamModuleId, checked: boolean) => {
    let enabledModules = [...opts.enabledModules];
    if (checked) {
      if (!enabledModules.includes(id)) enabledModules.push(id);
      // Compatibility: kerosene ↔ kerosene-leak are mutually exclusive
      if (id === 'kerosene') {
        enabledModules = enabledModules.filter((m) => m !== 'kerosene-leak');
      }
      if (id === 'kerosene-leak') {
        enabledModules = enabledModules.filter((m) => m !== 'kerosene');
      }
    } else {
      enabledModules = enabledModules.filter((m) => m !== id);
    }
    update({ enabledModules });
  };

  const toggleAbility = (id: SkyTeamSpecialAbilityId, checked: boolean) => {
    let selected = [...opts.selectedSpecialAbilityIds];
    if (checked) {
      if (selected.length >= MAX_SPECIAL_ABILITIES) return;
      if (!selected.includes(id)) selected.push(id);
    } else {
      selected = selected.filter((a) => a !== id);
    }
    update({ selectedSpecialAbilityIds: selected });
  };

  const keroseneOn = opts.enabledModules.includes('kerosene');
  const keroseneLeakOn = opts.enabledModules.includes('kerosene-leak');

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-2">Sky Team — Pilot + Co-Pilot (2 คน)</p>
        <Button type="button" size="sm" variant="ghost" onClick={() => setHowto(true)}>
          <BookOpen className="size-4" /> วิธีเล่น
        </Button>
      </div>

      <label className="grid gap-1 text-sm">
        <span>เวลา Strategy (วินาที)</span>
        <Select
          disabled={!isHost}
          value={String(opts.strategySeconds)}
          onChange={(e) => update({ strategySeconds: Number(e.target.value) })}
        >
          {[30, 60, 90, 120, 180].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </label>

      <section className="grid gap-2">
        <div>
          <h3 className="text-sm font-semibold">Expansion modules</h3>
          <p className="text-xs text-ink-2">
            เลือกโมดูลที่ต้องการเปิดในแมตช์นี้ (ยังใช้ Approach / Altitude พื้นฐาน)
          </p>
        </div>
        <div className="grid gap-2">
          {SKY_TEAM_MODULE_IDS.map((id) => {
            const meta = SKY_TEAM_MODULE_META[id];
            const checked = opts.enabledModules.includes(id);
            const conflictDisabled =
              (id === 'kerosene' && keroseneLeakOn) || (id === 'kerosene-leak' && keroseneOn);
            return (
              <Checkbox
                key={id}
                disabled={!isHost || conflictDisabled}
                checked={checked}
                onChange={(e) => toggleModule(id, e.target.checked)}
                label={meta.name}
                description={
                  conflictDisabled
                    ? `${meta.description} (ขัดกับ ${id === 'kerosene' ? 'Kerosene Leak' : 'Kerosene'})`
                    : meta.description
                }
              />
            );
          })}
        </div>
      </section>

      <section className="grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Special abilities</h3>
          <span className="text-xs text-ink-2">
            {opts.selectedSpecialAbilityIds.length}/{MAX_SPECIAL_ABILITIES}
          </span>
        </div>
        <div className="grid gap-2">
          {SKY_TEAM_SPECIAL_ABILITY_IDS.map((id) => {
            const def = SKY_TEAM_SPECIAL_ABILITY_DEFS[id];
            const checked = opts.selectedSpecialAbilityIds.includes(id);
            const atCap =
              !checked && opts.selectedSpecialAbilityIds.length >= MAX_SPECIAL_ABILITIES;
            return (
              <Checkbox
                key={id}
                disabled={!isHost || atCap}
                checked={checked}
                onChange={(e) => toggleAbility(id, e.target.checked)}
                label={def.name}
                description={
                  atCap ? `${def.description} (ครบ ${MAX_SPECIAL_ABILITIES} ใบแล้ว)` : def.description
                }
              />
            );
          })}
        </div>
      </section>

      {validationErrors.length > 0 && (
        <ul className="m-0 list-disc space-y-1 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {validationErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <HowToPlayDialog open={howto} onClose={() => setHowto(false)} />
    </div>
  );
}
