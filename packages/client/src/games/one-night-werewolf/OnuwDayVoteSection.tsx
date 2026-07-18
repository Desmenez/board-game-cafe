import { useEffect, useMemo, useState } from 'react';
import type { OnuwAction, OnuwPlayerView, OnuwRole } from 'shared';
import { ONUW_ROLE_DESCRIPTION_TH, ONUW_VOTE_PHASE_MS, onuwTeamForRole } from 'shared';
import { PlayerAvatar } from '../../components/player-avatar';
import { Button, Dialog, DialogDescription, DialogFooter, DialogTitle } from '../../components/ui';
import { useDeadlineCountdown } from '../../hooks/useDeadlineCountdown';
import { onuwCardBackUrl, onuwRoleCardUrl } from '../../imageMap';
import {
  ROLE_LABEL_EN,
  ROLE_LABEL_TH,
  TEAM_LABEL_TH,
  buildOrderedCompositionSlots,
} from './onuwRoles';

function OnuwVoteCountdown({ endsAtMs, totalMs }: { endsAtMs: number; totalMs: number }) {
  const { remainMs } = useDeadlineCountdown(endsAtMs);
  const msLeft = remainMs;
  const sec = Math.ceil(msLeft / 1000);
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  const progressPct = Math.min(100, Math.max(0, (msLeft / totalMs) * 100));
  const totalMin = totalMs / 60_000;

  return (
    <div className="onuw-vote-countdown-wrap" role="timer" aria-live="polite">
      <p className="onuw-vote-countdown-eyebrow">ถอยหลังสูงสุด {totalMin} นาที</p>
      <div className="onuw-vote-countdown-digits" aria-label={`เหลือ ${mm} นาที ${ss} วินาที`}>
        <div className="onuw-vote-countdown-segment">
          <span className="onuw-vote-countdown-num">{mm}</span>
          <span className="onuw-vote-countdown-unit">นาที</span>
        </div>
        <span className="onuw-vote-countdown-colon" aria-hidden>
          :
        </span>
        <div className="onuw-vote-countdown-segment">
          <span className="onuw-vote-countdown-num">{ss.toString().padStart(2, '0')}</span>
          <span className="onuw-vote-countdown-unit">วินาที</span>
        </div>
      </div>
      <div className="onuw-vote-countdown-progress" aria-hidden>
        <div className="onuw-vote-countdown-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
}

export function OnuwDayVoteSection({
  gs,
  myId,
  sendAction,
}: {
  gs: OnuwPlayerView;
  myId: string;
  sendAction: (action: OnuwAction) => void;
}) {
  const orderedSlots = useMemo(() => {
    const pickMap = new Map(
      (gs.roleConfidenceSlots ?? []).map((r) => [r.slotKey, r.pickers] as const),
    );
    return buildOrderedCompositionSlots(gs.rolesInPlay).map((slot) => ({
      ...slot,
      pickers: pickMap.get(slot.slotKey) ?? [],
    }));
  }, [gs.rolesInPlay, gs.roleConfidenceSlots]);

  const confidenceSlotKeyByPlayerId = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of gs.roleConfidenceSlots ?? []) {
      for (const picker of row.pickers) {
        m.set(picker.playerId, row.slotKey);
      }
    }
    return m;
  }, [gs.roleConfidenceSlots]);

  const slotMetaByKey = useMemo(
    () => new Map(orderedSlots.map((s) => [s.slotKey, s] as const)),
    [orderedSlots],
  );

  const [voteDraftId, setVoteDraftId] = useState<string | null>(null);
  const [roleDetailCard, setRoleDetailCard] = useState<{ role: OnuwRole; artKey: string } | null>(
    null,
  );

  useEffect(() => {
    setVoteDraftId(null);
  }, [gs.myVoteTargetId, gs.myVoteAbstained]);

  const selectedForVote = voteDraftId ?? gs.myVoteTargetId ?? null;
  const confirmDisabled =
    selectedForVote == null ||
    selectedForVote === myId ||
    (gs.myVoteTargetId != null && selectedForVote === gs.myVoteTargetId);

  const abstainDisabled = gs.myVoteAbstained && voteDraftId === null;

  const votedNames = gs.voteParticipantStatus?.filter((r) => r.hasVoted).map((r) => r.name) ?? [];
  const pendingNames =
    gs.voteParticipantStatus?.filter((r) => !r.hasVoted).map((r) => r.name) ?? [];

  return (
    <>
      <section className="onuw-stage card onuw-day-vote-stage">
        <header className="onuw-phase-banner onuw-phase-banner--day">
          <span className="onuw-phase-banner-kicker">ช่วงเกม</span>
          <span className="onuw-phase-banner-title">กลางวัน</span>
        </header>

        {gs.votePhaseEndsAtMs != null ? (
          <div className="onuw-vote-deadline-bar" role="status">
            <span className="onuw-vote-deadline-label">เวลากลางวันถอยหลัง</span>
            <OnuwVoteCountdown endsAtMs={gs.votePhaseEndsAtMs} totalMs={ONUW_VOTE_PHASE_MS} />
            <span className="onuw-vote-deadline-hint">
              เมื่อครบ {ONUW_VOTE_PHASE_MS / 60_000} นาทีถ้ายังไม่ครบทุกคนยืนยันโหวตหรือไม่โหวต =
              ทุกคนแพ้
            </span>
          </div>
        ) : null}

        <p className="onuw-desc onuw-day-vote-lead">
          พูดคุยจากข้อมูลตอนคืน — ดูการ์ดในชุดเกมด้านล่าง และ<strong>โหวตผู้เล่น</strong>
          ที่สงสัยว่าเป็นมนุษย์หมาป่า (แตะชื่อแล้วกดยืนยันโหวต · ไม่โหวตตัวเอง · หรือกด
          <strong>ไม่โหวต</strong>ถ้ามั่นใจว่าไม่มีหมาป่าในผู้เล่น)
        </p>

        <div className="onuw-day-section">
          <h3 className="onuw-day-section-title">การ์ดในเกมนี้</h3>
          <p className="onuw-day-section-lead">
            แตะการ์ดบทที่คุณ<strong>มั่นใจมากที่สุด</strong>ว่าอยู่ในเกม —
            ชื่อของผู้เล่นจะโผล่ใต้การ์ดให้ทุกคนในห้องเห็น
            (แตะการ์ดเดิมอีกครั้งเพื่อยกเลิกการเลือกของคุณ)
          </p>
          <div className="onuw-day-role-grid" aria-label="การ์ดในชุดเกม">
            {orderedSlots.map((slot) => {
              const myPick = gs.myRoleConfidenceSlotKey === slot.slotKey;
              return (
                <div key={slot.slotKey} className="onuw-day-role-slot">
                  <button
                    type="button"
                    className={`onuw-day-role-tile${myPick ? ' onuw-day-role-tile--selected' : ''}`}
                    onClick={() =>
                      sendAction({
                        type: 'day_role_confidence',
                        slotKey: myPick ? null : slot.slotKey,
                      })
                    }
                  >
                    <div className="onuw-day-role-card-wrap">
                      <img
                        src={onuwRoleCardUrl(slot.artKey)}
                        alt=""
                        className="onuw-day-role-img"
                        decoding="async"
                      />
                    </div>
                    <span className="onuw-day-role-label">{slot.label}</span>
                    {slot.pickers.length > 0 ? (
                      <div className="onuw-day-role-confidence-tags">
                        {slot.pickers.map((p) => (
                          <span
                            key={p.playerId}
                            className={`onuw-day-role-confidence-tag${p.playerId === myId ? ' onuw-day-role-confidence-tag--me' : ''}`}
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="onuw-card-help-btn onuw-day-role-help-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setRoleDetailCard({ role: slot.role, artKey: slot.artKey });
                    }}
                    aria-label={`คำอธิบาย ${slot.label}`}
                  >
                    ?
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="onuw-day-section onuw-day-section--vote">
          <h3 className="onuw-day-section-title">โหวตผู้เล่น</h3>
          <p className="onuw-day-section-lead">
            แตะชื่อเพื่อเลือก จากนั้นกดยืนยันโหวต —
            หรือกดไม่โหวตถ้าทุกคนพร้อมยอมรับว่าไม่มีมนุษย์หมาป่าในผู้เล่น
          </p>

          <div className="onuw-day-player-grid" aria-label="เลือกผู้เล่นเพื่อโหวต">
            {gs.players.map((p) => {
              const isMe = p.id === myId;
              const isSel = selectedForVote === p.id;
              const pickedKey = confidenceSlotKeyByPlayerId.get(p.id);
              const pickedSlot = pickedKey ? slotMetaByKey.get(pickedKey) : undefined;
              const roleThumbSrc =
                pickedSlot?.artKey != null && pickedSlot.artKey !== ''
                  ? onuwRoleCardUrl(pickedSlot.artKey)
                  : null;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isMe}
                  className={`onuw-day-player-tile${isSel ? ' onuw-day-player-tile--selected' : ''}${isMe ? ' onuw-day-player-tile--me' : ''}`}
                  onClick={() => setVoteDraftId(p.id)}
                >
                  <span className="onuw-day-player-tile-avatar" aria-hidden>
                    {roleThumbSrc ? (
                      <img
                        src={roleThumbSrc}
                        alt=""
                        className="onuw-day-player-tile-role-img"
                        decoding="async"
                      />
                    ) : (
                      <span className="onuw-day-player-tile-avatar-fallback">
                        <PlayerAvatar
                          playerId={p.id}
                          name={p.name}
                          size={56}
                          decorative
                          className="onuw-day-player-tile-user-avatar"
                        />
                      </span>
                    )}
                  </span>
                  <span className="onuw-day-player-tile-name">{p.name}</span>
                  {isMe ? <span className="onuw-day-player-tile-note">คุณ</span> : null}
                </button>
              );
            })}
          </div>

          <div className="onuw-day-vote-confirm-row">
            <div className="onuw-day-vote-confirm-actions">
              <Button
                type="button"
                disabled={confirmDisabled}
                onClick={() => {
                  if (selectedForVote == null || selectedForVote === myId) return;
                  sendAction({ type: 'vote', targetId: selectedForVote });
                }}
              >
                {gs.myVoteTargetId != null && selectedForVote === gs.myVoteTargetId
                  ? 'โหวตแล้ว'
                  : gs.myVoteTargetId != null || gs.myVoteAbstained
                    ? 'ยืนยันเปลี่ยนโหวต'
                    : 'ยืนยันโหวต'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={abstainDisabled}
                onClick={() => sendAction({ type: 'vote_abstain' })}
              >
                {gs.myVoteAbstained && voteDraftId === null ? 'ไม่โหวตแล้ว' : 'ไม่โหวต'}
              </Button>
            </div>
            {gs.myVoteAbstained && voteDraftId === null ? (
              <p className="onuw-day-vote-pick-summary">
                คุณเลือก<strong>ไม่โหวต</strong> (ไม่นับคะแนนให้ใคร)
              </p>
            ) : selectedForVote != null && selectedForVote !== myId ? (
              <p className="onuw-day-vote-pick-summary">
                เลือก:{' '}
                <strong>{gs.players.find((p) => p.id === selectedForVote)?.name ?? '?'}</strong>
              </p>
            ) : null}
          </div>

          {gs.voteProgress && gs.voteParticipantStatus ? (
            <div className="onuw-vote-status-panel">
              <p className="onuw-vote-status-line">
                <span className="onuw-vote-status-label">โหวตแล้ว</span>{' '}
                <strong>
                  {gs.voteProgress.current}/{gs.voteProgress.total}
                </strong>{' '}
                คน
              </p>
              {votedNames.length > 0 ? (
                <p className="onuw-vote-status-names onuw-vote-status-names--done">
                  <span className="onuw-vote-status-sub">รายชื่อที่ยืนยันแล้ว:</span>{' '}
                  {votedNames.join(' · ')}
                </p>
              ) : null}
              {pendingNames.length > 0 ? (
                <p className="onuw-vote-status-names onuw-vote-status-names--pending">
                  <span className="onuw-vote-status-sub">ยังไม่โหวต:</span>{' '}
                  {pendingNames.join(' · ')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <Dialog
        open={roleDetailCard !== null}
        onOpenChange={(open) => {
          if (!open) setRoleDetailCard(null);
        }}
        contentClassName={
          roleDetailCard !== null
            ? `modal onuw-role-detail-dialog onuw-role-detail-dialog--${onuwTeamForRole(roleDetailCard.role)}`
            : 'modal onuw-role-detail-dialog'
        }
        aria-labelledby="onuw-day-vote-role-detail-title"
      >
        {roleDetailCard !== null ? (
          <>
            <div className="onuw-role-detail-heading">
              <span
                className={`onuw-role-detail-team onuw-role-detail-team--${onuwTeamForRole(roleDetailCard.role)}`}
              >
                {TEAM_LABEL_TH[onuwTeamForRole(roleDetailCard.role)]}
              </span>
              <DialogTitle id="onuw-day-vote-role-detail-title" className="onuw-role-detail-title">
                {ROLE_LABEL_TH[roleDetailCard.role]}
              </DialogTitle>
              <p className="onuw-role-detail-title-en">{ROLE_LABEL_EN[roleDetailCard.role]}</p>
            </div>
            <div className="onuw-role-detail-body">
              <img
                src={
                  roleDetailCard.artKey ? onuwRoleCardUrl(roleDetailCard.artKey) : onuwCardBackUrl()
                }
                alt=""
                className="onuw-role-detail-img"
              />
              <DialogDescription className="onuw-role-detail-desc">
                {ONUW_ROLE_DESCRIPTION_TH[roleDetailCard.role]}
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setRoleDetailCard(null)}>
                ปิด
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </Dialog>
    </>
  );
}
