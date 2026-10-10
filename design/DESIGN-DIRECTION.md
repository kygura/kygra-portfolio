# Kygra Codex — design direction

Mock: `design/mock/index.html` (single file, publishes as a claude.ai Artifact).

## Concept

The portfolio is an engineer's drawing sheet. A heavy ink frame with zone markers
(1–8 across, A–F down), a title block bottom-right (DRAWN / SCALE / SHEET / REV /
DATE / UNITS), a left index drawn as keycaps, and a bill of materials where the
work would normally be a card grid. The one bold moment is Fig. 1: a PS1-rendered
low-poly model of Leonardo's aerial screw (Ms. B 83v) with live leader lines,
dimension lines and Renaissance marginalia around it. Colour comes from Cowboy
Bebop title cards: flat blocks, slightly misregistered second ink, nothing glossy.
Three registers on one sheet: engineer (frame, BOM, modeline), Renaissance
notebook (italic marginalia, braccia), indie web (webring, 88×31 badges, counter).

## Palette tokens

Light = drafting vellum. Dark = night shift. Both defined on `:root` per the
artifact theme contract (`prefers-color-scheme` guarded by `:root:not([data-theme="light"])`,
plus `:root[data-theme="dark"]`); `t` toggles `data-theme` on `<html>`.

| token        | vellum    | night     | use                                   |
|--------------|-----------|-----------|---------------------------------------|
| --paper      | #E4DBC3   | #16161A   | page + fog colour (aged, green-grey)  |
| --paper-2    | #D9CFB3   | #1E1E24   | table heads, hover, expanded rows     |
| --ink        | #1D1B17   | #D9CFB6   | text, rules, inverted selection       |
| --ink-2      | #5A5546   | #A89E86   | secondary text (≥ 4.5:1 on paper)     |
| --graphite   | #7A7464   | #55535C   | construction lines only (never text)  |
| --hatch      | #BFB49A   | #2C2C34   | hatch fills, hairline dividers        |

Accent plates, selected with `data-plate` on `<html>`. Each plate carries three
inks: `--plate` (the flat title-card block, constant across themes), `--accent`
(text/line-safe tone, resolves to `--accent-light` on vellum and `--accent-dark`
on night, all ≥ 4.5:1 against their paper), and `--plate-2` (second ink for the
misregistered print layer). `--on-plate` is the text colour on a block.

| plate    | --plate  | --accent-light | --accent-dark | --on-plate | --plate-2 |
|----------|----------|----------------|---------------|------------|-----------|
| MARS     | #B5401F  | #A3391A        | #E0683F       | #E8DFC8    | #C9962A   |
| CALLISTO | #C9962A  | #7B5A10        | #D9A63A       | #1D1B17    | #B5401F   |
| GANYMEDE | #2F6E6A  | #2A605C        | #5FA39E       | #E8DFC8    | #C9962A   |
| VENUS    | #34508F  | #34508F        | #7F98D6       | #E8DFC8    | #B5401F   |

Rule: ochre is never text on vellum at its block value; use `--accent`. Blocks are
always flat; no gradients, no transparency over imagery.

## Type (Google Fonts, fallbacks required)

- Display: Big Shoulders Display 800/900 — headings, title cards, huge numerals,
  the H1. Uppercase, tight (−0.01em), line-height 0.82–0.9.
- Annotation: IM Fell English italic — leader labels, figure captions, section
  subtitles, notes, about. Never uppercase, never letter-spaced.
- Utility: Courier Prime — body, BOM, keycaps, modeline, title block, badges.
  Uppercase labels get 0.12–0.16em tracking.

Scale (px): 11 label · 13 body · 15 · 19 annotation · 26 h3 · 40 h2 · display clamp(64, 11vw, 148).

## Layout grid

