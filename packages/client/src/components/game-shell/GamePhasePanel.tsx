import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type GamePhasePanelTone = 'default' | 'success' | 'danger';
export type GamePhasePanelActionsPlacement = 'header' | 'footer';
export type GamePhasePanelDensity = 'default' | 'compact';

export interface GamePhasePanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Where primary actions sit. `footer` = below children (better for card-pick flows). */
  actionsPlacement?: GamePhasePanelActionsPlacement;
  tone?: GamePhasePanelTone;
  /** `compact` = tighter padding/type for embedding under a board HUD. */
  density?: GamePhasePanelDensity;
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
  density = 'default',
  as: Element = 'section',
  className,
  children,
  ...props
}: GamePhasePanelProps) {
  const compact = density === 'compact';
  const headerActions = actions != null && actionsPlacement === 'header' ? actions : null;
  const footerActions = actions != null && actionsPlacement === 'footer' ? actions : null;

  return (
    <Element
      className={cn(
        'rounded-card border bg-paper-2 text-ink',
        compact ? 'p-3' : 'p-4 sm:p-5',
        tone === 'default' && 'border-rule',
        tone === 'success' && 'border-success/60',
        tone === 'danger' && 'border-error/60',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'flex min-w-0 flex-col',
          compact ? 'gap-2' : 'gap-4',
          headerActions != null && 'sm:flex-row sm:items-start sm:justify-between',
        )}
      >
        <div className="min-w-0">
          <h2
            className={cn(
              'font-display font-extrabold leading-tight tracking-[-0.025em] text-ink [overflow-wrap:anywhere]',
              compact ? 'text-sm md:text-base' : 'text-sm md:text-lg',
            )}
          >
            {title}
          </h2>
          {description != null ? (
            <div
              className={cn(
                'max-w-[65ch] leading-relaxed text-ink-2',
                compact ? 'mt-1 text-sm' : 'mt-2 text-base',
              )}
            >
              {description}
            </div>
          ) : null}
          {meta != null ? (
            <div className={cn('text-sm text-ink-2', compact ? 'mt-1.5' : 'mt-3')}>{meta}</div>
          ) : null}
        </div>
        {headerActions != null ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>
        ) : null}
      </div>
      {children != null ? (
        <div className={cn('min-w-0', compact ? 'mt-3' : 'mt-5')}>{children}</div>
      ) : null}
      {footerActions != null ? (
        <div
          className={cn(
            'flex flex-wrap items-center justify-center gap-2 border-t border-rule/70',
            compact ? 'mt-3 pt-3' : 'mt-6 pt-5',
          )}
        >
          {footerActions}
        </div>
      ) : null}
    </Element>
  );
}
