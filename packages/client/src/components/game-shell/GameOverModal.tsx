import { useEffect, type ReactNode } from 'react';
import { startGameOverCelebrationLoop } from '../../utils/winCelebration';
import { Dialog } from '../ui';
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
    <Dialog
      open
      onOpenChange={() => undefined}
      dismissible={false}
      overlayClassName={['game-over-modal-overlay', overlayClassName].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
      className={[
        'game-over-modal rounded-card border border-rule bg-paper-2 text-ink',
        panelClassName,
      ]
        .filter(Boolean)
        .join(' ')}
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
    </Dialog>
  );
}
