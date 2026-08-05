import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, UserCircle } from 'lucide-react';
import {
  DEFAULT_NAMEPLATE_ID,
  MAX_PLAYER_DISPLAY_NAME_LENGTH,
  NO_ICON_ID,
  NO_TITLE_ID,
  PLAYER_DISPLAY_NAME_HINT,
  getPlayerDisplayNameValidationError,
  isValidPlayerDisplayName,
  normalizeIconId,
  normalizeNameplateId,
  normalizeTitleId,
  sanitizePlayerDisplayNameInput,
  type AchievementStats,
  type PlayerAvatarConfig,
  type PlayerAvatarDisplay,
} from 'shared';
import { AvatarEditor } from './player-avatar';
import { Alert, Button, Dialog, DialogDescription, DialogFooter, DialogTitle, Input } from './ui';
import { CosmeticsLobbyPreview } from './profile/CosmeticsLobbyPreview';
import { CosmeticsPicker } from './profile/CosmeticsPicker';
import { fetchOwnAchievementStats, fetchOwnAchievementUnlocks } from '../auth/profileApi';

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
  /** Signed-in only — enables photo upload in the avatar editor. */
  photoUpload?: {
    userId: string;
    avatarUrl: string | null;
    avatarDisplay: PlayerAvatarDisplay;
    onAvatarUrlChange: (url: string | null) => void;
    onAvatarDisplayChange: (display: PlayerAvatarDisplay) => void;
  } | null;
  /** Signed-in only — equip title / icon / nameplate (persisted by parent on submit). */
  cosmetics?: {
    nameplateId: string;
    titleId: string;
    iconId: string;
    onNameplateChange: (id: string) => void;
    onTitleChange: (id: string) => void;
    onIconChange: (id: string) => void;
  } | null;
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
  photoUpload = null,
  cosmetics = null,
}: PlayerProfileModalProps) {
  const [cosmeticsOpen, setCosmeticsOpen] = useState(false);
  const [draftTitleId, setDraftTitleId] = useState(NO_TITLE_ID);
  const [draftIconId, setDraftIconId] = useState(NO_ICON_ID);
  const [draftNameplateId, setDraftNameplateId] = useState(DEFAULT_NAMEPLATE_ID);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(() => new Set());
  const [matchStats, setMatchStats] = useState<AchievementStats>({
    wins: 0,
    matchesPlayed: 0,
    winsByGame: {},
    matchesByGame: {},
  });

  const cosmeticsUserId = photoUpload?.userId ?? null;

  useEffect(() => {
    if (!open || !cosmetics || !cosmeticsUserId) {
      setUnlockedAchievements(new Set());
      setMatchStats({ wins: 0, matchesPlayed: 0, winsByGame: {}, matchesByGame: {} });
      return;
    }
    let cancelled = false;
    void Promise.all([
      fetchOwnAchievementUnlocks(cosmeticsUserId),
      fetchOwnAchievementStats(cosmeticsUserId),
    ]).then(([ids, stats]) => {
      if (cancelled) return;
      setUnlockedAchievements(ids);
      setMatchStats(stats);
    });
    return () => {
      cancelled = true;
    };
  }, [open, cosmetics, cosmeticsUserId]);

  useEffect(() => {
    if (!open) setCosmeticsOpen(false);
  }, [open]);

  if (!open) return null;

  const validationError = playerName.trim()
    ? getPlayerDisplayNameValidationError(playerName)
    : null;
  const canSubmit = isValidPlayerDisplayName(playerName) && !submitDisabled;
  const inputError = validationError ?? undefined;
  const isEdit = mode === 'edit';
  const showCosmetics = Boolean(cosmetics && cosmeticsUserId);

  return createPortal(
    <div
      className="modal-overlay room-night-dialog-overlay"
      onClick={onDismiss}
      role="presentation"
    >
      <div
        className="modal room-night-dialog max-h-[calc(100svh-2rem)] w-[min(100%,42rem)]! max-w-2xl! overflow-y-auto p-4! sm:p-8!"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-profile-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="player-profile-modal-title" className="player-name-modal-title">
          <UserCircle size={28} className="text-pear" aria-hidden />
          {isEdit ? 'แก้ไขโปรไฟล์' : 'ใส่ชื่อของคุณ'}
        </h2>
        <p>
          {isEdit
            ? 'ชื่อ avatar และของตกแต่งจะใช้ในห้องนี้และครั้งถัดไป'
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
          photoUpload={photoUpload}
          className="my-6 border-y border-rule py-5"
        />

        {showCosmetics && cosmetics ? (
          <div className="mb-6">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1 text-sm font-bold text-ink">ของตกแต่ง</p>
                <p className="m-0 text-sm leading-6 text-ink-2">
                  ฉายาและพื้นหลังกล่องชื่อ — แสดงในล็อบบี้
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="shrink-0 gap-2"
                disabled={submitDisabled}
                onClick={() => {
                  setDraftTitleId(normalizeTitleId(cosmetics.titleId));
                  setDraftIconId(normalizeIconId(cosmetics.iconId));
                  setDraftNameplateId(normalizeNameplateId(cosmetics.nameplateId));
                  setCosmeticsOpen(true);
                }}
              >
                <Pencil size={16} aria-hidden />
                แก้ไขของตกแต่ง
              </Button>
            </div>
            <CosmeticsLobbyPreview
              playerId={cosmeticsUserId!}
              name={playerName}
              avatar={playerAvatar}
              avatarUrl={photoUpload?.avatarUrl}
              avatarDisplay={photoUpload?.avatarDisplay}
              nameplateId={cosmetics.nameplateId}
              titleId={cosmetics.titleId}
              iconId={cosmetics.iconId}
            />
          </div>
        ) : null}

        <Button block onClick={onSubmit} disabled={!canSubmit}>
          {isEdit ? 'บันทึกโปรไฟล์' : 'ไปที่โต๊ะ'}
        </Button>
      </div>

      {showCosmetics && cosmetics ? (
        <Dialog
          open={cosmeticsOpen}
          onOpenChange={(next) => {
            if (!next) setCosmeticsOpen(false);
          }}
          className="room-night-dialog flex max-h-[min(90dvh,44rem)] w-[min(100%,42rem)]! max-w-2xl! flex-col overflow-hidden p-4! sm:p-8!"
          overlayClassName="room-night-dialog-overlay"
          aria-labelledby="player-cosmetics-dialog-title"
          aria-describedby="player-cosmetics-dialog-desc"
        >
          <DialogTitle id="player-cosmetics-dialog-title" className="mb-2!">
            แก้ไขของตกแต่ง
          </DialogTitle>
          <DialogDescription id="player-cosmetics-dialog-desc" className="mb-4! text-ink-2">
            เลือกฉายา ไอคอน และพื้นหลังกล่องชื่อ — กดใช้แล้วกดบันทึกโปรไฟล์
          </DialogDescription>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 pr-1">
            <CosmeticsPicker
              titleId={draftTitleId}
              iconId={draftIconId}
              nameplateId={draftNameplateId}
              onTitleChange={setDraftTitleId}
              onIconChange={setDraftIconId}
              onNameplateChange={setDraftNameplateId}
              unlockedAchievements={unlockedAchievements}
              matchStats={matchStats}
              previewName={playerName}
              previewPlayerId={cosmeticsUserId!}
              previewAvatar={playerAvatar}
              previewAvatarUrl={photoUpload?.avatarUrl}
              previewAvatarDisplay={photoUpload?.avatarDisplay}
            />
          </div>
          <DialogFooter className="mt-5! shrink-0 border-t border-rule pt-4">
            <div className="flex w-full gap-3">
              <Button
                type="button"
                variant="secondary"
                block
                onClick={() => setCosmeticsOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                block
                onClick={() => {
                  cosmetics.onTitleChange(draftTitleId);
                  cosmetics.onIconChange(draftIconId);
                  cosmetics.onNameplateChange(draftNameplateId);
                  setCosmeticsOpen(false);
                }}
              >
                ใช้
              </Button>
            </div>
          </DialogFooter>
        </Dialog>
      ) : null}
    </div>,
    document.body,
  );
}
