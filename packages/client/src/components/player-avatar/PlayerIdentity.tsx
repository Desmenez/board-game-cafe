import type { ReactNode } from 'react';
import type { PlayerAvatarConfig } from 'shared';
import { cn } from '../../utils/cn';
import { PlayerAvatar } from './PlayerAvatar';

export interface PlayerIdentityProps {
  playerId: string;
  name: string;
  avatar?: PlayerAvatarConfig;
  avatarSize?: number;
  secondary?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  nameClassName?: string;
}

/** Shared inline player identity for game-owned rows, results, and reveals. */
export function PlayerIdentity({
  playerId,
  name,
  avatar,
  avatarSize = 36,
  secondary,
  trailing,
  className,
  nameClassName,
}: PlayerIdentityProps) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      <PlayerAvatar playerId={playerId} name={name} avatar={avatar} size={avatarSize} decorative />
      <span className="min-w-0 flex-1">
        <strong className={cn('block truncate text-sm font-semibold text-ink', nameClassName)}>
          {name}
        </strong>
        {secondary != null ? (
          <span className="block truncate text-xs text-ink-2">{secondary}</span>
        ) : null}
      </span>
      {trailing}
    </span>
  );
}
