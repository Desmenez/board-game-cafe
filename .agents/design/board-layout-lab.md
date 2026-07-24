# Board layout lab (percent overlays)

Use this when a game places **hit targets / tokens / markers on a fixed board art** image (Sky Team–style control panels, maps with printed wells, etc.).

Do **not** hard-code pixel coordinates guessed from screenshots. Ship a small **dev-only layout lab**, tune visually, then paste JSON back into a layout module.

## When to use

| Need | Approach |
| ---- | -------- |
| Board image + absolute overlays that must align with printed wells | **Layout lab** (% of board box) |
| Flexible CSS grid / flex game UI (no printed board) | Normal CSS — no lab |
| One-off approximate positions | OK for first draft only; finish in the lab |

## Pattern (reference: Sky Team)

| Piece | Path |
| ----- | ---- |
| Layout constants | `packages/client/src/games/<slug>/boardLayout.ts` |
| Board that consumes layout | `.../components/*Board.tsx` |
| Dev lab page | `packages/client/src/pages/<Slug>LayoutDemoPage.tsx` |
| Route | `/dev/<slug>-layout` in `App.tsx` (dev-only is fine) |

Canonical example:

- Layout: [`packages/client/src/games/sky-team/boardLayout.ts`](../../packages/client/src/games/sky-team/boardLayout.ts)
- Lab: [`packages/client/src/pages/SkyTeamLayoutDemoPage.tsx`](../../packages/client/src/pages/SkyTeamLayoutDemoPage.tsx)
- Route: `/dev/sky-team-layout`

## Coordinate system

- Positions are **`{ left, top }` as % of the board container** (the element that wraps the board art).
- Overlay elements use `position: absolute` + `transform: translate(-50%, -50%)` so the point is the **center** of the token/slot.
- Size knobs (`slotSize`, `tokenSize`, …) are also **% of board width** (keep aspect-ratio via CSS).

Separate concerns in the layout object:

1. **Die / click slots** — interactive hit targets (`slots`)
2. **Tracks / gauges** — mark paths keyed by game value (`aeroTrack`, `brakeTrack`, …)
3. **Token anchors** — parking wells that are **not** die slots (coffee, reroll, switches)
4. **Two-state markers** — e.g. switch `off` / `on` positions (slide animation between them)

Do not overload die-slot IDs for token parking.

## Lab UX (minimum)

1. Render the real board component with a **demo / mock player view**.
2. Select a target (slot, track point, token, size).
3. **Nudge** by 0.5% (or type left/top).
4. **Copy layout JSON** → paste into `boardLayout.ts` defaults.
5. **Reset** to defaults.

Helpful extras:

- Force-show slot outlines / empty token ghosts while tuning
- Live toggles for marks (aero value, switch ON/OFF, token counts)
- Ghost click targets over non-button overlays (track marks, tokens)

## Agent / human workflow

1. Scaffold `boardLayout.ts` with rough % guesses.
2. Wire board to read only from that module (no magic numbers in JSX).
3. Add `/dev/<slug>-layout` lab early — before polishing art alignment.
4. Human (or agent with visual feedback) tunes → **Copy JSON** → update defaults.
5. Keep the lab around for later asset swaps / art crop changes.

When an agent is asked to “set positions,” prefer: **open/extend the lab + update defaults from exported JSON**, not inventing dozens of coordinates blindly.

## Checklist for a new board-overlay game

- [ ] `boardLayout.ts` with typed `%` positions + sizes
- [ ] Board component takes optional `layout` prop (defaults to `DEFAULT_*`)
- [ ] `/dev/<slug>-layout` route + Copy JSON
- [ ] Die slots ≠ token anchors
- [ ] Two-state UI has both `off` and `on` (or equivalent) anchors
- [ ] Final tuned JSON committed into defaults
