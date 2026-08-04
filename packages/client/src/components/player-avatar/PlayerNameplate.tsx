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
   * `inline` — hug name width (lobby / identity).
   * `tile` — fixed strip width for profile picker cards.
   */
  layout?: 'inline' | 'tile';
}

/**
 * Display name with equipped profile nameplate background (+ optional ฉายา).
 */
export function PlayerNameplate({
  name,
  nameplateId,
  titleId,
  className,
  nameClassName,
  title,
  layout = 'inline',
}: PlayerNameplateProps) {
  const def = getNameplateDef(normalizeNameplateId(nameplateId));
  const titleDef = getTitleDef(normalizeTitleId(titleId));
  const style =
    def.imageUrl && def.imageUrl.length > 0
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
        `player-nameplate--${def.theme}`,
        def.motion === 'animated' && 'player-nameplate--animated',
        def.imageUrl && 'player-nameplate--has-art',
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
