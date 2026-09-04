import type { SurviveTheIslandPlayerView, SurviveTheIslandReveal } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { stiTileLocationLabel, stiTileRevealCard, stiTileRevealTitle } from '../tileRevealCopy';

type Props = {
  reveal: SurviveTheIslandReveal;
  players: SurviveTheIslandPlayerView['players'];
  terrain: SurviveTheIslandPlayerView['tiles'][number]['terrain'] | null;
  myId: string;
  visible: boolean;
};

export function SurviveTheIslandTileRevealToast({
  reveal,
  players,
  terrain,
  myId,
  visible,
}: Props) {
  const revealer = players.find((p) => p.id === reveal.playerId);
  const revealerName = revealer?.name ?? reveal.playerId;
  const displayName = `${revealerName}${reveal.playerId === myId ? ' (คุณ)' : ''}`;
  const card = stiTileRevealCard(reveal.back);
  const locationLabel = stiTileLocationLabel(reveal.tileId, terrain);
  const title = stiTileRevealTitle(reveal.back);

  return (
    <div
      className={`ttr-draw-toast${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${displayName} เปิด ${locationLabel}: ${title}`}
    >
      <PlayerAvatar
        playerId={reveal.playerId}
        name={revealerName}
        size={36}
        decorative
        className="ttr-draw-toast__avatar"
      />
      <img src={card.src} alt={card.alt} className="h-12 w-12 shrink-0" aria-hidden />
      <div className="ttr-draw-toast__copy">
        <strong>{displayName}</strong>
        <span>{locationLabel} จมแล้ว</span>
        <span className="ttr-draw-toast__detail">{title}</span>
      </div>
    </div>
  );
}
