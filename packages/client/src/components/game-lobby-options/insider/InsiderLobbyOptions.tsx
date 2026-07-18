import { useEffect, useState } from 'react';
import type { InsiderLobbyOptions as InsiderOpts } from 'shared';
import { Select } from '../../ui';
import type { LobbyOptionsProps } from '../types';

const QUESTIONING_MINUTES = [3, 5, 7, 10, 15] as const;
const DISCUSSION_MINUTES = [1, 2, 3, 5, 10] as const;

const DEFAULTS: InsiderOpts = { questioningMinutes: 5, discussionMinutes: 2 };

function optsFromUnknown(opts: unknown): InsiderOpts {
  let questioningMinutes = DEFAULTS.questioningMinutes;
  let discussionMinutes = DEFAULTS.discussionMinutes;
  if (opts && typeof opts === 'object') {
    const o = opts as Record<string, unknown>;
    if (typeof o.questioningMinutes === 'number' && Number.isFinite(o.questioningMinutes)) {
      questioningMinutes = o.questioningMinutes;
    }
    if (typeof o.discussionMinutes === 'number' && Number.isFinite(o.discussionMinutes)) {
      discussionMinutes = o.discussionMinutes;
    }
  }
  const q = QUESTIONING_MINUTES.includes(questioningMinutes as (typeof QUESTIONING_MINUTES)[number])
    ? questioningMinutes
    : DEFAULTS.questioningMinutes;
  const d = DISCUSSION_MINUTES.includes(discussionMinutes as (typeof DISCUSSION_MINUTES)[number])
    ? discussionMinutes
    : DEFAULTS.discussionMinutes;
  return { questioningMinutes: q, discussionMinutes: d };
}

export function InsiderLobbyOptions({ isHost, onChange, lobbyOptions }: LobbyOptionsProps) {
  const initial = optsFromUnknown(lobbyOptions);
  const [questioningMinutes, setQuestioningMinutes] = useState(initial.questioningMinutes);
  const [discussionMinutes, setDiscussionMinutes] = useState(initial.discussionMinutes);

  // ผู้ไม่ใช่หัวห้อง — รับค่าจาก room.lobbyOptions เมื่อ host อัปเดต
  useEffect(() => {
    if (isHost) return;
    const next = optsFromUnknown(lobbyOptions);
    setQuestioningMinutes(next.questioningMinutes);
    setDiscussionMinutes(next.discussionMinutes);
  }, [isHost, lobbyOptions]);

  // หมายเหตุ: ไม่ใช้ useEffect ส่ง onChange อัตโนมัติ — ฟังก์ชัน onChange จาก parent มักเป็น
  // inline จึงเปลี่ยน reference ทุก render ทำให้เอฟเฟกต์ยิงซ้ำและ state กระพริบ/ไม่ตรงกับที่เลือก
  // ส่งเฉพาะตอน user เปลี่ยน Select แทน

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 8 }}>
        {isHost ? 'ตั้งเวลา Insider' : 'ตั้งเวลา Insider (ตั้งโดยหัวห้อง)'}
      </h3>
      {!isHost && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
          เฉพาะหัวห้องเท่านั้นที่เปลี่ยนได้
        </p>
      )}
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 14 }}>
        กำหนดเวลาขั้นถาม-ตอบ (หาคำลับ) และเวลาอภิปรายหลังมีคนทายถูก — ค่าเริ่มต้น 5 / 2 นาที
      </p>
      <div className="grid grid-cols-2 items-end gap-4">
        {isHost ? (
          <>
            <Select
              className="w-full"
              label="เวลาถาม-ตอบ (หาคำลับ)"
              value={String(questioningMinutes)}
              onChange={(e) => {
                const nextQ = Number(e.target.value);
                setQuestioningMinutes(nextQ);
                if (isHost) onChange({ questioningMinutes: nextQ, discussionMinutes });
              }}
            >
              {QUESTIONING_MINUTES.map((m) => (
                <option key={m} value={String(m)}>
                  {m} นาที
                </option>
              ))}
            </Select>
            <Select
              className="w-full"
              label="เวลาอภิปราย (หลังทายถูก)"
              value={String(discussionMinutes)}
              onChange={(e) => {
                const nextD = Number(e.target.value);
                setDiscussionMinutes(nextD);
                if (isHost) onChange({ questioningMinutes, discussionMinutes: nextD });
              }}
            >
              {DISCUSSION_MINUTES.map((m) => (
                <option key={m} value={String(m)}>
                  {m} นาที
                </option>
              ))}
            </Select>
          </>
        ) : (
          <>
            <div className="ui-field">
              <span className="ui-label">เวลาถาม-ตอบ (หาคำลับ)</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{questioningMinutes} นาที</span>
            </div>
            <div className="ui-field">
              <span className="ui-label">เวลาอภิปราย (หลังทายถูก)</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{discussionMinutes} นาที</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
