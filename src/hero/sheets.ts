/** Hero scene metadata. Kept free of three.js so the tabs can render
 *  before (or without) the lazily loaded engine. */
export interface SheetMeta {
  id: "ocean" | "topo" | "astral";
  no: string;
  name: string;
  aria: string;
}

export const SHEETS: SheetMeta[] = [
  {
    id: "ocean",
    no: "01",
    name: "Ocean",
    aria: "Animated low-poly seascape: an endless ocean with tilted, bent and toppled skyscrapers overgrown with vines, palm islands, futuristic wing-sail ships and two suns setting on the horizon.",
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
