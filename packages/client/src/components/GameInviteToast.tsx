import type { IncomingInviteItem } from '../auth/invitesApi';
import { getGameCoverById } from '../gameCatalogDisplay';
import './game-invite-toast.css';

type Props = {
  item: IncomingInviteItem;
  visible: boolean;
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function GameInviteToast({ item, visible, busy, onAccept, onDecline }: Props) {
  const cover = getGameCoverById(item.invite.game_id);
  const gameLabel = item.invite.game_id;

  return (
    <div
      className={`game-invite-toast${visible ? ' is-visible' : ''}`}
      role="alertdialog"
      aria-label={`คำเชิญจาก ${item.from.display_name}`}
    >
      <div className="game-invite-toast__row">
        <div
          className={`game-invite-toast__cover${cover ? '' : ' game-invite-toast__cover--empty'}`}
          aria-hidden
        >
          {cover ? <img src={cover} alt="" decoding="async" /> : null}
        </div>

        <div className="game-invite-toast__body">
          <p className="game-invite-toast__copy">
            <strong>{item.from.display_name}</strong>
            <span>
              {' '}
              ชวนเล่น {gameLabel}
            </span>
          </p>
          <div className="game-invite-toast__actions">
            <button
              type="button"
              className="game-invite-toast__btn game-invite-toast__btn--accept"
              disabled={busy}
              onClick={onAccept}
            >
              เข้าห้อง
            </button>
            <button
              type="button"
              className="game-invite-toast__btn game-invite-toast__btn--decline"
              disabled={busy}
              onClick={onDecline}
            >
              ปฏิเสธ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
