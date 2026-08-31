import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

type Props = {
  icon: ReactNode;
  value: number;
  label: string;
  title: string;
  emphasize?: boolean;
};

export function SpicyRosterStatChip({ icon, value, label, title, emphasize }: Props) {
  return (
    <span
      className={cn('spicy-roster-stat', emphasize && 'spicy-roster-stat--on')}
      title={title}
      aria-label={`${label} ${value}`}
    >
      {icon}
      <span className="spicy-roster-stat__value tabular-nums">{value}</span>
    </span>
  );
}
