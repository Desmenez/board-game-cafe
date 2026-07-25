import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

const EXIT_MS = 280;

type Props = {
  open: boolean;
  onClose: () => void;
  side: 'left' | 'right';
  /** Accessible name when no visible title id is provided. */
  label: string;
  /** Optional colored / custom header above the scroll body. */
  header?: ReactNode;
  /** Classes on the header chrome (e.g. scenario tier gradient). */
  headerClassName?: string;
  children: ReactNode;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Full-height side drawer for Approach / Altitude track strips.
 * Approach → left, Altitude → right.
 */
export function SkyTeamTrackDrawer({
  open,
  onClose,
  side,
  label,
  header,
  headerClassName,
  children,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const reduced = prefersReducedMotion();
      if (reduced) {
        setEntered(true);
        return;
      }
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setEntered(false);
    if (!mounted) return;
    if (prefersReducedMotion()) {
      setMounted(false);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted || !entered) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
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
      const firstInteractive = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstInteractive ?? panelRef.current)?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [mounted, entered]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn('st-track-drawer', entered && 'st-track-drawer--open')}
      role="presentation"
    >
      <button
        type="button"
        className="st-track-drawer__backdrop"
        aria-label="ปิด"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          'st-track-drawer__panel',
          side === 'left' ? 'st-track-drawer__panel--left' : 'st-track-drawer__panel--right',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={header ? titleId : undefined}
        tabIndex={-1}
      >
        <div className="st-track-drawer__chrome">
          <div className="st-track-drawer__toolbar">
            <p className="st-track-drawer__eyebrow">{label}</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="st-track-drawer__close"
              onClick={onClose}
            >
              ปิด
            </Button>
          </div>
          {header ? (
            <div id={titleId} className={cn('st-track-drawer__header', headerClassName)}>
              {header}
            </div>
          ) : null}
        </div>
        <div className="st-track-drawer__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
