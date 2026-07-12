# 1. The player-hand scroller must stay `pointer-events: auto` on iOS

Date: 2026-07-09

## Status

Accepted

## Context

The shared **hand dock** (`packages/client/src/components/player-hand/`) shows a
player's private hand as an overlapping **fan** of cards. When the fan is wider
than the screen (roughly >4 cards) the user scrolls it left/right. It is used by
10 games (camel-up, cup-the-crab, exploding-kittens, fugitive, love-letter,
salem-1692, sheriff-of-nottingham, similo, splendor, sushi-go).

A user reported (in Exploding Kittens) that on a **real iPhone / Safari** the hand
**cannot be scrolled left/right** once it overflows, even though tapping,
selecting, and playing cards all work. The bug did **not** reproduce in Chrome or
desktop-Safari responsive/device-emulation mode — there the hand scrolled fine.

Root cause: the element that carried `overflow-x: auto` also carried
`pointer-events: none`. This happened in two places:

- non-peek mode — `.player-hand-fan` (the scroller itself), and
- peek mode — `.player-hand-fan-scroll` (which becomes the scroller, inheriting
  `pointer-events: none` from its base rule).

On iOS Safari, `pointer-events: none` removes an element from **touch**
hit-testing, so the browser never attaches a touch-pan gesture to it — finger
scrolling dies. A desktop **mouse wheel** finds the scrollable ancestor through a
different code path, so it still scrolls; that is why emulation (which drives the
wheel/scrollbar with a mouse) looked fine. The card items re-enable
`pointer-events: auto`, which is why taps/plays kept working.

The `pointer-events: none` was **intentional**: the dock is `position: fixed`
across the full width, and its transparent lift-room / side padding overlays real
game UI. `none` let taps in those empty bands fall through to the UI behind the
dock. So the fix had to keep click-through in the empty bands while making the
card strip touch-scrollable — and `pointer-events` is all-or-nothing per element.

An audit of every other game's scrollers found no independent reproduction: their
`touch-action: none` sits only on dnd-kit draggables, their `pointer-events: none`
only on decorative overlays off the scroll path, and their `preventDefault()`
calls are all keyboard handlers. This is a single, shared root cause.

## Decision

Make the **scroll surface itself** `pointer-events: auto`, and size it with
`width: fit-content; max-width: 100%` so it **hugs the cards**:

- When the hand fits, the box shrinks to the cards; the empty side bands stay in
  the `pointer-events: none` parent and keep passing taps through.
- When the hand overflows, the box caps at `100%` and scrolls — and because it is
  now hittable, iOS attaches the touch-pan gesture.

Applied per mode, because the scroller is a different element in each:

- **non-peek** — `.player-hand-fan` is the scroller: `pointer-events: auto`,
  `width: fit-content; max-width: 100%; margin-inline: auto`.
- **peek** — `.player-hand-fan-scroll` is the scroller: same treatment; its
  content `.player-hand-fan` stays uncapped `width: max-content` so it can
  overflow and scroll.

Alternatives rejected:

- **Blanket `pointer-events: auto` on the full-width scroller** — fixes scrolling
  but the transparent bands start swallowing taps meant for the UI behind the
  dock, a regression across all 10 games.
- **Overflow-gated `auto` via JS/ResizeObserver** — smaller change, but while
  overflowing the lift-room band still captures taps, and it adds JS to a
  CSS-only concern.
- **JS touch-scroll shim** (`touchmove` → `scrollLeft`) — reimplements native
  momentum scrolling; worse feel on iOS.

## Consequences

- One shared-component change fixes the hand scroll for all 10 games.
- **Cannot be verified in desktop emulation** — it only reproduces with real
  touch. Changes here must be checked on a physical iPhone/Safari.
- Residual: in non-peek (organize) mode the thin lift-room padding strip above the
  cards is now inside the hittable scroller, so it captures taps rather than
  passing them through. Accepted as minor (organize mode is transient); revisit by
  moving lift-room padding onto the `pointer-events: none` parent if it bites.
- `width: fit-content` needs the `-webkit-fit-content` fallback for older iOS
  Safari; both are declared.
