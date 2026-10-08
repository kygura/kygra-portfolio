# Redesign proposal: "Sheet 01"

Status: mock for review. No site code changed. Open `mock.html` in a browser (or the published artifact) and press `?`.

## Direction

The site is an engineering drawing sheet. Every page is a plate: registration crosshairs in the corners, a title block, dimension lines, figure numbers. Section headers are session title cards (condensed black type on a solid bar, accent on the numeral). Chrome is monospace with a key hint on every action; the bottom bar is a TUI-style key legend and it actually works. Marginalia are italic serif, like notes in the margin of a codex.

The 3D element is a wireframe, not a rendered object: a polyhedron inside a gear ring, drawn in sepia drafting ink on a 2D canvas, with one lit edge in the accent and a vertex label. In the build this becomes a Three.js line-material scene so project pages can each carry their own figure.

Brutalist cues are limited to structure: hard 1px rules, no radius, no shadow, visible grid, raw stacked blocks. The page stays legible; the roughness is in the geometry, not the type.

## Why this avoids the convergent look

- No cream + serif + terracotta. The paper base uses a sepia rule system, not a warm card.
- No lone neon pop on black. The accent is one of four Bebop-derived colours and is always secondary to the drafting ink.
- No Inter / Space Grotesk. Barlow Condensed (title cards), IBM Plex Mono (chrome), Cormorant Garamond italic (marginalia).
- Nothing centered, nothing rounded, no gradient hero, no emoji markers.
- Numbering is real: plates are a sequence, figures are counted, sheet revisions are dated.

## Palette

Fixed base (dark, "Hangar"): ink `#0F1114`, surface `#171A1E`, line `#2B3037`, drafting ink `#B8976A`, muted `#8C8778`, bone `#E6DFCC`.
Paper base ("Codex"): `#ECE3CD` / `#E3D8BB` / `#C6B893`, sepia ink `#7A5A2C`, text `#1B1A17`.

Accent variants (pick one, or ship the picker as a site feature on `t`):

| Name | Dark | Paper | Read |
|---|---|---|---|
| Swordfish | `#D6392C` | same | Vermilion warning stripe. Loudest. |
| Session | `#E9B32B` | `#B9850E` | Title-card mustard. Closest to Bebop. |
| Hammerhead | `#5A9D7C` | `#2F6D50` | Oxidised copper. Quietest, ink does the work. |
| Gate | `#5D7FD6` | same | Astral-gate blue. Most blueprint, least Bebop. |

My pick: Session on Hangar, Swordfish as the secondary for live/danger states. Session is the only one that makes the base read as Bebop rather than generic dark-mode.

## Mapping to existing routes

| Route | Plate |
|---|---|
| `/` | Sheet 01: general arrangement hero, Plate II work, Plate III notes |
| `/projects`, `/projects/:slug` | One plate per project; detail page gets its own figure and title block |
| `/writings`, `/writings/:slug` | Ledger list; post page is a plate with marginalia column |
| `/artifacts` | Figure grid, same card as work |
| `/guestbook` | Ledger with the entry form as a title-block row |
| `/cv` | Printed sheet: paper base forced, full title block |
| Terminal, soundtrack player | Kept; both are indie-web assets. Terminal gets `:` as its key. |

## Keyboard contract

`j`/`k` scroll, `1`-`4` plates, `g` top, `t` accent, `b` base, `?` map, `Esc` close, `:` terminal. All hints visible in the key bar; no hidden shortcuts.

## Open decisions for the full pass

1. Accent: one fixed, or the picker shipped as a feature.
2. Default base: Hangar (dark) proposed; Codex for `/cv` only.
3. Wireframe: canvas 2D as in the mock, or Three.js with per-project models.
