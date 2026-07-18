import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { GameProgressValue } from './types';

export type GameProgressState = 'pending' | 'active' | 'success' | 'fail';

export type GameProgressItem = {
  id: string;
  label: ReactNode;
  meta?: ReactNode;
  state?: GameProgressState;
};

export interface GameProgressTrackProps {
  items: GameProgressItem[];
  ariaLabel: string;
  className?: string;
}

export type { GameProgressValue };

export function GameProgressTrack({ items, ariaLabel, className }: GameProgressTrackProps) {
  return (
    <ol
      className={cn(
        'grid min-w-0 grid-cols-[repeat(auto-fit,minmax(3.75rem,1fr))] gap-2 rounded-card border border-rule bg-paper-2 p-3 sm:gap-3 sm:p-4',
        className,
      )}
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const state = item.state ?? 'pending';
        return (
          <li key={item.id} className="min-w-0 text-center">
            <div
              className={cn(
                'mx-auto flex size-11 items-center justify-center rounded-pill border font-label text-sm font-bold tabular-nums sm:size-12',
                state === 'pending' && 'border-rule bg-paper-3 text-ink-2',
                state === 'active' && 'border-pear bg-paper-4 text-pear',
                state === 'success' && 'border-success/70 bg-success/10 text-success',
                state === 'fail' && 'border-error/70 bg-error/10 text-error',
              )}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              {state === 'success' ? (
                <Check size={18} strokeWidth={2.5} aria-hidden />
              ) : state === 'fail' ? (
                <X size={18} strokeWidth={2.5} aria-hidden />
              ) : (
                index + 1
              )}
            </div>
            <div className="mt-2 truncate text-xs font-semibold text-ink">{item.label}</div>
            {item.meta != null ? (
              <div className="mt-0.5 truncate text-xs text-ink-2">{item.meta}</div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
