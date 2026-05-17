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
    <header className={['game-play-header', className].filter(Boolean).join(' ')}>
      <div className="game-play-header__top">
        <div className="game-play-header__brand">
          <h1 className="game-play-header__title">{title}</h1>
          {subtitle ? <div className="game-play-header__subtitle">{subtitle}</div> : null}
          {trailing ? <div className="game-play-header__trailing">{trailing}</div> : null}
        </div>
        <GameSessionActions onLeave={onLeave} onRestart={onRestart} leaveLabel={leaveLabel} />
      </div>
    </header>
  );
}
