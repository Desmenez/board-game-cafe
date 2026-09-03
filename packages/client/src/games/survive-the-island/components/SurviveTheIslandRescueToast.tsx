import type { SurviveTheIslandColor } from 'shared';
import { PlayerAvatar } from '../../../components/player-avatar';
import { stiAdventurerSrc } from '../art';

type Props = {
  color: SurviveTheIslandColor;
  treasure: number;
  displayName: string;
  playerId: string;
  playerName: string;
  visible: boolean;
};

export function SurviveTheIslandRescueToast({
  color,
  treasure,
  displayName,
  playerId,
  playerName,
  visible,
}: Props) {
  return (
    <div
      className={`ttr-draw-toast${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${displayName} ขึ้น Rescue Island ได้ ${treasure} คะแนน`}
    >
      <PlayerAvatar
        playerId={playerId}
        name={playerName}
        size={36}
        decorative
        className="ttr-draw-toast__avatar"
      />
      <img
        src={stiAdventurerSrc(color)}
        alt="Adventurer"
        className="h-10 w-7 flex-shrink-0 object-contain drop-shadow-md"
        aria-hidden
      />
      <div className="ttr-draw-toast__copy">
        <strong>{displayName}</strong>
        <span>ขึ้น Rescue Island</span>
        <span className="ttr-draw-toast__detail">+{treasure} คะแนน</span>
      </div>
    </div>
  );
}
