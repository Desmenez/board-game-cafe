import type { CSSProperties } from 'react';
import { cn } from '../../utils/cn';
import { getNameplateDef, normalizeNameplateId } from 'shared';

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
