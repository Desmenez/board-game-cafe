import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { GameProgressValue } from './types';

export interface GameWaitingStateProps {
  children: ReactNode;
  progress?: GameProgressValue;
  className?: string;
  surface?: 'plain' | 'panel';
}

export function GameWaitingState({
  children,
  progress,
  className,
  surface = 'plain',
}: GameWaitingStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-28 flex-col items-center justify-center gap-3 p-3 text-center text-ink-2',
        surface === 'panel' && 'rounded-card border border-rule bg-paper-2 p-5',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle
        className="size-6 animate-spin text-pear motion-reduce:animate-none"
        aria-hidden
      />
      <div className="max-w-[60ch] text-base leading-relaxed">{children}</div>
      {progress ? (
        <span className="font-label text-sm text-ink tabular-nums">
          {progress.current}/{progress.total}
        </span>
      ) : null}
    </div>
  );
}
