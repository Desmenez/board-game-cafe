# Board Game Cafe — Midnight Design System

Hallmark app system for the public landing page, game catalog, administration surface, and shared room shell.

## Direction

- **Genre:** Atmospheric
- **Theme:** Midnight
- **Anchor:** Amber table light on cool navy surfaces
- **Audience:** Friends opening and joining lightweight multiplayer board-game sessions
- **Tone:** Warm, social, legible, and slightly theatrical without looking like a casino or a generic gaming dashboard

The interface should feel like a well-lit board-game table in a dark room. Function carries the visual interest: game covers, room codes, player seats, and live status are the enrichment. Avoid glass panels, purple gradients, decorative glow on text, and unrelated illustration.

## Structure

The app uses a **Workbench** family:

- `/` is the invitation and game-selection workbench.
- `/games` is the grid-led catalogue variant.
- `/admin` is the tabular spec-sheet variant.
- `/room/:code` is the split lobby variant: players and invitation tools on the main rail, game options and actions on the side rail.
- Active games use the shared Midnight gameplay shell and interaction modules. A game may own artwork, board geometry, secrecy rules, and rule-specific motion, but not duplicate page chrome, phase hierarchy, player selection, waiting, history, or game-over patterns.

All production pages use a maximum shell of `76rem`, fluid inline gutters, and a mobile-first single-column base. Desktop structure begins at `60rem`; compact two-column changes may begin at `40rem`.

## Implementation ownership

- Edit page layout, spacing, responsive breakpoints, typography, and local states directly in each page's Tailwind `className`.
- `packages/client/tailwind.config.cjs` maps readable utilities such as `bg-paper-2`, `text-ink-2`, `border-rule`, `font-display`, `rounded-card`, and `max-w-shell` to the shared tokens.
- Keep `tokens.css` as the palette/type/spacing source of truth.
- Keep `home-night.css` for the landing-page tabletop illustration, shared component skins, portal dialogs, status/toast chrome, and keyframes. Do not move complex pseudo-elements or portal-owned selectors into long arbitrary utility strings.
- Shared gameplay modules live under `components/game-shell`, `components/player-choice`, `components/player-roster`, and `components/secret-identity`. Games pass rule-owned copy and state into these components rather than cloning their layout.
- Game CSS is reserved for board geometry, artwork crops, card flips, and other mechanics that cannot be expressed clearly as a reusable component or short Tailwind class list.

## Theme

`tokens.css` is the source of truth. Use role tokens in page CSS; do not add raw color values to route styles.

- `paper` is the deepest page background.
- `paper-2` is the primary working surface.
- `paper-3` is a raised or interactive surface.
- `paper-4` is hover/selected emphasis.
- `ink` is primary warm text; `ink-2` is secondary text.
- `rule` and `rule-2` are structural borders.
- `pear` is the sole primary accent and CTA fill.
- `error` and `success` are semantic only.

## Typography

- **Display:** Bricolage Grotesque 700–800, with Noto Sans Thai fallback.
- **Body:** Geist 350–700, with Noto Sans Thai fallback.
- **Codes and labels:** JetBrains Mono 500–700, with Noto Sans Thai fallback.
- Page titles use tight tracking and sentence case. Labels stay short and are not forced to uppercase in Thai.
- Room codes and operational counts use tabular numerals.

## Components

### Navigation and page heading

Back links are quiet text links with an arrow. Each app page starts with a compact mono eyebrow, a direct title, and one sentence of supporting copy. Utility actions align to the title at wider widths.

### Buttons

- Primary: amber fill, midnight text, pill radius.
- Secondary: `paper-3`, subtle rule, warm text.
- Danger: dark surface, error border and text.
- Minimum target height is `2.75rem`, or `3rem` on coarse pointers.
- Hover moves up by `1px`; active moves down by `1px`. Disabled controls never move.

### Fields

Inputs use `paper-3`, a structural border, and `radius-input`. Focus uses a visible `2px` amber outline with offset. Placeholder and hint text use `ink-2`.

### Cards and panels

Cards are opaque, not blurred. Use one large surface per functional group rather than wrapping every sentence. Game cards are image-led with a numbered catalogue label. Room/player panels use borders and spacing rather than shadow stacking.

### Dialogs

