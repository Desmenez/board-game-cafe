import type { SimiloOrientation } from 'shared';

export const SIMILO_DROP_SIMILAR = 'similo-drop-similar';
export const SIMILO_DROP_DIFFERENT = 'similo-drop-different';

export function parseSimiloClueDropTarget(overId: string | undefined): SimiloOrientation | null {
  if (overId === SIMILO_DROP_SIMILAR) return 'similar';
  if (overId === SIMILO_DROP_DIFFERENT) return 'different';
  return null;
}
