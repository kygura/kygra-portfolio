# DESIGN.md: NULL ORRERY

Status: **MOCK / SKETCH phase.** This brief defines the direction and the scope of one throwaway mock page.
The full design pass happens after the owner approves the direction. The brief was written without looking
at the current site on purpose, so implementers must not carry over its components, tokens or layout either.

---

## 1. Direction

**Name: NULL ORRERY**

> A portfolio that behaves like a bootleg planetarium console found on a burned PS1 disc.
> Projects are bodies orbiting a dead monolith in a 320px sky. Text lives in opaque terminal panes
> that are driven by hjkl. The sky is never decoration: it is the cursor.

Handle shown as `kygra` (primary). `kygura` appears as the secondary reading in the handle block (`kygra / kygura`).

---

## 2. Anti-goals (hard bans)

- No gradients of any kind in UI chrome. The only gradients allowed are ones that come out of the 3D fog and get dithered.
- No glassmorphism, `backdrop-filter`, translucent panels or blur. Panes are 100% opaque.
- No `border-radius` above 0. Everything is a hard rectangle, including buttons, chips, inputs and focus rings.
- No box-shadows or glow (`text-shadow` glow, neon bloom). Emphasis comes from inverse video, not light.
- No Inter, Geist, SF Pro, Space Grotesk, Space Mono or JetBrains Mono. No purple-to-blue anything.
- No card grid, no bento, no "feature tiles", no centered hero, no "Hi, I'm X and I build Y" headline.
- No emoji, no icon fonts (Lucide, Heroicons and the like). Glyphs are ASCII or box-drawing only: `> [ ] / | + - * . :`.
- No eased slide/fade transitions (`ease-in-out`, springs). Motion is stepped: `steps(n)`, frame counts, dither dissolves.
- No smooth antialiased 3D. No MSAA, no FXAA, no PBR materials, no bloom, no SSAO.
- No synthwave sunset, no chrome text, no magenta-on-cyan grid horizon. Cyberpunk shows up in geometry and HUD, not in clichés.
- No scroll-jacking, parallax sections or "scroll to reveal". The page is a console, not a story.
- No shadcn feel: no muted gray-on-white popovers, no pill badges, no skeleton loaders.

---

## 3. Layout

### Principle
The full-viewport canvas (the **Sky**) sits behind everything. Opaque **Panes** sit on top in an asymmetric
tmux-like arrangement: a fixed-width stack of panes on the left and open sky on the right. The right side is
where the camera frames the selected body, and the only right-side pane is the **Inspector**, which docks next
to the body. Panes have 1px solid rules. The sky shows only through the gutters (8px) and the open region.

### Desktop (>= 1024px)

```
+------------------------------------------------------------------------------------------------+
| kygra  0:sky* 1:proj 2:notes 3:links 4:now  ||  pal:SODIUM  motion:on  res:320  30fps  23:41Z   |  StatusBar 24px
+------------------------------+  .        *            .                      .            *   |
| KYGRA                     ## |        .        .                 *                             |
| / kygura /                   |                         ______                    .              |
| <ROLE_LINE: e.g. dev, x, y>  |    *          .        |      |   .                              |
| <BIO: 2-3 lines, <=240ch>    |        ___________ ____|  MO  |____ __________   orbit ring      |
+------------------------------+      /    .           |  NO  |             [ ]\  (24 segments)   |
| INDEX                        |     |      [<PRJ_B>]  |  LI  |       +-[<PRJ_A>]-+  <- reticle   |
| > 01 projects           [gp] |      \_____________ __|  TH  |__ ____|_______  /                 |
|   02 notes              [gw] |              *        |______|      |    .                       |
|   03 links              [gc] |    .                                |                            |
|   04 now                [gn] |          .         *           +-- INSPECT -- [o] [esc] ------+  |
+------------------------------+                                | <PROJECT_A_NAME>              |  |
| 01 PROJECTS        6 [/] [?] |     *                          | <one-line description>        |  |
| > <PROJECT_A>      2025  ts  |                 .              | year <YYYY>  stack <A,B,C>    |  |
|   <PROJECT_B>      2025  rs  |                                | role <ROLE>  status <LIVE>    |  |
|   <PROJECT_C>      2024  go  |        .                *      | > src  > live  > writeup      |  |
|   <PROJECT_D>      2024  c   |                                +-------------------------------+  |
|   <PROJECT_E>      2023  lua |    *           .                                .                |
+------------------------------+                  .                  RA 04h21m  DEC +12  d=3.20au |  HUD corner readout
| NOW  <STATUS_LINE> .. <DATE> |                                                                 |
+------------------------------------------------------------------------------------------------+
| NORMAL | projects 1/6 | [j][k] move [h][l] section [o] open [:] cmd [?] keys [1-4] palette       |  Modeline 24px
+------------------------------------------------------------------------------------------------+
```

