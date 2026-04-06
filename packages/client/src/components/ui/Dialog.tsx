import {
  useEffect,
  type ComponentProps,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

export interface DialogProps {
  open: boolean;
  /** false = ปิด (overlay / Escape / programmatic) */
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** class บน overlay (เช่น z-index) */
  overlayClassName?: string;
  /** class บนกล่องเนื้อหา */
  contentClassName?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

/**
 * Dialog แบบ portal — ใช้สไตล์เดียวกับ `.modal-overlay` / `.modal` ใน index.css
 */
export function Dialog({
  open,
  onOpenChange,
  children,
  overlayClassName,
  contentClassName,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn('modal-overlay', overlayClassName)}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className={cn('modal', contentClassName)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cn(className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn(className)} {...props} />;
}

export function DialogFooter({
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-wrap gap-3', className)}
      style={{ marginTop: 20, ...style }}
      {...props}
    />
  );
}
