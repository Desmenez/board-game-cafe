import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { GameProgressValue } from '../game-shell';
import { Badge, Button } from '../ui';

export type SecretIdentityTone = 'default' | 'good' | 'evil';

export interface SecretIdentityRevealProps {
  imageSrc: string;
  imageAlt: string;
  title: ReactNode;
  affiliation: ReactNode;
  tone?: SecretIdentityTone;
  details?: ReactNode;
  progress?: GameProgressValue;
  acknowledged: boolean;
  onAcknowledge: () => void;
  acknowledgeLabel?: string;
  acknowledgedLabel?: string;
  className?: string;
}

/**
 * Shared reveal surface for social-deduction identities. It deliberately knows
 * nothing about roles, factions, or visibility rules; each game supplies only
 * information already safe for the current player.
 */
export function SecretIdentityReveal({
  imageSrc,
  imageAlt,
  title,
  affiliation,
  tone = 'default',
  details,
  progress,
  acknowledged,
  onAcknowledge,
  acknowledgeLabel = 'รับทราบ พร้อมเล่น',
  acknowledgedLabel = 'รับทราบแล้ว — รอผู้เล่นคนอื่น',
  className,
}: SecretIdentityRevealProps) {
  const badgeVariant = tone === 'good' ? 'success' : tone === 'evil' ? 'danger' : 'accent';

  return (
    <section
      className={cn(
        'mx-auto w-full max-w-md overflow-clip rounded-card border border-rule bg-paper-2 text-ink',
        className,
      )}
    >
      <div className="relative aspect-[3/4] max-h-80 overflow-clip bg-paper-3">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="h-full w-full object-cover object-[center_15%]"
          loading="eager"
        />
        <Badge variant={badgeVariant} className="absolute top-3 right-3">
          {affiliation}
        </Badge>
      </div>
      <div className="p-5 sm:p-6">
        <h2 className="font-display text-xl leading-tight font-extrabold tracking-[-0.03em] text-ink">
          {title}
        </h2>
        {details != null ? <div className="mt-4">{details}</div> : null}
        {progress ? (
          <p className="mt-5 text-sm leading-relaxed text-ink-2" role="status" aria-live="polite">
            ผู้เล่นรับทราบแล้ว{' '}
            <span className="font-label text-ink tabular-nums">
              {progress.current}/{progress.total}
            </span>{' '}
            คน
          </p>
        ) : null}
        <Button
          type="button"
          variant={acknowledged ? 'secondary' : 'primary'}
          block
          disabled={acknowledged}
          className="mt-4"
          onClick={onAcknowledge}
        >
          {acknowledged ? acknowledgedLabel : acknowledgeLabel}
        </Button>
      </div>
    </section>
  );
}