- Left stack width: `46ch` of body font (about 440px), flush left with a 16px outer margin. Not centered.
- The 01 section pane is the only one that swaps content (projects / notes / links / now). The HandleBlock, Index and Now panes stay put.
- Section pane height is fixed to the remaining viewport. It scrolls internally and `j`/`k` keeps the selection in view.
- The Inspector docks with its top-left corner offset (+24, +24) from the projected screen position of the
  selected body. It is clamped to the open region and moves in snapped 8px steps, never smoothly.
- HUD readouts (RA/DEC/distance) are fake celestial coordinates derived from the selected body's position.
- Very wide screens (> 1600px): the left stack keeps its width and the sky gets more room. Nothing stretches.

### Tablet (640-1023px)
Same as desktop, but the Inspector stops floating. It becomes a pane under the section pane in the left stack,
which widens to 52ch. The sky stays full-bleed behind it.

### Mobile (< 640px)

```
+--------------------------------------+
| kygra   pal:SOD  [:] [?]       23:41Z |  StatusBar 24px
+--------------------------------------+
|  .      *        .     ____    .     |
|     .      [<PRJ_A>]  | MO |      *   |  Sky band: 4:3 box, width 100%,
|  ___________ ______ __| NO |___  .   |  internal res 160x120,
| /     .              |____|      \   |  nearest-upscaled
+--------------------------------------+
| KYGRA / kygura                       |
| <ROLE_LINE>                          |
| <BIO>                                |
+--------------------------------------+
| 01 PROJECTS                        6 |
| > <PROJECT_A>              2025  ts  |  tap = select (camera retargets)
|   <PROJECT_B>              2025  rs  |  tap again = expand inline inspector
|   ...                                |
+--------------------------------------+
| 02 NOTES / 03 LINKS / 04 NOW         |  all sections stacked, normal page scroll
+--------------------------------------+
| [:] cmd  [pal]  [m] motion  [?] keys |  KeyBar: sticky bottom, 44px tap targets
+--------------------------------------+
```

- On mobile the sky is a fixed-aspect band at the top, not a background, so text never sits on top of the 3D.
- Sections are stacked and scroll natively. `h`/`l` still work for anyone with a hardware keyboard.
- Side gutters are 16px. No horizontal scroll at 360px.

### Content slots (all placeholders)
`<HANDLE>`, `<ROLE_LINE>`, `<BIO>`, `<PROJECT_n>{name, year, lang, one-liner, stack, role, status, links}`,
`<NOTE_n>{date, title, read-time}`, `<LINK_n>{label, url, handle}`, `<STATUS_LINE>`, `<NOW_ITEMS>`, `<EMAIL>`.
The mock uses 6 projects, 4 notes, 5 links and 3 now items.

---

## 4. Typography

The type is a deliberate mix of a dot-matrix display face and a slightly odd grotesk mono. It should look
like firmware, not like a startup. All faces are free and come from Google Fonts.

| Role | Font | Fallback | Notes |
|---|---|---|---|
| Display (handle, section numbers, Inspector title) | **DotGothic16** | monospace | Dot-matrix, JP arcade/handheld feel. Use only at integer multiples of 16px (16 / 32 / 48 / 64). |
| Body + UI | **Martian Mono** (variable; use `wdth` 87.5 and weight 400/600) | `ui-monospace, monospace` | Squarish and a little wide, and not overused. |
| Micro (key chips, HUD readouts, StatusBar) | **Silkscreen** | monospace | Pixel font. Use only at 8px or 16px so it stays crisp. Uppercase. |

Scale (px, fixed and not fluid; rough on purpose):

| Token | Size / line-height | Use |
|---|---|---|
| `--t-hero` | 64 / 1.0 (DotGothic16) | `KYGRA` in the HandleBlock. Mobile: 48. |
| `--t-h` | 32 / 1.1 (DotGothic16) | Section titles `01 PROJECTS`, Inspector name |
| `--t-body` | 14 / 1.5 (Martian Mono) | Bio, rows, descriptions |
| `--t-small` | 12 / 1.4 (Martian Mono) | Metadata columns (year, lang), Now |
| `--t-micro` | 8 or 16 (Silkscreen) | Chips, HUD, StatusBar (16 on desktop StatusBar, 8 inside chips) |

Rules: no italics. Bold (600) only for the selected row label. Section labels and chips are uppercase with
`letter-spacing: 0.08em`. Numbers use tabular figures where available. Set `-webkit-font-smoothing: none`
and `font-smooth: never` on Silkscreen and DotGothic16 elements; where the browser ignores it, that's fine.
Rows can be truncated with a hard cut and a trailing `~` (vim-style), not `...`.

---

## 5. Color

Each palette sets eight tokens: `--bg`, `--panel` (pane fill, one step off bg), `--rule` (1px lines),
`--fg`, `--dim`, `--acc`, `--acc2`, `--glitch`. The sky's post pass reads the same tokens (see §6), so
switching palettes recolors the 3D too. Every palette is dark. There is no light mode in the mock; a light
"paper" palette is a possible later addition.

