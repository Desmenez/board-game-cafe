import { useEffect, useRef, type ComponentProps, type HTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  /** false = ปิด (overlay / Escape / programmatic) */
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** class บน overlay (เช่น z-index) */
  overlayClassName?: string;
  /** class บนกล่องเนื้อหา */
  contentClassName?: string;
  /** alias ของ contentClassName */
  className?: string;
  /** Prevent Escape/backdrop dismissal for secret or blocking game reveals. */
  dismissible?: boolean;
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
  className,
  dismissible = true,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (dismissible && e.key === 'Escape') {
        onOpenChangeRef.current(false);
        return;
      }
      if (e.key !== 'Tab' || !contentRef.current) return;
      const focusable = Array.from(
        contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        e.preventDefault();
        contentRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => {
      const firstInteractive = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstInteractive ?? contentRef.current)?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [dismissible, open]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn('modal-overlay', overlayClassName)}
      role="presentation"
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        ref={contentRef}
        className={cn('modal', contentClassName, className)}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
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

export function DialogFooter({ className, style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-wrap gap-3', className)}
      style={{ marginTop: 20, ...style }}
      {...props}
    />
  );
}