Body gutter 16px → 2px sheet frame → 22px zone bands (18px on phones) → field.
Field = header (title left, DWG No. + subtitle right, 2px rule) → body grid
`184px rail | 1fr content` → title block right-aligned, max 420px.
Content sections pad 22/24px, 1px rule between. Fig. 1 is `viewport (max 860px,
4:3) | 236px parts list`. Below 760px: rail becomes a wrapping keycap row above
content, fig. 1 stacks, BOM scrolls inside its own `overflow-x` box (min 600px),
plates go 2-up, modeline drops the render/hint segments. No horizontal page scroll.
Rules: 1px hairlines, 2px for frame/section heads/table heads. Border-radius 0,
box-shadow 0, everywhere, no exceptions.

## PS1 render rules (Fig. 1)

- three.js r128 only (UMD, cdnjs). WebGLRenderer at 320×240, `setPixelRatio(1)`,
  canvas scaled by CSS with `image-rendering: pixelated`. Requires WebGL2; if the
  context fails or is WebGL1, show the static SVG line plate and keep annotations.
- Custom `ShaderMaterial`, `glslVersion: THREE.GLSL3`. Note: with GLSL3 three omits
  the `gl_FragColor` shim; declare `out vec4 fragColor` yourself.
- Vertex: snap clip-space xy to the 320×240 grid (`floor(ndc*res/2+.5)/(res/2)`);
  Gouraud lighting quantised to 4 steps from a fixed view-space light; fog factor
  from view depth (near 4.6, far 8.6) fading into `--paper`.
- Affine texturing: GLSL ES 3.0 has no `noperspective`, so pass `uv*w, w` and divide
  in the fragment shader; that cancels perspective correction exactly.
- Fragment: 4×4 Bayer (`M4 = 4*M2(x,y) + M2(x>>1,y>>1)`, `M2 = (2x)^(3y)`), then
  quantise to 5 bits per channel.
- Textures: three procedural 32×32 canvases (rust, hatched linen, wood),
  NearestFilter, no mipmaps, RepeatWrapping. All geometry made non-indexed with
  recomputed normals so facets stay flat.
- Edge pass: `EdgesGeometry` + `LineBasicMaterial` in `--accent`, parented to each
  mesh; mesh material uses polygonOffset so lines sit on top. Threshold 18°
  (40° for the sail). Three render modes: textured → textured+edges → drawing.
- Mechanism: platform (12-gon) · mast (6-gon) · helical sail (1¾ turns, 3 rings ×
  26 segments) · pinion 8t on the mast · idler 12t · great wheel 16t with crank,
  module 0.06. Ratios drive rotation (pinion ω, idler −8/12 ω, wheel 8/16 ω).
  Camera orbits ±8° and bobs 6cm; ~816 tris, live count in the caption.
- Leader-line endpoints are projected from world anchors every frame so the
  marginalia tracks the model. Reduced motion: one still frame, no loop.

## Keyboard map (no modifiers except shift)

`0–6` jump sections (figure, work, lab, notes, about, contact, plates) ·
`j/k` BOM cursor · `⏎` open/close detail row · `/` focus filter (esc leaves) ·
`g/G` top/bottom · `t` theme · `a` cycle plate · `⇧1–⇧4` select plate (checked
via `e.code` so layouts don't matter) · `r` render mode · `space` pause ·
`?` key map, `esc` closes. Keys are ignored while typing in an input, and
`⏎`/`space` are left alone when a button or link has focus. Modeline reads
`MODE · section/NN · plate: NAME · render: MODE · ? keys` (NN = BOM cursor in
work, section ordinal elsewhere). Modes: NORMAL, FILTER, HELP.

## Motion

Only the mechanism moves (0.9 rad/s screw, slow camera orbit, small bob).
No scroll reveals, no opacity-0 states, no hover transforms; theme and plate
switches are instant. Roughness lives in dithering, vertex jitter, 1.5° hand-set
labels, the fixed 3px/−2px two-ink offset and hatch fills; layout stays exact.

## Avoid

Cream #F4F1EA, serif-body + terracotta, purple or any gradient, glass/blur,
rounded cards, drop shadows, bento grids, Inter / Space Grotesk / Space Mono,
emoji, centred hero copy, icon packs, smooth-shaded 3D, skeleton loaders, fade-ins.
