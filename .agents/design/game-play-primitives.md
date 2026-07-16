# Game-play UI primitives

Shared in-game building blocks under `packages/client/src/components/` and
`packages/client/src/hooks/`. These sit **inside** a game view — they do not
replace [`GameShell`](game-ui.md) / `GamePlayHeader` / `GameOverModal`.

Canonical pattern: **shell + slots** (same idea as [`player-hand.md`](player-hand.md)).

## When to use which

| Primitive | Use when |
|-----------|----------|
| `useDeadlineCountdown` / `formatRemainMs` | Server sends `*EndsAtMs`; show live remaining time |
| `WaitingBanner` | Show `done/total` sync progress (acks, votes, picks) |
| `GroupAcknowledgeGate` | Secret/role content + “รับทราบ” + group progress |
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

### `WaitingBanner`

Props: `done`, `total`, `label?` (default `รับทราบแล้ว`), `className?`.

### `GroupAcknowledgeGate`

Props: `title`, `children`, `acknowledged`, `onAcknowledge`,
`progress: { current, total }`, optional ack labels, `className?`.
Renders acknowledge button + `WaitingBanner`.

### `PlayerTargetPicker`

Single-select only (Avalon multi-select is a later migration).

Props: `options: { id, name, disabled? }[]`, `onSelect`, `submitted?`,
`submittedContent?`, `progress?`, `progressLabel?`, `hint?`, `emptyMessage?`,
`className?`.

### `PlayerRosterStrip`

```ts
type RosterSeat = {
  id: string;
  name: string;
  active?: boolean;
  muted?: boolean;
  leading?: ReactNode; // seat # before name block
  status?: ReactNode;
  badges?: ReactNode;
  trailing?: ReactNode; // header right (e.g. tokens)
  aside?: ReactNode; // seat-level right column (e.g. hand meter)
  extra?: ReactNode;
  className?: string;
};
```

Props: `seats`, `myId`, `ariaLabel?`, `className?`, `layout?: 'row' | 'grid'`.
Adds `(คุณ)` and `--me` / `--active` / `--muted` modifiers.

## Pilot migrations (done in first pass)

| Primitive | Pilots |
|-----------|--------|
| Deadline hook | Undercover clue/discussion, Spyfall questioning timer, Insider timers |
| WaitingBanner + GroupAcknowledgeGate | Undercover + Spyfall role reveal |
| PlayerTargetPicker | Undercover voting, Spyfall accusation |
| PlayerRosterStrip | Sushi Go strip, Love Letter strip |

## Migration order (follow-ups)

1. ~~Cup the Crab / Splendor / Camel Up / EK / Hues player strips → `PlayerRosterStrip`~~
   - Done: Cup the Crab, Camel Up, EK, Hues
   - Deferred: Splendor (heavy domain visuals)
2. ~~Avalon team vote / ONUW day vote / Salem night / Insider discussion vote → `PlayerTargetPicker`~~
   - Done: Salem constable night pick (single-select)
   - Deferred: Avalon multi, ONUW day vote (draft+confirm), Insider draft+confirm
3. ~~Avalon / Insider / Undercover elimination ack flows → `GroupAcknowledgeGate`~~
   - Done: Undercover elimination
   - Deferred: Avalon / Insider role-reveal intro flip shells
4. Remaining inline “รอผู้เล่นอื่น…” copy → `WaitingBanner` (as touched)
5. ~~Salem / ONUW / Name It / Pows timers → `useDeadlineCountdown`~~ Done

Do not force-migrate every game in one PR — extract when touching that game.