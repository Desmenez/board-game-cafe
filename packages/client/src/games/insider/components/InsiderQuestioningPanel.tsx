import { useState } from 'react';
import type { InsiderAction, InsiderMasterAnswer, InsiderPlayerView } from 'shared';
import { Button } from '../../../components/ui';
import { ANSWER_LABEL } from '../lib/roleMeta';

type Props = {
  questionLog: InsiderPlayerView['questionLog'];
  isMaster: boolean;
  remainLabel: string | null;
  unansweredCount: number;
  send: (a: InsiderAction) => void;
};

export function InsiderQuestioningPanel({
  questionLog,
  isMaster,
  remainLabel,
  unansweredCount,
  send,
}: Props) {
  const [questionDraft, setQuestionDraft] = useState('');
  const questionsNewestFirst = [...questionLog].reverse();

  return (
    <section className="card insider-card insider-questioning" aria-label="รอบถามตอบ">
      <div className="insider-row">
        <h2>ถาม — ตอบ</h2>
        {remainLabel != null && <span className="insider-timer">เหลือ {remainLabel}</span>}
      </div>
      {isMaster && unansweredCount > 0 && (
        <p className="insider-questioning-master-hint" role="status">
          มีคำถามรอตอบ <strong>{unansweredCount}</strong> ข้ — แต่ละข้อเลือกคำตอบได้อิสระ
        </p>
      )}
      <p className="insider-hint">
        {isMaster
          ? 'อ่านคำถามจากบนสู่ล่าง (ล่าสุดก่อน) แล้วกดปุ่มใต้แต่ละกล่อง ผู้เล่นอื่นเห็นคำตอบทุกคำถาม'
          : 'ทุกคน (ยกเว้น Master) ถามได้สม่ำเสมอ กดถามเพิ่มได้ตลอดไม่ต้องรอ — Master ตอบแยกแต่ละคำถาม'}
      </p>
      {!isMaster && (
        <div className="insider-ask-composer">
          <input
            className="insider-input"
            value={questionDraft}
            onChange={(e) => setQuestionDraft(e.target.value)}
            placeholder="เช่น มันเป็นสัตว์หรือไม่?"
            maxLength={400}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && questionDraft.trim().length >= 2) {
                e.preventDefault();
                send({ type: 'ask_question', text: questionDraft.trim() });
                setQuestionDraft('');
              }
            }}
            aria-label="พิมพ์คำถามถึง Master"
          />
          <Button
            type="button"
            disabled={questionDraft.trim().length < 2}
            onClick={() => {
              send({ type: 'ask_question', text: questionDraft.trim() });
              setQuestionDraft('');
            }}
          >
            ถาม
          </Button>
        </div>
      )}
      <ul className="insider-q-feed">
        {questionsNewestFirst.map((q) => {
          const answered = q.answer != null;
          return (
            <li
              key={q.id}
              className={`insider-q-card${answered ? ' insider-q-card--answered' : ' insider-q-card--open'}`}
            >
              <div className="insider-q-card-top">
                <span className="insider-q-from">{q.askerName}</span>
                {answered && q.answer != null && (
                  <span className="insider-q-answer-pill" data-ans={q.answer}>
                    {ANSWER_LABEL[q.answer]}
                  </span>
                )}
              </div>
              <p className="insider-q-text">&ldquo;{q.text}&rdquo;</p>
              {!answered && isMaster && (
                <div
                  className="insider-q-master-btns"
                  role="group"
                  aria-label={`ตอบคำถามของ ${q.askerName}`}
                >
                  {(Object.keys(ANSWER_LABEL) as InsiderMasterAnswer[]).map((a) => (
                    <Button
                      key={a}
                      type="button"
                      size="sm"
                      variant={a === 'correct' ? 'primary' : 'secondary'}
                      className="insider-q-ans-btn"
                      onClick={() => send({ type: 'master_answer', questionId: q.id, answer: a })}
                    >
                      {ANSWER_LABEL[a]}
                    </Button>
                  ))}
                </div>
              )}
              {!answered && !isMaster && (
                <p className="insider-q-pending-hint">รอ Master ตอบข้อนี้…</p>
              )}
            </li>
          );
        })}
      </ul>
      {questionLog.length === 0 && (
        <p className="insider-q-empty">ยังไม่มีคำถาม — ลองพิมพ์เพื่อเริ่ม</p>
      )}
    </section>
  );
}
