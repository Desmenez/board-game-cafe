# Context / Glossary

Ubiquitous language for the Board Game Cafe codebase. Terms only — no
implementation detail. See `docs/adr/` for decisions.

## Hand dock

The shared, bottom-anchored UI that shows a player's private hand of cards.
Implemented in `packages/client/src/components/player-hand/` and reused by many
games. Composed of:

- **Fan** — the row of the player's own cards, overlapped like a held hand. This
  is the "own card list" a player scrolls left/right when it is wider than the
  screen.
- **Peek mode** — resting state where only the top strip of the fan shows above
  the screen edge; the player reveals the full fan by swiping/hovering. In peek
  mode the horizontal scroll surface is the fan's wrapper, not the fan itself.
- **Organize mode** — non-peek state where the fan is fully revealed for
  reordering cards (drag to reorder).
- **Lift room** — transparent padding above the cards that gives a
  hovered/lifted card space to rise into without clipping.
- **Pass-through band** — the transparent empty regions of the fixed dock (side
  padding, lift room). Kept click-through so taps there reach the game UI behind
  the dock. This click-through requirement is in tension with touch-scrolling the
  fan on iOS — see [ADR 0001](docs/adr/0001-ios-hand-scroll-pointer-events.md).

## Platform note

**iOS Safari touch-scroll** differs from desktop: a scroll container with
`pointer-events: none` cannot be finger-scrolled (it is removed from touch
hit-testing), even though a desktop mouse wheel still scrolls it. Bugs of the form
"scrolls in device-emulation but not on a real iPhone" almost always trace to
this. Verify hand-dock scroll changes on a physical device.
