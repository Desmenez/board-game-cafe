import { type HTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export type AlertVariant = 'default' | 'destructive' | 'warning';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  /** แสดงปุ่มปิดมุมขวา */
  onDismiss?: () => void;
  children: ReactNode;
}

export function Alert({
  className,
  variant = 'default',
  onDismiss,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm leading-snug',
        variant === 'default' &&
          'border-[var(--border-subtle)] bg-[var(--bg-glass)] text-[var(--text-primary)]',
        variant === 'destructive' &&
          'border-[color-mix(in_srgb,var(--danger)_50%,transparent)] bg-[var(--danger-bg)] text-[var(--text-primary)]',
        variant === 'warning' &&
          'border-[color-mix(in_srgb,var(--warning)_50%,transparent)] bg-[var(--warning-bg)] text-[var(--text-primary)]',
        onDismiss && 'relative pr-10',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          className="absolute top-2 right-2 flex shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
          onClick={onDismiss}
          aria-label="ปิด"
        >
          <X size={18} strokeWidth={2.25} aria-hidden />
        </button>
      )}
    </div>
  );
}
