import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type GamePhasePanelTone = 'default' | 'success' | 'danger';

export interface GamePhasePanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  tone?: GamePhasePanelTone;
  as?: 'section' | 'div';
  children?: ReactNode;
}

/**
 * Shared phase surface. Games own the rules and copy; this module owns hierarchy,
 * responsive action placement, semantic tone, and the Midnight workbench surface.
 */
export function GamePhasePanel({
  title,
  description,
  meta,
  actions,
  tone = 'default',
  as: Element = 'section',
  className,
  children,
  ...props
}: GamePhasePanelProps) {
  return (
    <Element
      className={cn(
        'rounded-card border bg-paper-2 p-4 text-ink sm:p-5',
        tone === 'default' && 'border-rule',
        tone === 'success' && 'border-success/60',
        tone === 'danger' && 'border-error/60',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-sm md:text-lg leading-tight font-extrabold tracking-[-0.025em] text-ink [overflow-wrap:anywhere]">
            {title}
          </h2>
          {description != null ? (
            <div className="mt-2 max-w-[65ch] text-base leading-relaxed text-ink-2">
              {description}
            </div>
          ) : null}
          {meta != null ? <div className="mt-3 text-sm text-ink-2">{meta}</div> : null}
        </div>
        {actions != null ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children != null ? <div className="mt-5 min-w-0">{children}</div> : null}
    </Element>
  );
}
