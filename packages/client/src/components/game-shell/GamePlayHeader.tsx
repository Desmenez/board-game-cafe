import type { ReactNode } from 'react';
import { GameSessionActions, type GameSessionActionsProps } from './GameSessionActions';

export type GamePlayHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  /** Extra content below title/subtitle (turn pills, phase hints, etc.) */
  trailing?: ReactNode;
  onLeave: GameSessionActionsProps['onLeave'];
  onRestart?: GameSessionActionsProps['onRestart'];
  leaveLabel?: GameSessionActionsProps['leaveLabel'];
  className?: string;
};

export function GamePlayHeader({
  title,
  subtitle,
  trailing,
  onLeave,
  onRestart,
  leaveLabel = 'short',
  className,
}: GamePlayHeaderProps) {
  return (
    <header
      className={[
        'game-play-header rounded-card border border-rule bg-paper-2 px-4 py-4 sm:px-5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="game-play-header__top flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="game-play-header__brand min-w-0">
          <h1 className="game-play-header__title font-display text-xl leading-tight font-extrabold tracking-[-0.03em] text-ink">
            {title}
          </h1>
          {subtitle ? (
            <div className="game-play-header__subtitle mt-1.5 text-sm leading-relaxed text-ink-2">
              {subtitle}
            </div>
          ) : null}
          {trailing ? <div className="game-play-header__trailing mt-2">{trailing}</div> : null}
        </div>
        <GameSessionActions onLeave={onLeave} onRestart={onRestart} leaveLabel={leaveLabel} />
      </div>
    </header>
  );
}
