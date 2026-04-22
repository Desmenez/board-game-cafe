import type { ExplodingKittensPlayerView } from 'shared';
import { getPlayerFrontRowBadges, modalTurnChipFrontClass } from '../lib/playerBadges';

export function EkSpotlightFrontBadges({
  gs,
  player,
}: {
  gs: ExplodingKittensPlayerView;
  player: { id: string; alive: boolean } | null | undefined;
}) {
  if (!player?.alive) return null;
  const fb = getPlayerFrontRowBadges(gs, player.id, true);
  if (fb.length === 0) return null;
  return (
    <div className="ek-turn-spotlight__front-badges" aria-label="การ์ดหน้าตัว">
      {fb.map((b) => (
        <span
          key={b.key}
          className={`ek-front-badge ek-front-badge--${b.variant} ek-front-badge--spotlight`}
          title={b.title}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

/** ลำดับผู้เล่น — dock = แถบแนวตั้งขวา; แนวนอนใน modal อื่น */
export function EkModalTurnOrderStrip({
  gs,
  myId,
  hint,
  dock = true,
}: {
  gs: ExplodingKittensPlayerView;
  myId: string;
  hint?: string;
  dock?: boolean;
}) {
  return (
    <div
      className={`ek-modal-turn-strip${dock ? ' ek-modal-turn-strip--dock' : ''}`}
      role="region"
      aria-label="ลำดับผู้เล่นรอบโต๊ะ"
    >
      <div className="ek-modal-turn-strip__head">
        <span className="ek-modal-turn-strip__title">ลำดับการเล่น</span>
        <span className="ek-modal-turn-strip__sub">เรียงตามที่นั่งโต๊ะ</span>
      </div>
      {hint ? <p className="ek-modal-turn-strip__hint">{hint}</p> : null}
      <div className="ek-modal-turn-strip__scroll" role="list">
        {gs.players.map((p, i) => {
          const isCurrent = p.id === gs.currentPlayerId;
          return (
            <div
              key={p.id}
              role="listitem"
              className={`ek-modal-turn-chip${isCurrent && p.alive ? ' ek-modal-turn-chip--current' : ''}${p.alive ? '' : ' ek-modal-turn-chip--dead'}${modalTurnChipFrontClass(gs, p)}`}
            >
              <span className="ek-modal-turn-chip__seat" aria-hidden>
                {i + 1}
              </span>
              <span className="ek-modal-turn-chip__body">
                <span className="ek-modal-turn-chip__name">{p.name}</span>
                {p.id === myId ? <span className="ek-modal-turn-chip__badge">คุณ</span> : null}
                {isCurrent && p.alive ? (
                  <span className="ek-modal-turn-chip__badge ek-modal-turn-chip__badge--turn">
                    ตาปัจจุบัน
                  </span>
                ) : null}
                {!p.alive ? (
                  <span className="ek-modal-turn-chip__badge ek-modal-turn-chip__badge--dead">
                    ตาย
                  </span>
                ) : null}
                <EkSpotlightFrontBadges gs={gs} player={p} />
                {p.alive && p.pendingTurns > 1 ? (
                  <span className="ek-modal-turn-chip__meta" title="ค้างหลายเทิร์น">
                    ×{p.pendingTurns}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
