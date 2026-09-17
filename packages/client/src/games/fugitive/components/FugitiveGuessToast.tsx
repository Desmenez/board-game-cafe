import type { FugitiveGuessNotice } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { fugitiveCardImageUrl } from '../lib/cardMeta';

type Props = {
  notice: FugitiveGuessNotice;
  playerName: string;
  myId: string;
  visible: boolean;
};

export function FugitiveGuessToast({ notice, playerName, myId, visible }: Props) {
  const displayName = `${playerName}${notice.by === myId ? ' (คุณ)' : ''}`;
  const action = notice.hit ? 'Marshal ทายถูก' : 'Marshal ทายผิด';
  const numbers = notice.numbers.join(', ');

  return (
    <div
      className={`fugitive-guess-toast${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${displayName} ${action}: ${numbers}`}
    >
      <PlayerAvatar
        playerId={notice.by}
        name={playerName}
        size={36}
        decorative
        className="fugitive-guess-toast__avatar"
      />
      <div className="fugitive-guess-toast__cards" aria-hidden>
        {notice.numbers.map((n, index) => (
          <img
            key={`${n}-${index}`}
            className="fugitive-guess-toast__card"
            src={fugitiveCardImageUrl(n)}
            alt=""
          />
        ))}
      </div>
      <div className="fugitive-guess-toast__copy">
        <strong>{displayName}</strong>
        <span>{action}</span>
        <span className="fugitive-guess-toast__detail">{numbers}</span>
      </div>
    </div>
  );
}
