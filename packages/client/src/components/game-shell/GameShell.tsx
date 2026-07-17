import type { CSSProperties, ReactNode } from 'react';
import './game-shell.css';

export type GameShellProps = {
  /** Extra class on the content column, e.g. `cn-page` or `ctc-page` for game-specific layout */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/**
 * Root wrapper for every in-game view.
 * Outer shell is full-bleed midnight page chrome; inner column is width-constrained.
 */
export function GameShell({ className, style, children }: GameShellProps) {
  return (
    <div className="page app-night-page game-shell" style={style}>
      <div
        className={[
          'game-shell__content container flex w-full max-w-shell flex-col gap-4 !mx-auto !px-4 !py-4 sm:!px-6 sm:!py-6',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </div>
  );
}
