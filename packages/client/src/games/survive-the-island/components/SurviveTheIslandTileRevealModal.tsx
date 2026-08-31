import type { SurviveTheIslandPlayerView, SurviveTheIslandReveal } from 'shared';
import { GameCardActionModal } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import {
  stiTileLocationLabel,
  stiTileRevealCard,
  stiTileRevealDescription,
  stiTileRevealLabel,
  stiTileRevealTitle,
} from '../tileRevealCopy';

type Props = {
  reveal: SurviveTheIslandReveal;
  players: SurviveTheIslandPlayerView['players'];
  terrain: SurviveTheIslandPlayerView['tiles'][number]['terrain'] | null;
  myId: string;
  onDismiss: () => void;
};

export function SurviveTheIslandTileRevealModal({
  reveal,
  players,
  terrain,
  myId,
  onDismiss,
}: Props) {
  const revealer = players.find((player) => player.id === reveal.playerId);
  const revealerName = revealer?.name ?? reveal.playerId;
  const revealerLabel = `${revealerName}${reveal.playerId === myId ? ' (คุณ)' : ''}`;
  const card = stiTileRevealCard(reveal.back);
  const locationLabel = stiTileLocationLabel(reveal.tileId, terrain);
  const effectLabel = stiTileRevealLabel(reveal.back);
  const effectDescription = stiTileRevealDescription(reveal.back);

  return (
    <GameCardActionModal
      open
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      titleId="sti-tile-reveal"
      descriptionId="sti-tile-reveal-desc"
      title={stiTileRevealTitle(reveal.back)}
      description={`${locationLabel} จมแล้ว — ทุกคนเห็นผลนี้`}
      cardSrc={card.src}
      cardAlt={card.alt}
      cardAspectRatio="1 / 0.866"
      meta="หน้าต่างนี้ปิดอัตโนมัติในไม่กี่วินาที"
      actors={
        <PlayerIdentity
          playerId={reveal.playerId}
          name={revealerLabel}
          avatarSize={40}
          secondary="เลือกให้ tile จม"
        />
      }
    >
      <div
        className="rounded-lg border border-rule/80 bg-paper/60 p-3.5"
        aria-label="ผลของ tile ที่เปิด"
      >
        <div className="flex items-baseline justify-between gap-3 border-b border-rule/60 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            ผลของ Tile
          </span>
          <span className="text-sm font-bold text-ink">{effectLabel}</span>
        </div>
        <p id="sti-tile-reveal-desc" className="m-0 pt-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
          {effectDescription}
        </p>
      </div>
    </GameCardActionModal>
  );
}
