import { useMemo, useState } from 'react';
import type { OnuwPlayerView, OnuwRole } from 'shared';
import { ONUW_NIGHT_STEP_MS } from 'shared';
import { useDeadlineCountdown } from '../../hooks/useDeadlineCountdown';
import { onuwCardBackUrl, onuwRoleCardUrl } from '../../imageMap';
import { OnuwRoleDetailDialog } from './OnuwRoleDetailDialog';
import {
  NIGHT_KIND_TH,
  ONUW_ROLES_WITHOUT_NIGHT_ACTION,
  artKeyForNightScheduledRole,
  buildOrderedCompositionSlots,
} from './onuwRoles';

function OnuwNightSlotTimer({
  mode,
  endsAtMs,
}: {
  mode: 'past' | 'current' | 'upcoming';
  endsAtMs: number | null;
}) {
  const { remainMs } = useDeadlineCountdown(mode === 'current' ? endsAtMs : null);

  if (mode === 'past') {
    return (
      <span className="onuw-night-schedule-slot-timer onuw-night-schedule-slot-timer--done">✓</span>
    );
  }
  if (mode === 'upcoming') {
    return (
      <span className="onuw-night-schedule-slot-timer onuw-night-schedule-slot-timer--muted">
        —
      </span>
    );
  }
  if (endsAtMs == null) {
    return <span className="onuw-night-schedule-slot-timer">—</span>;
  }
  const sec = Math.max(0, Math.ceil(remainMs / 1000));
  return (
    <span className="onuw-night-schedule-slot-timer" role="timer" aria-live="polite">
      เหลือ {sec} วินาที
    </span>
  );
}

export function OnuwNightScheduleStrip({
  nightList,
  nightCurIdx,
  endsAtMs,
  rolesInPlay,
}: {
  nightList: NonNullable<OnuwPlayerView['nightSteps']>;
  nightCurIdx: number;
  endsAtMs: number | null;
  rolesInPlay: OnuwPlayerView['rolesInPlay'];
}) {
  const [detailCard, setDetailCard] = useState<{ role: OnuwRole; artKey: string } | null>(null);

  const passiveCompositionSlots = useMemo(
    () =>
      buildOrderedCompositionSlots(rolesInPlay).filter((s) =>
        ONUW_ROLES_WITHOUT_NIGHT_ACTION.has(s.role),
      ),
    [rolesInPlay],
  );

  return (
    <>
      <div className="onuw-night-schedule-inner">
        <div
          className="onuw-night-schedule-strip"
          role="list"
          aria-label="ลำดับขั้นคืนและเวลานับถอยหลัง"
        >
          {nightList.map((st, i) => {
            const role = st.kind as OnuwRole;
            const artKey = artKeyForNightScheduledRole(rolesInPlay, st.kind);
            const thumbSrc = artKey ? onuwRoleCardUrl(artKey) : onuwCardBackUrl();
            const labelTh = NIGHT_KIND_TH[st.kind];
            const isPast = nightCurIdx >= 0 && i < nightCurIdx;
            const isCurrent = nightCurIdx >= 0 && i === nightCurIdx;
            const mode: 'past' | 'current' | 'upcoming' = isPast
              ? 'past'
              : isCurrent
                ? 'current'
                : 'upcoming';
            return (
              <div
                key={`${st.kind}-${i}`}
                role="listitem"
                className={`onuw-night-schedule-slot${isCurrent ? ' onuw-night-schedule-slot--current' : ''}`}
              >
                <span className="onuw-night-schedule-slot-idx">{i + 1}</span>
                <div className="onuw-night-schedule-slot-visual">
                  <button
                    type="button"
                    className="onuw-card-help-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailCard({ role, artKey });
                    }}
                    aria-label={`คำอธิบาย ${labelTh}`}
                  >
                    ?
                  </button>
                  <div className="onuw-night-schedule-card-wrap">
                    <img
                      src={thumbSrc}
                      alt=""
                      className="onuw-night-schedule-slot-img"
                      decoding="async"
                    />
                  </div>
                </div>
                <span className="onuw-night-schedule-slot-name">{labelTh}</span>
                <OnuwNightSlotTimer mode={mode} endsAtMs={endsAtMs} />
              </div>
            );
          })}
          {passiveCompositionSlots.map((slot, pi) => {
            const thumbSrc = slot.artKey ? onuwRoleCardUrl(slot.artKey) : onuwCardBackUrl();
            const firstPassive = pi === 0;
            return (
              <div
                key={`passive-${slot.slotKey}`}
                role="listitem"
                className={`onuw-night-schedule-slot onuw-night-schedule-slot--passive${firstPassive ? ' onuw-night-schedule-slot--passive-first' : ''}`}
                aria-label={`${slot.label} — ไม่มีขั้นตื่นกลางคืน ไม่จับเวลา`}
              >
                <span
                  className="onuw-night-schedule-slot-idx onuw-night-schedule-slot-idx--passive"
                  aria-hidden
                >
                  —
                </span>
                <div className="onuw-night-schedule-slot-visual">
                  <button
                    type="button"
                    className="onuw-card-help-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailCard({ role: slot.role, artKey: slot.artKey });
                    }}
                    aria-label={`คำอธิบาย ${slot.label}`}
                  >
                    ?
                  </button>
                  <div className="onuw-night-schedule-card-wrap">
                    <img
                      src={thumbSrc}
                      alt=""
                      className="onuw-night-schedule-slot-img"
                      decoding="async"
                    />
                  </div>
                </div>
                <span className="onuw-night-schedule-slot-name">{slot.label}</span>
                <span className="onuw-night-schedule-slot-timer onuw-night-schedule-slot-timer--muted onuw-night-schedule-slot-timer--passive-only">
                  ไม่ตื่นกลางคืน
                </span>
              </div>
            );
          })}
        </div>
        <p className="onuw-night-schedule-note">
          ไม่แสดงชื่อผู้เล่นเพื่อไม่ให้ล่วงรู้บทคนอื่นจากจอเดียว — ขั้นที่มีเลขจับเวลา{' '}
          {ONUW_NIGHT_STEP_MS / 1000} วินาที — หลังทำแอ็กชันแล้วยังรอจบเวลาขั้นอยู่ —
          การ์ดขวาสุดเป็นบทที่ไม่ตื่นกลางคืน (ไม่จับเวลา กด ? ดูความสามารถ)
        </p>
      </div>

      <OnuwRoleDetailDialog
        detail={detailCard}
        onClose={() => setDetailCard(null)}
        titleId="onuw-night-schedule-role-detail-title"
      />
    </>
  );
}
