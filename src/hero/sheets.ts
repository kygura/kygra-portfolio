/** Hero scene metadata. Kept free of three.js so the tabs can render
 *  before (or without) the lazily loaded engine. */
export interface SheetMeta {
  id: "ocean" | "sea" | "astral" | "ruins" | "rail" | "field" | "matrix" | "abyss" | "cliff" | "cipher";
  name: string;
  aria: string;
  /** Overrides the default drag/zoom hint under the tabs. */
  hint?: string;
  /** Set false to switch a scene off without deleting it. Disabled scenes are neither listed nor built. */
  enabled?: boolean;
}

const ALL_SHEETS: SheetMeta[] = [
  {
    id: "cipher",
    name: "Cipher",
    aria: "Interactive black field of random characters: the cursor lights and pushes the glyphs aside and rolls them like slot reels until they stop on words, and a click sends a pulse in the accent colour rippling out from where it landed.",
    hint: "HOVER TO DECODE \u00b7 CLICK TO PULSE",
  },
  {
    id: "ocean",
    enabled: false,
    name: "Ocean",
    aria: "Animated low-poly scene: an endless ocean with overgrown, half-drowned skyscrapers, palm islands and a wing-sail ship moored at a pier, under two setting suns.",
  },
  {
    id: "sea",
    name: "Sea",
    aria: "Animated low-poly scene: a lone stone causeway running out over an endless still sea toward a city skyline on the horizon, under two suns.",
  },
  {
    id: "astral",
    name: "Astral",
    aria: "Animated night sky: a ringed halo with orbiting glyphs, wireframe polyhedra, a watching eye figure and a moon with a satellite.",
  },
  {
    id: "ruins",
    name: "Ruins",
    aria: "Animated low-poly scene: misty forest ruins, a mossy stone circle around a shrine with a floating glowing crystal, rune lights and drifting wisps.",
  },
  {
    id: "rail",
    enabled: false,
    name: "Rail",
    aria: "Animated low-poly scene: a lone station platform in an endless still sea, a train arriving along a causeway over the water, a city skyline on the horizon, under two suns.",
  },
  {
    id: "field",
    name: "Field",
    aria: "Interactive low-poly relief map that behaves like a living field: tap or click to send a pulse rippling out through the contours, drag to pull the contour fabric and survey grid along, and move the cursor to lift a swell and leave a wake.",
    hint: "CLICK TO PULSE \u00b7 DRAG TO ORBIT \u00b7 SHIFT+DRAG TO WARP",
  },
  {
    id: "matrix",
    name: "Matrix",
    aria: "Animated black void: streams of random glyphs rain down in the dark around a slowly turning wireframe tesseract above a ticked ring and survey grid.",
  },
  {
    id: "abyss",
    enabled: false,
    name: "Abyss",
    aria: "Animated low-poly underground chamber after Hyper Light Drifter: a magenta diamond crystal hangs over a flooded rhombus dais, gripped by black roots that pulse with pink light, ringed by four seal pillars with cyan glyphs and beams, a sunken titan head and arm, ribs, broken columns and stasis tubes, and a small red-cloaked drifter.",
  },
  {
    id: "cliff",
    enabled: false,
    name: "Cliffs",
    aria: "Animated low-poly coast: a ruined stone city overgrown with trees on top of a sea cliff, a waterfall falling from the cliff face, a lighthouse and a broken bridge to a temple on a sea stack, above an open swell reaching to a low sun, with a drowned colossus head, a raised stone hand, a leaning tower and a line of arches standing in the water out to the horizon, and gulls circling.",
  },
];

export const SHEETS: SheetMeta[] = ALL_SHEETS.filter((s) => s.enabled !== false);

/** Tab number: scenes are numbered by position, so adding one renumbers the rest. */
export const sheetNo = (i: number) => String(i + 1).padStart(2, "0");
