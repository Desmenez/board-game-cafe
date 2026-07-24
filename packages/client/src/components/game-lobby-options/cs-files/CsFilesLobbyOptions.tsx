import { useEffect, useMemo, useState } from 'react';
import {
  CS_FILES_DISCUSSION_MINUTES,
  CS_FILES_TURN_SECONDS,
  parseCsFilesLobbyOptions,
  type CsFilesLobbyOptions as CsFilesOpts,
} from 'shared';
import { BookOpen } from 'lucide-react';
import { Button, Checkbox, Dialog, DialogFooter, DialogTitle, Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

function optsFromUnknown(opts: unknown, playerCount?: number): CsFilesOpts {
  return parseCsFilesLobbyOptions(opts, playerCount);
}

function HowToPlayDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      className="room-night-dialog"
      overlayClassName="room-night-dialog-overlay"
    >
      <DialogTitle>วิธีเล่น CS Files</DialogTitle>
      <div className="grid max-h-[70vh] gap-4 overflow-y-auto text-sm leading-relaxed text-ink-2">
        <section>
          <h3 className="font-display text-base font-bold text-ink">เป้าหมาย</h3>
          <p>
            ค้นหาให้ถูกต้องทั้ง «หลักฐานสำคัญ» (การ์ดน้ำตาล) และ «วิธีการฆาตกรรม» (การ์ดน้ำเงิน)
            ภายใน 3 รอบสืบสวน (~20 นาที) ผู้เล่น 4–12 คน
          </p>
        </section>

        <section>
          <h3 className="font-display text-base font-bold text-ink">บทบาท</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>นักนิติวิทยาศาสตร์</strong> — รู้คำตอบ ใบ้ได้แค่แผ่นสถานการณ์กับหมุด
              (ห้ามพูด/ใบ้ด้วยท่าทาง)
            </li>
            <li>
              <strong>ฆาตกร</strong> — เลือกการ์ดหลักฐาน 1 ใบและวิธีฆ่า 1 ใบของตนเป็นคำตอบ
              (ไม่รู้ว่าใครเป็นสมรู้ร่วมคิด)
            </li>
            <li>
              <strong>นักสืบ</strong> — วิเคราะห์คำใบ้และไขคดี
            </li>
            <li>
              <strong>ผู้สมรู้ร่วมคิด</strong> (≥6 คน) — รู้ว่าใครเป็นฆาตกรและรู้คำตอบ
            </li>
            <li>
              <strong>พยาน</strong> (ร่วมกับสมรู้ร่วมคิด) — รู้ว่าใคร 2 คนเป็นฝ่ายร้าย
              แต่ไม่รู้ว่าใครเป็นฆาตกร/สมรู้ร่วมคิด และไม่รู้การ์ดคำตอบ
            </li>
          </ul>
        </section>

        <section>
          <h3 className="font-display text-base font-bold text-ink">ลำดับการเล่น</h3>
          <ol className="list-decimal space-y-1 pl-5">
            <li>ช่วงก่อเหตุ: ฆาตกรเลือกคำตอบ</li>
            <li>สืบสวน 3 รอบ: วางหมุด → อภิปราย → รอบสืบสวนผลัดกันไขคดี/ผ่าน</li>
            <li>
              รอบ 2–3: นิติฯ ได้แผ่นสถานการณ์ใหม่ แล้วเลือกแผ่นเก่าออก 1 แผ่น
              (ห้ามเปลี่ยนสถานที่/สาเหตุการตาย) แล้ววางหมุดบนแผ่นใหม่
            </li>
            <li>รอบสุดท้าย: ผู้ที่ยังมีเหรียญตราต้องไขคดี ห้ามผ่าน</li>
          </ol>
        </section>

        <section>
          <h3 className="font-display text-base font-bold text-ink">สรุปกติกาสำคัญ</h3>
          <ol className="list-decimal space-y-1 pl-5">
            <li>ตอบถูกทั้งหลักฐานและวิธีฆ่าของคนเดียวกัน</li>
            <li>สิทธิ์ตอบมีครั้งเดียวต่อคน (นักนิติฯ ตอบไม่ได้)</li>
            <li>นักนิติฯ ใบ้ได้แค่แผ่น+หมุด — ไม่ร่วมอภิปราย</li>
            <li>สถานที่เกิดเหตุ + สาเหตุการตาย ไม่เปลี่ยนหลังรอบแรก</li>
            <li>มีพยานแล้วไขถูก — ฆาตกรยังชี้พยานพลิกผลได้</li>
          </ol>
        </section>
      </div>
      <DialogFooter>
        <Button type="button" onClick={onClose}>
          ปิด
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export function CsFilesLobbyOptions({
  isHost,
  onChange,
  lobbyOptions,
  playerCount,
  players = [],
}: LobbyOptionsProps) {
  const initial = useMemo(
    () => optsFromUnknown(lobbyOptions, playerCount),
    [lobbyOptions, playerCount],
  );
  const [includeAccomplice, setIncludeAccomplice] = useState(initial.includeAccomplice);
  const [includeWitness, setIncludeWitness] = useState(initial.includeWitness);
  const [discussionMinutes, setDiscussionMinutes] = useState(initial.discussionMinutes);
  const [turnSeconds, setTurnSeconds] = useState(initial.turnSeconds);
  const [forensicMode, setForensicMode] = useState<'random' | 'manual'>(initial.forensicMode);
  const [forensicPlayerId, setForensicPlayerId] = useState(initial.forensicPlayerId ?? '');
  const [howtoOpen, setHowtoOpen] = useState(false);

  const canUseSpecial = (playerCount ?? 0) >= 6;
  const forensicStillInRoom =
    forensicPlayerId === '' || players.some((p) => p.id === forensicPlayerId);

  useEffect(() => {
    if (isHost) return;
    setIncludeAccomplice(initial.includeAccomplice);
    setIncludeWitness(initial.includeWitness);
    setDiscussionMinutes(initial.discussionMinutes);
    setTurnSeconds(initial.turnSeconds);
    setForensicMode(initial.forensicMode);
    setForensicPlayerId(initial.forensicPlayerId ?? '');
  }, [isHost, initial]);

  useEffect(() => {
    if (!isHost) return;
    if (canUseSpecial) return;
    if (!includeAccomplice && !includeWitness) return;
    const next = parseCsFilesLobbyOptions(
      {
        includeAccomplice: false,
        includeWitness: false,
        discussionMinutes,
        turnSeconds,
        forensicMode,
        forensicPlayerId: forensicMode === 'manual' ? forensicPlayerId || undefined : undefined,
      },
      playerCount,
    );
    setIncludeAccomplice(false);
    setIncludeWitness(false);
    onChange(next);
  }, [
    canUseSpecial,
    discussionMinutes,
    forensicMode,
    forensicPlayerId,
    includeAccomplice,
    includeWitness,
    isHost,
    onChange,
    playerCount,
    turnSeconds,
  ]);

  const push = (patch: Partial<CsFilesOpts>) => {
    const mode = patch.forensicMode ?? forensicMode;
    const playerId =
      patch.forensicPlayerId !== undefined ? (patch.forensicPlayerId ?? '') : forensicPlayerId;
    const parsed = parseCsFilesLobbyOptions(
      {
        includeAccomplice,
        includeWitness,
        discussionMinutes,
        turnSeconds,
        ...patch,
        forensicMode: mode,
        forensicPlayerId: mode === 'manual' ? playerId || undefined : undefined,
      },
      playerCount,
    );
    setIncludeAccomplice(parsed.includeAccomplice);
    setIncludeWitness(parsed.includeWitness);
    setDiscussionMinutes(parsed.discussionMinutes);
    setTurnSeconds(parsed.turnSeconds);
    setForensicMode(parsed.forensicMode);
    setForensicPlayerId(parsed.forensicPlayerId ?? '');
    if (isHost) onChange(parsed);
  };

  const selectedForensicName =
    forensicMode === 'manual' && forensicPlayerId
      ? (players.find((p) => p.id === forensicPlayerId)?.name ?? '—')
      : null;

  return (
    <div className="grid gap-3">
      <h3 className="font-display text-base font-bold text-ink">
        {isHost ? 'ตั้งค่า CS Files' : 'ตั้งค่า CS Files (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost ? <p className="text-sm text-ink-3">เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้</p> : null}

      <Button type="button" variant="secondary" size="sm" onClick={() => setHowtoOpen(true)}>
        <BookOpen size={16} aria-hidden /> วิธีเล่น
      </Button>

      <div className="grid gap-3 sm:grid-cols-2">
        {isHost ? (
          <>
            <Select
              className="w-full"
              label="เวลาอภิปราย"
              hint="ทุกคนยกเว้นนักนิติฯ"
              value={String(discussionMinutes)}
              onChange={(e) => push({ discussionMinutes: Number(e.target.value) })}
            >
              {CS_FILES_DISCUSSION_MINUTES.map((m) => (
                <option key={m} value={String(m)}>
                  {m} นาที
                </option>
              ))}
            </Select>
            <Select
              className="w-full"
              label="เวลารอบสืบสวน (ต่อคน)"
              hint="ตัดสินใจไขคดีหรือผ่าน"
              value={String(turnSeconds)}
              onChange={(e) => push({ turnSeconds: Number(e.target.value) })}
            >
              {CS_FILES_TURN_SECONDS.map((s) => (
                <option key={s} value={String(s)}>
                  {s} วินาที
                </option>
              ))}
            </Select>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-2">อภิปราย: {discussionMinutes} นาที</p>
            <p className="text-sm text-ink-2">รอบสืบสวน: {turnSeconds} วินาที/คน</p>
          </>
        )}
      </div>

      {isHost ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            className="w-full"
            label="นักนิติวิทยาศาสตร์"
            hint="รู้คำตอบและวางหมุดใบ้"
            value={forensicMode}
            onChange={(e) => {
              const mode = e.target.value === 'manual' ? 'manual' : 'random';
              push({
                forensicMode: mode,
                forensicPlayerId: mode === 'manual' ? forensicPlayerId || undefined : undefined,
              });
            }}
          >
            <option value="random">สุ่มเมื่อเริ่มเกม</option>
            <option value="manual">เลือกผู้เล่น</option>
          </Select>
          {forensicMode === 'manual' ? (
            <Select
              className="w-full"
              label="เลือกผู้เล่น"
              hint={!forensicStillInRoom ? 'ผู้เล่นที่เลือกไว้ไม่อยู่ในห้องแล้ว' : undefined}
              value={forensicStillInRoom ? forensicPlayerId : ''}
              disabled={players.length === 0}
              onChange={(e) => push({ forensicPlayerId: e.target.value || undefined })}
            >
              <option value="">— เลือกผู้เล่น —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-ink-2">
          นักนิติฯ:{' '}
          {forensicMode === 'random'
            ? 'สุ่มเมื่อเริ่มเกม'
            : selectedForensicName
              ? selectedForensicName
              : 'ยังไม่ได้เลือก'}
        </p>
      )}

      <Checkbox
        checked={canUseSpecial && includeAccomplice}
        disabled={!isHost || !canUseSpecial}
        onChange={(e) => {
          const on = e.target.checked;
          push({ includeAccomplice: on, includeWitness: on ? includeWitness : false });
        }}
        label="ผู้สมรู้ร่วมคิด"
        description={
          canUseSpecial
            ? 'รู้ว่าใครเป็นฆาตกรและรู้คำตอบ (แนะนำเมื่อ ≥ 6 คน)'
            : 'ใช้ได้เมื่อมีผู้เล่นอย่างน้อย 6 คน'
        }
      />

      <Checkbox
        checked={canUseSpecial && includeAccomplice && includeWitness}
        disabled={!isHost || !canUseSpecial || !includeAccomplice}
        onChange={(e) => push({ includeWitness: e.target.checked })}
        label="พยาน"
        description="รู้ว่าใคร 2 คนเป็นฝ่ายร้าย แต่ไม่รู้ว่าใครเป็นฆาตกร/สมรู้ร่วมคิด และไม่รู้คำตอบ — ต้องเปิดสมรู้ร่วมคิดด้วย"
      />

      <HowToPlayDialog open={howtoOpen} onClose={() => setHowtoOpen(false)} />
    </div>
  );
}
