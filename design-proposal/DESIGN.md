# Kygra portfolio redesign: "Field Survey" (sketch phase)

Status: proposal. The mockup is `mockup.html` in this folder. Open it in a browser; it runs with no build step. Screenshots `screenshot-*.png` show each accent variant, the projects list with a j/k selection, and a phone-width view with reduced motion on.

## 1. Concept

The site is set up as a hand-made survey sheet of one person's practice. Each section is a numbered map sheet (01–05). The visual references are printed topographic quads, field notebooks, terminal UIs and PlayStation 1 era real-time 3D, so everything looks drafted rather than polished.

It also has to look nothing like the usual AI-generated portfolio, so the following are not used anywhere:

- glass, blur or translucent cards
- rounded corners (`border-radius: 0` is set globally)
- soft drop shadows (the only "shadow" is a hard 2–3 px offset in the accent colour, like misregistered print)
- purple/blue gradients and gradient text
- bento grids and card walls (projects are a list, not cards)
- an Inter hero headline

To keep it rough on purpose: borders are 1 px solid ink, with dashed lines for secondary frames. The background has a visible 64 px survey grid. The 3D runs at 320×180 and is scaled up with no smoothing. HUD labels are snapped to that same pixel grid.

Three ideas tie the content together:

1. **Map:** contour lines, elevation bands, coordinates, a legend, scale bars and waypoints.
2. **Astral:** low-poly bodies in orbit, a ring and a star field, as if the survey also covers the sky.
3. **Terminal:** key hints, a vim-style status line, a `:` command line and gazetteer-style indexes.

## 2. Layout and hierarchy

The layout is one column of sheets, max width 1180 px, with a 16 px side gutter on phones.

