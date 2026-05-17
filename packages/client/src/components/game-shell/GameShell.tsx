import type { ReactNode } from 'react';
import './game-shell.css';

export type GameShellProps = {
  /** Extra class on root, e.g. `cn-page` or `ctc-page` for game-specific layout */
  className?: string;
  children: ReactNode;
};

/** Root wrapper for every in-game view — uses app `page` + `container`, no custom page background. */
export function GameShell({ className, children }: GameShellProps) {
  return (
    <div
      className={['page container game-shell flex flex-col gap-4', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
