/** Hero scene metadata. Kept free of three.js so the tabs can render
 *  before (or without) the lazily loaded engine. */
export interface SheetMeta {
  id: "monument" | "topo" | "astral";
  no: string;
  name: string;
  aria: string;
}

export const SHEETS: SheetMeta[] = [
  {
    id: "monument",
    no: "01",
    name: "Monument",
    aria: "Animated low-poly scene: a pastel stone keep with towers, domes and a stair hovering above a still lake, mirrored in the water, with a small drift isle and mesas on the horizon.",
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
];