Contrast ratios are approximate WCAG ratios against `--bg`. The figure in parentheses is against `--panel`.
Inverse video (bg text on an accent fill) is also listed because selected rows use it.

### 1 · SODIUM (default)
Sodium-vapor streetlight over a dead parking lot, with a mercury-vapor teal as the second light source. Warm and nocturnal.

| bg | panel | rule | fg | dim | acc | acc2 | glitch |
|---|---|---|---|---|---|---|---|
| `#0c0b10` | `#16141b` | `#2e2a33` | `#e6dcc8` | `#8f897c` | `#ffaa1f` | `#57c4a9` | `#ff2e4c` |

fg 14.4:1 (13.4) · dim 5.6:1 (5.2) · acc 10.3:1 (9.6) · acc2 9.2:1 · glitch 5.4:1 · bg on acc 10.3:1

### 2 · PHOSPHOR
A P1 green CRT terminal with a sulphur-yellow highlight. The most "underground BBS" option.

| bg | panel | rule | fg | dim | acc | acc2 | glitch |
|---|---|---|---|---|---|---|---|
| `#050806` | `#0c120d` | `#1f2b20` | `#c6f0c2` | `#6a8a66` | `#3dff6e` | `#d8ff3a` | `#ff5a1f` |

fg 15.9:1 (15.0) · dim 5.2:1 (4.9) · acc 15.1:1 (14.2) · acc2 17.5:1 · glitch 6.5:1 · bg on acc 15.1:1

### 3 · OXIDE
Rust and iron oxide on a cold steel second color, with a hazard-yellow glitch. Industrial and hostile.

| bg | panel | rule | fg | dim | acc | acc2 | glitch |
|---|---|---|---|---|---|---|---|
| `#0e0908` | `#181110` | `#332522` | `#ecd9cf` | `#94776e` | `#ff5a2e` | `#b8c4be` | `#f2ff00` |

fg 14.5:1 (13.7) · dim 4.8:1 (4.5, the floor; never use dim below 12px here) · acc 6.4:1 (6.0) · acc2 11.0:1 · glitch 18.0:1 · bg on acc 6.4:1

### 4 · COLDSTAR
Ice-cyan starlight with a hot-pink second color and a yellow glitch. This is the most openly cyberpunk option; it reads as "night city" without the purple.

| bg | panel | rule | fg | dim | acc | acc2 | glitch |
|---|---|---|---|---|---|---|---|
| `#06080d` | `#0e121a` | `#1f2735` | `#d6e7f0` | `#74889a` | `#5ef0ff` | `#ff5aa8` | `#fff04d` |

fg 15.8:1 (14.8) · dim 5.5:1 (5.1) · acc 14.7:1 (13.7) · acc2 6.9:1 · glitch 17.0:1 · bg on acc 14.7:1

### Usage rules
- `--acc` marks the focused or selected item, the cursor block, key chips while pressed, and link hover in inverse video.
- `--acc2` marks the secondary state: the sky's selected-orbit ring, Inspector link glyphs, and the palette name in the StatusBar.
- `--glitch` is for errors, the tear effect, 404, and the `motion:off` indicator. It never colors normal content.
- Links: `--fg` with a 1px solid underline in `--dim`. On hover or focus they invert (`--acc` background, `--bg` text).
- Accent covers no more than about 5% of non-sky pixels. Most of the page is fg/dim on bg/panel.

---

## 6. 3D scene spec: the Sky

### Stack
- **three.js r160, pinned**: import map with `"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"`.
  No addons are needed. The post pass is a hand-written fullscreen quad.
- One `<canvas id="sky">` sits fixed and full-viewport at `z-index: 0` (on mobile, the 4:3 band).
  CSS: `image-rendering: pixelated`.

### PS1 pipeline
1. **Low-res target.** `WebGLRenderTarget` with internal height fixed at **240** (desktop) or **120** (mobile).
   Width = height × aspect, rounded to an even number (a 16:9 viewport gives 426×240). Use `minFilter`/`magFilter = NearestFilter`,
   no mipmaps, `renderer.setPixelRatio(1)`, `antialias: false`. Debug keys `[` and `]` cycle the height through 120/180/240/360.
2. **Vertex snapping.** In every custom `ShaderMaterial` vertex shader, after projection:
   `ndc = clip.xy / clip.w; ndc = floor(ndc * uSnap + 0.5) / uSnap; clip.xy = ndc * clip.w;`
   with `uSnap = vec2(targetW, targetH) * 0.5`. The default is to snap to half the internal resolution, which
   gives visible wobble. Add a ±0.5px per-vertex jitter seeded by vertex id, driven by `uTime` at 15Hz (quantized).
