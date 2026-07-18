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
  /** Applied to the role card `<img>` (e.g. `aspect-[722/1130]` for Salem). */
  imageClassName?: string;
}

/**
 * Shared reveal surface for social-deduction identities. It deliberately knows
 * nothing about roles, factions, or visibility rules; each game supplies only
 * information already safe for the current player.
 *
 * Layout: full role card on the left, readable copy/details on the right (desktop).
 * Stacks card-above-content on small screens.
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
  imageClassName,
}: SecretIdentityRevealProps) {
  const badgeVariant = tone === 'good' ? 'success' : tone === 'evil' ? 'danger' : 'accent';

  return (
    <section
      className={cn(
        'mx-auto w-full max-w-md rounded-card border border-rule bg-paper-2 text-ink md:max-w-3xl',
        className,
      )}
    >
      <div className="flex flex-col gap-5 p-4 sm:p-5 md:flex-row md:items-stretch md:gap-6 md:p-6">
        <div className="mx-auto w-full max-w-62 shrink-0 md:mx-0 md:w-66 md:max-w-66">
          <div
            className={cn(
              'overflow-hidden rounded-input border bg-paper-3 shadow-card',
              tone === 'good' && 'border-success/50',
              tone === 'evil' && 'border-error/50',
              tone === 'default' && 'border-rule',
            )}
          >
            <img
              src={imageSrc}
              alt={imageAlt}
              className={cn(
                'aspect-3/4 h-auto w-full object-contain object-center',
                imageClassName,
              )}
              loading="eager"
              decoding="async"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={badgeVariant} size="sm">
              {affiliation}
            </Badge>
          </div>
          <h2 className="mt-2 font-display text-xl leading-tight font-extrabold tracking-[-0.03em] text-ink md:text-2xl">
            {title}
          </h2>

          {details != null ? (
            <div className="mt-4 min-w-0 flex-1 text-left text-sm leading-relaxed text-ink md:mt-5">
              {details}
            </div>
          ) : (
            <div className="min-h-0 flex-1" />
          )}

          <div className="mt-5 border-t border-rule pt-4 md:mt-auto">
            {progress ? (
              <p
                className="mb-3 text-sm leading-relaxed text-ink-2"
                role="status"
                aria-live="polite"
              >
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
              onClick={onAcknowledge}
            >
              {acknowledged ? acknowledgedLabel : acknowledgeLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
