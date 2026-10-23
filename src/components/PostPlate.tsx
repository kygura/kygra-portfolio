import { useMemo } from "react";

// The plate draws on a 16:10 sheet, the same shape as the software windows.
const W = 320;
const H = 200;

const KINDS = ["orbits", "sun", "contours", "strata"] as const;
type Kind = (typeof KINDS)[number];

const ROMAN: [number, string][] = [
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

function toRoman(n: number): string {
  let out = "";
  for (const [value, glyph] of ROMAN) {
    while (n >= value) {
      out += glyph;
      n -= value;
    }
  }
  return out;
}

/** FNV-1a, so a post keeps its plate across builds and reloads. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small, seedable, good enough for line art. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

type Line = { d: string; accent?: boolean; weight?: number; dash?: boolean };
type Figure = { lines: Line[]; dots: { x: number; y: number; r: number }[]; spin: boolean };

function orbits(r: () => number): Figure {
  const cx = 150 + r() * 80;
  const cy = 100;
  const R = 62 + r() * 18;
  const count = 3 + Math.floor(r() * 3);
  const tilt = r() * 180;
  const lean = 0.18 + r() * 0.3;
  const lines: Line[] = [
    { d: `M${f(cx - R)} ${cy}a${f(R)} ${f(R)} 0 1 0 ${f(R * 2)} 0a${f(R)} ${f(R)} 0 1 0 ${f(-R * 2)} 0`, weight: 1.4 },
  ];
  for (let i = 0; i < count; i++) {
    const ry = R * (lean + (i / count) * (1 - lean));
    const angle = tilt + (i * 180) / count;
    const rad = (angle * Math.PI) / 180;
    // An ellipse as two arcs, rotated by hand so the path stays self-contained.
    const sx = cx - R * Math.cos(rad);
    const sy = cy - R * Math.sin(rad);
    lines.push({
      d: `M${f(sx)} ${f(sy)}a${f(R)} ${f(ry)} ${f(angle)} 1 0 ${f(2 * R * Math.cos(rad))} ${f(2 * R * Math.sin(rad))}a${f(R)} ${f(ry)} ${f(angle)} 1 0 ${f(-2 * R * Math.cos(rad))} ${f(-2 * R * Math.sin(rad))}`,
      accent: i === count - 1,
      dash: i % 2 === 1,
    });
  }
  const dots = [0, 90, 180, 270].map((a) => ({
    x: cx + R * Math.cos((a * Math.PI) / 180),
    y: cy + R * Math.sin((a * Math.PI) / 180),
    r: 2.2,
  }));
  return { lines, dots, spin: true };
}

function sun(r: () => number): Figure {
  const cx = 140 + r() * 90;
  const cy = 90 + r() * 30;
  const core = 22 + r() * 12;
  const rays = 18 + Math.floor(r() * 14);
  const lines: Line[] = [
    { d: `M${f(cx - core)} ${f(cy)}a${f(core)} ${f(core)} 0 1 0 ${f(core * 2)} 0a${f(core)} ${f(core)} 0 1 0 ${f(-core * 2)} 0`, weight: 1.6 },
    {
      d: `M${f(cx - core * 0.62)} ${f(cy)}a${f(core * 0.62)} ${f(core * 0.62)} 0 1 0 ${f(core * 1.24)} 0a${f(core * 0.62)} ${f(core * 0.62)} 0 1 0 ${f(-core * 1.24)} 0`,
      dash: true,
    },
  ];
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const inner = core + 6;
    const outer = inner + 14 + r() * 48;
    lines.push({
      d: `M${f(cx + inner * Math.cos(a))} ${f(cy + inner * Math.sin(a))}L${f(cx + outer * Math.cos(a))} ${f(cy + outer * Math.sin(a))}`,
      accent: i % 5 === 0,
      weight: i % 2 ? 0.6 : 1,
    });
  }
  return { lines, dots: [{ x: cx, y: cy, r: 3.5 }], spin: true };
}

function contours(r: () => number): Figure {
  const cx = 130 + r() * 110;
  const cy = 85 + r() * 40;
  const rings = 6 + Math.floor(r() * 4);
  const harmonics = [2, 3, 5].map((k) => ({ k, amp: 0.06 + r() * 0.12, phase: r() * Math.PI * 2 }));
  const lines: Line[] = [];
  for (let i = 1; i <= rings; i++) {
    const base = i * (9 + r() * 2.5);
    const points: string[] = [];
    for (let s = 0; s <= 72; s++) {
      const t = (s / 72) * Math.PI * 2;
      // Outer rings wobble more, like ground falling away from a summit.
      const wobble = harmonics.reduce((sum, h) => sum + h.amp * (i / rings) * Math.sin(h.k * t + h.phase), 0);
      const rad = base * (1 + wobble);
      points.push(`${f(cx + rad * Math.cos(t) * 1.35)} ${f(cy + rad * Math.sin(t))}`);
    }
    lines.push({ d: `M${points.join("L")}Z`, accent: i === Math.ceil(rings / 2), weight: i % 4 === 0 ? 1.3 : 0.8 });
  }
  return { lines, dots: [{ x: cx, y: cy, r: 2.5 }], spin: false };
}

function strata(r: () => number): Figure {
  const rows = 9 + Math.floor(r() * 5);
  const freq = 0.018 + r() * 0.02;
  const shift = 0.25 + r() * 0.5;
  const amp = 6 + r() * 10;
  const gap = 150 / rows;
  const lines: Line[] = [];
  for (let i = 0; i < rows; i++) {
    const y0 = 30 + i * gap;
    const points: string[] = [];
    for (let x = 0; x <= W; x += 8) {
      // Swell in the middle of the sheet, flat at the margins.
      const envelope = Math.sin((x / W) * Math.PI);
      points.push(`${x} ${f(y0 + amp * envelope * Math.sin(x * freq + i * shift))}`);
    }
    lines.push({ d: `M${points.join("L")}`, accent: i === Math.floor(rows * 0.6), weight: i % 3 === 0 ? 1.2 : 0.7 });
  }
  const sx = 60 + r() * 200;
  const sr = 12 + r() * 8;
  lines.push({ d: `M${f(sx - sr)} 28a${f(sr)} ${f(sr)} 0 1 0 ${f(sr * 2)} 0a${f(sr)} ${f(sr)} 0 1 0 ${f(-sr * 2)} 0`, weight: 1.4 });
  return { lines, dots: [], spin: false };
}

const DRAW: Record<Kind, (r: () => number) => Figure> = { orbits, sun, contours, strata };

/** A coordinate stamp that reads like a survey reference, seeded like the rest. */
function stamp(r: () => number): string {
  const lat = (r() * 80).toFixed(2);
  const lon = (r() * 170).toFixed(2);
  return `${lat}°${r() > 0.5 ? "N" : "S"} ${lon}°${r() > 0.5 ? "E" : "W"}`;
}

type PostPlateProps = {
  slug: string;
  title: string;
  /** The post's place in the full index: numbers the plate and picks its figure. */
  plate: number;
  /** Its place on screen, for staggering the draw-in. */
  index: number;
};

/**
 * A drawn frontispiece for a post: one of a few figures from the hero's
 * cartographic vocabulary. Figures take turns down the index so neighbours
 * differ; the slug seeds the rest, so each essay keeps its own drawing.
 */
const PostPlate = ({ slug, title, plate: number, index }: PostPlateProps) => {
  const plate = useMemo(() => {
    const r = rng(hash(slug));
    const kind = KINDS[number % KINDS.length];
    return { kind, figure: DRAW[kind](r), stamp: stamp(r) };
  }, [slug, number]);

  const initial = title.trim().charAt(0).toUpperCase();

  return (
    <div className="post-plate" data-kind={plate.kind}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="post-plate__svg" aria-hidden="true">
        <g className="post-plate__figure" data-spin={plate.figure.spin}>
          {plate.figure.lines.map((line, i) => (
            <path
              key={i}
              d={line.d}
              pathLength={1}
              className="post-plate__line"
              data-accent={line.accent || undefined}
              data-dash={line.dash || undefined}
              strokeWidth={line.weight ?? 0.9}
              style={{ animationDelay: `${index * 80 + i * 25}ms` }}
            />
          ))}
          {plate.figure.dots.map((dot, i) => (
            <circle key={i} cx={dot.x} cy={dot.y} r={dot.r} className="post-plate__dot" />
          ))}
        </g>
        {/* Registration marks in two corners, as on the hero sheets. */}
        <path d="M12 12h18M12 12v18M308 188h-18M308 188v-18" className="post-plate__mark" />
      </svg>
      <span className="post-plate__initial" aria-hidden="true">
        {initial}
      </span>
      <span className="post-plate__no" aria-hidden="true">
        PL. {toRoman(number + 1)}
      </span>
      <span className="post-plate__stamp" aria-hidden="true">
        {plate.stamp}
      </span>
    </div>
  );
};

export default PostPlate;