3. **Affine texture warping.** The vertex shader outputs `vUvw = vec3(uv * clip.w, clip.w)` and the fragment shader
   samples at `vUvw.xy / vUvw.z`. That cancels perspective correction. Large faces such as the monolith and the
   floor should be few-triangle so the warp is obvious.
4. **Lighting.** Gouraud-style, per-vertex only: one directional "star" light plus ambient, computed in the
   vertex shader. No normal maps and no specular. Flat-shaded objects use non-indexed geometry.
5. **Fog.** Linear fog in the fragment shader, computed per vertex and interpolated (PS1-correct). Fog color is `--bg`, near 6, far 40.
   The fog factor is quantized to 8 levels before mixing.
6. **Textures.** Generate them procedurally with a 2D canvas at boot: 64×64 noise and checker, a 32×128 glyph strip of
   random Silkscreen characters for the monolith faces, and an 8×8 star sprite. All use `NearestFilter`, no mipmaps and `RepeatWrapping`.
7. **Post pass** (fullscreen quad, upscales the target to the canvas):
   - Sample with nearest filtering.
   - Quantize to 15-bit color (5 bits per channel, the PS1 framebuffer depth).
   - 4×4 Bayer ordered dither applied before quantizing, at internal-pixel scale.
   - **Palette lock**: compute luminance, map it onto a 5-stop ramp `[bg, rule, dim, acc2, acc]` (with `fg` reserved for
     star cores above 0.95), then `mix(quantized, ramp, uPaletteLock)` with a default of `0.8`. This makes palette switching recolor the scene.
   - An optional scanline darkening of 6% on every other *output* row. It's subtle and can be toggled.
   - Tear effect: when `uTear > 0`, offset UV.x by a hash of the row on a band of 4-12 rows, tinted with `--glitch`.

### Scene objects (all low-poly, < 6k triangles total)
| Object | Geometry | Notes |
|---|---|---|
| **Starfield** | 1,400 `Points`, 1 internal px each, on a 60-unit shell | Twinkle comes from moving each star's dither threshold, not its alpha. About 3% of stars are brighter and hit the `fg` stop. |
| **Constellations** | 3-4 `LineSegments` sets joining starfield points | One is a 7-star sigil shaped like a `K` (kygra). Lines draw in segment by segment during boot. |
| **Monolith** | Box 1 : 4 : 9 (proportions fixed), 12 triangles | Center of the orrery. Rotates slowly on Y at 0.05 rad/s. Glyph-strip texture with obvious affine warp. Near-black, catching rim light in `--acc2`. |
| **Orbit rings** | One `LineLoop` per project, **24 segments** (faceted on purpose), elliptical and tilted ±15° | The selected ring goes `--acc2` and the rest `--rule`. |
| **Project bodies** | One per project, cycling through tetra, octa, dodeca, icosa (detail 0), low torus (6×4) and a "broken" icosa with 3 faces removed | Flat shaded, scale 0.3-0.6. Each body's label is drawn as DOM in the HudLayer, not in WebGL. |
| **Dead sun** | Icosahedron detail 1 with a wireframe shell 1.15× larger, far behind the monolith | Large, dim and fogged. Pulses brightness in 4 quantized steps every 8s. |
| **Totem / figure** | Stack of 5 primitives (cone, box, sphere at 6 segments, box, ring) forming an abstract standing figure, out in the fog at about 30 units | A silhouette at the edge of visibility that turns to face the camera in 45° steps. |
| **Ruin grid** | Plane 40×40 at y = -6 with 12×12 segments; about 15% of cells removed; vertices displaced ±0.2 | Dim checker texture under heavy fog. Reads as structure, not as a synthwave floor. |

### Motion
- The simulation and render loop is capped at **30fps** (PS1 cadence) using a timestamp accumulator.
- Bodies orbit at 0.02-0.08 rad/s with periods as small-integer ratios, so the sky has a rhythm.
- The camera idles on a slow 20s Lissajous drift of ±2° yaw and ±1° pitch.
- **Camera retarget** (on project select): a 12-frame stepped tween (12 discrete positions at 30fps, so 0.4s
  with visible stepping). It ends with the body at about 62% of screen width and the Inspector docking beside it.
- **Section switch** (`h`/`l`): the whole orrery rotates 72° around Y in 8 frames. The notes, links and now sections each frame
  a different "region": notes faces the constellations, links faces the totem, now faces the dead sun.
- **Cursor**: parallax of ±3° yaw/pitch from pointer position, snapped to 0.5° increments. Hovering a ProjectRow
  previews its body with a bracket reticle in the HUD but does not move the camera. A click or Enter does.
- **Tear glitch**: every 25-45s at random, 2 frames of `uTear`. It also fires on palette switch and on errors.

