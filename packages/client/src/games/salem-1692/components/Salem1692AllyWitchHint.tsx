import { Moon } from 'lucide-react';

/** Private hint for witch allies — marks a face-down Witch tryal. */
export function Salem1692AllyWitchHint({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={['s1692-ally-witch-hint', compact ? 's1692-ally-witch-hint--compact' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="Witch ของทีมคุณ"
    >
      <Moon size={compact ? 14 : 18} strokeWidth={2.25} aria-hidden />
      <span>Witch</span>
    </div>
  );
}
