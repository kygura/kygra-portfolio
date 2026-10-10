/** Hero scene metadata. Kept free of three.js so the tabs can render
 *  before (or without) the lazily loaded engine. */
export interface SheetMeta {
  id: "ruins" | "topo" | "astral";
  no: string;
  name: string;
  aria: string;
}

export const SHEETS: SheetMeta[] = [
  {
    id: "ruins",
    no: "01",
    name: "Ruins",
    aria: "Animated low-poly scene: forest ruins with broken columns, a collapsed arch and a fallen stone head under a starry sky.",
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