### Performance budget
- At most 30 draw calls, at most 6k triangles, render target at most 426×240 (desktop), 30fps cap.
- Pause rendering when `document.hidden`, or when the canvas is offscreen on mobile (IntersectionObserver).
- JS written for the mock: under 40KB unminified, excluding three.js. No external textures, models or images.
- If 10 consecutive frames take over 40ms, drop the internal height one step (240→180→120) and show `res:180` in the StatusBar.

### Fallbacks
- **`prefers-reduced-motion: reduce`**: render one still frame (after boot positions settle), then render again only on
  selection or palette change. Retargets jump instantly with no tween. No tear, no twinkle, no idle drift, no boot animation.
  The StatusBar shows `motion:off` in `--glitch`. The `m` key toggles this at any time and the choice persists in localStorage.
- **No WebGL**: the canvas is replaced by a CSS fallback, a 2px Bayer pattern made from `repeating-conic-gradient`
  in `--rule` on `--bg` with a static ASCII orrery in `<pre>` dimmed on top. The StatusBar shows `gl:none`.

---

## 7. Keyboard model

The model is vim-first and mouse-equal: everything is reachable with keys alone, and everything is also clickable.
There is a single global key handler. It ignores keys while an input is focused, except `Esc`, `Enter`, `Tab`, `Ctrl-n` and `Ctrl-p`.

