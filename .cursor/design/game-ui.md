# Game play UI — design spec

Canonical implementation: `packages/client/src/components/game-shell/`.

## Root shell

Every in-game view **must** wrap content in `<GameShell>`.

- Applies `page container game-shell flex flex-col gap-4` — same as Codenames (`cn-page`), Flip7, etc.
- Optional `className` for game-specific spacing only (e.g. `ctc-page`).
- **Do not** set `min-height: 100dvh`, full-viewport padding, or `background: linear-gradient(...)` on the game root.
- Page background comes from the app theme (`index.css` / `--bg-*`).

## Header

Use `<GamePlayHeader>` for the top bar on every phase (including game over).

| Slot | Purpose |
|------|---------|
| `title` | Game name — top-left, `1.35rem` via `.game-play-header__title` |
| `subtitle` | Meta line (round, score, turn) — optional |
| `trailing` | Turn pills, phase banners — optional |
| `onLeave` / `onRestart` | Session controls (right side) |

**Copy**

- In-play leave: `leaveLabel="short"` → **ออก**
- Game over / full header: `leaveLabel="full"` → **ออกจากห้อง**
- Restart (host only): **รีห้อง** — only when `onRestart` is passed from RoomPage

Do not build a custom header row with one-off leave buttons.

## Game over actions

Use `<GameOverActions onLeave onRestart? />` at the end screen.

- Host: **รีห้อง** + **ออกจากห้อง**
- Non-host: **รอหัวห้องกด «รีห้อง»** + **ออกจากห้อง**
- `layout="stacked"` (default) or `inline` for compact footers

Leave/restart confirm modals stay in `RoomPage` — games only call callbacks.

## Content panels

- Use global `.card` for major sections (board, hand, scores).
- Use `Button`, `Badge`, etc. from `components/ui`.
- Game-specific CSS lives in `games/<slug>/*.css` — style **components inside** the shell, not the page backdrop.

## Minimal example

```tsx
import { GameShell, GamePlayHeader, GameOverActions } from '../../components/game-shell';

export function MyGame({ gameState, onLeave, onRestart }: Props) {
  if (gameState.phase === 'game_over') {
    return (
      <GameShell className="my-page">
        <GamePlayHeader title="My Game" onLeave={onLeave} onRestart={onRestart} leaveLabel="full" />
        {/* scores */}
        <GameOverActions onLeave={onLeave} onRestart={onRestart} />
      </GameShell>
    );
  }

  return (
    <GameShell className="my-page">
      <GamePlayHeader
        title="My Game"
        subtitle={<span>รอบ {gameState.round}</span>}
        onLeave={onLeave}
        onRestart={onRestart}
      />
      <section className="card">{/* board */}</section>
    </GameShell>
  );
}
```

## Reference games

| Pattern | File |
|---------|------|
| Shared shell (new) | `cup-the-crab/CupTheCrabGame.tsx` |
| Header + custom turn UI | `codenames/CodenamesGame.tsx` (migrate to `GamePlayHeader` when touched) |
| Session + game over | `codenames/CodenamesGame.tsx` → `CodenamesGameOverActions` (prefer `GameOverActions`) |

## Migrating older games

When editing an existing game, prefer switching to `GameShell` in the same PR. Not required repo-wide immediately, but **all new games** must use the shell from day one.
