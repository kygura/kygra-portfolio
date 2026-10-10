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

The only fills are the accent and the sheet. Corners are square (`--radius: 0`). Tokens live in `src/index.css`; the shadcn HSL tokens are remapped onto the same palette (`--ui-accent` etc.) so kit components stay in the world.

### Accent variants

Keys `1`–`4`, buttons in the home strip and footer, or click the accent in the status line. Stored in `localStorage["nca-accent"]` (guarded with try/catch; an inline script in `index.html` applies it before first paint). One switch rewrites the CSS tokens and the hero's shader uniforms (accent, deep accent, fog, zenith).

1. Lichen `#bcc77c` (default)
2. Torch Amber `#eaa24c`
3. Astral Cyan `#86d3dc`
4. Ritual Madder `#e5787f`

## Type

- **Literata** (opsz 7–72, 400/600, italic 400): body and headings. Reading column 19px / 1.68 on a ~66ch (42rem) measure; 17px under 560px.
- **Fragment Mono**: keys, code, data, nav, table cells, status line.
- **Silkscreen**: wordmark initials, eyebrows, sheet numbers, 88×31 buttons, status mode. Nowhere else.

Scale: 11 / 13 / 16 / 19 (read) / 24 / 36px, hero `clamp(2.1rem, 5.2vw, 3.9rem)`.

Wordmark: "NCA" in Silkscreen + "Ventures" in Literata italic in the accent.

## Layout per route

All routes: top bar (wordmark, nav with printed g-chords), survey-grid `main.sheet` (max 1240px, `clamp(16px, 4vw, 48px)` gutters), indie footer, status line pinned to the bottom.

- `/` Home: full-bleed hero (top bar and index filter overlaid), control strip (accent, motion, keys), ruler A–H, project index as survey table, latest five field notes, the craft statement in rail + reading column.
- `/projects`: same survey table with a filter. Rows expand in place (description, dossier, live, GitHub).
- `/projects/:slug`: rail (ref, kind, est., state, stack) + reading column (description lede, links, overview).
- `/writings`: field-note log (number, date, title, read time, excerpt), text filter and tag buttons.
- `/writings/:slug`: rail (note number, filed, reading time, tags, TOC built from rendered headings, back link) + reading column. Code blocks use a token-driven Prism theme; `> [!NOTE]` callouts render as ruled asides; GFM footnotes styled; older/newer links at the end.
- `/guestbook`: rail + form panel (name ≤ 64, message ≤ 280, Ctrl+Enter, 30s cooldown, Supabase insert + realtime unchanged) + signature log. Toasts replaced by an inline status message mirrored to the status line.
- `/cv`, `/artifacts`, 404: section heads, ruled CV sections with a Silkscreen label column.

Mobile (≤ 560px): 16px gutters, nav keys hidden, sheet tabs left-aligned, map key hidden, index drops kind/year/stack columns and state text (dot remains), status line drops where/accent. No horizontal page scroll at 400px.

## Hero

Code: `src/hero/` (`Hero.tsx` DOM frame, `sheets.ts` metadata, `engine/` three.js r160: `psx.ts` shared materials and helpers, `ruins.ts`, `topo.ts`, `astral.ts`, `hero-engine.ts` loop + post). The engine is a dynamic import, so only `/` downloads three.

- **01 Ruins**: plaza, column ring, collapsed arch, fallen head, trees, motes, moon. Readout lat/lon/elev/bearing/grid.
- **02 Topo**: animated relief, marching-squares contours (0.5 m, index every 2.5 m), draped 5 m grid, trig points, sweep. Readout scale/CI/relief/bearing/grid.
- **03 Astral**: halo with glyphs, cored polyhedra, the watcher, moon with satellite. Readout RA/Dec/epoch/bearing/field.

PS1 pipeline: render to ~¼ width target, vertex snap, affine UVs, Gouraud light, fog, 15-bit quantize with 4×4 Bayer dither, vignette, nearest upscale. Switching sheets dissolves through the dither matrix (hard cut under reduced motion). Last sheet stored in `localStorage["nca-sheet"]`. Map frame per sheet: eyebrow, readouts, scale bar labels, key glyphs, compass turning with the camera, pinned labels projected from the scene.

Colour: three's colour management is off and output is linear, matching the r128 mock. The loop runs only while needed (stops offscreen, in hidden tabs, and when paused and clean). Reduced motion starts paused on a still frame. Everything is disposed on unmount. Without WebGL the frame stays up over a CSS contour fallback.

## Keyboard

Ignored while typing in a field, except `Esc`, which leaves it.

| Keys | Action |
| --- | --- |
| `g h` / `g w` / `g b` / `g l` / `g c` / `g a` | Home / Work / Writing / Guestbook (log) / CV / Artifacts |
| `g g` | Top of page |
| `/` | Focus the page's filter (`[data-filter]`) |
| `j` `k` | Next / previous row (project index on home and /projects, notes on /writings) |
| `Enter` | Native activation of the focused row (expand, or open note) |
| `1`–`4` | Accent |
| `[` `]` | Previous / next hero sheet (home) |
| `p` | Pause / play the scene (home) |
| `x` | PS1 pipeline on/off (home; key only, no button) |
| `?` | Help overlay (focus held on its close button) |
| `Esc` | Close help, leave a field, cancel a chord |

Status line: mode (NORMAL / SEARCH / INSERT / HELP, follows focus), where (path or hero sheet), message, pending chord, accent.

## Removed

Cartographic hero, custom cursor, magnetic buttons, Lenis smooth scroll, scroll progress bar, page transitions, typewriter manifesto, quote-carousel footer, theme toggle (next-themes provider), terminal overlay and soundtrack player, old SVG graphics, toasts. Dependencies dropped: framer-motion, lenis, canvas-confetti. Added: three 0.160.1.

Not carried from the mock: proposal tags A–G and the notes section, the "Proposal" nav item, the visible PS1 toggle button, the invented project activity profiles (the table shows real stack and status instead), RSS (no feed exists; the footer links `/writings.json`). The webring is a placeholder.
