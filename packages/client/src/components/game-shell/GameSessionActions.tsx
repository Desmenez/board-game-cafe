import { LogOut, RotateCcw } from 'lucide-react';
import { Button } from '../ui';

export type GameSessionActionsProps = {
  onLeave: () => void;
  onRestart?: () => void;
  /** `short` → ออก (in-play header); `full` → ออกจากห้อง */
  leaveLabel?: 'short' | 'full';
  className?: string;
};

export function GameSessionActions({
  onLeave,
  onRestart,
  leaveLabel = 'short',
  className,
}: GameSessionActionsProps) {
  const leaveText = leaveLabel === 'short' ? 'ออก' : 'ออกจากห้อง';

  return (
    <div className={['game-play-header__actions', className].filter(Boolean).join(' ')}>
      {onRestart ? (
        <Button type="button" variant="secondary" onClick={onRestart}>
          <RotateCcw size={16} aria-hidden />
          รีห้อง
        </Button>
      ) : null}
      <Button type="button" variant="danger" onClick={onLeave}>
        <LogOut size={16} aria-hidden />
        {leaveText}
      </Button>
    </div>
  );
}
