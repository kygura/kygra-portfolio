/** Hero scene metadata. Kept free of three.js so the tabs can render
 *  before (or without) the lazily loaded engine. The order is the story's:
 *  the engine plays the chapters in turn on a timer and loops. */
export interface SheetMeta {
  id: "topo" | "ruins" | "astral";
  no: string;
  name: string;
  aria: string;
}

export const SHEETS: SheetMeta[] = [
  {
    id: "topo",
    no: "01",
    name: "Topo",
    aria: "Animated low-poly map: a signal pings a site on a contour-drawn world map, and the view zooms in and tilts until the site's relief rises as an isometric survey with live contour lines.",
  },
  {
    id: "ruins",
    no: "02",
    name: "Ruins",
    aria: "Animated low-poly scene: forest ruins round a lake, with a stone tower floating over the water. Its lantern charges and fires a beam of light into the sky as the camera pulls away.",
  },
  {
    id: "astral",
    no: "03",
    name: "Astral",
    aria: "Animated night sky: the beam crosses a solar system of polyhedral planets inside a ringed halo and reaches a great watching eye, which closes.",
  },
];
