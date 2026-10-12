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

Keys `1`–`5`, or `t` to cycle, or the row of five squares at the right of the nav bar. Stored in `localStorage["nca-accent"]` (guarded with try/catch; an inline script in `index.html` applies it before first paint). One switch rewrites the CSS tokens and the hero's shader uniforms (accent, deep accent, fog, zenith).

1. Lichen `#bcc77c` (default)
2. Torch Amber `#eaa24c`
3. Astral Cyan `#86d3dc`
4. Ritual Madder `#e5787f`
5. Graphite `#d4d4d4`: the monochrome option. Also swaps the ground, ink, rules, danger and shadcn kit tokens for pure grays (`:root[data-accent="mono"]` in `src/index.css`), so the sheet carries no hue. Errors read as the brightest ink rather than red.

## Type

- **Literata** (opsz 7–72, 400/600, italic 400): body and every heading that used Instrument Serif or Newsreader (Tailwind `font-display`/`font-serif`/`font-body`/`font-sans` all map to it). Post body 19px / 1.68 with a 66ch cap; 17px under 560px.
- **Fragment Mono**: code, data, nav links, buttons, terminal, labels (`font-mono`).
- **Silkscreen** (`font-pixel`): page eyebrows `( 0x — … )`, the hero strip and runway marker, help-sheet headings, and the "NCA" of the wordmark. Nowhere else.

Wordmark (nav, where master printed "N.CA"): "NCA" in Silkscreen + "Ventures" in Literata italic in the accent. Under 640px the bar keeps only "NCA" so the five links still fit unscrolled, as master's did.

## Layout

