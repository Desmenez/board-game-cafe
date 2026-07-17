import type { OnuwAction, OnuwPlayerView } from 'shared';
import { Button } from '../../components/ui';
import { onuwRoleCardUrl } from '../../imageMap';
import { ROLE_LABEL_TH } from './onuwRoles';

type HunterRevealProps = {
  gs: OnuwPlayerView;
  hunterRevealCard: NonNullable<OnuwPlayerView['hunterRevealCard']>;
  sendAction: (action: OnuwAction) => void;
};

export function OnuwHunterReveal({ gs, hunterRevealCard, sendAction }: HunterRevealProps) {
  return (
    <section className="onuw-stage card onuw-hunter-reveal-stage">
      <h2>เปิดการ์ดผู้ถูก Hunter ยิง</h2>
      <p className="onuw-desc">
        <strong>
          {gs.players.find((p) => p.id === hunterRevealCard.playerId)?.name ?? '?'}
        </strong>{' '}
        ถูกเลือกให้ออกจากเกม — บทบาทหน้าที่นั่งตอนกลางวัน (หลังคืน) คือ
      </p>
      <div className="onuw-hunter-reveal-card-wrap">
        <img
          src={onuwRoleCardUrl(hunterRevealCard.artKey)}
          alt={ROLE_LABEL_TH[hunterRevealCard.role]}
          className="onuw-hunter-reveal-card-img"
          decoding="async"
        />
        <div className="onuw-role-caption">{ROLE_LABEL_TH[hunterRevealCard.role]}</div>
      </div>
      {!gs.hasAcknowledgedHunterReveal ? (
        <Button type="button" onClick={() => sendAction({ type: 'acknowledge_hunter_reveal' })}>
          รับทราบ — ดูการ์ดแล้ว
        </Button>
      ) : (
        <Button type="button" variant="secondary" disabled>
          คุณรับทราบแล้ว — รอผู้อื่น…
        </Button>
      )}
      {gs.hunterRevealAckProgress ? (
        <p className="onuw-event">
          รับทราบแล้ว {gs.hunterRevealAckProgress.current}/{gs.hunterRevealAckProgress.total} คน
        </p>
      ) : null}
    </section>
  );
}

type HunterShotProps = {
  gs: OnuwPlayerView;
  myId: string;
  sendAction: (action: OnuwAction) => void;
};

export function OnuwHunterShot({ gs, myId, sendAction }: HunterShotProps) {
  return (
    <section className="onuw-stage card">
      <h2>Hunter ยิง</h2>
      {gs.hunterMustShoot ? (
        <>
          <p className="onuw-desc">
            เลือกยิงผู้เล่นคนใดก็ได้ที่ยังไม่ถูกโหวต (และยังไม่ถูก Hunter ยิงในรอบนี้) —
            หลังเลือกทุกคนจะเห็นการ์ดของคนนั้น แล้วค่อยสรุปผล
          </p>
          <div className="onuw-vote-grid">
            {gs.players.map((p) => (
              <button
                key={p.id}
                type="button"
                className="onuw-chip-btn"
                disabled={p.id === myId || (gs.hunterExcludedTargetIds ?? []).includes(p.id)}
                onClick={() => sendAction({ type: 'hunter_shoot', targetId: p.id })}
              >
                {p.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="onuw-event">
          รอ Hunter ที่ยังไม่ยิงเลือกเป้าหมาย:{' '}
          <strong>
            {(gs.hunterPendingShooterIds ?? [])
              .map((id) => gs.players.find((p) => p.id === id)?.name ?? id)
              .join(' · ') || '—'}
          </strong>
        </p>
      )}
    </section>
  );
}
