import type { SurviveTheIslandAbility } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { STI_ABILITY_LABEL, stiAbilitySrc } from '../art';

type Props = {
  ability: SurviveTheIslandAbility;
  displayName: string;
  playerId: string;
  playerName: string;
  visible: boolean;
};

export function SurviveTheIslandAbilityToast({
  ability,
  displayName,
  playerId,
  playerName,
  visible,
}: Props) {
  const label = STI_ABILITY_LABEL[ability];

  return (
    <div
      className={`ttr-draw-toast${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${displayName} ใช้ ${label}`}
    >
      <PlayerAvatar
        playerId={playerId}
        name={playerName}
        size={36}
        decorative
        className="ttr-draw-toast__avatar"
      />
      <img
        src={stiAbilitySrc(ability)}
        alt={label}
        className="h-10 w-10 flex-shrink-0 rounded-md border border-white/20 object-contain shadow-md"
        aria-hidden
      />
      <div className="ttr-draw-toast__copy">
        <strong>{displayName}</strong>
        <span>ใช้ Ability</span>
        <span className="ttr-draw-toast__detail">{label}</span>
      </div>
    </div>
  );
}