### Keymap
| Key | Mode | Action |
|---|---|---|
| `j` / `↓` | NORMAL | Next row in the active section; the camera retargets on projects |
| `k` / `↑` | NORMAL | Previous row |
| `h` / `←` | NORMAL | Previous section (01 projects → 04 now, wrapping) |
| `l` / `→` | NORMAL | Next section |
| `g g` | NORMAL | First row |
| `G` | NORMAL | Last row |
| `g p` / `g w` / `g c` / `g n` | NORMAL | Jump to projects / writing (notes) / contact (links) / now |
| `Enter` / `o` | NORMAL | Open the selected row: Inspector for projects, the link otherwise |
| `O` | NORMAL | Open the selected row's primary URL in a new tab |
| `Esc` | any | Close Inspector, palette or help, then clear the filter, then return to NORMAL |
| `/` | NORMAL | Filter the active list (inline input in the pane title) |
| `n` / `N` | FILTER | Next / previous match |
| `:` or `Ctrl-k` | NORMAL | Open the CommandLine |
| `?` | NORMAL | Toggle the HelpOverlay (full keymap) |
| `1` `2` `3` `4` | NORMAL | Palette: SODIUM / PHOSPHOR / OXIDE / COLDSTAR |
| `m` | NORMAL | Toggle motion |
| `f` | NORMAL | LOOK mode: hide all panes and keep the sky plus the modeline |
| `h j k l` | LOOK | Orbit the camera (yaw/pitch in 5° steps); `+` / `-` zoom; `Esc` or `f` exits |
| `y` | NORMAL | Yank (copy) the selected row's URL, or `<EMAIL>` on links; the modeline shows `yanked <...>` |
| `Tab` / `Shift-Tab` | any | Native focus order still works; focus and selection are kept in sync |
| `[` `]` `\` | NORMAL (mock only) | Internal res down/up; toggle the PS1 pipeline off/on for comparison |

Chords use `g` as a leader with an 800ms timeout. While it's pending, the modeline shows `g-`.

### How keybinds appear on the page
- **KeyChip**: `[j]`, written as brackets plus the key in Silkscreen 8px, uppercase-safe, `--dim` on `--panel`, with a 1px `--rule` border.
  When the matching key is pressed anywhere, the chip flashes inverse (`--acc` bg) for 120ms (4 frames).
- Chips appear in the Index (`[gp]`), pane titles (`[/]`, `[?]`), Inspector actions (`[o] [esc]`), the modeline (contextual set)
  and the HelpOverlay. Never more than 8 chips are visible outside the HelpOverlay.
- The **Modeline** is context-aware. It shows the mode (`NORMAL`, `FILTER`, `CMD`, `LOOK`), position (`projects 3/6`) and the
  4-6 most relevant chips for the current state.

### Focus and selection visuals
- **Selected row**: full-width inverse (`--acc` bg, `--bg` text, weight 600), with a `>` caret in column 0. A caret
  column is reserved on every row so nothing shifts.
- **Hovered row** (mouse): `--panel` becomes `--rule` and gets the caret, but stays non-inverse.
- **Native `:focus-visible`** on any control: a 2px solid `--acc` outline with 2px offset, square, no glow.
- **Cursor block**: an `█` in `--acc` after the input prompt, blinking at 1Hz with `steps(1)`. It does not blink under reduced motion.

### CommandLine (command palette)
- It's vim-style, not a centered modal. It opens as a full-width bar **directly above the Modeline**, with the result list
  growing upward (up to 8 rows). The rest of the page stays visible and no backdrop dim is used.
- The prompt is `:` followed by an input. It uses simple subsequence fuzzy matching, and matched characters render in `--acc`.
- Keys: `Ctrl-n`/`Ctrl-p` or `↓`/`↑` move; `Tab` completes; `Enter` runs; `Esc` closes.
- Each result row shows the command (left), a description in `--dim`, and a key chip if the command has one (right).
- Commands (mock):
  `projects` `notes` `links` `now` · `open <project>` (one entry per project) · `theme sodium|phosphor|oxide|coldstar` ·
  `motion on|off` · `res 120|180|240|360` · `look` · `ps1 on|off` · `yank email` · `help` · `boot` (replays the boot sequence).
- Unknown commands get `E492: not an editor command: <x>` in `--glitch` in the modeline, plus a 2-frame tear.

---

## 8. Interaction and state transitions

### Boot sequence (first visit per session, at most 1.6s, skipped by any key or click)
1. **0-500ms**: black screen with a BootScreen text log typed line by line at 30ms per line in Silkscreen 16:
   `KYGRA-OS 0.9 / MEM 2048K OK / CD-ROM ... OK / LOADING SKY.DAT / LOADING ORBITS [6] / HANDSHAKE kygura`.
2. **500-1100ms**: the sky dissolves in by raising the dither threshold through 16 Bayer levels (a dither dissolve, not an opacity fade).
   The constellation lines draw segment by segment.
3. **1100-1600ms**: panes appear one by one, top to bottom, each popping in fully over 1 frame with a 2-frame `--acc` border flash.
   No sliding.
4. Remembered in `sessionStorage`; reduced motion skips straight to the final state. `:boot` replays it.

### State machine
`BOOT → NORMAL ⇄ {FILTER, CMD, HELP, LOOK}`; `INSPECT` is a sub-state of NORMAL on the projects section.
Only one overlay is open at a time, and opening a new one closes the current one.

### Section switching
The pane's content swaps through a **scanline wipe**: 4 frames, where each frame replaces 25% of rows top to bottom with the
new content. The section title "decodes" over 6 frames, with each character cycling through random Silkscreen glyphs before it
settles. At the same time the sky runs its 72° orrery rotation (§6). Under reduced motion it's an instant swap.

### Selection and Inspector
- `j`/`k` moves the selection, the camera retargets, and the Inspector follows in 8px steps. The Inspector stays open while you
  browse once it has been opened with `o`. If it hasn't been opened, only a HUD reticle shows.
- The HUD reticle is four corner brackets `⌜ ⌝ ⌞ ⌟` drawn as CSS borders around the body's projected screen bounding box,
  plus a 1px leader line to the Inspector.
- Links in the Inspector are listed as `> src`, `> live`, `> writeup`, and each can be selected with `j`/`k` while the Inspector has focus (`Tab` into it).

### Hover, press and empty states
- Pressing a button or chip makes it inverse for 4 frames. There is no scale transform.
- Empty list: `-- no matches for /<query> --` in `--dim`, centered in the pane, which is the only centered thing on the page.
- Errors and 404: the full sky tears for 6 frames, then the StatusBar shows `ERR` in `--glitch`.

### Palette switch
Pressing `1`-`4` triggers a 2-frame tear and an instant CSS variable swap, sets the post-pass ramp uniforms, and updates the StatusBar name.
The choice persists in localStorage (wrapped in try/catch).

---

## 9. Component inventory

| Component | Role |
|---|---|
| `BootScreen` | Fullscreen boot log plus skip handling |
| `Sky` | Canvas, three.js scene, PS1 pipeline, retarget API (`sky.focus(id)`, `sky.section(i)`, `sky.setPalette(p)`, `sky.setRes(h)`) |
| `HudLayer` | DOM overlay that projects 3D anchors to 2D: body labels, reticle, leader line, corner RA/DEC readout |
| `StatusBar` | Top bar, tmux-style: handle, section tabs `0:sky* 1:proj ...`, palette, motion, res, fps, UTC clock |
| `Pane` | Opaque bordered box with a title tab (`01 PROJECTS`), optional right-aligned chips, internal scroll |
| `HandleBlock` | `KYGRA` in DotGothic16, the `/ kygura /` reading, role line, bio |
| `IndexRail` | Section list with numbers and `[g?]` chips; the current section is inverse |
| `ProjectList` / `ProjectRow` | Columns: caret, name, year, lang. The selected row is inverse |
| `Inspector` | Floating (desktop) or inline (tablet/mobile) project detail pane with link rows |
| `NoteList` / `NoteRow` | Date (`2026-09-14`), title, read-time |
| `LinkTable` | `label ........ handle  [y]`, with dot leaders drawn as text |
| `NowBlock` | Status line plus up to 3 items, with an `updated <DATE>` stamp |
| `KeyChip` | `[k]` chip that flashes on its keypress |
| `Modeline` | Bottom bar showing mode, position, contextual chips and transient messages (`yanked`, `E492`) |
| `CommandLine` | `:` palette above the Modeline |
| `HelpOverlay` | Full keymap as a two-column table inside a Pane, centered over the sky (an exception that is still opaque and square) |
| `FilterInput` | Inline `/query` in a pane title |
| `PaletteSwitcher` | **Mock only.** Four swatch blocks with names and `[1]`-`[4]` chips, in the StatusBar on desktop and the KeyBar on mobile |
| `KeyBar` | Mobile-only sticky bottom chip bar with tap targets |

---

## 10. Mock scope: `design/mock/index.html`

### Constraints
- One static HTML file with inline `<style>` and `<script type="module">`. No build step and no local assets.
- three.js **0.160.0** through an import map on jsdelivr (exact URL in §6). Google Fonts `<link>` for DotGothic16, Martian Mono and Silkscreen.
- Must open by double-clicking (`file://`) and also from any static server.
- Everything lives under `design/`. Nothing in `src/` is touched or read.

