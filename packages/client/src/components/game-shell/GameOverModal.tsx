import { useEffect, type ReactNode } from 'react';
import { startGameOverCelebrationLoop } from '../../utils/winCelebration';
import { GameOverActions, type GameOverActionsProps } from './GameOverActions';
import './game-shell.css';

export type GameOverModalProps = {
  children: ReactNode;
  onLeave: () => void;
  onRestart?: () => void;
  /** `aria-labelledby` target — put this id on the main heading inside `children` */
  titleId: string;
  panelClassName?: string;
  overlayClassName?: string;
  actionsLayout?: GameOverActionsProps['layout'];
  restartLabel?: string;
  leaveLabel?: string;
  restartWaitLabel?: string;
  /** Set `false` to skip confetti (rare). Default: true */
  celebrate?: boolean;
  /** Override default `startGameOverCelebrationLoop`; return cleanup from `useEffect` */
  startCelebration?: () => () => void;
};

/**
 * Standard end-game overlay: fixed modal + confetti loop + restart/leave actions.
 * Put game-specific hero, leaderboard, etc. in `children`.
 */
export function GameOverModal({
  children,
  onLeave,
  onRestart,
  titleId,
  panelClassName,
  overlayClassName,
  actionsLayout = 'stacked',
  restartLabel,
  leaveLabel,
  restartWaitLabel,
  celebrate = true,
  startCelebration = startGameOverCelebrationLoop,
}: GameOverModalProps) {
  useEffect(() => {
    if (!celebrate) return undefined;
    return startCelebration();
  }, [celebrate, startCelebration]);

  return (
    <div
      className={['modal-overlay game-over-modal-overlay', overlayClassName]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={['modal game-over-modal', panelClassName].filter(Boolean).join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="game-over-modal__body">{children}</div>
        <GameOverActions
          onLeave={onLeave}
          onRestart={onRestart}
          layout={actionsLayout}
          restartLabel={restartLabel}
          leaveLabel={leaveLabel}
          restartWaitLabel={restartWaitLabel}
        />
      </div>
    </div>
  );
}
