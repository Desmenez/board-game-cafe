import type { LoveLetterPendingAction, LoveLetterPlayerView } from 'shared';
import { PlayerIdentity } from '../../../components/player-avatar';
import { CARD_IMAGE, roleLabel } from '../lib/cardMeta';

type Props = {
  pending: LoveLetterPendingAction;
  players: LoveLetterPlayerView['players'];
};

function actorName(
  players: LoveLetterPlayerView['players'],
  actorId: string,
): string {
  return players.find((p) => p.id === actorId)?.name ?? 'ผู้เล่น';
}

export function LoveLetterSpectatePendingModal({ pending, players }: Props) {
  const actor = actorName(players, pending.actorId);

  let effectRole: Parameters<typeof roleLabel>[0] | null = null;
  let title = '';
  let body = '';
  let targetId: string | null = null;
  let targetName: string | null = null;

  if (pending.mode === 'target_player') {
    effectRole = pending.effectRole;
    title = `${actor} เล่น ${roleLabel(pending.effectRole)}`;
    body = 'กำลังเลือกเป้าหมาย…';
  } else if (pending.mode === 'guard_guess') {
    effectRole = 'guard';
    title = `${actor} เล่น Guard`;
    body = `เลือก ${pending.targetName} แล้ว — กำลังทายเลขการ์ด`;
    targetId = pending.targetPlayerId;
    targetName = pending.targetName;
  } else if (pending.mode === 'priest_peek') {
    effectRole = 'priest';
    title = `${actor} เล่น Priest`;
    body = `กำลังแอบดูมือของ ${pending.targetName} (ผลลัพธ์เป็นความลับ)`;
    targetId = pending.targetPlayerId;
    targetName = pending.targetName;
  } else {
    return null;
  }

  const art = effectRole ? CARD_IMAGE[effectRole] : null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ll-spectate-title"
    >
      <div className="modal ll-modal-shell ll-select-modal ll-modal-shell--wide">
        <div className="ll-select-modal__hero">
          {art ? (
            <div className="ll-select-modal__card-wrap">
              <img
                src={art}
                alt={effectRole ? roleLabel(effectRole) : ''}
                className="ll-select-modal__card"
                width={440}
                height={600}
              />
            </div>
          ) : null}
          <div className="ll-select-modal__copy">
            <h2 id="ll-spectate-title" className="ll-modal-shell__title">
              {title}
            </h2>
            <p className="ll-select-modal__hint">{body}</p>
            <p className="ll-select-modal__meta">รอผู้เล่นคนอื่นตัดสินใจ</p>
          </div>
        </div>

        <div className="ll-spectate__actors" aria-label="ผู้เกี่ยวข้อง">
          <div className="ll-spectate__actor">
            <span className="ll-spectate__role">ผู้เล่น</span>
            <PlayerIdentity playerId={pending.actorId} name={actor} avatarSize={40} />
          </div>
          {targetId && targetName ? (
            <>
              <span className="ll-spectate__arrow" aria-hidden>
                →
              </span>
              <div className="ll-spectate__actor">
                <span className="ll-spectate__role">เป้าหมาย</span>
                <PlayerIdentity playerId={targetId} name={targetName} avatarSize={40} />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
