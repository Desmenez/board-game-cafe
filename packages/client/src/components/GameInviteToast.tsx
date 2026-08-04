import { Button } from './ui';
import type { IncomingInviteItem } from '../auth/invitesApi';
import './game-invite-toast.css';

type Props = {
  item: IncomingInviteItem;
  visible: boolean;
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function GameInviteToast({ item, visible, busy, onAccept, onDecline }: Props) {
  return (
    <div
      className={`game-invite-toast${visible ? ' is-visible' : ''}`}
      role="alertdialog"
      aria-label={`คำเชิญจาก ${item.from.display_name}`}
    >
      <p className="game-invite-toast__copy">
        <strong>{item.from.display_name}</strong>
        <span>
          {' '}
          ชวนเล่น {item.invite.game_id} · ห้อง {item.invite.room_code}
        </span>
      </p>
      <div className="game-invite-toast__actions">
        <Button type="button" size="sm" disabled={busy} onClick={onAccept}>
          เข้าห้อง
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onDecline}>
          ปฏิเสธ
        </Button>
      </div>
    </div>
  );
}
