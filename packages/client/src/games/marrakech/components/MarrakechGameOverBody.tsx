import { Crown, Trophy } from 'lucide-react';
import type { MarrakechColor, MarrakechScoreEntry } from 'shared';
import {
  PlayerAvatar,
  PlayerAvatarIconBadge,
  PlayerNameplate,
  NameplateFrameVideo,
  nameplateFrameProps,
  usePlayerAvatar,
} from '../../../components/player-avatar';
import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { MARRAKECH_COLOR_LABEL } from '../labels';

type Props = {
  titleId: string;
  iWon: boolean;
  reason: string | null | undefined;
  scores: MarrakechScoreEntry[];
  winners: ReadonlySet<string>;
  myId: string;
  /** Rug colors per player (for swatches in the breakdown). */
  colorsByPlayerId?: Readonly<Record<string, readonly MarrakechColor[]>>;
};

function GameOverScoreRow({
  s,
  place,
  isWinner,
  isMe,
  colors,
}: {
  s: MarrakechScoreEntry;
  place: number;
  isWinner: boolean;
  isMe: boolean;
  colors: readonly MarrakechColor[];
}) {
  const roomSeat = usePlayerAvatar(s.playerId);
  const frame = nameplateFrameProps(roomSeat?.equippedNameplateId);
  const primaryColor = colors[0];

  return (
    <li
      className={cn(
        'mk-game-over__row relative overflow-hidden',
        isWinner && 'mk-game-over__row--winner',
        isMe && 'mk-game-over__row--me',
        frame.className,
        frame.hasArt && 'mk-game-over__row--has-plate',
      )}
      style={frame.style}
    >
      <NameplateFrameVideo nameplateId={roomSeat?.equippedNameplateId} />
      <span
        className={cn(
          'mk-game-over__place relative z-1',
          place === 1 && 'mk-game-over__place--gold',
          place === 2 && 'mk-game-over__place--silver',
          place === 3 && 'mk-game-over__place--bronze',
        )}
        aria-label={`อันดับ ${place}`}
      >
        {place}
      </span>

      <span className="mk-game-over__avatar relative z-1 shrink-0">
        <PlayerAvatar playerId={s.playerId} name={s.name} size={isWinner ? 44 : 36} decorative />
        <PlayerAvatarIconBadge iconId={roomSeat?.equippedIconId} avatarSize={isWinner ? 44 : 36} />
      </span>

      <div className="mk-game-over__who relative z-1">
        <div className="mk-game-over__name-row">
          {isWinner ? (
            <Crown className="mk-game-over__crown" size={14} strokeWidth={2.25} aria-hidden />
          ) : null}
          <PlayerNameplate
            name={s.name}
            nameplateId={roomSeat?.equippedNameplateId}
            titleId={roomSeat?.equippedTitleId}
            surface="text"
            className="mk-game-over__name min-w-0"
            nameClassName="mk-game-over__name-label"
          />
          {isMe ? <span className="mk-game-over__you">คุณ</span> : null}
        </div>
        {isWinner ? <span className="mk-game-over__winner-tag">ชนะ</span> : null}
      </div>

      <div className="mk-game-over__score relative z-1">
        <span className="mk-game-over__total tabular-nums">{s.total}</span>
        <span className="mk-game-over__breakdown">
          <span className="mk-game-over__stat" title={`${s.dirhams} Dirham`}>
            <img src={imageMap.marrakech.coin5} alt="" className="mk-game-over__coin" />
            <span className="tabular-nums">{s.dirhams}</span>
          </span>
          <span className="mk-game-over__plus" aria-hidden>
            +
          </span>
          <span
            className="mk-game-over__stat"
            title={`${s.visibleSquares} ช่องพรม${
              primaryColor ? ` (${MARRAKECH_COLOR_LABEL[primaryColor]})` : ''
            }`}
          >
            {colors.length > 0 ? (
              <span className="mk-game-over__rugs">
                {colors.map((c) => (
                  <img
                    key={c}
                    src={imageMap.marrakech.rugs[c]}
                    alt=""
                    className="mk-game-over__rug"
                  />
                ))}
              </span>
            ) : (
              <img src={imageMap.marrakech.rugs['rug-1']} alt="" className="mk-game-over__rug" />
            )}
            <span className="tabular-nums">{s.visibleSquares}</span>
          </span>
        </span>
      </div>
    </li>
  );
}

export function MarrakechGameOverBody({
  titleId,
  iWon,
  reason,
  scores,
  winners,
  myId,
  colorsByPlayerId,
}: Props) {
  return (
    <div className="mk-game-over">
      <header className={cn('mk-game-over__hero', iWon && 'mk-game-over__hero--win')}>
        <div className="mk-game-over__trophy" aria-hidden>
          {iWon ? <Crown size={28} strokeWidth={1.75} /> : <Trophy size={28} strokeWidth={1.75} />}
        </div>
        <p className="mk-game-over__kicker">เกมจบแล้ว</p>
        <h2 id={titleId} className="mk-game-over__title">
          {iWon ? 'ยินดีด้วย — คุณชนะ!' : 'สรุปผล'}
        </h2>
        {reason ? <p className="mk-game-over__reason">{reason}</p> : null}
      </header>

      <ol className="mk-game-over__list">
        {scores.map((s, i) => (
          <GameOverScoreRow
            key={s.playerId}
            s={s}
            place={i + 1}
            isWinner={winners.has(s.playerId)}
            isMe={s.playerId === myId}
            colors={colorsByPlayerId?.[s.playerId] ?? []}
          />
        ))}
      </ol>
    </div>
  );
}
