import { LogOut, RotateCcw } from 'lucide-react';
import { Button, type ButtonVariant } from '../ui';

export type GameOverActionsProps = {
  onLeave: () => void;
  onRestart?: () => void;
  /** `stacked` for end screens; `inline` for compact footers */
  layout?: 'stacked' | 'inline';
  leaveVariant?: ButtonVariant;
  leaveClassName?: string;
  className?: string;
};

export function GameOverActions({
  onLeave,
  onRestart,
  layout = 'stacked',
  leaveVariant = 'danger',
  leaveClassName,
  className,
}: GameOverActionsProps) {
  return (
    <div
      className={['game-over-actions', layout === 'inline' && 'game-over-actions--inline', className]
        .filter(Boolean)
        .join(' ')}
    >
      {onRestart ? (
        <Button type="button" variant="secondary" block={layout === 'stacked'} onClick={onRestart}>
          <RotateCcw size={16} aria-hidden />
          รีห้อง
        </Button>
      ) : (
        <p className="game-over-actions__wait-host">รอหัวห้องกด «รีห้อง»</p>
      )}
      <Button
        type="button"
        variant={leaveVariant}
        className={leaveClassName}
        block={layout === 'stacked'}
        onClick={onLeave}
      >
        <LogOut size={16} aria-hidden />
        ออกจากห้อง
      </Button>
    </div>
  );
}
