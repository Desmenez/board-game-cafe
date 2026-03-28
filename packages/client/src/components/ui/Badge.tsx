import { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'accent'
  | 'outline';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export function Badge({ className, variant = 'default', size = 'md', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'ui-badge',
        variant === 'default' && 'ui-badge--default',
        variant === 'success' && 'ui-badge--success',
        variant === 'danger' && 'ui-badge--danger',
        variant === 'warning' && 'ui-badge--warning',
        variant === 'info' && 'ui-badge--info',
        variant === 'accent' && 'ui-badge--accent',
        variant === 'outline' && 'ui-badge--outline',
        size === 'sm' && 'ui-badge--sm',
        size === 'lg' && 'ui-badge--lg',
        className,
      )}
      {...props}
    />
  );
}
