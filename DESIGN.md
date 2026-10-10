# Design — "the index sheet"

## Concept: "the index sheet"
A two-colour risograph print, not a web app. Paper, ink, one fluorescent spot.
Everything is a list, a rule, or a block of type. No cards, no glass, no glow,
no gradients, no rounded-2xl, no Inter, no centered hero with gradient text.

The page should feel like a photocopied catalogue from a small press:
dense mono metadata, enormous condensed headlines bleeding off the edge,
hairline rules, numbered sections, a colophon that admits it was built by hand.

## Palette (two-colour riso)
- paper   #EEE8DA   (warm stock)
- ink     #15120F
- spot    #FF4A1A   (fluorescent orange — only for emphasis, rules, selection)
- mute    #7A7366   (secondary mono text)
Dark theme = literal inversion: ink paper, paper ink. Spot stays.

## Type
- display: Big Shoulders Display 900, uppercase, tight (-0.03em), very large (clamp 4rem..14rem)
- body:    Newsreader (serif) for prose / writings, 1.05rem, 1.6
- mono:    Space Mono for all metadata, nav, numbers, labels, 0.72rem uppercase tracking .14em

## Layout rules
- One grid: 12 cols, 1px gaps drawn as rules, max-width none (full-bleed), 24px gutters.
- Every section starts with a rule + a mono label: `§02 / WRITINGS` left, count right.
- Hero: name set as a poster, two lines, one word overflowing the viewport on purpose.
  Under it, a one-line statement in serif and a mono "fact strip" (location, time, status).
- Projects = index table. Row: No. | Title | Year | Discipline | ↗. Hover: row inverts to ink.
- Writings = logbook. Row: date (mono) | title (serif, large) | read time.
- Ticker: a 1-line orange marquee strip with mono text between sections (used once).
- Sticker: one rotated (-4deg) orange stamp, "OPEN FOR WORK / 2026".
- Footer = colophon: fonts used, hosted where, last commit short hash, webring, 88x31-style
  badge row, "no tracking".

## Texture / motion
- SVG feTurbulence grain at 6% opacity over the whole page.
- Images: grayscale + multiply blend + halftone dot pattern overlay; spot tint on hover.
- Motion budget: underline sweeps, row inversions, marquee. No scroll-fade on everything.
- Default cursor.

## Things explicitly banned
backdrop-blur, bg-gradient-to-*, text-transparent bg-clip-text, rounded-xl+ cards,
drop shadows with colour, hero orbs/blobs, "Crafted with ♥", three-column feature grids.
