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

  useEffect(() => {
    if (isHost) return;
    const next = optsFromUnknown(lobbyOptions);
    setQuestioningMinutes(next.questioningMinutes);
    setDiscussionMinutes(next.discussionMinutes);
  }, [isHost, lobbyOptions]);

  useEffect(() => {
    if (!isHost) return;
    onChange({ questioningMinutes, discussionMinutes });
  }, [isHost, onChange, questioningMinutes, discussionMinutes]);

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
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="font-semibold">เวลาถาม-ตอบ (หาคำลับ)</span>
          {isHost ? (
            <Select
              className="w-full"
              value={questioningMinutes}
              onChange={(e) => setQuestioningMinutes(Number(e.target.value))}
            >
              {QUESTIONING_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m} นาที
                </option>
              ))}
            </Select>
          ) : (
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{questioningMinutes} นาที</span>
          )}
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">เวลาอภิปราย (หลังทายถูก)</span>
          {isHost ? (
            <Select
              className="w-full"
              value={discussionMinutes}
              onChange={(e) => setDiscussionMinutes(Number(e.target.value))}
            >
              {DISCUSSION_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m} นาที
                </option>
              ))}
            </Select>
          ) : (
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{discussionMinutes} นาที</span>
          )}
        </label>
      </div>
    </div>
  );
}
