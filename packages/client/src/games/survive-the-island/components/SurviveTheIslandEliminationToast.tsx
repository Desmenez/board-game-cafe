import type {
  SurviveTheIslandColor,
  SurviveTheIslandEliminationCause,
  SurviveTheIslandPlayerView,
} from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { stiAdventurerSrc, stiArt, stiCreatureSrc } from '../art';

const CAUSE_LABEL: Record<SurviveTheIslandEliminationCause, string> = {
  shark: 'ถูกฉลามกิน',
  'sea-serpent': 'ถูกงูทะเลกลืน',
  volcano: 'ภูเขาไฟปะทุ',
  whirlpool: 'ถูกวังวนกลืน',
  kaiju: 'ถูกไคจูผลักตาย',
};

type Victim = {
  adventurerId: string;
  playerId: string;
  color: SurviveTheIslandColor;
};

type Props = {
  cause: SurviveTheIslandEliminationCause;
  victims: Victim[];
  players: SurviveTheIslandPlayerView['players'];
  myId: string;
  visible: boolean;
};

function causeArt(cause: SurviveTheIslandEliminationCause): { src: string; alt: string } {
  if (cause === 'shark' || cause === 'sea-serpent' || cause === 'kaiju') {
    return {
      src: stiCreatureSrc(cause === 'sea-serpent' ? 'sea-serpent' : cause),
      alt: CAUSE_LABEL[cause],
    };
  }
  if (cause === 'volcano') return { src: stiArt.effects.volcano, alt: 'ภูเขาไฟ' };
  return { src: stiArt.effects.whirlpool, alt: 'วังวน' };
}

export function SurviveTheIslandEliminationToast({
  cause,
  victims,
  players,
  myId,
  visible,
}: Props) {
  const art = causeArt(cause);
  const primary = victims[0];
  const owner = primary ? players.find((player) => player.id === primary.playerId) : null;
  const ownerName = owner?.name ?? primary?.playerId ?? '';
  const displayName = primary ? `${ownerName}${primary.playerId === myId ? ' (คุณ)' : ''}` : '';
  const detail =
    victims.length > 1 ? `${CAUSE_LABEL[cause]} · ${victims.length} ตัว` : CAUSE_LABEL[cause];

  return (
    <div
      className={`ttr-draw-toast${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={
        victims.length > 1
          ? `${victims.length} ผจญภัย${CAUSE_LABEL[cause]}`
          : `${displayName} ${CAUSE_LABEL[cause]}`
      }
    >
      {primary ? (
        <PlayerAvatar
          playerId={primary.playerId}
          name={ownerName}
          size={36}
          decorative
          className="ttr-draw-toast__avatar"
        />
      ) : null}
      <img src={art.src} alt="" className="h-10 w-10 shrink-0 object-contain" aria-hidden />
      <div className="flex items-center gap-1">
        {victims.slice(0, 4).map((victim) => (
          <img
            key={victim.adventurerId}
            src={stiAdventurerSrc(victim.color)}
            alt=""
            className="h-9 w-6 object-contain drop-shadow-md"
            aria-hidden
          />
        ))}
      </div>
      <div className="ttr-draw-toast__copy">
        <strong>{victims.length > 1 ? `${victims.length} ผจญภัย` : displayName}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}
