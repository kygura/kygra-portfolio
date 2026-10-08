# Redesign brief — "Deskmat"

Status: proposal / sketch. Not yet checked against the current site on purpose.

## Thesis

The site is a keyboard. Every page is laid out like a split ergonomic board seen
from above on a dark desk mat; navigation is chords, not menus; the one piece of
spectacle is an abstract 3D object (wireframe keycap cluster → torus knot) that
reacts to keypresses. Everything else is deliberately plain, visible-plumbing
indie web: monospace, underlined blue links that turn purple when visited,
a colophon, a webring row, a "last built" stamp, 88×31 badges.

Two moods, one surface:

- **Indie web / underground**: raw, hand-built feel. Visible grid lines, status
  bar, no cards, no rounded-xl, no gradient hero, no emoji markers.
- **Abstract 3D**: one canvas, strict wireframe + flat-shaded facets, two inks.
  Not glossy, not Spline-looking. Thin lines, visible vertices, slight
  orthographic tilt like a keyboard CAD render.

## Palette (single committed theme, dark desk mat)

| token      | value     | use                                   |
|------------|-----------|---------------------------------------|
| --mat      | #2a2c31   | page ground (warm charcoal, PBT grey) |
| --mat-2    | #333640   | status bar / key wells                |
| --legend   | #ece7da   | body text (keycap legend off-white)   |
| --legend-2 | #a8a498   | secondary text                        |
| --line     | #4a4d57   | rules, wireframe base                 |
| --link     | #7eb2ff   | links (classic web blue, lifted)      |
| --visited  | #c99cff   | visited links (classic purple)        |
| --hot      | #ff6e7f   | one accent: focused key, active chord |

No gradients. No shadows except the 1px keycap "lip" (inset highlight).

### Accent candidates (switch with `1`–`6` in the mock)

Derived from the current site's palette where possible, lifted for a dark ground.

| #  | name  | value   | origin                                   | read                                 |
|----|-------|---------|------------------------------------------|--------------------------------------|
| 1  | coral | #ff6e7f | proposal default                         | warm, obviously "new", not terracotta |
| 2  | amber | #e3b85e | current `--accent-amber` (#c3a561 dark)  | continuity with today's brand        |
| 3  | sage  | #7fd1c3 | current `--accent-sage` (#6d968f dark)   | cool, CAD / oscilloscope feel        |
| 4  | terra | #ff8a5b | current `--accent-terracotta` (#cc7f5a)  | closest to today, riskiest for "AI look" |
| 5  | lilac | #c99cff | visited-link purple                      | one less colour; retro web           |
| 6  | mono  | #7eb2ff | link blue                                | strictest; accent = link             |

Recommendation: coral or sage. Amber keeps brand memory but reads "warm cream site in dark mode". Terra is the one to avoid for the stated reason.

## Type

- UI / body: **Martian Mono** (400/500). Everything at 13–15px, 1.6 line height.
- Eyebrows, badges, key legends: **Silkscreen** (bitmap, 8–10px, uppercase).
- Headlines: Martian Mono 600 at 28–44px, tight tracking, `text-wrap: balance`.
  No serif anywhere.

## Layout

Fixed 12-col grid with visible 1px column rules on wide screens (≥1100px),
collapsing to a single column on phones. Left 2 cols = "thumb cluster":
sticky vertical nav of keycaps. Right 10 cols = content. Bottom = persistent
tmux-style status line: `NORMAL · ~/work · 3/14 · ? help`.

### Home

1. Status line (bottom, always).
2. Thumb cluster nav (left): keycaps `g h` home · `g w` work · `g p` posts ·
   `g a` about · `/` search · `?` help. Each cap shows its legend + chord.
3. Hero: left 5 cols text — name, one-line what-I-do, two inline links.
   Right 5 cols: 3D canvas, one construct of 42 wireframe particles that
   eases between three forms (`s` cycles, buttons too):
   - **keycloud** — exploded split keyboard; a keypress fires its cap.
   - **galaxy** — core + 4 tilted orbit rings of small polygons; a keypress
     pulses one ring (picked from the key code).
   - **bird** — the classic polygon flyer: spine, head, 5-feather tail, two
     wings of 2×7 points hinged at the spine. Flaps continuously, banks with
     its flight path; a keypress bursts the flap rate.
   Same particles morph between forms, so switching is a transformation, not
   a cut. Mock uses canvas 2D orthographic projection; production can keep
   that or move to three.js for depth sorting and lighting.
4. "Now" strip: three plain rows (building / reading / listening) — real
   indie-web convention.
5. Work: list, not cards. Each row: `[k]` index key, title, one line, stack
   tags as tiny keycaps. `j/k` moves a focus ring, `Enter` opens.
6. Writing: same row pattern, date in the left gutter.
7. Footer: webring `← prev · random · next →`, 88×31 badges, colophon line
   ("built with vite · hosted on vercel · last build 2026-10-08 14:02"),
   guestbook link.

### Interaction model

- Chords, vim style. `g` then letter = go. `j/k` = move focus in lists.
  `/` = cmdk palette. `?` = overlay listing every binding.
- Every key hint is rendered as a real keycap (`<kbd>`), never a tooltip.
- Focus ring is `--hot`, 2px, offset 2px. Mouse works everywhere too.
- Reduced motion: canvas freezes to a still frame, no morph.

### Components (names for implementation)

`Keycap` · `ThumbCluster` · `StatusLine` · `KeyboardScene` · `ChordHint` ·
`RowList` / `Row` · `WebringBar` · `BadgeStrip` · `HelpOverlay`

## What we are explicitly avoiding

Cream + serif + terracotta. Pure black + acid green. Glassmorphism. Bento
grids. Gradient text. Centered everything. Rounded cards with accent rails.
Inter / Space Grotesk. Spline-style glossy blobs.

## Mapping to existing routes (checked after the sketch)

| chord   | route                     | notes                                   |
|---------|---------------------------|-----------------------------------------|
| `g h`   | `/`                       | hero + now + top rows                   |
| `g w`   | `/projects`, `/projects/:slug` | "work" rows; detail page keeps row header |
| `g p`   | `/writings`, `/writings/:slug` | "posts" rows, date in gutter          |
| `g a`   | `/artifacts`              | gallery of small experiments            |
| `g c`   | `/cv`                     | plain, printable                        |
| `g g`   | `/guestbook`              | already exists, fits the indie-web footer |
| `/`     | cmdk palette (already a dependency) | search across all of the above |

Stack notes: Vite + React + Tailwind + shadcn stay. Framer Motion already present
for the help overlay. Scene can ship as plain canvas (as in the mock) or three.js
if we want real lighting later; the mock proves the look without it.