Layout: unchanged from master. Same routes, component tree, section order, nav/footer/hero placement, grids, gutters, content and interactions (custom cursor, Lenis smooth scroll, page transitions, scroll progress, terminal on `` ` ``/Ctrl+K, footer quote carousel on A/D). Only colour, type, shape and the hero's background changed. Before/after captures at 1360px: `design/qa/before-*.png`, `design/qa/after-*.png` (element x/width identical; heights move only where Literata sets wider than the old faces and lines rewrap).

Per-project accent hues on `/projects` were dropped for the site accent (they sat outside the palette).

## Hero

Master's `CartographicHero` keeps its sticky stage, scroll runway, name, tagline, "C.A" accent initials, hairline strip and scroll parallax. Only the field behind them changed: the canvas-2D contour field is replaced by the PS1 five-scene renderer in `src/hero/` (`sheets.ts` metadata, `engine/` three.js r160: `psx.ts` shared materials and helpers, `ocean.ts`, `astral.ts`, `ruins.ts`, `rail.ts`, `field.ts`, `hero-engine.ts` loop + post). The engine is a dynamic import, so only `/` downloads three.

- **01 Ocean** (replaced the mock's Ruins sheet): endless swell, overgrown half-drowned towers with lit bands, palm islands, a wing-sail ship moored at a pier, twin suns with glitter on the water, gulls.
- **02 Astral**: halo with glyphs, cored polyhedra, the watcher, moon with satellite.
- **03 Ruins**: misty forest ruins: an outer ring of mixed pieces (capped and broken fluted columns, a leaning column, monoliths, an obelisk, a fallen column) and a small inner ring of free-standing low columns around the shrine (no lintels or beams across the centre); the camera drifts between the two rings so nothing crosses the centrepiece. Floating ward crystal with a rune ring, collapsed arch, an old tree gripping a fallen column, glowing mushrooms, drifting mist layers, light shafts, wisps.
- **04 Rail**: a lone halt standing in a boundless, near-still sea: a causeway runs from behind the camera to the horizon under a catenary, and a four-car train brakes in over the water, stands at the platform, then pulls out past the camera (47 s loop). A city skyline far out on the horizon (300 to 370 m off, hazed by fog): about seventy glass and concrete towers standing in the sea, with the line running into it, tallest where the line runs in, some stepped back or spired, lit crown bands and mast beacons; two suns high overhead with glitter on the water.
- **05 Field**: the interactive sheet, a living relief on one shared height field (ambient drift + wave simulation + cursor swell). Click or tap sends a pulse out from that point (the wave equation carries it through the contours, with a dashed accent ring marking the front). Dragging pulls the contours and draped grid along and they relax back; moving the cursor lifts a soft swell with a reticle and leaves a wake. Scenes opt into input through `SceneDef.pointer`; such a scene owns plain drags and orbit moves to Shift+drag or the keyboard.

Scene tabs (`01 Ocean / 02 Astral / 03 Ruins / 04 Rail / 05 Field` + `[` `]` hint) sit at the left end of the existing bottom strip, opposite the scroll cue. Pinned scene labels float in the stage beneath the type; the mock's readouts, map key and compass are not shown (master's hero has no slot for them).

Easter eggs: every scene hides one to four tap targets (`SceneDef.eggs` in `psx.ts`: a world position, a screen-pixel radius and a `fire` that starts a one-shot reaction and returns a caption). A tap (under 8px of travel) on or near one fires the nearest; drags, orbit and the Field's pulse are untouched, and a hit on the Field's benchmark suppresses that tap's pulse. The caption shows as a hairline readout above the strip (`FOUND 03/15` the first time, `AGAIN` after). Found ids persist in `localStorage["nca-eggs"]`. Nothing marks the targets.

Home is the hero alone (the type sits in plain hairline-framed translucent panels, no title bars): the Manifesto section and the "02 — On software craft" marker are gone. NICOLAS and C.A type in on load (95 ms and 150 ms per character, a caret rides the active one and hides 1 s after the last; instant under reduced motion). Pointer: a 20px square ring and 6px dot; over links and buttons the ring grows to 38px and takes the accent; a press squeezes it and a click leaves an expanding accent square.

PS1 pipeline: render to ~¼ width target, vertex snap, affine UVs, Gouraud light, fog, 15-bit quantize with 4×4 Bayer dither, vignette, nearest upscale. Switching scenes dissolves through the dither matrix (hard cut under reduced motion). Last scene stored in `localStorage["nca-sheet"]`. The mock's scrims (top and lower half) keep the type legible over every scene.

Colour: three's colour management is off and output is linear, matching the r128 mock. The render loop runs only while needed (stops offscreen and in hidden tabs). Reduced motion starts paused on a still frame. Everything is disposed on unmount. Without WebGL the stage shows a CSS contour sheet.

## Keyboard

Additive to master's keys (terminal `` ` ``/Ctrl+K, quotes A/D). Ignored while typing in a field or with a modifier held. Code: `src/theme/Keys.tsx`, tables in `src/theme/keymap.ts`. Nav links carry their chord in `title`/`aria-keyshortcuts`; no visible hints were added to the bar (no room without changing it), and there is no status line.

| Keys | Action |
| --- | --- |
| `g h` / `g w` / `g s` / `g b` / `g c` | Home / Writings / Software / Guestbook / CV |
| `g g` | Top of page (a hint strip lists the second keys while `g` is pending) |
| `1`–`5` / `t` | Accent / cycle accent |
| `n` / `p` | Next / previous page (nav order, wraps) |
| `j` / `k` / `G` | Scroll down / up / bottom |
| `←` `→` `Home` `End` | Move along the nav links when one is focused |
| `[` `]` | Previous / next hero scene (home) |
| `?` | Help sheet (focus held on its close button) |
| `Esc` | Close help, leave a field |

## Also fixed

Post markdown: fenced code is detected from its `<pre>` (react-markdown no longer passes `inline`, so every inline code span rendered as a block); a markdown `h1` renders as `h2` under the page title; the hast `node` prop is no longer forwarded to the DOM. Code blocks use a token-driven Prism theme (comments ink-3, keywords accent, literals ink-2). Footer quote keys ignore typing and claimed chord keys.
