import { Crown, Skull, Trophy } from 'lucide-react';
import type { SkullPublicSeat } from 'shared';
import {
  PlayerAvatar,
  PlayerAvatarIconBadge,
  PlayerNameplate,
  NameplateFrameVideo,
  nameplateFrameProps,
  usePlayerAvatar,
} from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';

type Props = {
  titleId: string;
  iWon: boolean;
  reason: string | null | undefined;
  seats: SkullPublicSeat[];
  winners: ReadonlySet<string>;
  myId: string;
};

function GameOverSeatRow({
  seat,
  place,
  isWinner,
  isMe,
}: {
  seat: SkullPublicSeat;
  place: number;
  isWinner: boolean;
  isMe: boolean;
}) {
  const roomSeat = usePlayerAvatar(seat.id);
  const frame = nameplateFrameProps(roomSeat?.equippedNameplateId);

  return (
    <li
      className={cn(
        'skull-game-over__row relative overflow-hidden',
        isWinner && 'skull-game-over__row--winner',
        isMe && 'skull-game-over__row--me',
        seat.eliminated && 'skull-game-over__row--out',
        frame.className,
        frame.hasArt && 'skull-game-over__row--has-plate',
      )}
      style={frame.style}
    >
      <NameplateFrameVideo nameplateId={roomSeat?.equippedNameplateId} />
      <span
        className={cn(
          'skull-game-over__place relative z-1',
          place === 1 && 'skull-game-over__place--gold',
          place === 2 && 'skull-game-over__place--silver',
          place === 3 && 'skull-game-over__place--bronze',
        )}
        aria-label={`อันดับ ${place}`}
      >
        {place}
      </span>

      <span className="skull-game-over__avatar relative z-1 shrink-0">
        <PlayerAvatar
          playerId={seat.id}
          name={seat.name}
          size={isWinner ? 44 : 36}
          decorative
        />
        <PlayerAvatarIconBadge
          iconId={roomSeat?.equippedIconId}
          avatarSize={isWinner ? 44 : 36}
        />
      </span>

      <div className="skull-game-over__who relative z-1">
        <div className="skull-game-over__name-row">
          {isWinner ? (
            <Crown className="skull-game-over__crown" size={14} strokeWidth={2.25} aria-hidden />
          ) : null}
          <PlayerNameplate
            name={seat.name}
            nameplateId={roomSeat?.equippedNameplateId}
            titleId={roomSeat?.equippedTitleId}
            chipId={roomSeat?.equippedChipId}
            surface="text"
            className="skull-game-over__name min-w-0"
            nameClassName="skull-game-over__name-label"
          />
          {isMe ? <span className="skull-game-over__you">คุณ</span> : null}
        </div>
        <div className="skull-game-over__meta">
          {isWinner ? <span className="skull-game-over__winner-tag">ชนะ</span> : null}
          {seat.eliminated ? (
            <span className="skull-game-over__out-tag">คัดออก</span>
          ) : null}
          <span
            className={cn('skull-roster-swatch', `skull-roster-swatch--${seat.color}`)}
            title={`สี${seat.color}`}
            aria-hidden
          />
        </div>
      </div>

      <div className="skull-game-over__score relative z-1">
        <span className="skull-game-over__total tabular-nums">{seat.wins}</span>
        <span className="skull-game-over__score-label">ชัย / 2</span>
      </div>
    </li>
  );
}

export function SkullGameOverBody({
  titleId,
  iWon,
  reason,
  seats,
  winners,
  myId,
}: Props) {
  const ranked = [...seats].sort((a, b) => {
    const aWin = winners.has(a.id) ? 1 : 0;
    const bWin = winners.has(b.id) ? 1 : 0;
    if (aWin !== bWin) return bWin - aWin;
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return b.wins - a.wins;
  });

  return (
    <div className="skull-game-over">
      <header className={cn('skull-game-over__hero', iWon && 'skull-game-over__hero--win')}>
        <div className="skull-game-over__trophy" aria-hidden>
          {iWon ? <Crown size={28} strokeWidth={1.75} /> : <Trophy size={28} strokeWidth={1.75} />}
        </div>
        <p className="skull-game-over__kicker">
          <Skull size={12} strokeWidth={2.25} aria-hidden />
          Skull
        </p>
        <h2 id={titleId} className="skull-game-over__title">
          {iWon ? 'ยินดีด้วย — คุณชนะ!' : 'สรุปผล'}
        </h2>
        {reason ? <p className="skull-game-over__reason">{reason}</p> : null}
      </header>

      <ol className="skull-game-over__list">
        {ranked.map((seat, i) => (
          <GameOverSeatRow
            key={seat.id}
            seat={seat}
            place={i + 1}
            isWinner={winners.has(seat.id)}
            isMe={seat.id === myId}
          />
        ))}
      </ol>
    </div>
  );
}
