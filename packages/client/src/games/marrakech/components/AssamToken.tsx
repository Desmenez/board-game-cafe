import { cn } from '../../../utils/cn';

type Props = {
  className?: string;
  label?: string;
};

/**
 * CSS/SVG Assam token — a market-owner figure with a facing chevron.
 * Fills its parent; position + rotation are the parent's job.
 */
export function AssamToken({ className, label = 'Assam' }: Props) {
  return (
    <div className={cn('mk-assam', className)} aria-label={label}>
      <svg viewBox="0 0 40 40" className="mk-assam__svg" aria-hidden>
        <circle cx="20" cy="22" r="14" fill="#1a1a1a" stroke="#f5d76e" strokeWidth="2" />
        <circle cx="20" cy="18" r="6" fill="#f5d76e" />
        <path d="M20 4 L26 14 L14 14 Z" fill="#f5d76e" stroke="#1a1a1a" strokeWidth="1" />
      </svg>
    </div>
  );
}
