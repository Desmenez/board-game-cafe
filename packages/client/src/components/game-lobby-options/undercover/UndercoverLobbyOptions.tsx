import { useEffect, useMemo, useState } from 'react';
import {
  UNDERCOVER_CATEGORIES,
  UNDERCOVER_RANDOM_CATEGORY_ID,
  parseUndercoverLobbyOptions,
  recommendedMrWhiteEnabled,
  recommendedUndercoverCount,
  undercoverCountBounds,
  type UndercoverLobbyOptions as UndercoverOpts,
} from 'shared';
import { BookOpen } from 'lucide-react';
import '../../../games/undercover/undercover.css';
import { Button, Checkbox, Dialog, DialogFooter, DialogTitle, Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

function optsFromUnknown(opts: unknown, playerCount?: number): UndercoverOpts {
  return parseUndercoverLobbyOptions(opts, playerCount);
}

function HowToPlayDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogTitle>วิธีเล่น Undercover</DialogTitle>
      <div className="uc-howto-body">
        <p>
          ทุกคนได้รับคำลับ — คนธรรมดาได้คำเดียวกัน Undercover ได้คำที่ใกล้เคียงแต่ต่างกัน Mr. White
          ไม่มีคำ
        </p>
        <ol>
          <li>เปิดดูคำของคุณและจำไว้ (ไม่รู้ว่าตัวเองเป็นใคร)</li>
          <li>รอบคำใบ้: พูดคำใบ้นอกแอป (ห้ามพูดคำตรงๆ) แล้วกด «เสร็จแล้ว»</li>
          <li>อภิปรายหาคนที่น่าสงสัย</li>
          <li>โหวตลับคัดออก — ไม่เปิดเผยคำหรือบทบาทของคนที่ถูกคัดออก</li>
          <li>
            คนธรรมดาชนะเมื่อคัดออก Undercover และ Mr. White หมด —
            ทีมลับชนะเมื่อจำนวนรอดเท่ากับหรือมากกว่าคนธรรมดา
          </li>
          <li>Mr. White ที่ถูกคัดออกมีโอกาสทายคำคนธรรมดา 1 ครั้ง — ทายถูกชนะทันที</li>
        </ol>
      </div>
      <DialogFooter>
        <Button type="button" onClick={onClose}>
          ปิด
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export function UndercoverLobbyOptions({
  isHost,
  onChange,
  lobbyOptions,
  playerCount,
}: LobbyOptionsProps) {
  const initial = useMemo(
    () => optsFromUnknown(lobbyOptions, playerCount),
    [lobbyOptions, playerCount],
  );
  const [opts, setOpts] = useState(initial);
  const [howToOpen, setHowToOpen] = useState(false);

  useEffect(() => {
    if (isHost) return;
    setOpts(optsFromUnknown(lobbyOptions, playerCount));
  }, [isHost, lobbyOptions, playerCount]);

  const bounds = useMemo(
    () => undercoverCountBounds(playerCount ?? 3, opts.mrWhiteEnabled),
    [playerCount, opts.mrWhiteEnabled],
  );

  const recommended = useMemo(() => {
    const n = playerCount ?? 3;
    return {
      undercover: recommendedUndercoverCount(n),
      mrWhite: recommendedMrWhiteEnabled(n),
    };
  }, [playerCount]);

  const push = (next: UndercoverOpts) => {
    setOpts(next);
    if (isHost) onChange(next);
  };

  return (
    <div className="uc-lobby-options">
      <div className="uc-lobby-options__head">
        <h3>{isHost ? 'ตั้งค่า Undercover' : 'ตั้งค่า Undercover (ตั้งโดยหัวห้อง)'}</h3>
        <Button type="button" variant="secondary" size="sm" onClick={() => setHowToOpen(true)}>
          <BookOpen size={16} aria-hidden />
          วิธีเล่น
        </Button>
      </div>

      {!isHost && <p className="uc-lobby-hint">เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้</p>}

      <p className="uc-lobby-hint">
        ตัวจับเวลา 30 วินาทีต่อคำใบ้ / 60 วินาทีอภิปราย · 1 รอบคำใบ้ก่อนโหวต
      </p>

      <div className="uc-lobby-grid">
        <label className="uc-lobby-field">
          <span>หมวดคำ</span>
          {isHost ? (
            <Select
              value={opts.categoryId}
              onChange={(e) => push({ ...opts, categoryId: e.target.value })}
            >
              <option value={UNDERCOVER_RANDOM_CATEGORY_ID}>สุ่มหมวด</option>
              {UNDERCOVER_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          ) : (
            <span className="uc-lobby-readonly">
              {opts.categoryId === UNDERCOVER_RANDOM_CATEGORY_ID
                ? 'สุ่มหมวด'
                : UNDERCOVER_CATEGORIES.find((c) => c.id === opts.categoryId)?.label}
            </span>
          )}
        </label>

        <label className="uc-lobby-field">
          <span>
            จำนวน Undercover ({bounds.min}–{bounds.max})
            <small> แนะนำ {recommended.undercover}</small>
          </span>
          {isHost ? (
            <Select
              value={String(opts.undercoverCount)}
              onChange={(e) => push({ ...opts, undercoverCount: Number(e.target.value) })}
            >
              {Array.from({ length: bounds.max - bounds.min + 1 }, (_, i) => bounds.min + i).map(
                (n) => (
                  <option key={n} value={String(n)}>
                    {n} คน
                  </option>
                ),
              )}
            </Select>
          ) : (
            <span className="uc-lobby-readonly">{opts.undercoverCount} คน</span>
          )}
        </label>

        <label className="uc-lobby-field uc-lobby-field--check">
          {isHost ? (
            <Checkbox
              checked={opts.mrWhiteEnabled}
              disabled={(playerCount ?? 0) < 6}
              onChange={(e) => push({ ...opts, mrWhiteEnabled: e.target.checked })}
              label={`เปิด Mr. White${(playerCount ?? 0) < 6 ? ' (ต้องมี 6 คนขึ้นไป)' : ''}`}
            />
          ) : (
            <span className="uc-lobby-readonly">
              Mr. White: {opts.mrWhiteEnabled ? 'เปิด' : 'ปิด'}
            </span>
          )}
        </label>
      </div>

      <HowToPlayDialog open={howToOpen} onClose={() => setHowToOpen(false)} />
    </div>
  );
}
