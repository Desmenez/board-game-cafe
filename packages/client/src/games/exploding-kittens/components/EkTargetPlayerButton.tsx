import { PlayerAvatar } from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';

type Props = {
  playerId: string;
  name: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

/** Target choice chip with avatar — replaces bare name buttons. */
export function EkTargetPlayerButton({ playerId, name, onClick, disabled, className }: Props) {
  return (
    <button
      type="button"
      className={cn('ek-target-player-btn', className)}
      onClick={onClick}
      disabled={disabled}
    >
      <PlayerAvatar playerId={playerId} name={name} size={36} decorative />
      <span className="ek-target-player-btn__name">{name}</span>
    </button>
  );
}
