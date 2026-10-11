/** Hero scene metadata. Kept free of three.js so the tabs can render
 *  before (or without) the lazily loaded engine. */
export interface SheetMeta {
  id: "ocean" | "topo" | "astral" | "ruins" | "rail";
  no: string;
  name: string;
  aria: string;
}

export const SHEETS: SheetMeta[] = [
  {
    id: "ocean",
    no: "01",
    name: "Ocean",
    aria: "Animated low-poly scene: an endless ocean with overgrown, half-drowned skyscrapers, palm islands and a wing-sail ship moored at a pier, under two setting suns.",
  },
  {
    id: "topo",
    no: "02",
    name: "Topo",
    aria: "Animated low-poly relief map: a shifting terrain drawn with live contour lines, a survey grid and a sweeping scan.",
  },
  {
    id: "astral",
    no: "03",
    name: "Astral",
    aria: "Animated night sky: a ringed halo with orbiting glyphs, wireframe polyhedra, a watching eye figure and a moon with a satellite.",
  },
  {
    id: "ruins",
    no: "04",
    name: "Ruins",
    aria: "Animated low-poly scene: misty forest ruins, a mossy stone circle around a shrine with a floating glowing crystal, rune lights and drifting wisps.",
  },
  {
    id: "rail",
    no: "05",
    name: "Rail",
    aria: "Animated low-poly scene: a lone station platform in an endless still sea, a train arriving along a causeway over the water, abstract megastructures on the horizon, under two suns.",
  },
];
