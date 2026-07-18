import { UserCircle } from 'lucide-react';
import {
  MAX_PLAYER_DISPLAY_NAME_LENGTH,
  PLAYER_DISPLAY_NAME_HINT,
  getPlayerDisplayNameValidationError,
  isValidPlayerDisplayName,
  sanitizePlayerDisplayNameInput,
} from 'shared';
import type { PlayerAvatarConfig } from 'shared';
import { AvatarEditor } from './player-avatar';
import { Alert, Button, Input } from './ui';

interface PlayerProfileModalProps {
  open: boolean;
  playerName: string;
  playerAvatar: PlayerAvatarConfig;
  onChangeName: (value: string) => void;
  onChangeAvatar: (value: PlayerAvatarConfig) => void;
  onSubmit: () => void;
  onDismiss: () => void;
  /** Standalone profile edit vs continuing into create/join */
  mode?: 'edit' | 'continue';
  /** e.g. while a room create/join request is in flight */
  submitDisabled?: boolean;
  /** Server or flow error shown above field validation */
  externalError?: string | null;
}

export function PlayerProfileModal({
  open,
  playerName,
  playerAvatar,
  onChangeName,
  onChangeAvatar,
  onSubmit,
  onDismiss,
  mode = 'continue',
  submitDisabled = false,
  externalError = null,
}: PlayerProfileModalProps) {
  if (!open) return null;

  const validationError = playerName.trim()
    ? getPlayerDisplayNameValidationError(playerName)
    : null;
  const canSubmit = isValidPlayerDisplayName(playerName) && !submitDisabled;
  const inputError = validationError ?? undefined;
  const isEdit = mode === 'edit';

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div
        className="modal max-h-[calc(100svh-2rem)] max-w-2xl overflow-y-auto p-4! sm:p-8!"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="player-name-modal-title">
          <UserCircle size={28} className="text-accent" aria-hidden />
          {isEdit ? 'แก้ไขโปรไฟล์' : 'ใส่ชื่อของคุณ'}
        </h2>
        <p>
          {isEdit
            ? 'ชื่อและ avatar นี้จะใช้ตอนสร้างหรือเข้าห้องครั้งถัดไป'
            : 'ชื่อและ avatar นี้จะแสดงให้ผู้เล่นคนอื่นเห็น'}
        </p>
        {externalError ? (
          <Alert variant="destructive" className="mt-4">
            {externalError}
          </Alert>
        ) : null}
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
        <AvatarEditor
          value={playerAvatar}
          onChange={onChangeAvatar}
          busy={submitDisabled}
          previewName={playerName.trim() || 'คุณ'}
          className="my-6 border-y border-rule py-5"
        />
        <Button block onClick={onSubmit} disabled={!canSubmit}>
          {isEdit ? 'บันทึกโปรไฟล์' : 'ไปที่โต๊ะ'}
        </Button>
      </div>
    </div>
  );
}
