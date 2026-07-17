import { Check, LoaderCircle, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Alert } from '../ui';

export type PlayerChoice = {
  id: string;
  name: string;
  disabled?: boolean;
  badge?: ReactNode;
  description?: ReactNode;
};

export interface PlayerChoiceGridProps {
  players: PlayerChoice[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
  busy?: boolean;
  error?: string;
  ariaLabel: string;
  className?: string;
}

/**
 * Controlled player-selection module. Selection rules stay with the game;
 * this module owns keyboard semantics, feedback states, and responsive layout.
 */
export function PlayerChoiceGrid({
  players,
  selectedIds,
  onToggle,
  disabled = false,
  busy = false,
  error,
  ariaLabel,
  className,
}: PlayerChoiceGridProps) {
  const selected = new Set(selectedIds);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <div
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2.5"
        role="group"
        aria-label={ariaLabel}
        aria-busy={busy}
      >
        {players.map((player) => {
          const isSelected = selected.has(player.id);
          const isDisabled = disabled || busy || player.disabled;
          return (
            <button
              key={player.id}
              type="button"
              className={cn(
                'relative flex min-h-20 min-w-0 items-center gap-3 rounded-input border bg-paper-3 px-3 py-3 text-left text-ink outline-2 outline-transparent outline-offset-2 transition-[background-color,border-color,transform] duration-[var(--dur-micro)] ease-[var(--ease-out)]',
                isSelected && 'border-pear bg-paper-4',
                !isSelected && 'border-rule',
                !isDisabled &&
                  'hover:border-rule-2 hover:bg-paper-4 focus-visible:outline-focus active:translate-y-px',
                isDisabled && 'cursor-not-allowed opacity-50',
              )}
              aria-pressed={isSelected}
              disabled={isDisabled}
              onClick={() => onToggle(player.id)}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-pill border',
                  isSelected
                    ? 'border-pear bg-pear text-accent-ink'
                    : 'border-rule bg-paper-2 text-ink-2',
                )}
                aria-hidden
              >
                {busy ? (
                  <LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" />
                ) : isSelected ? (
                  <Check size={17} strokeWidth={2.6} />
                ) : (
                  <UserRound size={17} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <strong className="truncate text-sm font-bold">{player.name}</strong>
                  {player.badge}
                </span>
                {player.description != null ? (
                  <span className="mt-1 block text-xs leading-snug text-ink-2">
                    {player.description}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
