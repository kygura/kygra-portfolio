/** Hero act metadata, in story order. Kept free of three.js so the tabs can
 *  render before (or without) the lazily loaded engine. */
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
    name: "Ping",
    aria: "Animated relief map with live contour lines: a scan sweeps the terrain, a pin drops beside a hollow, pings ring out and the view dives onto the marked spot.",
  },
  {
    id: "ruins",
    no: "02",
    name: "Sword",
    aria: "Animated low-poly scene: a cross-hilted sword set in a pedestal among forest ruins by a lake wakes and throws a column of light into the sky as the view rises away.",
  },
  {
    id: "astral",
    no: "03",
    name: "Eye",
    aria: "Animated solar system: the view pulls out from the third planet to the whole system as the column of light crosses it and reaches a giant eye above the ecliptic, which opens.",
  },
];
