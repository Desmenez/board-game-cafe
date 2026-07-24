import { useEffect, useState } from 'react';
import { parseSkyTeamLobbyOptions, type SkyTeamLobbyOptions as SkyTeamOpts } from 'shared';
import { BookOpen } from 'lucide-react';
import { Button, Dialog, DialogTitle, Select } from '../../ui';
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

  const update = (patch: Partial<SkyTeamOpts>) => {
    const next = { ...opts, ...patch };
    setOpts(next);
    onChange(next);
  };

  return (
    <div className="grid gap-3">
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

      <label className="grid gap-1 text-sm">
        <span>Approach scenario</span>
        <Select
          disabled={!isHost}
          value={opts.scenarioId}
          onChange={(e) => update({ scenarioId: e.target.value })}
        >
          <option value="yul">YUL Montréal-Trudeau</option>
        </Select>
      </label>

      <HowToPlayDialog open={howto} onClose={() => setHowto(false)} />
    </div>
  );
}
