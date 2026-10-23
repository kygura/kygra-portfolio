/**
 * The moss golem's renderer: a pocket Titan in the Hyper Light Drifter
 * mould. A big rounded stone head with one diamond eye glowing in a dark
 * visor, a sprout and a thick moss cap on top, a small body carrying a
 * rune, and long thin arms hanging free; vines and pink blossoms grew over
 * it while it slept.
 *
 * Nothing here is a bitmap. Each frame the body is rasterised from a few
 * shapes into a GW×GH buffer, shaded per part from a top-left light (with a
 * checker dither at the band edges), mossed along every upward-facing edge,
 * outlined, then decorated (sprout, vines, blossoms, rune, visor and eye,
 * particles). Breathing, the hop, the wave and the gaze are integer offsets
 * on those shapes, so motion stays on the pixel grid. The host scales the
 * canvas up with nearest-neighbour.
 */

export const GW = 52;
export const GH = 59;
/** Vertical offset of the whole figure in the buffer (trims empty rows above). */
const BASE = 4;

type Shape =
  | { k: "ell" | "sup"; cx: number; cy: number; rx: number; ry: number }
  | { k: "rect"; x0: number; y0: number; x1: number; y1: number };

interface Part {
  shapes: Shape[];
  /** shading frame: normals are taken relative to this box */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** moss depth range on upward-facing edges (0,0 = bare) */
  moss: [number, number];
  /** pushes the whole part toward shadow */
  dim: number;
  seed: number;
}

