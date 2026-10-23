/**
 * Mossback: a dormant stone titan, in the manner of the fallen giants in
 * Hyper Light Drifter: a hulking two-tone body lit from above, a small head
 * sunk between huge pauldrons, knuckles planted on the ground, one glowing
 * eye slit, and the moss, vines and a sapling that grew over it while it
 * slept.
 *
 * Nothing here is a bitmap. Each frame the body is rasterised from a handful
 * of shapes into a 52×56 buffer, shaded per part from a top-left light (with
 * a checker dither at the band edges), mossed along every upward-facing edge,
 * outlined, then decorated (vines, eye, rune, particles). Breathing, the hop
 * and the glance are integer offsets on those shapes, so the motion stays on
 * the pixel grid. The host scales the canvas up with nearest-neighbour.
 */

export const GW = 52;
export const GH = 56;

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
  kind: "spore" | "z" | "heart" | "leaf" | "dust";
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
const STONE = ["#1a2427", "#2d3c3f", "#4f6360", "#83977f"].map((h) => px(hex(h)));
const MOSS = ["#26452a", "#3d6a33", "#68983d", "#a5c659"].map((h) => px(hex(h)));
const VISOR = hex("#0d1416");
const BARK = px(hex("#57452f"));
const PETAL = px(hex("#e8579c"));
const PETAL_HI = px(hex("#ffb0d4"));
const SPORE = hex("#dceba4");
const INK = hex("#c9d0bf");
const DUST = hex("#728778");
const WHITE: RGB = [255, 255, 255];

const HEART = [".X.X.", "XXXXX", ".XXX.", "..X.."];
const ZED = ["XXXXX", "...X.", "..X..", ".X...", "XXXXX"];

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
const SHOULDER_L = 8;
const SHOULDER_R = 9;

/** Vines hang from the underside of these parts: [part, column, length]. */
const VINES: [number, number, number][] = [
  [SHOULDER_L, 9, 6],
  [SHOULDER_L, 17, 3],
  [SHOULDER_R, 35, 4],
  [SHOULDER_R, 42, 7],
  [2, 21, 2],
];

export type GolemMood = "awake" | "asleep";

export interface Golem {
  /** advance one animation step (the host runs about 12 a second) */
  tick(): void;
  draw(): void;
  pet(): void;
  wake(): void;
  sleep(): void;
  /** -1 left, 0 ahead, 1 right */
  look(dir: number): void;
  setAccent(hex: string): void;
  readonly mood: GolemMood;
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
  let mood: GolemMood = "awake";
  let lookDir = 0;
  let idleLook = 0;
  let nextGlance = 40;
  let nextBlink = 30;
  let blinkUntil = -1;
  let happyUntil = -1;
  let flareUntil = -1;
  let hop = -1;
  let bloom = 0;
  let mossTops: number[] = [];
  const parts: Part[] = [];
  const particles: Particle[] = [];

  const spawn = (p: Omit<Particle, "max">) => {
    if (!still && particles.length < 40) particles.push({ ...p, max: p.life });
  };

  const HOP = [-1, -2, -3, -3, -2, -1, 0];

