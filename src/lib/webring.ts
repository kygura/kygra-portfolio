// Friends and contacts linked from the footer webring. The ring is circular:
// this site sits at SELF_URL, and prev/next wrap around the list.
export interface RingSite {
  name: string;
  url: string;
}

export const SELF_URL = "https://www.nca.ink";

export const WEBRING: RingSite[] = [
  { name: "nca.ink", url: SELF_URL },
  { name: "la charca profunda", url: "https://lacharcaprofunda.com" },
];

export function ringNeighbours(ring: RingSite[] = WEBRING, self = SELF_URL) {
  const i = Math.max(0, ring.findIndex((s) => s.url === self));
  const n = ring.length;
  return { prev: ring[(i - 1 + n) % n], next: ring[(i + 1) % n] };
}
