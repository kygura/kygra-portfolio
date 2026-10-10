# NCA Ventures · design brief

Source of truth for the look: `design/mock/ruins-mock.html` (approved). This file records what was carried into the site and what was left out, so later changes can be checked against it.

## World and tokens

One dark world, no light theme. A survey sheet: slate ground with a green-blue bias, bone-coloured ink, hairline rules, square corners everywhere, a faint 48px grid behind content.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` / `--bg-2` / `--sheet` / `--code` | `#111617` / `#161d1f` / `#1a2224` / `#0c1112` | ground, bars, selected rows, code and status line |
| `--ink` / `--ink-2` / `--ink-3` | `#e0d9c8` / `#aab1a7` / `#75817b` | text, secondary text, labels |
| `--rule` / `--rule-2` | `#2b3739` / `#3d4b4d` | hairlines |
| `--accent` / `--accent-deep` / `--on-accent` | per variant | links, keys, selection, fills |

The only fills are the accent and the sheet. Corners are square and shadows flat everywhere: `--radius: 0`, and `tailwind.config.ts` overrides every `rounded-*`/`shadow-*` step to 0/none. Tokens live in `src/index.css`. The names the existing components already read (`--bg-primary`, `--text-primary`, `--accent-amber`, `--border-muted`, …) are aliases onto the palette, and the shadcn HSL tokens are remapped too (the kit's accent is `--ui-accent`, fed by `--accent-h`, so `bg-accent/50` style modifiers follow the accent switch). `next-themes` is forced to dark; there is no light theme. Accent state: `src/theme/accent.ts`.

### Accent variants

Keys `1`–`4`, or the four-swatch picker in the nav (the slot the old day/night toggle used). Stored in `localStorage["nca-accent"]` (guarded with try/catch; an inline script in `index.html` applies it before first paint). One switch rewrites the CSS tokens and the hero's shader uniforms (accent, deep accent, fog, zenith).

1. Lichen `#bcc77c` (default)
2. Torch Amber `#eaa24c`
3. Astral Cyan `#86d3dc`
4. Ritual Madder `#e5787f`

## Type

- **Literata** (opsz 7–72, 400/600, italic 400): body and every heading that used Instrument Serif or Newsreader (Tailwind `font-display`/`font-serif`/`font-body`/`font-sans` all map to it). Post body 19px / 1.68 with a 66ch cap; 17px under 560px.
- **Fragment Mono**: code, data, nav links, buttons, terminal, labels (`font-mono`).
- **Silkscreen** (`font-pixel`): page eyebrows `( 0x — … )`, the hero strip and runway marker, help-sheet headings, and the "NCA" of the wordmark. Nowhere else.

Wordmark (nav, where master printed "N.CA"): "NCA" in Silkscreen + "Ventures" in Literata italic in the accent. Under 640px the bar keeps only "NCA" so the five links still fit unscrolled, as master's did.

## Layout

Layout: unchanged from master. Same routes, component tree, section order, nav/footer/hero placement, grids, gutters, content and interactions (custom cursor, Lenis smooth scroll, page transitions, scroll progress, terminal on `` ` ``/Ctrl+K, footer quote carousel on A/D). Only colour, type, shape and the hero's background changed. Before/after captures at 1360px: `design/qa/before-*.png`, `design/qa/after-*.png` (element x/width identical; heights move only where Literata sets wider than the old faces and lines rewrap).

Per-project accent hues on `/projects` were dropped for the site accent (they sat outside the palette).

## Hero

Master's `CartographicHero` keeps its sticky stage, scroll runway, name, tagline, "C.A" accent initials, hairline strip and scroll parallax. Only the field behind them changed: the canvas-2D contour field is replaced by the PS1 three-scene renderer in `src/hero/` (`sheets.ts` metadata, `engine/` three.js r160: `psx.ts` shared materials and helpers, `ruins.ts`, `topo.ts`, `astral.ts`, `hero-engine.ts` loop + post). The engine is a dynamic import, so only `/` downloads three.

- **01 Ruins**: plaza, column ring, collapsed arch, fallen head, trees, motes, moon.
- **02 Topo**: animated relief, marching-squares contours, draped grid, trig points, sweep.
- **03 Astral**: halo with glyphs, cored polyhedra, the watcher, moon with satellite.

Scene tabs (`01 Ruins / 02 Topo / 03 Astral` + `[` `]` hint) sit at the left end of the existing bottom strip, opposite the scroll cue. Pinned scene labels float in the stage beneath the type; the mock's readouts, map key and compass are not shown (master's hero has no slot for them).

PS1 pipeline: render to ~¼ width target, vertex snap, affine UVs, Gouraud light, fog, 15-bit quantize with 4×4 Bayer dither, vignette, nearest upscale. Switching scenes dissolves through the dither matrix (hard cut under reduced motion). Last scene stored in `localStorage["nca-sheet"]`. The mock's scrims (top and lower half) keep the type legible over every scene.

Colour: three's colour management is off and output is linear, matching the r128 mock. The render loop runs only while needed (stops offscreen and in hidden tabs). Reduced motion starts paused on a still frame. Everything is disposed on unmount. Without WebGL the stage shows a CSS contour sheet.

## Keyboard

Additive to master's keys (terminal `` ` ``/Ctrl+K, quotes A/D). Ignored while typing in a field or with a modifier held. Code: `src/theme/Keys.tsx`, tables in `src/theme/keymap.ts`. Nav links carry their chord in `title`/`aria-keyshortcuts`; no visible hints were added to the bar (no room without changing it), and there is no status line.

| Keys | Action |
| --- | --- |
| `g h` / `g w` / `g s` / `g b` / `g c` | Home / Writings / Software / Guestbook / CV |
| `g g` | Top of page |
| `1`–`4` | Accent |
| `[` `]` | Previous / next hero scene (home) |
| `?` | Help sheet (focus held on its close button) |
| `Esc` | Close help, leave a field |

## Also fixed

Post markdown: fenced code is detected from its `<pre>` (react-markdown no longer passes `inline`, so every inline code span rendered as a block); a markdown `h1` renders as `h2` under the page title; the hast `node` prop is no longer forwarded to the DOM. Code blocks use a token-driven Prism theme (comments ink-3, keywords accent, literals ink-2). Footer quote keys ignore typing and claimed chord keys.
