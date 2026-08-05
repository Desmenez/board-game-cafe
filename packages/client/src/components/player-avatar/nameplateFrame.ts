import type { CSSProperties } from 'react';
import { cn } from '../../utils/cn';
import { getNameplateDef, normalizeNameplateId } from 'shared';

/** CSS class + inline style for a seat/card frame that carries nameplate art. */
export function nameplateFrameProps(nameplateId?: string | null): {
  className: string;
  style?: CSSProperties;
  hasArt: boolean;
  hasVideo: boolean;
  videoUrl?: string;
} {
  const def = getNameplateDef(normalizeNameplateId(nameplateId));
  const hasVideo = Boolean(def.videoUrl && def.videoUrl.length > 0);
  const hasImage = Boolean(def.imageUrl && def.imageUrl.length > 0);
  const hasArt = hasVideo || hasImage;
  // Video is rendered as a <video> layer; still images use CSS background.
  const style =
    hasImage && !hasVideo
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
      hasVideo && 'player-seat-frame--has-video',
    ),
    style,
    hasArt,
    hasVideo,
    ...(hasVideo ? { videoUrl: def.videoUrl } : {}),
  };
}
