import { cn } from '../../utils/cn';
import {
  getChipDef,
  getNameplateDef,
  getTitleDef,
  normalizeChipId,
  normalizeNameplateId,
  normalizeTitleId,
} from 'shared';
import { NameplateFrameVideo } from './NameplateFrameVideo';
import { chipBackgroundStyle } from './chipStyle';

export interface PlayerNameplateProps {
  name: string;
  nameplateId?: string | null;
  titleId?: string | null;
  chipId?: string | null;
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

/**
 * Display name (+ optional ฉายา). Prefer `surface="text"` inside a seat frame
 * that uses `nameplateFrameProps` for the background art.
 */
export function PlayerNameplate({
  name,
  nameplateId,
  titleId,
  chipId,
  className,
  nameClassName,
  title,
  layout = 'inline',
  surface = 'badge',
}: PlayerNameplateProps) {
  const def = getNameplateDef(normalizeNameplateId(nameplateId));
  const titleDef = getTitleDef(normalizeTitleId(titleId));
  const chipDef = getChipDef(normalizeChipId(chipId));
  const showBadgeArt = surface === 'badge';
  const hasVideo = showBadgeArt && Boolean(def.videoUrl);
  const hasImage = showBadgeArt && Boolean(def.imageUrl) && !hasVideo;
  const style = hasImage
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
        showBadgeArt && (def.imageUrl || def.videoUrl) && 'player-nameplate--has-art',
        hasVideo && 'player-nameplate--has-video',
        surface === 'text' && 'player-nameplate--text',
        layout === 'tile' && 'player-nameplate--tile',
        className,
      )}
      style={style}
      title={title ?? (titleDef ? `${titleDef.label} · ${name}` : name)}
      data-nameplate={def.id}
      data-title={titleDef?.id}
      data-chip={chipDef?.id}
    >
      {hasVideo ? <NameplateFrameVideo nameplateId={nameplateId} /> : null}
      <span className="player-nameplate__stack relative z-1">
        {titleDef ? <span className="player-nameplate__title">{titleDef.label}</span> : null}
        <span
          className={cn(
            'player-nameplate__label',
            chipDef &&
              `player-nameplate__label--chip player-nameplate__label--chip-${chipDef.theme}`,
            nameClassName,
          )}
          style={chipBackgroundStyle(chipDef)}
        >
          {name}
        </span>
      </span>
    </span>
  );
}