### Must show
1. **Boot sequence**, skippable, sessionStorage-gated. `:boot` replays it.
2. **The desktop layout** from §3 with all panes: StatusBar, HandleBlock, IndexRail, section pane (all 4 sections switchable),
   NowBlock, floating Inspector, HudLayer, Modeline.
3. **Responsive** tablet and mobile layouts (check at 390px width: sky band, stacked sections, KeyBar).
4. **The Sky** with every object in §6 and the full PS1 pipeline: low-res target, vertex snap, jitter, affine UV, vertex lighting,
   quantized fog, 15-bit quantize, Bayer dither, palette lock, tear.
5. **Keyboard model** for every key in §7, including `gg`/`G`, `g`-chords, `/` filter, `y` yank and LOOK mode.
6. **CommandLine** with fuzzy matching and every command listed in §7.
7. **HelpOverlay** (`?`).
8. **PaletteSwitcher**: keys `1`-`4` and clickable swatches swap all CSS tokens *and* the sky ramp live, with the palette name
   shown in the StatusBar. This is the main thing the owner will judge.
9. **Comparison debug keys**: `\` toggles the PS1 pipeline off (clean three.js render at full res) and on, and `[` `]` cycle the
   internal resolution, so the owner can see what the pipeline adds.
10. **Reduced-motion** behavior, both through the media query and through `m`.

### Faked or stubbed (label these in an HTML comment block at the top of the file)
- All content: names, bio, projects, notes, links and now items are bracketed placeholders like `<PROJECT_A>`. No lorem ipsum.
- All link targets point to `#`. `O` and Enter on links show `would open <url>` in the modeline instead of navigating.
- The `y` key copies the placeholder `<EMAIL>` string, using the real clipboard API with a fallback to a modeline message.
- RA/DEC/distance values are computed from 3D positions but have no astronomical meaning.
- The fps counter and UTC clock are real. Uptime and version strings in the boot log are fake.
- There's no routing or URL state. Notes don't open; they flash `note view: not in mock`.
- The no-WebGL fallback only needs a basic version.

### Acceptance check (owner review)
- [ ] Nothing on the page has rounded corners, shadows, gradients in chrome, blur or emoji.
- [ ] Pixels in the sky are visibly chunky (about 3-4 screen px per internal px at 1080p), polygons wobble, and textures swim.
- [ ] All four palettes are reachable with `1`-`4` and each one recolors both the UI and the sky.
- [ ] The whole page can be used without a mouse, and every keybind is discoverable on screen or through `?`.
- [ ] It stays at 30fps on an integrated-GPU laptop and works at 390px width without horizontal scroll.
- [ ] Reduced motion produces a calm, static page.

---

## Amendments (full pass)

Status: **FULL PASS.** The direction is approved. These amendments apply the brief to the real site and its real content.
They override the sections they name. The rule in §1 about not carrying anything over from the old site still holds for
visuals; only content, routes and data plumbing carry over. `design/SPEC.md` holds the build plan.

### A1. Palettes ship
All four palettes from §5 ship. SODIUM stays the default (`:root`); PHOSPHOR, OXIDE and COLDSTAR are
`:root[data-pal=...]` token sets. The **PaletteSwitcher is no longer mock-only** (§9): keys `1`-`4`, clickable swatches
(StatusBar on desktop, KeyBar on mobile) and `:theme sodium|phosphor|oxide|coldstar` all stay. The choice persists per
viewer in localStorage and is applied before first paint, so the page never flashes the wrong palette. The §8 palette
switch behaviour (2-frame tear, instant token swap, ramp uniforms, StatusBar name) is unchanged. Per-project accent colors
from the old content are not used: palette tokens own every color on the page.

