import { LogOut, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button, type ButtonVariant } from '../ui';

export type GameOverActionsProps = {
  onLeave: () => void;
  onRestart?: () => void;
  /** `stacked` for end screens; `inline` for compact footers */
  layout?: 'stacked' | 'inline';
  restartLabel?: string;
  leaveLabel?: string;
  restartWaitLabel?: string;
  leaveVariant?: ButtonVariant;
  leaveClassName?: string;
  className?: string;
};

export function GameOverActions({
  onLeave,
  onRestart,
  layout = 'stacked',
  restartLabel = 'รีห้อง',
  leaveLabel = 'ออกจากห้อง',
  restartWaitLabel = 'รอหัวห้องกด «รีห้อง»',
  leaveVariant = 'danger',
  leaveClassName,
  className,
}: GameOverActionsProps) {
  const waitingForHost = onRestart == null;

  return (
    <div
      className={cn(
        'game-over-actions',
        layout === 'inline' && 'game-over-actions--inline',
        waitingForHost && 'game-over-actions--waiting',
        className,
      )}
    >
      {onRestart ? (
        <Button type="button" variant="primary" block={layout === 'stacked'} onClick={onRestart}>
          <RotateCcw size={16} aria-hidden />
          {restartLabel}
        </Button>
      ) : (
        <p className="game-over-actions__wait-host" role="status">
          {restartWaitLabel}
        </p>
      )}
      <Button
        type="button"
        variant={leaveVariant}
        className={leaveClassName}
        block={layout === 'stacked'}
        onClick={onLeave}
      >
        <LogOut size={16} aria-hidden />
        {leaveLabel}
      </Button>
    </div>
  );
}
