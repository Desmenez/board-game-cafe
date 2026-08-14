import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { GAME_THUMBNAIL_BY_ID } from 'shared';
import { getGameCoverById } from '../../gameCatalogDisplay';
import { cn } from '../../utils/cn';
import { startGameOverCelebrationLoop } from '../../utils/winCelebration';
import { Dialog } from '../ui';
import { GameOverActions, type GameOverActionsProps } from './GameOverActions';
import { useGamePlaySession } from './GamePlaySessionContext';
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
  /** Soft accent for win / lose shells. Default keeps the neutral paper panel. */
  tone?: 'default' | 'win' | 'lose';
  /** Optional cover override. Default: room session thumbnail, then `GAME_THUMBNAIL_BY_ID`. */
  coverUrl?: string;
  /** Optional game id when no room session is mounted (dev labs). */
  gameId?: string;
};

function lookupCoverByGameId(gameId: string): string {
  const shared = GAME_THUMBNAIL_BY_ID[gameId]?.trim();
  if (shared) return shared;
  return getGameCoverById(gameId);
}

function resolveGameOverCoverUrl(
  coverUrl: string | undefined,
  gameId: string | undefined,
  session: { gameId: string; coverUrl?: string } | null,
): string {
  const explicit = coverUrl?.trim();
  if (explicit) return explicit;
  if (gameId) {
    const fromProp = lookupCoverByGameId(gameId);
    if (fromProp) return fromProp;
  }
  const sessionCover = session?.coverUrl?.trim();
  if (sessionCover) return sessionCover;
  if (session?.gameId) return lookupCoverByGameId(session.gameId);
  return '';
}

const PANEL_EASE = [0.22, 1, 0.36, 1] as const;

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
  tone = 'default',
  coverUrl,
  gameId,
}: GameOverModalProps) {
  const reduceMotion = useReducedMotion();
  const session = useGamePlaySession();
  const resolvedCover = resolveGameOverCoverUrl(coverUrl, gameId, session);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [resolvedCover]);

  useEffect(() => {
    if (!celebrate) return undefined;
    return startCelebration();
  }, [celebrate, startCelebration]);

  const showCover = Boolean(resolvedCover) && !coverFailed;

  return (
    <Dialog
      open
      onOpenChange={() => undefined}
      dismissible={false}
      overlayClassName={cn(
        'game-over-modal-overlay',
        'room-night-dialog-overlay',
        tone === 'win' && 'game-over-modal-overlay--win',
        tone === 'lose' && 'game-over-modal-overlay--lose',
        overlayClassName,
      )}
      aria-labelledby={titleId}
      className={cn(
        'game-over-modal room-night-dialog rounded-card border border-rule bg-paper-2 text-ink',
        tone === 'win' && 'game-over-modal--win',
        tone === 'lose' && 'game-over-modal--lose',
        showCover && 'game-over-modal--has-cover',
        panelClassName,
      )}
    >
      {showCover ? (
        <div className="game-over-modal__backdrop" aria-hidden>
          <img
            className="game-over-modal__cover"
            src={resolvedCover}
            alt=""
            decoding="async"
            onError={() => setCoverFailed(true)}
          />
          <div className="game-over-modal__scrim" />
        </div>
      ) : null}
      <motion.div
        className="game-over-modal__stage"
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: PANEL_EASE }}
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
      </motion.div>
    </Dialog>
  );
}