  function build(b: number, hb: number, j: number) {
    const Y = 4 + j;
    parts.length = 0;
    const part = (shapes: Shape[], box: [number, number, number, number], moss: [number, number], dim = 0) =>
      parts.push({ shapes, cx: box[0], cy: box[1], rx: box[2], ry: box[3], moss, dim, seed: parts.length * 31 + 7 });
    // 0,1 legs: stubby columns behind the torso, mostly in its shadow
    part([{ k: "rect", x0: 19, y0: 37 + Y, x1: 23, y1: 45 + Y }, { k: "rect", x0: 17, y0: 43 + Y, x1: 24, y1: 45 + Y }], [21, 41 + Y, 5, 5], [0, 1], 0.35);
    part([{ k: "rect", x0: 28, y0: 37 + Y, x1: 32, y1: 45 + Y }, { k: "rect", x0: 27, y0: 43 + Y, x1: 34, y1: 45 + Y }], [30, 41 + Y, 5, 5], [0, 1], 0.35);
    // 2 torso: a broad barrel, hunched forward
    part([{ k: "ell", cx: 26, cy: 30 + Y + b, rx: 10.5, ry: 9 }], [26, 30 + Y + b, 10.5, 9], [1, 1], 0.1);
    // 3 head: small and boxy, sunk below the line of the shoulders
    part([{ k: "sup", cx: 26, cy: 20 + Y + hb, rx: 5.5, ry: 5 }], [26, 20 + Y + hb, 5.5, 5], [1, 3]);
    // 4,5 forearms: long enough that the knuckles rest on the ground
    part([{ k: "ell", cx: 11, cy: 32 + Y + b, rx: 3.6, ry: 8 }], [11, 32 + Y, 3.6, 8], [0, 1], 0.15);
    part([{ k: "ell", cx: 41, cy: 32 + Y + b, rx: 3.6, ry: 8 }], [41, 32 + Y, 3.6, 8], [0, 1], 0.15);
    // 6,7 fists
    part([{ k: "sup", cx: 11.5, cy: 41.5 + Y, rx: 5.5, ry: 4 }], [11.5, 41.5 + Y, 5.5, 4], [0, 2]);
    part([{ k: "sup", cx: 40.5, cy: 41.5 + Y, rx: 5.5, ry: 4 }], [40.5, 41.5 + Y, 5.5, 4], [0, 2]);
    // 8,9 pauldrons: domed, the biggest masses, carrying most of the growth
    part([{ k: "ell", cx: 13, cy: 20 + Y + b, rx: 8.5, ry: 6.5 }], [13, 20 + Y + b, 8.5, 6.5], [1, 5]);
    part([{ k: "ell", cx: 39, cy: 20 + Y + b, rx: 8.5, ry: 6.5 }], [39, 20 + Y + b, 8.5, 6.5], [1, 5]);
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

  function sapling() {
    // A young tree rooted in the left pauldron, leaning with the wind.
    const top = topOf(SHOULDER_L, 11);
    if (top < 6) return;
    const sway = still ? 0 : Math.round(Math.sin(t * 0.09) * 0.7);
    const set = (x: number, y: number, c: number) => {
      if (x < 0 || x >= GW || y < 0 || y >= GH) return;
      id[y * GW + x] = SHOULDER_L;
      fixed[y * GW + x] = c;
    };
    set(11, top - 1, BARK);
    set(11, top - 2, BARK);
    set(11 + (sway > 0 ? 1 : 0), top - 3, BARK);
    const cx = 11 + sway;
    const leaves = [
      [-1, -6], [0, -6], [1, -6],
      [-2, -5], [-1, -5], [0, -5], [1, -5], [2, -5],
      [-3, -4], [-2, -4], [-1, -4], [0, -4], [1, -4], [2, -4], [3, -4],
      [-2, -3], [-1, -3], [1, -3], [2, -3],
    ];
    for (const [dx, dy] of leaves) {
      const lit = dy <= -5 || (dy === -4 && dx < 0) ? (hash(dx + 9, dy + 3) > 0.4 ? 3 : 2) : dx > 1 || dy === -3 ? 1 : 2;
      set(cx + dx, top + dy, MOSS[lit]);
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

  const put = (x: number, y: number, c: RGB, a = 1, over = false) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= GW || y < 0 || y >= GH) return;
    const p = y * GW + x;
    if (!over && a < 1 && col[p] >>> 24) {
      // blend onto what's there
      const d = col[p];
      const base: RGB = [d & 255, (d >> 8) & 255, (d >> 16) & 255];
      col[p] = px(mix(base, c, a));
    } else col[p] = px(c, a);
  };

  function shadow(j: number) {
    const s = -j;
    const gy = 50;
    for (const [y, x0, x1] of [
      [gy, 8 + s, 43 - s],
      [gy + 1, 13 + s, 38 - s],
    ])
      for (let x = x0; x <= x1; x++) if (!(col[y * GW + x] >>> 24)) col[y * GW + x] = px([4, 8, 9], 0.45);
  }

  function vines() {
    for (const [part, x, len] of VINES) {
      const y0 = bottomOf(part, x);
      if (y0 < 0) continue;
      for (let k = 1; k <= len; k++) {
        const sway = still ? 0 : Math.round(Math.sin(t * 0.13 + x) * 0.9 * (k / len));
        const vx = x + sway;
        const vy = y0 + k;
        col[vy * GW + vx] = MOSS[k === len ? 2 : 1];
        if (k % 3 === 1 && k < len) {
          const lx = vx + (x % 2 ? 1 : -1);
          if (lx >= 0 && lx < GW) col[vy * GW + lx] = MOSS[2];
        }
      }
    }
  }

  function flowers() {
    // Hyper-light pink blossoms on the moss; a pet makes more of them open.
    const spots = [36, 41, 19, 31, 7, 44, 24];
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

  function face(hb: number, j: number) {
    const Y = 4 + j;
    const ey = 21 + Y + hb + (mood === "asleep" ? 1 : 0);
    const look = mood === "asleep" ? 0 : lookDir || idleLook;
    // the recessed face slot
    for (let y = ey - 1; y <= ey + 1; y++)
      for (let x = 22; x <= 29; x++) if (id[y * GW + x] === 3 && !mossK[y * GW + x]) col[y * GW + x] = px(VISOR);
    const x0 = 24 + look;
    const hot = mix(accent, WHITE, 0.45);
    if (t <= happyUntil) {
      for (const [dx, dy] of [[0, 0], [1, -1], [2, -1], [3, 0]]) put(x0 + dx, ey + dy, hot);
      return;
    }
    if (mood === "asleep") {
      put(x0 + 1, ey, accent, 0.4);
      put(x0 + 2, ey, accent, 0.4);
      return;
    }
    if (t <= blinkUntil) {
      for (let dx = 0; dx < 4; dx++) put(x0 + dx, ey, accent, 0.12);
      return;
    }
    const flare = t <= flareUntil;
    // glow inside the slot first, then the slit over it
    for (let dx = -2; dx <= 5; dx++) {
      put(x0 + dx, ey - 1, accent, flare ? 0.45 : 0.18);
      put(x0 + dx, ey + 1, accent, flare ? 0.45 : 0.18);
    }
    for (let dx = flare ? -1 : 0; dx < (flare ? 5 : 4); dx++) put(x0 + dx, ey, dx === 1 || dx === 2 ? hot : accent);
  }

  function rune(b: number, j: number) {
    const cx = 26;
    const cy = 32 + 4 + j + b;
    const pulse = still ? 0.7 : 0.45 + 0.35 * Math.sin(t * 0.18) + (t <= happyUntil ? 0.3 : 0);
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
      else {
        const glyph = q.kind === "heart" ? HEART : ZED;
        const c = q.kind === "heart" ? accent : INK;
        glyph.forEach((row, gy) =>
          [...row].forEach((ch, gx) => ch === "X" && put(q.x + gx, q.y + gy, c, fade * (q.kind === "z" ? 0.75 : 1))),
        );
      }
    }
  }

  function frame() {
    const period = mood === "asleep" ? 48 : 30;
    const b = still ? 0 : (t % period) < period / 2 ? 0 : -1;
    // the head lags the chest by a few frames, and droops in sleep
    const hb = (still ? 0 : ((t + 4) % period) < period / 2 ? 0 : -1) + (mood === "asleep" ? 1 : 0);
    const j = hop >= 0 && hop < HOP.length ? HOP[hop] : 0;
    mossTops = [];
    build(b, hb, j);
    raster();
    sapling();
    shade();
    outline();
    shadow(j);
    vines();
    flowers();
    rune(b, j);
    face(hb, j);
    drawParticles();
  }

  return {
    get mood() {
      return mood;
    },
    tick() {
      t++;
      if (hop >= 0) {
        hop++;
        if (hop === HOP.length) {
          hop = -1;
          for (const s of [-1, 1]) spawn({ kind: "dust", x: 26 + s * 18, y: 49, vx: s * 0.35, vy: -0.15, life: 8 });
        }
      }
      if (mood === "awake") {
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
        spawn({ kind: "z", x: 31, y: 17, vx: 0.12, vy: -0.22, life: 44 });
      }
      if (t % 600 === 0 && bloom > 0) bloom--;
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
    draw() {
      if (!ctx || !img) return;
      frame();
      ctx.putImageData(img, 0, 0);
    },
    pet() {
      if (mood === "asleep") this.wake();
      happyUntil = t + 18;
      bloom = Math.min(5, bloom + 1);
      if (hop < 0) hop = 0;
      spawn({ kind: "heart", x: 24, y: 12, vx: 0, vy: -0.28, life: 26 });
      for (let k = 0; k < 6; k++) {
        const s = k % 2 ? 1 : -1;
        spawn({ kind: "leaf", x: 26 + s * (8 + Math.random() * 6), y: 22, vx: s * (0.2 + Math.random() * 0.3), vy: -0.4 - Math.random() * 0.3, life: 26 });
      }
    },
    wake() {
      if (mood === "awake") return;
      mood = "awake";
      flareUntil = t + 8;
      nextBlink = t + 20;
    },
    sleep() {
      if (mood === "asleep") return;
      mood = "asleep";
      idleLook = 0;
    },
    look(dir: number) {
      lookDir = Math.max(-1, Math.min(1, Math.round(dir)));
    },
    setAccent(h: string) {
      accent = hex(h);
    },
  };
}
