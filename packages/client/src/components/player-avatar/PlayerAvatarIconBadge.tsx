import { getIconDef, normalizeIconId } from 'shared';
import { cn } from '../../utils/cn';

export interface PlayerAvatarIconBadgeProps {
  iconId?: string | null;
  /** Avatar diameter in px — badge scales from this. */
  avatarSize: number;
  className?: string;
}

/** Corner medal overlay for an equipped profile icon. */
export function PlayerAvatarIconBadge({
  iconId,
  avatarSize,
  className,
}: PlayerAvatarIconBadgeProps) {
  const iconDef = getIconDef(normalizeIconId(iconId));
  if (!iconDef) return null;
  const badgeSize = Math.max(14, Math.round(avatarSize * 0.32));

  return (
    <img
      src={iconDef.imageUrl}
      alt=""
      width={badgeSize}
      height={badgeSize}
      className={cn(
        'player-avatar-icon pointer-events-none absolute -right-0.5 -bottom-0.5 z-1 object-contain drop-shadow-sm',
        className,
      )}
      style={{ width: badgeSize, height: badgeSize }}
      draggable={false}
    />
  );
}
