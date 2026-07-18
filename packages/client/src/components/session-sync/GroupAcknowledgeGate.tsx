import type { ReactNode } from 'react';
import { Button } from '../ui';
import { WaitingBanner } from './WaitingBanner';
import './session-sync.css';

export type GroupAcknowledgeGateProps = {
  title: ReactNode;
  children: ReactNode;
  acknowledged: boolean;
  onAcknowledge: () => void;
  progress: { current: number; total: number };
  acknowledgeLabel?: string;
  acknowledgedLabel?: string;
  progressLabel?: string;
  className?: string;
  /** Extra line under the title (e.g. category / round). */
  subtitle?: ReactNode;
};

export function GroupAcknowledgeGate({
  title,
  children,
  acknowledged,
  onAcknowledge,
  progress,
  acknowledgeLabel = 'รับทราบ',
  acknowledgedLabel = 'รับทราบแล้ว',
  progressLabel = 'รับทราบแล้ว',
  className,
  subtitle,
}: GroupAcknowledgeGateProps) {
  return (
    <div className={['group-ack-gate', className].filter(Boolean).join(' ')}>
      <h2 className="group-ack-gate__title">{title}</h2>
      {subtitle != null ? <div className="group-ack-gate__subtitle">{subtitle}</div> : null}
      <div className="group-ack-gate__body">{children}</div>
      <div className="group-ack-gate__actions">
        <Button variant="primary" disabled={acknowledged} onClick={onAcknowledge}>
          {acknowledged ? acknowledgedLabel : acknowledgeLabel}
        </Button>
      </div>
      <WaitingBanner
        done={progress.current}
        total={progress.total}
        label={progressLabel}
        className="group-ack-gate__progress"
      />
    </div>
  );
}
