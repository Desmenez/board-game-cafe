import type { ReactNode } from 'react';
import './session-sync.css';

export type WaitingBannerProps = {
  done: number;
  total: number;
  /** Prefix before `done/total`. Default: `รับทราบแล้ว` */
  label?: string;
  className?: string;
  children?: ReactNode;
};

export function WaitingBanner({
  done,
  total,
  label = 'รับทราบแล้ว',
  className,
  children,
}: WaitingBannerProps) {
  return (
    <p className={['waiting-banner', className].filter(Boolean).join(' ')}>
      {children ?? (
        <>
          {label} {done}/{total}
        </>
      )}
    </p>
  );
}
