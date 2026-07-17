import type { CSSProperties, ReactNode } from 'react';
import './game-shell.css';

export type GameShellProps = {
  /** Extra class on root, e.g. `cn-page` or `ctc-page` for game-specific layout */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/** Root wrapper for every in-game view — uses app `page` + `container`, no custom page background. */
export function GameShell({ className, style, children }: GameShellProps) {
  return (
    <div
      className={[
        'page container app-night-page game-shell flex flex-col gap-4 !mx-auto !w-full !max-w-shell !px-4 !py-4 sm:!px-6 sm:!py-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </div>
  );
}
