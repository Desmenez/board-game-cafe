import type { ReactNode } from 'react';
import type { SurviveTheIslandAbility, SurviveTheIslandPhase } from 'shared';
import { cn } from '../../../utils/cn';
import { STI_ABILITY_LABEL, stiAbilitySrc, stiAdventurerSrc, stiPhaseMeta } from '../art';

type TokenSize = 'xs' | 'sm' | 'md' | 'lg';

const TOKEN_SIZE: Record<TokenSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-7 w-7',
  md: 'h-11 w-11',
  lg: 'h-16 w-16',
};

const HEX_SIZE: Record<TokenSize, string> = {
  xs: 'w-6',
  sm: 'w-9',
  md: 'w-12',
  lg: 'w-[4.5rem]',
};

type ArtProps = {
  src: string;
  alt: string;
  size?: TokenSize;
  dimmed?: boolean;
  className?: string;
};

export function StiToken({ src, alt, size = 'sm', dimmed, className }: ArtProps) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={cn(
        'object-contain',
        TOKEN_SIZE[size],
        dimmed && 'opacity-30 grayscale',
        className,
      )}
    />
  );
}

export function StiAdventurerToken({
  color,
  treasure,
  size = 'lg',
  alt = '',
}: {
  color: string;
  treasure?: number | null;
  size?: TokenSize;
  alt?: string;
}) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center">
      <StiToken src={stiAdventurerSrc(color)} alt={alt} size={size} />
      {treasure != null ? (
        <span className="pointer-events-none absolute left-[58%] top-[60%] grid min-w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-slate-950/90 px-1 text-[10px] font-black tabular-nums text-amber-200">
          {treasure}
        </span>
      ) : null}
    </span>
  );
}

export function StiHexArt({ src, alt, size = 'md', dimmed, className }: ArtProps) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={cn(
        'aspect-[1.16] object-contain',
        HEX_SIZE[size],
        dimmed && 'opacity-30 grayscale',
        className,
      )}
    />
  );
}

export function StiStatChip({
  src,
  hex,
  icon,
  value,
  label,
  emphasize,
  dimmed,
}: {
  src?: string;
  hex?: boolean;
  icon?: ReactNode;
  value: ReactNode;
  label: string;
  emphasize?: boolean;
  dimmed?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border px-1.5 py-0.5 text-xs font-semibold tabular-nums',
        emphasize
          ? 'border-pear/50 bg-pear/10 text-ink'
          : 'border-rule bg-paper-3 text-ink-2',
      )}
      title={label}
      aria-label={`${label} ${value}`}
    >
      {icon}
      {src ? (
        hex ? (
          <StiHexArt src={src} alt="" size="xs" className="w-5" dimmed={dimmed} />
        ) : (
          <StiToken src={src} alt="" size="xs" dimmed={dimmed} />
        )
      ) : null}
      <span>{value}</span>
    </span>
  );
}

export function StiPhaseChip({ phase }: { phase: SurviveTheIslandPhase }) {
  const meta = stiPhaseMeta(phase);
  const hex = phase === 'action' || phase === 'rising_waters' || phase === 'creatures' || phase === 'game_over';
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-rule bg-paper-3 py-0.5 pr-2.5 pl-1 text-xs font-semibold text-ink">
      {hex ? (
        <StiHexArt src={meta.src} alt="" size="xs" className="w-6" />
      ) : (
        <StiToken src={meta.src} alt="" size="sm" />
      )}
      {meta.label}
    </span>
  );
}

export function StiMeter({
  src,
  hex,
  filled,
  total,
  label,
}: {
  src: string;
  hex?: boolean;
  filled: number;
  total: number;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5" title={label} aria-label={`${label} ${filled}/${total}`}>
      {Array.from({ length: total }, (_, index) =>
        hex ? (
          <StiHexArt
            key={index}
            src={src}
            alt=""
            size="sm"
            dimmed={index >= filled}
            className="w-8"
          />
        ) : (
          <StiToken key={index} src={src} alt="" size="sm" dimmed={index >= filled} />
        ),
      )}
      <span className="text-xs font-semibold tabular-nums text-ink-2">
        {filled}/{total}
      </span>
    </div>
  );
}

export function StiAbilityButton({
  ability,
  selected,
  disabled,
  onClick,
}: {
  ability: SurviveTheIslandAbility;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const label = STI_ABILITY_LABEL[ability];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      title={label}
      className={cn(
        'flex w-19 cursor-pointer flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition-colors duration-200',
        selected
          ? 'border-pear bg-pear/15 text-ink'
          : 'border-rule bg-paper-3 text-ink-2 hover:border-pear/45 hover:bg-paper-4',
        disabled && 'cursor-not-allowed opacity-50 hover:border-rule hover:bg-paper-3',
      )}
    >
      <StiHexArt src={stiAbilitySrc(ability)} alt="" size="md" />
      <span className="text-[11px] leading-tight font-semibold">{label}</span>
    </button>
  );
}
