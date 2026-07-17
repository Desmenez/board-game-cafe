# Game-play UI primitives

Shared in-game building blocks under `packages/client/src/components/` and
`packages/client/src/hooks/`. These sit **inside** a game view — they do not
replace [`GameShell`](game-ui.md) / `GamePlayHeader` / `GameOverModal`.

Canonical pattern: **shell + slots** (same idea as [`player-hand.md`](player-hand.md)).

## When to use which

| Primitive | Use when |
|-----------|----------|
| `useDeadlineCountdown` / `formatRemainMs` | Server sends `*EndsAtMs`; show live remaining time |
| `useYourTurnToast` | Player must act — toast on false→true + yellow viewport frame while true |
| `WaitingBanner` | Show `done/total` sync progress (acks, votes, picks) |
| `GroupAcknowledgeGate` | Secret/role content + “รับทราบ” + group progress |
| `DeckCompositionReveal` | Deck/composition flip grid + group ack (before personal reveal) |
| `SecretIdentityReveal` | Personal role/identity card + optional `details` + ack |
| `PlayerTargetPicker` | Single-select player target (vote, accuse, night pick) |
| `PlayerRosterStrip` | Ordered seat list with me/active/muted + status slots |

Page chrome (leave/restart, game-over confetti) stays in `components/game-shell/`.

## APIs (minimum)

### `formatRemainMs` / `useDeadlineCountdown`

```ts
formatRemainMs(ms: number): string;
// under 1 min → "12 วิ"; else → "1:05"

useDeadlineCountdown(endsAtMs: number | null | undefined, tickMs?: number): {
  remainMs: number;
  label: string | null;
  expired: boolean;
};
```

Hook owns the interval — games should not pass a parent `now` only for timers.

### `useYourTurnToast`

```ts
useYourTurnToast(isYourTurn: boolean, enabled?: boolean);
```

On rising edge (`false` → `true`): toast “ถึงตาของคุณแล้ว”. While
`enabled && isYourTurn`: adds `html.bgc-your-turn` for a pear inset frame
around the viewport (`hooks/your-turn.css`). Games only pass the boolean
(Avalon, Camel Up, etc.).

### `WaitingBanner`

Props: `done`, `total`, `label?` (default `รับทราบแล้ว`), `className?`.

### `GroupAcknowledgeGate`

Props: `title`, `children`, `acknowledged`, `onAcknowledge`,
`progress: { current, total }`, optional ack labels, `className?`.
Renders acknowledge button + `WaitingBanner`.

### `DeckCompositionReveal` / `SecretIdentityReveal`

Path: `components/secret-identity/`.

- **`DeckCompositionReveal`**: staggered card-back → face flip of deck slots
  (`{ key, imageSrc, label, tone?, description?, detailSubtitle? }[]` +
  `cardBackSrc` + optional `gridClassName`) then group ack via
  `GroupAcknowledgeGate`. Optional `description` shows a "?" that opens a
  full-card detail dialog. Domain-agnostic — games map roles → slots.
- **`SecretIdentityReveal`**: personal portrait + affiliation + optional
  `details` ReactNode + ack + progress.

Typical flow: composition stage → personal stage (server-gated double-ack).

### `PlayerTargetPicker`

Single-select only (Avalon multi-select is a later migration).

Props: `options: { id, name, disabled? }[]`, `onSelect`, `submitted?`,
`submittedContent?`, `progress?`, `progressLabel?`, `hint?`, `emptyMessage?`,
`className?`.

### `PlayerRosterStrip`

Path: `components/player-roster/`.

Shell for an ordered seat list — domain-agnostic. Games map state → seat
slots (tags stay as `ReactNode`; do not put `isLeader` / `handCount` on the
shared API).

```ts
type RosterSeat = {
  id: string;
  name: string;
  active?: boolean; // current turn / focus actor only (not “waiting to vote”)
  muted?: boolean;
  leading?: ReactNode; // seat # before name block
  status?: ReactNode;
  badges?: ReactNode; // freeform tags (Leader, Quest, hand size, …)
  trailing?: ReactNode; // header right (e.g. tokens, score)
  aside?: ReactNode; // seat-level right column (e.g. hand meter)
  extra?: ReactNode;
  className?: string;
};
```

Props: `seats`, `myId`, `ariaLabel?`, `className?`, `layout?: 'row' | 'grid'`.
Adds `(คุณ)` and `--me` / `--active` / `--muted` modifiers. `--active` uses a
clear accent border + ring so the current actor reads first.
`layout="grid"` = one horizontal strip with `overflow-x: auto` when seats
overflow (Avalon / Love Letter). `layout="row"` wraps.

**Adapter pattern:** keep a thin game wrapper that composes badges/status and
chooses when `active` is true.

- Avalon — `AvalonPlayerStatusPanel`: Leader / Quest badges; vote wait in
  `status`; `active` only while leader is building the team
- Camel Up — `CamelUpPlayerBar`: EP in `trailing`, turn badge
- Exploding Kittens — `EkModalTurnOrderStrip`: seat #, current turn, dead,
  front-row badges

## Pilot migrations (done in first pass)

| Primitive | Pilots |
|-----------|--------|
| Deadline hook | Undercover clue/discussion, Spyfall questioning timer, Insider timers |
| WaitingBanner + GroupAcknowledgeGate | Undercover + Spyfall role reveal |
| PlayerTargetPicker | Undercover voting, Spyfall accusation |
| PlayerRosterStrip | Sushi Go strip, Love Letter strip, AvalonPlayerStatusPanel (tags + phase-gated `active`) |

## Migration order (follow-ups)

1. ~~Cup the Crab / Splendor / Camel Up / EK / Hues player strips → `PlayerRosterStrip`~~
   - Done: Cup the Crab, Camel Up, EK, Hues
   - Deferred: Splendor (heavy domain visuals)
2. ~~Avalon team vote / ONUW day vote / Salem night / Insider discussion vote → `PlayerTargetPicker`~~
   - Done: Salem constable night pick (single-select)
   - Deferred: Avalon multi, ONUW day vote (draft+confirm), Insider draft+confirm
3. ~~Avalon / Insider / Undercover elimination ack flows → `GroupAcknowledgeGate`~~
   - Done: Undercover elimination; Avalon + ONUW composition → `DeckCompositionReveal`; Avalon + ONUW personal → `SecretIdentityReveal`
   - Deferred: Insider role-reveal intro flip → `DeckCompositionReveal`
4. Remaining inline “รอผู้เล่นอื่น…” copy → `WaitingBanner` (as touched)
5. ~~Salem / ONUW / Name It / Pows timers → `useDeadlineCountdown`~~ Done

Do not force-migrate every game in one PR — extract when touching that game.