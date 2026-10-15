/** Hero scene metadata. Kept free of three.js so the tabs can render
 *  before (or without) the lazily loaded engine. */
export interface SheetMeta {
  id: "ocean" | "astral" | "ruins" | "rail" | "field" | "sail";
  no: string;
  name: string;
  aria: string;
  /** Overrides the default drag/zoom hint under the tabs. */
  hint?: string;
}

export const SHEETS: SheetMeta[] = [
  {
    id: "ocean",
    no: "01",
    name: "Ocean",
    aria: "Animated low-poly scene: an endless ocean with overgrown, half-drowned skyscrapers, palm islands and a wing-sail ship moored at a pier, under two setting suns.",
  },
  {
    id: "astral",
    no: "02",
    name: "Astral",
    aria: "Animated night sky: a ringed halo with orbiting glyphs, wireframe polyhedra, a watching eye figure and a moon with a satellite.",
  },
  {
    id: "ruins",
    no: "03",
    name: "Ruins",
    aria: "Animated low-poly scene: misty forest ruins, a mossy stone circle around a shrine with a floating glowing crystal, rune lights and drifting wisps.",
  },
  {
    id: "rail",
    no: "04",
    name: "Rail",
    aria: "Animated low-poly scene: a lone station platform in an endless still sea, a train arriving along a causeway over the water, a city skyline on the horizon, under two suns.",
  },
  {
    id: "field",
    no: "05",
    name: "Field",
    aria: "Interactive low-poly relief map that behaves like a living field: tap or click to send a pulse rippling out through the contours, drag to pull the contour fabric and survey grid along, and move the cursor to lift a swell and leave a wake.",
    hint: "CLICK TO PULSE \u00b7 DRAG TO ORBIT \u00b7 SHIFT+DRAG TO WARP",
  },
  {
    id: "sail",
    no: "06",
    name: "Sail",
    aria: "Animated cel-shaded scene: a small red sailboat with a lion figurehead runs across a bright blue sea, throwing spray and a white wake, past islands of every biome, under floating sky ruins with waterfalls, voxel clouds, cyclones, airships, a winged galleon and hot-air balloons.",
  },
];
