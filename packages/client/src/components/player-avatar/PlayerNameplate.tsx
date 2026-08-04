import type { CSSProperties } from 'react';
import { cn } from '../../utils/cn';
import { getNameplateDef, getTitleDef, normalizeNameplateId, normalizeTitleId } from 'shared';

export interface PlayerNameplateProps {
  name: string;
  nameplateId?: string | null;
  titleId?: string | null;
  className?: string;
  nameClassName?: string;
  title?: string;
  /**
   * `inline` — hug name width.
   * `tile` — fixed strip for cosmetics picker cards (shows art on the strip).
   */
  layout?: 'inline' | 'tile';
  /**
   * `badge` — background on this element (picker tiles / legacy).
   * `text` — title + name only; put art on a parent seat frame instead.
   */
  surface?: 'badge' | 'text';
}

/** CSS class + inline style for a seat/card frame that carries nameplate art. */
export function nameplateFrameProps(nameplateId?: string | null): {
  className: string;
  style?: CSSProperties;
  hasArt: boolean;
} {
  const def = getNameplateDef(normalizeNameplateId(nameplateId));
  const hasArt = Boolean(def.imageUrl && def.imageUrl.length > 0);
  const style = hasArt
    ? ({
        backgroundImage: `url(${def.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } as const)
    : undefined;
  return {
    className: cn(
      'player-seat-frame',
      `player-seat-frame--${def.theme}`,
      def.motion === 'animated' && 'player-seat-frame--animated',
      hasArt && 'player-seat-frame--has-art',
    ),
    style,
    hasArt,
  };
}

/**
 * Display name (+ optional ฉายา). Prefer `surface="text"` inside a seat frame
 * that uses `nameplateFrameProps` for the background art.
 */
export function PlayerNameplate({
  name,
  nameplateId,
  titleId,
  className,
  nameClassName,
  title,
  layout = 'inline',
  surface = 'badge',
}: PlayerNameplateProps) {
  const def = getNameplateDef(normalizeNameplateId(nameplateId));
  const titleDef = getTitleDef(normalizeTitleId(titleId));
  const showBadgeArt = surface === 'badge';
  const style =
    showBadgeArt && def.imageUrl && def.imageUrl.length > 0
      ? ({
          backgroundImage: `url(${def.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } as const)
      : undefined;

  return (
    <span
      className={cn(
        'player-nameplate',
        showBadgeArt && `player-nameplate--${def.theme}`,
        showBadgeArt && def.motion === 'animated' && 'player-nameplate--animated',
        showBadgeArt && def.imageUrl && 'player-nameplate--has-art',
        surface === 'text' && 'player-nameplate--text',
        layout === 'tile' && 'player-nameplate--tile',
        className,
      )}
      style={style}
      title={title ?? (titleDef ? `${titleDef.label} · ${name}` : name)}
      data-nameplate={def.id}
      data-title={titleDef?.id}
    >
      <span className="player-nameplate__stack">
        {titleDef ? <span className="player-nameplate__title">{titleDef.label}</span> : null}
        <span className={cn('player-nameplate__label', nameClassName)}>{name}</span>
      </span>
    </span>
  );
}