### A2. Debug controls are dropped
`[`, `]` and `\` are unbound in production, and the `ps1 on|off` and `scan on|off` commands are gone. The PS1 pipeline is
always on, and the scanline pass stays at the mock's default. `:res 120|180|240` stays as a command with no key, and the
automatic step-down from §6 stays. `res 360` is dropped.

### A3. Fifth section: `05 LOG`
The guestbook becomes a fifth section. Five regions at 72° close the circle that §6's section rotation already implies.
- Title `05 LOG`, StatusBar tab `5:log`, IndexRail chip `[gb]`, chord `g b`. `h`/`l` wrap through five sections.
- Sky region: the orrery turns to the dark face of the monolith with the ruin grid below.
- Rows: `YYYY-MM-DD  name~  message~`. `Enter` expands a row inline (wrapped message, no new pane).
- The first row is `+ sign`. `Enter` on it, or `:sign`, opens an inline form inside the pane: `name:` (optional,
  default `anon`) and `msg:` (280 chars, counter `n/280` in `--dim`). The Modeline mode reads `INSERT`. `Enter` sends,
  `Esc` cancels. Sending is optimistic. After a send there is a 30s cooldown, and messages go to the Modeline (no toasts).
- The last row is `+ more` while more entries exist (pages of 12). New entries from other visitors appear at the top in real time.
- Without a backend: the list shows `-- log offline --` in `--dim`, and `+ sign` reports `E: log offline` in `--glitch`.

### A4. Reader pane (long-form)
Long text (notes, project dossiers, the CV, the manifesto and 404) opens in a **Reader**: an opaque Pane with a title tab
(`READ <slug>`, `DOSSIER <name>`, `CV`, `ABOUT`, `E404`) and the chips `[esc]` plus `[O]` where an external URL exists.
- Desktop: it docks in the open-sky region, 8px right of the stack and running between the bars. Its width is `min(80ch, available − 16px)` and it scrolls internally.
  The Inspector and reticle hide while it is open. The sky stays visible in the gutters and on the right.
- Tablet: it replaces the section pane and Inspector in the widened stack. Mobile: it replaces the stacked sections under the sky band.
- Keys: `j`/`k` scroll 3 lines, `gg`/`G` top and bottom, `Esc` closes back to the section. Everything else stays global.
- Prose: Martian Mono 14/1.6, max 72ch. Headings in DotGothic16 at 32 (h1/h2) or 16 (h3+). No italics: `em` renders as
  `--fg` with a 1px dotted `--dim` underline. Blockquotes get a 1px `--rule` left rule and `--dim` text. Lists use `-` and `*` glyphs.
  Code blocks sit on `--panel` with a 1px `--rule` border, and syntax colors are limited to `fg / dim / acc / acc2`. Images have a
  1px `--rule` border, no radius and normal (non-pixelated) scaling. Callouts (`[!NOTE]` and the rest) are boxed with a Silkscreen 8px label,
  in `--acc2` for NOTE, TIP and IMPORTANT and `--glitch` for WARNING and CAUTION.
- The Reader header shows date, read time and tags (posts), or year, status, stack and links (dossiers) as a `dl`, like the Inspector.
- 404: `E404: <path> not found` in `--glitch`, a 6-frame tear and `ERR` in the StatusBar, plus `> back to index`.

### A5. Routes
The URL is the source of truth for section and Reader. `/` and `/projects` → 01, `/writings` → 02, `/links` → 03,
`/now` → 04, `/guestbook` → 05. `/projects/:slug` opens the dossier, `/writings/:slug` the post, `/cv` the CV (section 03),
`/about` the manifesto, and `/artifacts` redirects to `/`. Section switches replace history; opening a Reader pushes.

### A6. Content slots, resolved
- HandleBlock: `KYGRA`, `/ kygura /`, then a new dim 12px line `nicolas cerrato anton / malaga`, then the role line and the bio
  (taken from the manifesto, 240ch or less), then `> manifesto` (to `/about`).
- Inspector: the mock's `role` row becomes `type` (the project subtitle). Links are `> src`, `> live` and `> dossier`
  (`dossier` replaces `writeup`), and links that don't exist are omitted. `O` opens live, or src if there is no live link.
- ProjectRow `lang` comes from the first stack entry as a short lowercase code; `--` when empty.
- `03 LINKS`: github, email, cv, cv.pdf, log. `y` on links yanks the email.
- `04 NOW`: status line, up to 3 items and `updated <date>`, followed by a **fortune** block with one random quote from the old site's
  quote list. A translation line (after `<br>`) renders on its own line in `--dim`. `:fortune` rerolls it.
- Boot log: `LOADING ORBITS [n]` uses the real project count.

### A7. Commands (production)
`projects notes links now log` · `open <project>` · `read <note>` (one per note) · `cv` · `about` · `sign` · `fortune` ·
`theme sodium|phosphor|oxide|coldstar` · `motion on|off` · `res 120|180|240` · `look` · `yank email` · `help` · `boot`.

### A8. three.js source
§6 and §10 load three from a CDN import map. That applied to the mock only. Production uses the npm package pinned at exactly `0.160.0`,
loaded as a lazy chunk. If the chunk fails or WebGL is missing, the page uses the §6 no-WebGL fallback and shows `gl:none`.
