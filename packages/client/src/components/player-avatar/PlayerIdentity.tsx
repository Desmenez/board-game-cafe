import type { ReactNode } from 'react';
import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import { cn } from '../../utils/cn';
import { PlayerAvatar } from './PlayerAvatar';

export interface PlayerIdentityProps {
  playerId: string;
  name: string;
  avatar?: PlayerAvatarConfig;
  avatarUrl?: string | null;
  avatarDisplay?: PlayerAvatarDisplay | null;
  avatarSize?: number;
  secondary?: ReactNode;
  /** Cards in hand (public count only). */
  handCount?: number;
  /** Cards sitting in front of this player (game-specific). */
  frontCount?: number;
  /** Face-down / unrevealed Tryal cards. */
  unrevealedTryalCount?: number;
  trailing?: ReactNode;
  className?: string;
  nameClassName?: string;
}

/** Shared inline player identity for game-owned rows, results, and reveals. */
export function PlayerIdentity({
  playerId,
  name,
  avatar,
  avatarUrl,
  avatarDisplay,
  avatarSize = 36,
  secondary,
  handCount,
  frontCount,
  unrevealedTryalCount,
  trailing,
  className,
  nameClassName,
}: PlayerIdentityProps) {
  const metaParts: ReactNode[] = [];
  if (secondary != null) metaParts.push(secondary);
  if (handCount != null) metaParts.push(<span key="hand">มือ {handCount}</span>);
  if (frontCount != null) {
    metaParts.push(
      <span key="front" className="text-blue-400">
        ตรงหน้า {frontCount}
      </span>,
    );
  }
  if (unrevealedTryalCount != null) {
    metaParts.push(
      <span key="tryal" className="text-pink-400">
        Tryal คว่ำ {unrevealedTryalCount}
      </span>,
    );
  }

  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      <PlayerAvatar
        playerId={playerId}
        name={name}
        avatar={avatar}
        avatarUrl={avatarUrl}
        avatarDisplay={avatarDisplay}
        size={avatarSize}
        decorative
      />
      <span className="min-w-0 flex-1">
        <strong className={cn('block truncate text-sm font-semibold text-ink', nameClassName)}>
          {name}
        </strong>
        {metaParts.length > 0 ? (
          <span className="block truncate text-xs text-ink-2">
            {metaParts.map((part, i) => (
              <span key={i}>
                {i > 0 ? ' · ' : null}
                {part}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      {trailing}
    </span>
  );
}
