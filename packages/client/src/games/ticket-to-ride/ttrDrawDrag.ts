export type TtrDrawPick = { source: 'deck' } | { source: 'face_up'; index: number };

export const TTR_DROP_TRAIN_HAND = 'ttr-drop-train-hand';
export const TTR_DROP_TRAIN_HAND_QUICK = 'ttr-drop-train-hand-quick';
export const TTR_TRAIN_HAND_DROP_IDS = new Set<string>([
  TTR_DROP_TRAIN_HAND,
  TTR_DROP_TRAIN_HAND_QUICK,
]);

export function parseTtrDrawDragId(id: string): TtrDrawPick | null {
  if (id === 'draw:deck') return { source: 'deck' };
  if (id.startsWith('draw:faceup:')) {
    const index = Number(id.replace('draw:faceup:', ''));
    if (Number.isInteger(index) && index >= 0) return { source: 'face_up', index };
  }
  return null;
}
