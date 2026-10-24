/** Hero scene metadata. Kept free of three.js so the tabs can render
 *  before (or without) the lazily loaded engine. */
export interface SheetMeta {
  id: "ocean" | "sea" | "astral" | "ruins" | "train" | "field" | "matrix" | "abyss" | "cliff" | "cipher";
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
    name: "Ocean",
    aria: "Animated low-poly scene: an endless ocean with overgrown, half-drowned skyscrapers, palm islands and the King of Red Lions, the lion-headed sailboat from The Wind Waker, moored at a pier, under two setting suns.",
  },
  {
    id: "sea",
    name: "Sea",
    aria: "Animated low-poly scene: an endless still sea with a city skyline of towers standing in it on the horizon, under two suns.",
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
    id: "train",
    name: "Train",
    aria: "Animated low-poly dream scene seen side on: a night train with lit windows runs on rails just under the surface of a still, glassy sea, past a drowned field of sharp, edged towers, leaning shards and blades, floating debris and shards hanging point-down in the air, through low mist under one pale sun on the horizon.",
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
    name: "Abyss",
    aria: "Animated low-poly underground chamber after Hyper Light Drifter: a magenta diamond crystal hangs over a flooded rhombus dais, gripped by black roots that pulse with pink light, ringed by four seal pillars with cyan glyphs and beams, a sunken titan head and arm, ribs, broken columns and stasis tubes, and a small red-cloaked drifter.",
  },
  {
    id: "cliff",
    name: "Cliffs",
    aria: "Animated low-poly mountain valley after Shadow of the Colossus and Hyper Light Drifter: layers of mist over a river, a pale stone tower on a mesa that climbs through the cloud ceiling with a magenta light at its crown, long arched bridges reaching it from the cliffs at different heights, one of them fallen in, a dead titan half-sunk in the valley floor, four seal pillars sending cyan beams into the clouds, birds circling the tower, a small red-cloaked drifter on the near bridge, and clear sky on the distant horizon.",
  },
];

export const SHEETS: SheetMeta[] = ALL_SHEETS.filter((s) => s.enabled !== false);

/** Tab number: scenes are numbered by position, so adding one renumbers the rest. */
export const sheetNo = (i: number) => String(i + 1).padStart(2, "0");
