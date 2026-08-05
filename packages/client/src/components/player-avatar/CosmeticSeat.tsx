import type {
  CSSProperties,
  ElementType,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from 'react';
import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import { cn } from '../../utils/cn';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerAvatarIconBadge } from './PlayerAvatarIconBadge';
import { PlayerNameplate } from './PlayerNameplate';
import { NameplateFrameVideo } from './NameplateFrameVideo';
import { nameplateFrameProps } from './nameplateFrame';

export interface CosmeticSeatIdentityProps {
  playerId: string;
  name: string;
  avatar?: PlayerAvatarConfig | null;
  avatarUrl?: string | null;
  avatarDisplay?: PlayerAvatarDisplay | null;
  nameplateId?: string | null;
  titleId?: string | null;
  iconId?: string | null;
  avatarSize?: number;
  showYouLabel?: boolean;
  youLabel?: string;
  /** Line under the name (handle, offline status, etc.). */
  secondary?: ReactNode;
  /** Replace the default avatar image. */
  avatarSlot?: ReactNode;
  className?: string;
  nameClassName?: string;
}

/** Avatar + title/name (+ optional you / secondary) — no outer frame. */
export function CosmeticSeatIdentity({
  playerId,
  name,
  avatar,
  avatarUrl,
  avatarDisplay,
  nameplateId,
  titleId,
  iconId,
  avatarSize = 40,
  showYouLabel = false,
  youLabel = '(คุณ)',
  secondary,
  avatarSlot,
  className,
  nameClassName = 'font-bold',
}: CosmeticSeatIdentityProps) {
  const label = name.trim() || 'ผู้เล่น';

  return (
    <div className={cn('relative z-2 flex min-w-0 items-center gap-3', className)}>
      {avatarSlot ?? (
        <span className="relative shrink-0">
          <PlayerAvatar
            playerId={playerId}
            name={label}
            avatar={avatar ?? undefined}
            avatarUrl={avatarUrl}
            avatarDisplay={avatarDisplay}
            size={avatarSize}
            decorative
            className="shrink-0"
          />
          <PlayerAvatarIconBadge iconId={iconId} avatarSize={avatarSize} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <PlayerNameplate
            name={label}
            nameplateId={nameplateId}
            titleId={titleId}
            surface="text"
            className="min-w-0"
            nameClassName={nameClassName}
          />
          {showYouLabel ? (
            <span className="player-seat-frame__you shrink-0 text-sm">{youLabel}</span>
          ) : null}
        </div>
        {secondary != null ? <div className="min-w-0">{secondary}</div> : null}
      </div>
    </div>
  );
}

export interface CosmeticSeatProps extends Omit<CosmeticSeatIdentityProps, 'className'> {
  trailing?: ReactNode;
  /** Extra content layered on the frame (e.g. absolute kick button). */
  overlay?: ReactNode;
  className?: string;
  /** Class on the inner identity row (avatar + name). */
  identityClassName?: string;
  style?: CSSProperties;
  /** Background when there is no nameplate art. */
  emptyBg?: 'paper' | 'transparent';
  rounded?: 'card' | 'input' | 'lg';
  as?: ElementType;
  'aria-label'?: string;
  role?: string;
  tabIndex?: number;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}

const ROUNDED: Record<NonNullable<CosmeticSeatProps['rounded']>, string> = {
  card: 'rounded-card',
  input: 'rounded-input',
  lg: 'rounded-lg',
};

/**
 * Horizontal seat: nameplate art on the outer frame, identity text on top.
 * Use {@link CosmeticSeatIdentity} alone when the frame wraps a different control (e.g. checkbox).
 */
export function CosmeticSeat({
  trailing,
  overlay,
  className,
  identityClassName,
  style,
  emptyBg = 'paper',
  rounded = 'input',
  as: Comp = 'div',
  'aria-label': ariaLabel,
  role,
  tabIndex,
  type,
  onClick,
  onKeyDown,
  ...identity
}: CosmeticSeatProps) {
  const frame = nameplateFrameProps(identity.nameplateId);

  return (
    <Comp
      className={cn(
        'relative flex min-w-0 items-center gap-3 border border-rule px-3 py-3',
        ROUNDED[rounded],
        !frame.hasArt && emptyBg === 'paper' && 'bg-paper-3',
        !frame.hasArt && emptyBg === 'transparent' && 'bg-transparent',
        frame.className,
        className,
      )}
      style={{ ...frame.style, ...style }}
      aria-label={ariaLabel}
      role={role}
      tabIndex={tabIndex}
      type={Comp === 'button' ? (type ?? 'button') : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {overlay}
      <NameplateFrameVideo nameplateId={identity.nameplateId} />
      <CosmeticSeatIdentity {...identity} className={cn('flex-1', identityClassName)} />
      {trailing != null ? <div className="relative z-2 shrink-0">{trailing}</div> : null}
    </Comp>
  );
}
