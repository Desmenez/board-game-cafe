import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type GamePhasePanelTone = 'default' | 'success' | 'danger';
export type GamePhasePanelActionsPlacement = 'header' | 'footer';

export interface GamePhasePanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Where primary actions sit. `footer` = below children (better for card-pick flows). */
  actionsPlacement?: GamePhasePanelActionsPlacement;
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
  actionsPlacement = 'header',
  tone = 'default',
  as: Element = 'section',
  className,
  children,
  ...props
}: GamePhasePanelProps) {
  const headerActions = actions != null && actionsPlacement === 'header' ? actions : null;
  const footerActions = actions != null && actionsPlacement === 'footer' ? actions : null;

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
      <div
        className={cn(
          'flex min-w-0 flex-col gap-4',
          headerActions != null && 'sm:flex-row sm:items-start sm:justify-between',
        )}
      >
        <div className="min-w-0">
          <h2 className="font-display text-sm font-extrabold leading-tight tracking-[-0.025em] text-ink [overflow-wrap:anywhere] md:text-lg">
            {title}
          </h2>
          {description != null ? (
            <div className="mt-2 max-w-[65ch] text-base leading-relaxed text-ink-2">
              {description}
            </div>
          ) : null}
          {meta != null ? <div className="mt-3 text-sm text-ink-2">{meta}</div> : null}
        </div>
        {headerActions != null ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>
        ) : null}
      </div>
      {children != null ? <div className="mt-5 min-w-0">{children}</div> : null}
      {footerActions != null ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-rule/70 pt-5">
          {footerActions}
        </div>
      ) : null}
    </Element>
  );
}
