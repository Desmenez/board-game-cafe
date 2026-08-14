import { Crown, Trophy } from 'lucide-react';
import { SPICY_TROPHY_POINTS, type SpicyScoreBreakdown } from 'shared';
import {
  NameplateFrameVideo,
  PlayerAvatar,
  PlayerAvatarIconBadge,
  PlayerNameplate,
  nameplateFrameProps,
  usePlayerAvatar,
} from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';
import { spicyCardBackUrl, spicyTrophyUrl } from '../art';

type Props = {
  titleId: string;
  iWon: boolean;
  reason: string | null | undefined;
  scores: SpicyScoreBreakdown[];
  winners: ReadonlySet<string>;
  myId: string;
};

function GameOverScoreRow({
  s,
  place,
  isWinner,
  isMe,
}: {
  s: SpicyScoreBreakdown;
  place: number;
  isWinner: boolean;
  isMe: boolean;
}) {
  const roomSeat = usePlayerAvatar(s.playerId);
  const frame = nameplateFrameProps(roomSeat?.equippedNameplateId);
  const trophyPoints = s.trophies * SPICY_TROPHY_POINTS;

  return (
    <li
      className={cn(
        'spicy-game-over__row relative overflow-hidden',
        isWinner && 'spicy-game-over__row--winner',
        isMe && 'spicy-game-over__row--me',
        frame.className,
        frame.hasArt && 'spicy-game-over__row--has-plate',
      )}
      style={frame.style}
    >
      <NameplateFrameVideo nameplateId={roomSeat?.equippedNameplateId} />
      <span
        className={cn(
          'spicy-game-over__place relative z-1',
          place === 1 && 'spicy-game-over__place--gold',
          place === 2 && 'spicy-game-over__place--silver',
          place === 3 && 'spicy-game-over__place--bronze',
        )}
        aria-label={`อันดับ ${place}`}
      >
        {place}
      </span>

      <span className="spicy-game-over__avatar relative z-1 shrink-0">
        <PlayerAvatar playerId={s.playerId} name={s.name} size={isWinner ? 44 : 36} decorative />
        <PlayerAvatarIconBadge iconId={roomSeat?.equippedIconId} avatarSize={isWinner ? 44 : 36} />
      </span>

      <div className="spicy-game-over__who relative z-1">
        <div className="spicy-game-over__name-row">
          {isWinner ? (
            <Crown className="spicy-game-over__crown" size={14} strokeWidth={2.25} aria-hidden />
          ) : null}
          <PlayerNameplate
            name={s.name}
            nameplateId={roomSeat?.equippedNameplateId}
            titleId={roomSeat?.equippedTitleId}
            chipId={roomSeat?.equippedChipId}
            surface="text"
            className="spicy-game-over__name min-w-0"
            nameClassName="spicy-game-over__name-label"
          />
          {isMe ? <span className="spicy-game-over__you">คุณ</span> : null}
        </div>
        {isWinner ? <span className="spicy-game-over__winner-tag">ชนะ</span> : null}
      </div>

      <div className="spicy-game-over__score relative z-1">
        <span className="spicy-game-over__total tabular-nums">{s.total}</span>
        <span className="spicy-game-over__breakdown">
          <span className="spicy-game-over__stat" title={`${s.wonCards} ใบที่เก็บได้`}>
            <img src={spicyCardBackUrl()} alt="" className="spicy-game-over__stat-art" />
            <span className="tabular-nums">{s.wonCards}</span>
          </span>
          <span className="spicy-game-over__plus" aria-hidden>
            +
          </span>
          <span
            className="spicy-game-over__stat"
            title={`${s.trophies} ถ้วย × ${SPICY_TROPHY_POINTS}`}
          >
            <img src={spicyTrophyUrl()} alt="" className="spicy-game-over__stat-art" />
            <span className="tabular-nums">{trophyPoints}</span>
          </span>
          <span className="spicy-game-over__plus" aria-hidden>
            −
          </span>
          <span className="spicy-game-over__stat" title={`${s.handPenalty} ใบในมือ`}>
            <span className="tabular-nums">{s.handPenalty}</span>
          </span>
        </span>
      </div>
    </li>
  );
}

export function SpicyGameOverBody({ titleId, iWon, reason, scores, winners, myId }: Props) {
  const ranked = scores.slice().sort((a, b) => b.total - a.total);

  return (
    <div className="spicy-game-over">
      <header className={cn('spicy-game-over__hero', iWon && 'spicy-game-over__hero--win')}>
        <div className="spicy-game-over__trophy" aria-hidden>
          {iWon ? <Crown size={28} strokeWidth={1.75} /> : <Trophy size={28} strokeWidth={1.75} />}
        </div>
        <p className="spicy-game-over__kicker">เกมจบแล้ว</p>
        <h2 id={titleId} className="spicy-game-over__title">
          {iWon ? 'ยินดีด้วย — คุณชนะ!' : 'สรุปผล'}
        </h2>
        {reason ? <p className="spicy-game-over__reason">{reason}</p> : null}
      </header>

      <ol className="spicy-game-over__list">
        {ranked.map((s, i) => (
          <GameOverScoreRow
            key={s.playerId}
            s={s}
            place={i + 1}
            isWinner={winners.has(s.playerId)}
            isMe={s.playerId === myId}
          />
        ))}
      </ol>
    </div>
  );
}
