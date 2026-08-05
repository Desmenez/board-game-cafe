import {
  getChipDef,
  getIconDef,
  getTitleDef,
  normalizeChipId,
  normalizeIconId,
  normalizeNameplateId,
  normalizePlayerAvatar,
  normalizePlayerAvatarDisplay,
  normalizeTitleId,
  type PlayerAvatarConfig,
  type PlayerAvatarDisplay,
} from 'shared';
import { PlayerAvatar } from '../player-avatar/PlayerAvatar';
import { NameplateFrameVideo } from '../player-avatar/NameplateFrameVideo';
import { nameplateFrameProps } from '../player-avatar/nameplateFrame';
import { cn } from '../../utils/cn';
import { pickBadgeIconIds } from './pickBadgeIconIds';

export interface CosmeticsPublicProfilePreviewProps {
  playerId: string;
  name: string;
  handle?: string | null;
  avatar?: PlayerAvatarConfig | null;
  avatarUrl?: string | null;
  avatarDisplay?: PlayerAvatarDisplay | null;
  nameplateId?: string | null;
  titleId?: string | null;
  iconId?: string | null;
  chipId?: string | null;
  unlockedAchievements?: ReadonlySet<string>;
  className?: string;
}

/**
 * Inline public-profile card shell for cosmetics picker (same look as
 * {@link PlayerPublicProfileDialog} header — no portal / fetch).
 */
export function CosmeticsPublicProfilePreview({
  playerId,
  name,
  handle,
  avatar,
  avatarUrl,
  avatarDisplay,
  nameplateId,
  titleId,
  iconId,
  chipId,
  unlockedAchievements,
  className,
}: CosmeticsPublicProfilePreviewProps) {
  const label = name.trim() || 'ชื่อของคุณ';
  const plateId = normalizeNameplateId(nameplateId);
  const frame = nameplateFrameProps(plateId);
  const titleDef = getTitleDef(normalizeTitleId(titleId));
  const chipDef = getChipDef(normalizeChipId(chipId));
  const badgeIcons = pickBadgeIconIds(unlockedAchievements ?? new Set(), iconId);
  const showCosmeticsRow = Boolean(titleDef) || badgeIcons.length > 0;
  const handleText = handle?.trim() ? handle.trim().toUpperCase() : null;

  return (
    <div
      className={cn(
        'public-profile-dialog overflow-hidden rounded-card border border-rule',
        className,
      )}
      aria-label={`พรีวิวโปรไฟล์สาธารณะ: ${label}`}
    >
      <div
        className={cn(
          'public-profile-dialog__shell relative overflow-hidden rounded-[inherit]',
          frame.className,
          frame.hasArt && 'public-profile-dialog__shell--has-plate',
        )}
        style={frame.style}
      >
        <NameplateFrameVideo nameplateId={plateId} />
        <div className="public-profile-dialog__scrim" aria-hidden />

        <div className="public-profile-dialog__body relative z-2 px-4 pt-12 pb-4">
          <div className="-mt-6 mb-3 flex h-16 items-end gap-3">
            <span className="relative size-16 shrink-0 overflow-hidden rounded-[1rem] border-[3px] border-[color-mix(in_oklch,var(--color-paper-2)_75%,transparent)] bg-paper-2 shadow-sm">
              <PlayerAvatar
                playerId={playerId}
                name={label}
                avatar={normalizePlayerAvatar(avatar, playerId)}
                avatarUrl={avatarUrl}
                avatarDisplay={normalizePlayerAvatarDisplay(avatarDisplay)}
                size={64}
                decorative
                className="size-full rounded-none! border-0!"
              />
            </span>
          </div>

          <p className="public-profile-dialog__name m-0 min-h-7 font-display text-xl leading-7 font-extrabold tracking-[-0.03em] text-ink">
            <span
              className={cn(
                'player-nameplate__label',
                chipDef &&
                  `player-nameplate__label--chip player-nameplate__label--chip-${chipDef.theme}`,
              )}
            >
              {label}
            </span>
          </p>
          <p className="public-profile-dialog__handle mt-1 mb-0 flex min-h-5 flex-wrap items-center gap-2 text-sm leading-5 text-ink-2">
            {handleText ? (
              <span className="font-mono tracking-wide">@{handleText}</span>
            ) : (
              <span className="text-ink-2/70">ไม่มีรหัสเพื่อน</span>
            )}
          </p>

          {showCosmeticsRow ? (
            <div className="mt-3 flex h-7 items-center gap-2 overflow-hidden">
              {titleDef ? (
                <span className="inline-flex h-6 max-w-full shrink-0 items-center truncate rounded-pill border border-rule bg-paper-3/70 px-2.5 text-xs font-semibold text-ink backdrop-blur-sm">
                  {titleDef.label}
                </span>
              ) : null}
              {badgeIcons.map((id) => {
                const def = getIconDef(normalizeIconId(id));
                if (!def) return null;
                return (
                  <img
                    key={id}
                    src={def.imageUrl}
                    alt={def.label}
                    title={def.label}
                    width={28}
                    height={28}
                    className="size-7 shrink-0 object-contain drop-shadow-sm"
                    draggable={false}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