Dialogs use an opaque `paper-2` surface over a dark overlay. Destructive actions retain explicit confirmation. Shared room dialogs follow Midnight; game-owned dialogs remain game-owned.

### Gameplay

- `GameShell` and `GamePlayHeader` own the responsive in-game frame.
- `GamePhasePanel` owns phase title, explanation, metadata, actions, and semantic success/danger treatment.
- `GameProgressTrack` owns ordered round or quest progress.
- `PlayerChoiceGrid` owns controlled, keyboard-operable player selection; each game retains validation and eligibility rules.
- `PlayerRosterStrip` owns compact player status presentation.
- `GameWaitingState`, `GameDecisionActions`, and `GameHistoryDisclosure` own their corresponding repeated interaction states.
- `SecretIdentityReveal` owns private role presentation without interpreting or deriving secret information.
- `GameOverModal` owns the terminal overlay and session actions.

### Data table

The admin table is a true table at desktop sizes. Below `40rem`, each row becomes a labelled record card without horizontal scrolling.

## Motion

- Motion communicates press, hover, copy success, refresh progress, and connection state only.
- Animate `transform`, `opacity`, or color; avoid layout animation.
- Standard durations: `120ms`, `220ms`, `420ms`.
- Reduced-motion mode shortens transitions and removes transforms. Functional loading indicators may remain without translation.

## Accessibility

- Maintain at least WCAG AA text contrast.
- Preserve visible keyboard focus on every interactive element.
- Never rely on color alone for online/offline, host, error, or destructive state.
- Keep game cards keyboard-operable and expose room-code copy controls as real buttons.
- Preserve One Night Ultimate Werewolf secrecy: shared room UI must not expose whether roles are held by seated players or exist only in the center.

## Exports

### CSS source (`tokens.css`)

