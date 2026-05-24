import { UserCircle } from 'lucide-react';
import {
  MAX_PLAYER_DISPLAY_NAME_LENGTH,
  PLAYER_DISPLAY_NAME_HINT,
  getPlayerDisplayNameValidationError,
  isValidPlayerDisplayName,
  sanitizePlayerDisplayNameInput,
} from 'shared';
import { Button, Input } from './ui';

interface PlayerNameModalProps {
  open: boolean;
  playerName: string;
  onChangeName: (value: string) => void;
  onSubmit: () => void;
  onDismiss: () => void;
  /** e.g. while a room create/join request is in flight */
  submitDisabled?: boolean;
  /** Server or flow error shown above field validation */
  externalError?: string | null;
}

export function PlayerNameModal({
  open,
  playerName,
  onChangeName,
  onSubmit,
  onDismiss,
  submitDisabled = false,
  externalError = null,
}: PlayerNameModalProps) {
  if (!open) return null;

  const validationError = playerName.trim()
    ? getPlayerDisplayNameValidationError(playerName)
    : null;
  const canSubmit = isValidPlayerDisplayName(playerName) && !submitDisabled;
  const inputError = externalError ?? validationError ?? undefined;

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
            maxLength={MAX_PLAYER_DISPLAY_NAME_LENGTH}
            hint={PLAYER_DISPLAY_NAME_HINT}
            onChange={(e) => onChangeName(sanitizePlayerDisplayNameInput(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && onSubmit()}
            error={inputError}
            autoFocus
          />
        </div>
        <Button block onClick={onSubmit} disabled={!canSubmit}>
          เริ่มเลย!
        </Button>
      </div>
    </div>
  );
}
