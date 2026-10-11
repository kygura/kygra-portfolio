/** Hero act metadata, in story order. Kept free of three.js so the tabs can
 *  render before (or without) the lazily loaded engine. */
export interface SheetMeta {
  id: "ruins" | "astral" | "topo";
  no: string;
  name: string;
  aria: string;
}

export const SHEETS: SheetMeta[] = [
  {
    id: "ruins",
    no: "01",
    name: "Sword",
    aria: "Animated low-poly scene: a cross-hilted sword set in a pedestal among forest ruins by a lake wakes and throws a column of light into the night sky.",
  },
  {
    id: "astral",
    no: "02",
    name: "Eye",
    aria: "Animated solar system seen from above: the column of light leaves the third planet and reaches a giant eye above the ecliptic, which opens.",
  },
  {
    id: "topo",
    no: "03",
    name: "Ping",
    aria: "Animated relief map with live contour lines: a scan sweeps the terrain, a pin drops beside a hollow and pings ring out from the marked spot.",
  },
];