```css
:root {
  --color-paper: oklch(13% 0.018 255);
  --color-paper-2: oklch(18% 0.022 255);
  --color-paper-3: oklch(23% 0.027 250);
  --color-paper-4: oklch(28% 0.03 248);
  --color-ink: oklch(94% 0.014 78);
  --color-ink-2: oklch(76% 0.018 72);
  --color-muted: var(--color-ink-2);
  --color-neutral: var(--color-paper-4);
  --color-rule: oklch(34% 0.026 250);
  --color-rule-2: oklch(46% 0.03 248);
  --color-accent: oklch(79% 0.14 78);
  --color-accent-ink: oklch(15% 0.018 255);
  --color-focus: oklch(86% 0.15 82);
  --color-error: oklch(68% 0.18 28);
  --color-success: oklch(72% 0.12 145);

  --font-display: 'Bricolage Grotesque', 'Noto Sans Thai', sans-serif;
  --font-body: 'Geist', 'Noto Sans Thai', sans-serif;
  --font-outlier: 'JetBrains Mono', 'Noto Sans Thai', monospace;

  --space-3xs: 0.125rem;
  --space-2xs: 0.25rem;
  --space-xs: 0.5rem;
  --space-sm: 0.75rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2.5rem;
  --space-2xl: 4rem;
  --space-3xl: 6rem;
  --space-4xl: 8rem;
  --space-5xl: 12rem;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-md: 1.25rem;
  --text-lg: 1.5625rem;
  --text-xl: 1.953rem;
  --text-2xl: 2.441rem;
  --text-display: clamp(2.75rem, 7vw + 0.5rem, 5.25rem);

  --radius-input: 0.75rem;
  --radius-card: 1rem;
  --radius-pill: 999px;
  --rule-hairline: 1px;
  --rule-medium: 2px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-micro: 120ms;
  --dur-short: 220ms;
  --dur-long: 420ms;
}
```

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(13% 0.018 255);
  --color-paper-2: oklch(18% 0.022 255);
  --color-paper-3: oklch(23% 0.027 250);
  --color-paper-4: oklch(28% 0.03 248);
  --color-ink: oklch(94% 0.014 78);
  --color-ink-2: oklch(76% 0.018 72);
  --color-rule: oklch(34% 0.026 250);
  --color-rule-2: oklch(46% 0.03 248);
  --color-accent: oklch(79% 0.14 78);
  --color-focus: oklch(86% 0.15 82);
  --color-error: oklch(68% 0.18 28);
  --color-success: oklch(72% 0.12 145);

  --font-display: 'Bricolage Grotesque', 'Noto Sans Thai', sans-serif;
  --font-body: 'Geist', 'Noto Sans Thai', sans-serif;
  --font-outlier: 'JetBrains Mono', 'Noto Sans Thai', monospace;

  --spacing-3xs: 0.125rem;
  --spacing-2xs: 0.25rem;
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2.5rem;
  --spacing-2xl: 4rem;
  --spacing-3xl: 6rem;
  --spacing-4xl: 8rem;
  --spacing-5xl: 12rem;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-md: 1.25rem;
  --text-lg: 1.5625rem;
  --text-xl: 1.953rem;
  --text-2xl: 2.441rem;

  --radius-input: 0.75rem;
  --radius-card: 1rem;
  --radius-pill: 999px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(13% 0.018 255)", "$type": "color" },
    "paper-2": { "$value": "oklch(18% 0.022 255)", "$type": "color" },
    "paper-3": { "$value": "oklch(23% 0.027 250)", "$type": "color" },
    "paper-4": { "$value": "oklch(28% 0.03 248)", "$type": "color" },
    "ink": { "$value": "oklch(94% 0.014 78)", "$type": "color" },
    "ink-2": { "$value": "oklch(76% 0.018 72)", "$type": "color" },
    "rule": { "$value": "oklch(34% 0.026 250)", "$type": "color" },
    "rule-2": { "$value": "oklch(46% 0.03 248)", "$type": "color" },
    "accent": { "$value": "oklch(79% 0.14 78)", "$type": "color" },
    "accent-ink": { "$value": "oklch(15% 0.018 255)", "$type": "color" },
    "focus": { "$value": "oklch(86% 0.15 82)", "$type": "color" },
    "error": { "$value": "oklch(68% 0.18 28)", "$type": "color" },
    "success": { "$value": "oklch(72% 0.12 145)", "$type": "color" }
  },
  "font": {
    "display": {
      "$value": ["Bricolage Grotesque", "Noto Sans Thai", "sans-serif"],
      "$type": "fontFamily"
    },
    "body": { "$value": ["Geist", "Noto Sans Thai", "sans-serif"], "$type": "fontFamily" },
    "outlier": {
      "$value": ["JetBrains Mono", "Noto Sans Thai", "monospace"],
      "$type": "fontFamily"
    }
  },
  "space": {
    "3xs": { "$value": "0.125rem", "$type": "dimension" },
    "2xs": { "$value": "0.25rem", "$type": "dimension" },
    "xs": { "$value": "0.5rem", "$type": "dimension" },
    "sm": { "$value": "0.75rem", "$type": "dimension" },
    "md": { "$value": "1rem", "$type": "dimension" },
    "lg": { "$value": "1.5rem", "$type": "dimension" },
    "xl": { "$value": "2.5rem", "$type": "dimension" },
    "2xl": { "$value": "4rem", "$type": "dimension" },
    "3xl": { "$value": "6rem", "$type": "dimension" },
    "4xl": { "$value": "8rem", "$type": "dimension" },
    "5xl": { "$value": "12rem", "$type": "dimension" }
  },
  "duration": {
    "micro": { "$value": "120ms", "$type": "duration" },
    "short": { "$value": "220ms", "$type": "duration" },
    "long": { "$value": "420ms", "$type": "duration" }
  }
}
```

### shadcn/ui variables

```css
.dark {
  --background: 13% 0.018 255;
  --foreground: 94% 0.014 78;
  --card: 18% 0.022 255;
  --card-foreground: 94% 0.014 78;
  --popover: 18% 0.022 255;
  --popover-foreground: 94% 0.014 78;
  --primary: 79% 0.14 78;
  --primary-foreground: 15% 0.018 255;
  --secondary: 23% 0.027 250;
  --secondary-foreground: 94% 0.014 78;
  --muted: 23% 0.027 250;
  --muted-foreground: 76% 0.018 72;
  --accent: 79% 0.14 78;
  --accent-foreground: 15% 0.018 255;
  --destructive: 68% 0.18 28;
  --destructive-foreground: 94% 0.014 78;
  --border: 34% 0.026 250;
  --input: 34% 0.026 250;
  --ring: 86% 0.15 82;
  --radius: 1rem;
}
```
