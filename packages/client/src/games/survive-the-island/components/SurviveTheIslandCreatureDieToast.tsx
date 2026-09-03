import type { SurviveTheIslandCreatureKind } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { STI_CREATURE_LABEL, stiCreatureSrc } from '../art';

type Props = {
  kind: SurviveTheIslandCreatureKind;
  displayName: string;
  playerId: string;
  playerName: string;
  visible: boolean;
};

export function SurviveTheIslandCreatureDieToast({
  kind,
  displayName,
  playerId,
  playerName,
  visible,
}: Props) {
  const label = STI_CREATURE_LABEL[kind];
  const src = stiCreatureSrc(kind);

  return (
    <div
      className={`ttr-draw-toast${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${displayName} ทอยได้ ${label}`}
    >
      <PlayerAvatar
        playerId={playerId}
        name={playerName}
        size={36}
        decorative
        className="ttr-draw-toast__avatar"
      />
      <img
        src={src}
        alt={label}
        className="h-10 w-10 flex-shrink-0 rounded-full border border-white/20 object-contain p-0.5 shadow-md"
        aria-hidden
      />
      <div className="ttr-draw-toast__copy">
        <strong>{displayName}</strong>
        <span>ทอยลูกเต๋า Creature</span>
        <span className="ttr-draw-toast__detail">ได้ {label}</span>
      </div>
    </div>
  );
}
