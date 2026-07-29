import { Crown, Trophy } from 'lucide-react';
import type { MarrakechColor, MarrakechScoreEntry } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
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
        {scores.map((s, i) => {
          const place = i + 1;
          const isWinner = winners.has(s.playerId);
          const isMe = s.playerId === myId;
          const colors = colorsByPlayerId?.[s.playerId] ?? [];
          const primaryColor = colors[0];

          return (
            <li
              key={s.playerId}
              className={cn(
                'mk-game-over__row',
                isWinner && 'mk-game-over__row--winner',
                isMe && 'mk-game-over__row--me',
              )}
            >
              <span
                className={cn(
                  'mk-game-over__place',
                  place === 1 && 'mk-game-over__place--gold',
                  place === 2 && 'mk-game-over__place--silver',
                  place === 3 && 'mk-game-over__place--bronze',
                )}
                aria-label={`อันดับ ${place}`}
              >
                {place}
              </span>

              <PlayerAvatar
                playerId={s.playerId}
                name={s.name}
                size={isWinner ? 44 : 36}
                decorative
                className="mk-game-over__avatar"
              />

              <div className="mk-game-over__who">
                <div className="mk-game-over__name-row">
                  {isWinner ? (
                    <Crown
                      className="mk-game-over__crown"
                      size={14}
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  ) : null}
                  <span className="mk-game-over__name">
                    {s.name}
                    {isMe ? <span className="mk-game-over__you">คุณ</span> : null}
                  </span>
                </div>
                {isWinner ? <span className="mk-game-over__winner-tag">ชนะ</span> : null}
              </div>

              <div className="mk-game-over__score">
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
                      <img
                        src={imageMap.marrakech.rugs['rug-1']}
                        alt=""
                        className="mk-game-over__rug"
                      />
                    )}
                    <span className="tabular-nums">{s.visibleSquares}</span>
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
