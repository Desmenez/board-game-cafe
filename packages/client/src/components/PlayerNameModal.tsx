import { UserCircle } from 'lucide-react';
import { Button, Input } from './ui';

interface PlayerNameModalProps {
  open: boolean;
  playerName: string;
  onChangeName: (value: string) => void;
  onSubmit: () => void;
  onDismiss: () => void;
  submitDisabled: boolean;
}

export function PlayerNameModal({
  open,
  playerName,
  onChangeName,
  onSubmit,
  onDismiss,
  submitDisabled,
}: PlayerNameModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="player-name-modal-title">
          <UserCircle size={28} className="text-accent" aria-hidden />
          ใส่ชื่อของคุณ
        </h2>
        <p>ชื่อนี้จะแสดงให้ผู้เล่นคนอื่นเห็น</p>
        <div className="form-group">
          <Input
            label="ชื่อที่แสดงในเกม"
            type="text"
            placeholder="ชื่อของคุณ"
            value={playerName}
            onChange={(e) => onChangeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !submitDisabled && onSubmit()}
            autoFocus
          />
        </div>
        <Button block onClick={onSubmit} disabled={submitDisabled}>
          เริ่มเลย!
        </Button>
      </div>
    </div>
  );
}
