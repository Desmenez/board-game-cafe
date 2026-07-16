import type { ReactNode } from 'react';
import { Button } from '../ui';
import { WaitingBanner } from '../session-sync';
import './player-target.css';

export type TargetOption = {
  id: string;
  name: string;
  disabled?: boolean;
};

export type PlayerTargetPickerProps = {
  options: TargetOption[];
  onSelect: (id: string) => void;
  submitted?: boolean;
  /** Shown instead of the grid when `submitted` is true. Defaults to a waiting line. */
  submittedContent?: ReactNode;
  progress?: { done: number; total: number };
  progressLabel?: string;
  hint?: ReactNode;
  emptyMessage?: string;
  className?: string;
  title?: ReactNode;
};

export function PlayerTargetPicker({
  options,
  onSelect,
  submitted = false,
  submittedContent,
  progress,
  progressLabel = 'โหวตแล้ว',
  hint,
  emptyMessage = 'ไม่มีเป้าหมายให้เลือก',
  className,
  title,
}: PlayerTargetPickerProps) {
  return (
    <div className={['player-target-picker', className].filter(Boolean).join(' ')}>
      {title != null ? <h2 className="player-target-picker__title">{title}</h2> : null}
      {hint != null ? <div className="player-target-picker__hint">{hint}</div> : null}

      {submitted ? (
        <div className="player-target-picker__submitted">
          {submittedContent ?? (
            <p className="player-target-picker__waiting">คุณโหวตแล้ว — รอผู้เล่นอื่น…</p>
          )}
        </div>
      ) : options.length === 0 ? (
        <p className="player-target-picker__empty">{emptyMessage}</p>
      ) : (
        <div className="player-target-picker__grid">
          {options.map((opt) => (
            <Button
              key={opt.id}
              variant="secondary"
              disabled={opt.disabled}
              onClick={() => onSelect(opt.id)}
            >
              {opt.name}
            </Button>
          ))}
        </div>
      )}

      {progress != null ? (
        <WaitingBanner
          done={progress.done}
          total={progress.total}
          label={progressLabel}
          className="player-target-picker__progress"
        />
      ) : null}
    </div>
  );
}