| Order | Component | Role |
|---|---|---|
| sticky top | **CommandBar** (C01) | Brand, section links with chord hints (`g a`, `g p`…), and the accent switcher |
| 1 | **SheetHead** (C03) | Title strip above each frame: sheet number, coordinates, scale and contour interval |
| 1 | **MapFrame** (C02) | Hero: the live PS1 scene with HUD corners, corner ticks and waypoint labels |
| 1 | **Cartouche** (C02b) | The map's title block: name, one-line bio and a cheat sheet of key hints |
| 2 | **Sheet: About** (C04) | Prose plus a **Legend** box (map symbols reused as the site's icon set) |
| 3 | **SurveyList + Inspector** (C05, C06) | Projects as a selectable list with a sticky detail panel; `/` filters the list |
| 4 | **Gazetteer** (C07) | Writings index: ISO date, title, reading time and §tag |
| 5 | **TerminalBlock** (C08) | Contact written as a shell transcript |
| fixed bottom | **StatusLine** (C09) | Mode (NORMAL/COMMAND), messages, current sheet, accent and scene state |
| modal | **KeyHelp** (C10) | Full keyboard map (`?`) |

How hierarchy is set: there is one big mono H1 (the name). H2s are uppercase mono with a small dim "sheet NN" tag. Body text is a readable sans. Metadata always uses small dim mono. The accent is kept for things you can act on: the selected row, focus, the current mode, waypoints and contours.

On phones (≤760 px): the cartouche, about columns and the list/inspector split all stack into one column. Nav chord hints are hidden; the help dialog still lists them, and they only matter with a hardware keyboard. The accent switcher becomes its own scrollable row. Two of the four HUD corners are hidden. No horizontal scroll was verified at 390 px.

## 3. Type

- **Body:** Atkinson Hyperlegible (Google Fonts), falling back to `system-ui`. It was designed for legibility, it is not Inter, and it has a slightly odd, indie feel. Set at 17 px with 1.6 line height (16 px on phones).
- **UI chrome, headings and data:** IBM Plex Mono, falling back to `ui-monospace`/Menlo/Consolas. Used for the H1, H2s, nav, key caps, HUD, metadata, the status line and the terminal block.
- No third font and no italics in the UI. Small caps come from `text-transform: uppercase` plus letter spacing on mono only.
- If the user wants zero webfonts, both stacks degrade cleanly to system fonts.

## 4. Colour system

Every colour is a token on `:root`. A variant is chosen with `html[data-acc="…"]`, which replaces the whole token set, so a variant can also change the base (Survey is the light one). The 3D scene reads the same tokens at runtime, so the canvas always matches the page.

| Token | Use |
|---|---|
| `--bg` | Page and canvas clear colour; also the fog colour |
| `--bg-2` | Raised surfaces: kbd caps, panel headers, status line |
| `--ink` | Body text, frames, planet body |
| `--dim` | Metadata and orbit paths |
| `--rule` | Background grid, list dividers, terrain wireframe |
| `--acc` | Interactive accent: focus, selection, contours, waypoints |
| `--acc-2` | Secondary accent: ring, moons, index highlights |
| `--acc-ink` | Text placed on `--acc` |
| `--terrain` | Base albedo for the elevation bands |

### Variants (keys 1–5)

All contrast pairs below pass WCAG AA. The figures are body ink on bg / dim on bg / accent on bg / acc-ink on accent.

1. **Sodium** (default in dark mode): sodium-vapour streetlights over wet tarmac, like a night-shift survey crew. Warm and the least "neon".
   `--bg #0e0d0b · --bg-2 #17150f · --ink #e6dfcc · --dim #8a8270 · --rule #2e2a21 · --acc #ff7a1a · --acc-2 #ffd23f · --acc-ink #0e0d0b · --terrain #6b4a1c`. Contrast 14.6 / 5.1 / 7.4 / 7.4.
2. **Phosphor**: P1 green CRT, BBS and demoscene. The most "underground terminal" option, at the risk of reading as hacker cliché.
   `#070b08 · #0d140f · #cfe8d2 · #6f8a74 · #1c2a20 · acc #5dff6a · acc-2 #e8ff7a · acc-ink #041006 · terrain #1f5a2a`. Contrast 15.2 / 5.2 / 15.1 / 14.8.
3. **Survey** (light; default when the OS prefers light): a printed USGS-style quad sheet, with survey red for roads and benchmarks and contour brown. The most "map", and the most distinctive in daylight.
   `#e9e3d0 · #ddd5bd · #1d1a14 · #5e5747 · #bfb498 · acc #b8301a · acc-2 #8a5a2b · acc-ink #f5f0e0 · terrain #c9b48a`. Contrast 13.5 / 5.6 / 4.7 / 5.3. The accent only just passes for small text, so do not darken the bg.
4. **Ion**: cyan and magenta on blue-black, the openly cyberpunk option. It is the one closest to generic "tech" palettes, so it is included for comparison.
   `#06090d · #0c121a · #d6e2ea · #6c7d8a · #1a2633 · acc #2ef2e0 · acc-2 #ff3d8b · acc-ink #03110f · terrain #123c44`. Contrast 15.1 / 4.7 / 14.1 / 13.7.
5. **Hazard**: hi-vis chartreuse and safety orange on near-black, like construction survey tape. The loudest of the five; focus states are impossible to miss.
   `#0b0b0a · #141412 · #ececec · #868680 · #2b2b28 · acc #d7ff1e · acc-2 #ff4f1f · acc-ink #0b0b0a · terrain #4a4a2a`. Contrast 16.7 / 5.4 / 17.1 / 17.1.

My recommendation: ship **Sodium** for dark mode and **Survey** for light mode, as one pair that follows `prefers-color-scheme`, and keep the others as optional themes behind `:acc`.

## 5. 3D / PS1 technique

The mockup uses three.js r160 loaded from jsDelivr through an import map. In the real build, use the existing `three@0.160.0` dependency. It needs no other packages and no post-processing passes.

- **Low internal resolution:** `renderer.setPixelRatio(1); setSize(320, 180, false)`. The canvas is stretched by CSS with `image-rendering: pixelated`. This needs no render target or extra pass, and the browser does nearest-neighbour upscaling for free.
- **Vertex snapping and jitter:** one shared `ShaderMaterial` is used for every mesh. The vertex shader snaps clip-space xy to the 320×180 grid: `p.xy = floor(p.xy/p.w * res/2 + .5) / (res/2) * p.w`. Moving the camera makes vertices pop between pixels, which is the PS1 wobble.
- **Affine texture warp:** WebGL2's GLSL ES 3.00 does not allow `noperspective` (I tested it; the shader fails to compile). Instead the shader passes `vec3(uv * w, w)` and divides in the fragment shader. That cancels the GPU's perspective correction, so the UV becomes screen-linear and big triangles warp the procedural grid and checker the PS1 way.
- **Gouraud lighting:** the light term is computed per vertex. Flat-looking polygons with banding are intentional.
- **Contours and elevation bands:** the terrain fragment shader computes `b = worldY * k`. `floor(b)` picks a stepped band shade, a thin line is drawn where `fract(b) < fwidth(b)`, and every fifth band gets a thicker "index contour". The affine-warped survey grid comes from UV.
- **Fog:** a linear mix toward `--bg` by view depth (uNear 22, uFar 80). It also hides the far terrain edge, the way the PS1 hid its draw distance.
- **Limited colour depth and dithering:** a 4×4 Bayer ordered dither on `gl_FragCoord`, then quantising to 6 levels per channel: `floor(c*6 + bayer)/6`. Colour management is off (`ColorManagement.enabled = false`, linear output) so the token hex values land exactly.
- **Topological animation:** the terrain is a 36×36 plane whose heights come from a sum of sines plus Gaussian peaks and pits, with time-varying phase and peak spread. It is re-displaced on the CPU each frame and normals are recomputed. That is about 1.4k vertices, so it is cheap. Contour lines slide over the surface as the land "breathes".
- **Astral layer:** a detail-0 icosahedron planet with a detail-1 wireframe shell, a 9-segment ring (deliberately coarse), three primitive moons (octahedron, tetrahedron, cube) on tilted elliptical orbits with dim orbit paths, and about 260 one-pixel stars.
- **Annotation layer:** waypoints such as `Σ PEAK`, `TRIG.0412` and `BODY·A` are HTML elements positioned from `Vector3.project()` and rounded to the 320×180 grid. The text stays crisp and readable while the pixels around it are crushed. Survey pins are vertical line segments that follow the terrain.

**Performance budget:** 30 fps cap; under 15 draw calls; under 3k triangles; one shader program for the meshes plus one for points; no textures; no render targets. The loop stops when the hero scrolls off screen (IntersectionObserver) and when paused. Target: under 2 ms GPU on an integrated laptop GPU and smooth on mid-range phones. In real use, also lazy-load three.js (dynamic `import()`) so first paint does not wait on it.

**Fallbacks:**
- three.js fails to load or WebGL is unavailable: the module catches it, adds `.no-gl` to the frame and shows a static ASCII contour sheet. The HUD reports why.
- Shader compile error: `renderer.debug.onShaderError` triggers the same fallback.
- The page UI and keyboard live in a separate classic script, so the site works fully without the scene.
- Production idea: replace the ASCII with a pre-rendered dithered PNG of the scene.

## 6. Keyboard map

| Keys | Action |
|---|---|
| `g a` / `g p` / `g w` / `g c` | Go to about / projects / writings / contact (vim-style chord, 900 ms window) |
| `g g` / `G` | Top / bottom |
| `j` `k` (also `↓` `↑` inside a list) | Next / previous entry in the active list (projects or writings) |
| `Enter` / `o` | Open the selected entry |
| `/` | Jump to projects and focus the filter; `Enter` in the filter moves into the list |
| `:` | Command line in the status bar: `acc <name\|1-5>`, `go <section>`, `pause`, `help` |
| `1`–`5`, `[` `]` | Choose / cycle the accent variant |
| `.` | Pause or resume the 3D scene |
| `y` | Copy (yank) the email |
| `?` | Key help dialog; `Esc` closes dialogs and leaves inputs |

Rules: shortcuts never fire while typing in an input, and never with Ctrl, Cmd or Alt held, so browser and screen-reader shortcuts keep working. Every shortcut also has a clickable equivalent. Key hints are always visible (as `kbd` caps) next to the thing they trigger.

Focus has to be loud: a 3 px accent outline with 2 px offset everywhere. Nav and links invert to an accent background. The selected list row is a solid accent fill with a `▶` marker, and keyboard focus inside the list adds an ink outline on top.

## 7. Motion rules

1. Only the 3D scene animates. UI changes (selection, accent swap, help) are instant, with no CSS transitions or eased fades. That fits the terminal feel and stays out of the way.
2. The scene runs at 30 fps or less, and its stepped, snapped motion is part of the look.
3. With `prefers-reduced-motion: reduce`, the scene renders a single frozen frame (the HUD says "frozen") and smooth scrolling is turned off. The frozen frame still re-renders when the accent changes. `.` can start it on purpose.
4. The scene stops when off screen or when the tab is hidden (rAF stops).
5. No parallax, no scroll-jacking, no reveal-on-scroll.

## 8. Component list

C01 CommandBar · C02 MapFrame (canvas, HUD corners, corner ticks, WaypointLabel) · C02b Cartouche · C03 SheetHead · C04 Sheet (section shell with H2 and sheet tag) · C04b Legend · C04c ContourRule (decorative divider) · C05 SurveyList (listbox, j/k) · C05b FilterField · C06 Inspector · C07 Gazetteer (SurveyList variant) · C08 TerminalBlock · C09 StatusLine (+ CommandLine) · C10 KeyHelp (dialog) · C11 AccentSwitcher · Kbd (key cap primitive) · Scene (three.js module: PS1Material, Terrain, Orrery, Stars, Pins).

When this is ported to React, the obvious hooks are `useHotkeys` (one global keydown handler with a chord state machine, shared between list navigation and the command line), `useAccent` (sets the data attribute and stores the choice in localStorage) and `<Scene>` (a single effect that owns the renderer).

## 9. Open questions for you

1. **Accent:** which variant, or which dark/light pair? Is it fine to drop the rest, or keep them as switchable themes?
2. **Default mode:** should the page follow the OS light/dark setting (my proposal: Sodium/Survey), or be dark only?
3. **Fonts:** are Atkinson Hyperlegible and IBM Plex Mono OK, or should the site use system fonts only (no webfont requests)?
4. **Scene subject:** keep it abstract, or tie it to something real, such as your actual city's elevation data (DEM tile, then contours) or real coordinates in the sheet headers?
5. **Project media:** dithered stills only (on brand), or also short clips? Should the inspector render a small PS1 thumbnail scene per project?
6. **Project and writing detail pages:** a full page (a "sheet"), or an expanding inspector?
7. **Keyboard:** are the vim chords (`g p`) right for you, or would you prefer single keys? Should `j`/`k` also scroll the page when no list is active?
8. **How rough:** is 320×180 with a 6-level dither the right amount of crunch, or should the scene go cleaner (480×270, 8 levels) or harsher (256×144, 4 levels)?
9. **Copy:** is there a real bio line and a list of projects and writings to replace the placeholders?