interface Particle {
  kind: "spore" | "z" | "leaf" | "dust";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

type RGB = [number, number, number];

const hex = (h: string): RGB => {
  const n = Number.parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
// ImageData is RGBA bytes; on little-endian hardware a Uint32 view reads ABGR.
const px = (c: RGB, a = 1) => ((Math.round(a * 255) << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;

const OUT = px(hex("#0a0f10"));
const CONTACT = px(hex("#131b1d"));
const STONE = ["#223033", "#3a4c4e", "#5f7571", "#97ab95"].map((h) => px(hex(h)));
const MOSS = ["#26452a", "#3d6a33", "#68983d", "#a5c659"].map((h) => px(hex(h)));
const VISOR = hex("#0d1416");
const PETAL = px(hex("#e8579c"));
const PETAL_HI = px(hex("#ffb0d4"));
const SPORE = hex("#dceba4");
const INK = hex("#c9d0bf");
const DUST = hex("#728778");
const WHITE: RGB = [255, 255, 255];

const ZED = ["XXXX", "..X.", ".X..", "XXXX"];

/** Stable per-column noise, so the moss line doesn't crawl between frames. */
const hash = (x: number, s: number) => {
  let h = (x * 374761393 + s * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const inside = (s: Shape, x: number, y: number) => {
  if (s.k === "rect") return x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1;
  const dx = (x + 0.5 - s.cx) / s.rx;
  const dy = (y + 0.5 - s.cy) / s.ry;
  return s.k === "ell" ? dx * dx + dy * dy <= 1 : dx ** 4 + dy ** 4 <= 1;
};

const bounds = (s: Shape) =>
  s.k === "rect"
    ? [s.x0, s.y0, s.x1, s.y1]
    : [Math.floor(s.cx - s.rx), Math.floor(s.cy - s.ry), Math.ceil(s.cx + s.rx), Math.ceil(s.cy + s.ry)];

// Part indices double as depth: a higher index sits in front.
const TORSO = 6;
const SHOULDER_L = 7;
const SHOULDER_R = 8;
const HEAD = 10;

/** Vines hang from the underside of these parts: [part, column, length]. */
const VINES: [number, number, number][] = [
  [HEAD, 14, 5],
  [HEAD, 38, 7],
  [SHOULDER_L, 9, 4],
  [SHOULDER_R, 43, 3],
  [TORSO, 20, 2],
];

/** What the host wants shown this frame. */
export interface Pose {
  asleep: boolean;
  /** -1 left, 0 ahead, 1 right; null lets it glance around on its own */
  lookX: -1 | 0 | 1 | null;
  lookUp: boolean;
  /** squinting arc */
  happy: boolean;
  /** wide, bright eye (while it talks) */
  flare: boolean;
  /** right arm raised, fist to one side or the other; null = resting */
  wave: 0 | 1 | null;
  /** extra blossoms open on the moss, 0–5 */
  bloom: number;
}

export interface Golem {
  /** advance one animation step (the host runs about 12 a second) */
  tick(): void;
  draw(pose: Pose): void;
  hop(): void;
  /** a burst of leaves off the pauldrons */
  rustle(): void;
  setAccent(hex: string): void;
}

export function createGolem(canvas: HTMLCanvasElement, opts: { still?: boolean } = {}): Golem {
  canvas.width = GW;
  canvas.height = GH;
  const ctx = canvas.getContext("2d");
  const img = ctx ? ctx.createImageData(GW, GH) : null;
  const col = img ? new Uint32Array(img.data.buffer) : new Uint32Array(GW * GH);
  const id = new Int8Array(GW * GH);
  const mossK = new Uint8Array(GW * GH);
  const fixed = new Uint32Array(GW * GH);
  const still = !!opts.still;

  let accent = hex("#bcc77c");
  let t = 0;
  let asleep = false;
  let idleLook = 0;
  let nextGlance = 40;
  let nextBlink = 30;
  let blinkUntil = -1;
  let hopAt = -1;
  let mossTops: number[] = [];
  const parts: Part[] = [];
  const particles: Particle[] = [];

  const spawn = (p: Omit<Particle, "max">) => {
    if (!still && particles.length < 40) particles.push({ ...p, max: p.life });
  };

  const HOP = [-1, -2, -3, -3, -2, -1, 0];

  function build(b: number, hb: number, j: number, wave: 0 | 1 | null) {
    const Y = BASE + j;
    parts.length = 0;
    const part = (shapes: Shape[], box: [number, number, number, number], moss: [number, number], dim = 0) =>
      parts.push({ shapes, cx: box[0], cy: box[1], rx: box[2], ry: box[3], moss, dim, seed: parts.length * 31 + 7 });
    // 0,1 legs: stubby, with flat feet, mostly behind the torso
    part([{ k: "rect", x0: 18, y0: 45 + Y, x1: 21, y1: 50 + Y }, { k: "rect", x0: 16, y0: 49 + Y, x1: 22, y1: 51 + Y }], [19, 48 + Y, 4, 4], [0, 1], 0.3);
    part([{ k: "rect", x0: 31, y0: 45 + Y, x1: 34, y1: 50 + Y }, { k: "rect", x0: 30, y0: 49 + Y, x1: 36, y1: 51 + Y }], [33, 48 + Y, 4, 4], [0, 1], 0.3);
    // 2,3 long thin arms hanging free of the body; the right one can wave
    part([{ k: "ell", cx: 8, cy: 39 + Y + b, rx: 2.8, ry: 9 }], [8, 39 + Y, 2.8, 9], [0, 1], 0.1);
    if (wave === null) part([{ k: "ell", cx: 44, cy: 39 + Y + b, rx: 2.8, ry: 9 }], [44, 39 + Y, 2.8, 9], [0, 1], 0.2);
    else part([{ k: "ell", cx: 46.5, cy: 23 + Y + b, rx: 2.6, ry: 8 }], [46.5, 23 + Y, 2.6, 8], [0, 1], 0.05);
    // 4,5 hands, near the ground
    part([{ k: "sup", cx: 8, cy: 48.5 + Y + b, rx: 3.6, ry: 2.8 }], [8, 48.5 + Y, 3.6, 2.8], [0, 1]);
    if (wave === null) part([{ k: "sup", cx: 44, cy: 48.5 + Y + b, rx: 3.6, ry: 2.8 }], [44, 48.5 + Y, 3.6, 2.8], [0, 1], 0.1);
    else {
      const hx = wave ? 47.5 : 45.5;
      part([{ k: "sup", cx: hx, cy: 13 + Y + b, rx: 3.4, ry: 3 }], [hx, 13 + Y + b, 3.4, 3], [1, 2]);
    }
    // 6 torso: a rounded box carrying the rune
    part([{ k: "sup", cx: 26, cy: 38 + Y + b, rx: 11.5, ry: 9 }], [26, 38 + Y + b, 11.5, 9], [1, 1], 0.05);
    // 7,8 small pauldrons where the arms meet the body, mossed over
    part([{ k: "ell", cx: 11.5, cy: 31 + Y + b, rx: 5, ry: 3.5 }], [11.5, 31 + Y + b, 5, 3.5], [1, 3]);
    part([{ k: "ell", cx: 40.5, cy: 31 + Y + b, rx: 5, ry: 3.5 }], [40.5, 31 + Y + b, 5, 3.5], [1, 3], 0.1);
    // 9 neck
    part([{ k: "rect", x0: 22, y0: 26 + Y + b, x1: 30, y1: 30 + Y + b }], [26, 28 + Y, 5, 3], [0, 0], 0.35);
    // 10 head: big and rounded, with a thick moss cap
    part([{ k: "sup", cx: 26, cy: 16 + Y + hb, rx: 15, ry: 11.5 }], [26, 16 + Y + hb, 15, 11.5], [2, 6]);
  }

  function raster() {
    id.fill(-1);
    mossK.fill(0);
    fixed.fill(0);
    col.fill(0);
    parts.forEach((p, i) => {
      for (const s of p.shapes) {
        const [x0, y0, x1, y1] = bounds(s);
        for (let y = Math.max(0, y0); y <= Math.min(GH - 1, y1); y++)
          for (let x = Math.max(0, x0); x <= Math.min(GW - 1, x1); x++) if (inside(s, x, y)) id[y * GW + x] = i;
      }
    });
  }

  const topOf = (part: number, x: number) => {
    for (let y = 0; y < GH; y++) if (id[y * GW + x] === part) return y;
    return -1;
  };
  const bottomOf = (part: number, x: number) => {
    for (let y = GH - 1; y >= 0; y--) if (id[y * GW + x] === part) return y;
    return -1;
  };

  function sprout(bloom: number) {
    // A two-leaf sprout growing out of the moss cap; it flowers when petted.
    const top = topOf(HEAD, 26);
    if (top < 7) return;
    const sway = still ? 0 : Math.round(Math.sin(t * 0.09) * 0.8);
    const set = (x: number, y: number, c: number) => {
      if (x < 0 || x >= GW || y < 0 || y >= GH) return;
      id[y * GW + x] = HEAD;
      fixed[y * GW + x] = c;
    };
    set(26, top - 1, MOSS[0]);
    set(26, top - 2, MOSS[1]);
    set(26 + (sway > 0 ? 1 : sway < 0 ? -1 : 0), top - 3, MOSS[1]);
    const cx = 26 + sway;
    const leaf: [number, number, number][] = [
      [1, -4, 2], [2, -4, 2], [2, -5, 3], [3, -5, 3], [3, -6, 3], [4, -6, 3], [4, -5, 2],
    ];
    for (const [dx, dy, tone] of leaf) {
      set(cx + dx, top + dy, MOSS[tone]);
      set(cx - dx, top + dy, MOSS[Math.max(1, tone - 1)]);
    }
    if (bloom > 0) {
      set(cx, top - 4, PETAL);
      set(cx - 1, top - 5, PETAL);
      set(cx + 1, top - 5, PETAL);
      set(cx, top - 5, PETAL_HI);
      set(cx, top - 6, PETAL);
    }
  }

  function shade() {
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const p = y * GW + x;
        const i = id[p];
        if (i < 0) continue;
        const part = parts[i];
        // moss: every pixel whose upper neighbour is empty or behind it
        if (part.moss[1] > 0 && (y === 0 || id[p - GW] < i)) {
          const [lo, hi] = part.moss;
          const d = lo + Math.floor(hash(x, part.seed) * (hi - lo + 1));
          for (let k = 0; k < d; k++) {
            const q = p + k * GW;
            if (q < GW * GH && id[q] === i && !mossK[q]) mossK[q] = k + 1;
          }
          if (d > 0 && y > 0 && id[p - GW] === -1 && hash(x, part.seed + 5) > 0.64) {
            id[p - GW] = i;
            mossK[p - GW] = 1;
          }
          mossTops.push(p);
        }
      }
    for (let p = 0; p < GW * GH; p++) {
      const i = id[p];
      if (i < 0) continue;
      const x = p % GW;
      const y = (p - x) / GW;
      const part = parts[i];
      const nx = Math.max(-1, Math.min(1, (x + 0.5 - part.cx) / part.rx));
      const ny = Math.max(-1, Math.min(1, (y + 0.5 - part.cy) / part.ry));
      if (fixed[p]) {
        col[p] = fixed[p];
        continue;
      }
      if (mossK[p]) {
        const k = mossK[p];
        const d = part.moss[0] + Math.floor(hash(x, part.seed) * (part.moss[1] - part.moss[0] + 1));
        let tone = 3 - (k - 1) - (nx > 0.35 ? 1 : 0) - (k === d && k > 1 ? 1 : 0);
        if (k === 1 && hash(x, part.seed + 11) > 0.8) tone = 3;
        col[p] = MOSS[Math.max(0, Math.min(3, tone))];
        continue;
      }
      let lit = 0.15 - 0.35 * nx - 0.95 * ny - part.dim;
      // cast shadow under anything in front
      if ((y > 0 && id[p - GW] > i) || (y > 1 && id[p - 2 * GW] > i)) lit -= 0.5;
      lit += (x + y) & 1 ? 0.04 : -0.04;
      const tone = lit > 0.5 ? 3 : lit > 0 ? 2 : lit > -0.45 ? 1 : 0;
      // weathering: sparse dark chips in the stone
      col[p] = hash(x * 7 + y, i * 13) > 0.985 ? STONE[Math.max(0, tone - 1)] : STONE[tone];
      // contact line where this part overlaps one behind it
      for (const q of [p - 1, p + 1, p - GW, p + GW]) {
        if (q >= 0 && q < GW * GH && id[q] >= 0 && id[q] < i && !mossK[p]) {
          col[p] = CONTACT;
          break;
        }
      }
    }
  }

  function outline() {
    for (let p = 0; p < GW * GH; p++) {
      if (id[p] >= 0) continue;
      const x = p % GW;
      if ((x > 0 && id[p - 1] >= 0) || (x < GW - 1 && id[p + 1] >= 0) || (p >= GW && id[p - GW] >= 0) || (p + GW < GW * GH && id[p + GW] >= 0))
        col[p] = OUT;
    }
  }

  const put = (x: number, y: number, c: RGB, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= GW || y < 0 || y >= GH) return;
    const p = y * GW + x;
    if (a < 1 && col[p] >>> 24) {
      // blend onto what's there
      const d = col[p];
      const base: RGB = [d & 255, (d >> 8) & 255, (d >> 16) & 255];
      col[p] = px(mix(base, c, a));
    } else col[p] = px(c, a);
  };

  function shadow(j: number) {
    const s = -j;
    const gy = 52 + BASE;
    for (const [y, x0, x1] of [
      [gy, 5 + s, 47 - s],
      [gy + 1, 11 + s, 41 - s],
    ]) {
      if (y >= GH) continue;
      for (let x = x0; x <= x1; x++) if (!(col[y * GW + x] >>> 24)) col[y * GW + x] = px([4, 8, 9], 0.45);
    }
  }

  function vines(wave: 0 | 1 | null) {
    for (const [part, x, len] of VINES) {
      const y0 = bottomOf(part, x);
      if (y0 < 0) continue;
      // a raised arm leaves the right pauldron's vines swinging free
      const swing = wave !== null && part === SHOULDER_R ? 1.6 : 0.9;
      for (let k = 1; k <= len; k++) {
        const sway = still ? 0 : Math.round(Math.sin(t * 0.13 + x) * swing * (k / len));
        const vx = x + sway;
        const vy = y0 + k;
        if (vy >= GH || vx < 0 || vx >= GW) continue;
        col[vy * GW + vx] = MOSS[k === len ? 2 : 1];
        if (k % 3 === 1 && k < len) {
          const lx = vx + (x % 2 ? 1 : -1);
          if (lx >= 0 && lx < GW) col[vy * GW + lx] = MOSS[2];
        }
      }
    }
  }

  function flowers(bloom: number) {
    // Hyper-light pink blossoms on the moss; petting opens more of them.
    const spots = [18, 34, 11, 41, 30, 21, 38];
    const n = Math.min(spots.length, 2 + bloom);
    for (let f = 0; f < n; f++) {
      const x = spots[f];
      let top = -1;
      for (let y = 0; y < GH; y++) {
        const i = id[y * GW + x];
        if (i >= 0 && mossK[y * GW + x]) {
          top = y;
          break;
        }
      }
      if (top < 1) continue;
      col[(top - 1) * GW + x] = PETAL;
      if (f % 2 === 0 && top > 1) col[(top - 2) * GW + x] = PETAL_HI;
    }
  }

  function face(hb: number, j: number, pose: Pose) {
    const Y = BASE + j;
    // the dark visor: a rounded slot across the face
    const vy = 16.5 + Y + hb;
    for (let y = Math.floor(vy - 6); y <= Math.ceil(vy + 6); y++)
      for (let x = 15; x <= 37; x++) {
        const p = y * GW + x;
        if (y < 0 || y >= GH || id[p] !== HEAD || mossK[p] || fixed[p]) continue;
        if (inside({ k: "sup", cx: 26, cy: vy, rx: 10.5, ry: 6 }, x, y)) col[p] = px(VISOR);
      }
    const look = asleep ? 0 : pose.lookX ?? idleLook;
    const cx = 26 + look * 4;
    const cy = Math.round(vy) + (pose.lookUp && !asleep ? -2 : 0);
    const hot = mix(accent, WHITE, 0.5);
    if (asleep) {
      for (let dx = -2; dx <= 2; dx++) put(cx + dx, cy + 1, accent, 0.35);
      return;
    }
    if (pose.happy) {
      for (const [dx, dy] of [[-3, 1], [-3, 0], [-2, -1], [-1, -2], [0, -2], [1, -2], [2, -1], [3, 0], [3, 1]]) put(cx + dx, cy + dy, hot);
      return;
    }
    if (t <= blinkUntil && !pose.flare) {
      for (let dx = -3; dx <= 3; dx++) put(cx + dx, cy, accent, Math.abs(dx) === 3 ? 0.4 : 0.9);
      return;
    }
    // a diamond eye: halo, ring, hot core (bigger while it talks)
    const r = pose.flare ? 3 : 2;
    for (let dy = -r - 1; dy <= r + 1; dy++)
      for (let dx = -r - 1; dx <= r + 1; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d === r + 1) put(cx + dx, cy + dy, accent, pose.flare ? 0.45 : 0.25);
        else if (d <= r - 1) put(cx + dx, cy + dy, hot);
        else if (d <= r) put(cx + dx, cy + dy, accent);
      }
  }

  function rune(b: number, j: number, happy: boolean) {
    const cx = 26;
    const cy = 38 + BASE + j + b;
    const pulse = still ? 0.7 : 0.45 + 0.35 * Math.sin(t * 0.18) + (happy ? 0.3 : 0) - (asleep ? 0.3 : 0);
    const a = Math.max(0.15, Math.min(1, pulse));
    for (const [dx, dy] of [[0, -2], [-2, 0], [2, 0], [0, 2]]) put(cx + dx, cy + dy, accent, a * 0.75);
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) put(cx + dx, cy + dy, accent, a * 0.35);
    put(cx, cy, mix(accent, WHITE, 0.4), a);
  }

  function drawParticles() {
    for (const q of particles) {
      const fade = Math.min(1, q.life / Math.min(10, q.max));
      if (q.kind === "spore") put(q.x, q.y, SPORE, (0.5 + 0.5 * Math.sin(q.life * 0.7)) * fade);
      else if (q.kind === "leaf") put(q.x, q.y, [104, 152, 61], fade);
      else if (q.kind === "dust") put(q.x, q.y, DUST, 0.7 * fade);
      else ZED.forEach((row, gy) => [...row].forEach((ch, gx) => ch === "X" && put(q.x + gx, q.y + gy, INK, fade * 0.75)));
    }
  }

  return {
    tick() {
      t++;
      if (hopAt >= 0) {
        hopAt++;
        if (hopAt === HOP.length) {
          hopAt = -1;
          for (const s of [-1, 1]) spawn({ kind: "dust", x: 26 + s * 18, y: 51 + BASE, vx: s * 0.35, vy: -0.15, life: 8 });
        }
      }
      if (!asleep) {
        if (t >= nextBlink) {
          blinkUntil = t + 1;
          nextBlink = t + (Math.random() < 0.2 ? 4 : 36 + Math.floor(Math.random() * 60));
        }
        if (t >= nextGlance) {
          idleLook = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1;
          nextGlance = t + 30 + Math.floor(Math.random() * 70);
        }
        if (Math.random() < 0.05 && mossTops.length) {
          const p = mossTops[Math.floor(Math.random() * mossTops.length)];
          spawn({ kind: "spore", x: p % GW, y: Math.floor(p / GW) - 1, vx: (Math.random() - 0.5) * 0.12, vy: -0.12 - Math.random() * 0.1, life: 40 + Math.floor(Math.random() * 30) });
        }
      } else if (t % 30 === 0) {
        spawn({ kind: "z", x: 36, y: 6, vx: 0.12, vy: -0.22, life: 44 });
      }
      for (let k = particles.length - 1; k >= 0; k--) {
        const q = particles[k];
        q.x += q.vx;
        q.y += q.vy;
        if (q.kind === "leaf") {
          q.vy = Math.min(0.35, q.vy + 0.03);
          q.vx *= 0.96;
        }
        if (--q.life <= 0 || q.y < -4 || q.y > GH) particles.splice(k, 1);
      }
    },
    draw(pose) {
      if (!ctx || !img) return;
      if (pose.asleep !== asleep) {
        asleep = pose.asleep;
        idleLook = 0;
        if (!asleep) nextBlink = t + 20;
      }
      const period = asleep ? 48 : 30;
      const b = still ? 0 : t % period < period / 2 ? 0 : -1;
      // the head lags the chest by a few frames, and droops in sleep
      const hb = (still ? 0 : (t + 4) % period < period / 2 ? 0 : -1) + (asleep ? 1 : 0);
      const j = hopAt >= 0 && hopAt < HOP.length ? HOP[hopAt] : 0;
      mossTops = [];
      build(b, hb, j, pose.wave);
      raster();
      sprout(pose.bloom);
      shade();
      outline();
      shadow(j);
      vines(pose.wave);
      flowers(pose.bloom);
      rune(b, j, pose.happy);
      face(hb, j, pose);
      drawParticles();
      ctx.putImageData(img, 0, 0);
    },
    hop() {
      if (!still && hopAt < 0) hopAt = 0;
    },
    rustle() {
      for (let k = 0; k < 6; k++) {
        const s = k % 2 ? 1 : -1;
        spawn({ kind: "leaf", x: 26 + s * (6 + Math.random() * 8), y: 10, vx: s * (0.2 + Math.random() * 0.3), vy: -0.4 - Math.random() * 0.3, life: 26 });
      }
    },
    setAccent(h: string) {
      accent = hex(h);
    },
  };
}
