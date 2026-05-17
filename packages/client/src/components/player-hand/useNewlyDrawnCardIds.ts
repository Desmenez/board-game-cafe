import { useEffect, useRef, useState } from 'react';

/**
 * Returns card ids that appeared since the previous render (useful for draw animation).
 * Clears the returned list on the next render after consumption — pass ids to drawAnimation
 * or read once per state update in the parent.
 */
export function useNewlyDrawnCardIds(cardIds: readonly string[]): string[] {
  const prevRef = useRef<readonly string[]>([]);
  const [newlyDrawn, setNewlyDrawn] = useState<string[]>([]);

  useEffect(() => {
    const prev = new Set(prevRef.current);
    const added = cardIds.filter((id) => !prev.has(id));
    prevRef.current = cardIds;
    setNewlyDrawn(added);
  }, [cardIds]);

  return newlyDrawn;
}
