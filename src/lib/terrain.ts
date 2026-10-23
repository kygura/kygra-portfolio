/**
 * Seeded geometry for the writings atlas: every essay gets the same contour
 * sigil and ridge noise on every visit, derived from its slug.
 */

/** FNV-1a: a small, stable 32-bit hash for seeding. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: deterministic floats in [0, 1). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fmt = (n: number) => n.toFixed(2);

export interface SigilRing {
  d: string;
  /** 0 = outermost, 1 = the summit ring. */
  depth: number;
}

export interface Sigil {
  rings: SigilRing[];
  summit: { x: number; y: number };
}

/**
 * Closed contour rings around a summit, like a single hill on a survey sheet.
 * Longer essays get more rings. Coordinates are in a 100×100 box.
 */
export function makeSigil(slug: string, readTime: number): Sigil {
  const rand = seeded(hashString(slug));
  const count = Math.max(3, Math.min(10, readTime + 2));
  const summit = { x: 42 + rand() * 16, y: 42 + rand() * 16 };
  // Three harmonics give each hill its own lopsided outline.
  const harmonics = [2, 3, 5].map((k) => ({ k, amp: 0.05 + rand() * 0.12, phase: rand() * Math.PI * 2 }));
  const lean = rand() * Math.PI * 2;

  const rings: SigilRing[] = [];
  for (let r = 0; r < count; r++) {
    const t = r / (count - 1);
    const radius = 44 - t * 38;
    // Inner rings drift toward the summit, outer ones toward the box centre.
    const cx = 50 + (summit.x - 50) * t + Math.cos(lean) * (1 - t) * 3;
    const cy = 50 + (summit.y - 50) * t + Math.sin(lean) * (1 - t) * 3;
    const steps = 48;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      let wobble = 1;
      for (const h of harmonics) wobble += h.amp * (1 - t * 0.6) * Math.sin(h.k * a + h.phase + r * 0.35);
      const x = cx + Math.cos(a) * radius * wobble;
      const y = cy + Math.sin(a) * radius * wobble;
      d += `${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`;
    }
    rings.push({ d: `${d}Z`, depth: t });
  }
  return { rings, summit };
}

export interface RidgePeak {
  x: number;
  y: number;
}

export interface Ridge {
  /** Closed area under the main ridge, for fill and clipping. */
  area: string;
  /** The ridge line itself. */
  line: string;
  /** Fainter ranges behind it, back to front. */
  backs: string[];
  peaks: RidgePeak[];
}

/**
 * An elevation profile with one summit per essay. Heights are given in [0, 1]
 * and laid out left to right in an evenly spaced band.
 */
export function makeRidge(
  heights: number[],
  seed: string,
  { width, height, padX, padTop, base }: { width: number; height: number; padX: number; padTop: number; base: number },
): Ridge {
  const rand = seeded(hashString(seed));
  const n = Math.max(1, heights.length);
  const span = width - padX * 2;
  const step = span / n;
  const centres = heights.map((_, i) => padX + step * (i + 0.5));
  const relief = base - padTop;
  const spread = step * 0.5;
  const phases = [rand() * 6, rand() * 6, rand() * 6];

  const elevation = (x: number, hs: number[], cs: number[], w: number) => {
    let e = 0;
    for (let i = 0; i < hs.length; i++) {
      const g = Math.exp(-(((x - cs[i]) / w) ** 2));
      e = Math.max(e, hs[i] * g);
    }
    // Low rolling ground so the valleys never sit flat on the baseline.
    const roll = 0.06 + 0.035 * Math.sin(x / 61 + phases[0]) + 0.02 * Math.sin(x / 23 + phases[1]);
    const grit = 0.008 * Math.sin(x / 4.3 + phases[2]) + 0.006 * Math.sin(x / 2.1);
    return Math.max(e, roll) + grit;
  };

  const sample = (hs: number[], cs: number[], w: number, scale: number, lift: number) => {
    const pts: string[] = [];
    for (let x = 0; x <= width; x += 4) {
      const y = base - lift - elevation(x, hs, cs, w) * relief * scale;
      pts.push(`${fmt(x)} ${fmt(y)}`);
    }
    return pts;
  };

  const main = sample(heights, centres, spread, 1, 0);
  const line = `M${main.join("L")}`;
  const area = `${line}L${width} ${height}L0 ${height}Z`;

  const backs = [0.7, 0.45].map((scale, layer) => {
    const hs = heights.map(() => 0.35 + rand() * 0.6);
    const cs = centres.map((c) => c + (rand() - 0.5) * step * 0.9);
    return `M${sample(hs, cs, spread * (1.3 + layer * 0.4), scale, 18 + layer * 16).join("L")}`;
  });

  const peaks = centres.map((x, i) => ({ x, y: base - elevation(x, heights, centres, spread) * relief }));

  return { area, line, backs, peaks };
}
