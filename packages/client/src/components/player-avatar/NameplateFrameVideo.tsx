import { getNameplateDef, normalizeNameplateId } from 'shared';

export interface NameplateFrameVideoProps {
  nameplateId?: string | null;
  className?: string;
}

/**
 * Looping muted nameplate video layer. Hidden under prefers-reduced-motion via CSS.
 */
export function NameplateFrameVideo({ nameplateId, className }: NameplateFrameVideoProps) {
  const def = getNameplateDef(normalizeNameplateId(nameplateId));
  if (!def.videoUrl) return null;

  return (
    <video
      className={['player-seat-frame__video', className].filter(Boolean).join(' ')}
      src={def.videoUrl}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
    />
  );
}
