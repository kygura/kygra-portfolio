/** Hero scene metadata. Kept free of three.js so the tabs can render
 *  before (or without) the lazily loaded engine. */
export interface SheetMeta {
  id: "ocean" | "astral" | "ruins" | "rail" | "field" | "cipher";
  name: string;
  aria: string;
  /** Overrides the default drag/zoom hint under the tabs. */
  hint?: string;
}

export const SHEETS: SheetMeta[] = [
  {
    id: "ocean",
    name: "Ocean",
    aria: "Animated low-poly scene: an endless ocean with overgrown, half-drowned skyscrapers, palm islands and a wing-sail ship moored at a pier, under two setting suns.",
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
    id: "cipher",
    name: "Cipher",
    aria: "Interactive black field of random characters: the cursor lights and pushes the glyphs aside and rolls them like slot reels until they stop on words, and a click sends a pulse in the site's accent colours rippling out from where it landed.",
    hint: "HOVER TO DECODE \u00b7 CLICK TO PULSE",
  },
];

/** Tab number: scenes are numbered by position, so adding one renumbers the rest. */
export const sheetNo = (i: number) => String(i + 1).padStart(2, "0");
