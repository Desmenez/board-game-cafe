import type { ReactNode } from 'react';
import { Alert, Button, type ButtonVariant } from '../ui';

export type GameDecision = {
  label: ReactNode;
  onSelect: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

export interface GameDecisionActionsProps {
  primary: GameDecision;
  secondary: GameDecision;
  busy?: boolean;
  error?: string;
  className?: string;
}

export function GameDecisionActions({
  primary,
  secondary,
  busy = false,
  error,
  className,
}: GameDecisionActionsProps) {
  return (
    <div className={['flex flex-col gap-3', className].filter(Boolean).join(' ')}>
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          size="lg"
          variant={primary.variant ?? 'success'}
          disabled={busy || primary.disabled}
          onClick={primary.onSelect}
        >
          {primary.label}
        </Button>
        <Button
          size="lg"
          variant={secondary.variant ?? 'danger'}
          disabled={busy || secondary.disabled}
          onClick={secondary.onSelect}
        >
          {secondary.label}
        </Button>
      </div>
    </div>
  );
}
