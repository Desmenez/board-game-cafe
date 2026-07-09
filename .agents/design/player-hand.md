# Player hand (private) — design spec

Canonical implementation: [`packages/client/src/components/player-hand/`](../../packages/client/src/components/player-hand/).

Demo (dev only): [`/dev/player-hand`](http://localhost:5173/dev/player-hand)

## Privacy

- The server must only include hand cards in **`getPlayerView` for the owning seat** (`myHand`, `reserve`, etc.).
- `PlayerHand` renders whatever `cards` the game passes — **do not pass opponent hands**.
- When `cards.length === 0`, the dock does not render.

## Layout

- Fixed bottom dock (`player-hand-dock`), z-index `90` (below `modal-overlay` at `100`).
- Fan overlap via negative `margin-left` on each slot.
- Hover / tap-lift: scale ~1.22, translate up ~16px.
- Games should add bottom padding ≈ `PLAYER_HAND_DOCK_RESERVE_PX` (168) so the board is not covered.

## Interaction

| Feature        | How                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Select         | `onSelectToggle` + `selectedIds`                                                                  |
| Preview        | `getPreview` + double-click (opens `HandCardPreviewModal`)                                        |
| Draw animation | `drawAnimation.newlyDrawnIds` + `drawFromRef` or `drawFromRect`; helper `useNewlyDrawnCardIds`    |
| Reorder hand   | `dragMode="reorder"` + `onReorder` — internal `DndContext`                                        |
| Play from hand | `dragMode="play"` — game wraps board in **`DndContext`**; card ids `{draggableIdPrefix}-{cardId}` |

## Minimal example (future game integration)

```tsx
import {
  PlayerHand,
  PLAYER_HAND_DOCK_RESERVE_PX,
  useNewlyDrawnCardIds,
} from '../../components/player-hand';

const newlyDrawn = useNewlyDrawnCardIds(hand.map((c) => c.id));

return (
  <GameShell className="my-page" style={{ paddingBottom: PLAYER_HAND_DOCK_RESERVE_PX }}>
    {/* board */}
    <PlayerHand
      cards={hand}
      getCardId={(c) => c.id}
      renderCard={({ card }) => <img src={cardImage(card)} alt="" />}
      selectedIds={selected}
      onSelectToggle={toggle}
      getPreview={(c) => ({ src: cardImage(c), alt: cardLabel(c) })}
      drawAnimation={{ newlyDrawnIds: newlyDrawn, drawFromRef: deckRef }}
    />
  </GameShell>
);
```

## Phase 2 migration order (not done yet)

1. Cup the Crab — `dragMode="none"` + select
2. Sheriff — `dragMode="play"` + board `DndContext`
3. Exploding Kittens — `dragMode="reorder"`

After migration, remove duplicated per-game hand CSS (`.ek-hand-*`, `.sheriff-hand-*`, etc.).
