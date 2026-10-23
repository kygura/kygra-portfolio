/**
 * The moss golem's renderer: a standing stone that woke up. One monolith
 * for head and body, a single glowing slit of an eye, a rune below it, two
 * block fists floating at its sides (in the manner of Hyper Light Drifter's
 * titans), stubby legs, and a moss cap with a sprout, drips and a blossom.
 *
 * It is drawn on a small grid and shown with big pixels, in a sharp,
 * minimal style: hard chamfered edges, flat two-tone shading (a lit face
 * and a shadow face, with a single highlight edge), a stepped moss cap and
 * a clean outline. Motion (breathing, the floating fists, the hop, the wave,
 * the gaze) is in whole pixels. The host scales the canvas up with
 * nearest-neighbour.
 */

export const GW = 30;
export const GH = 32;

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
const CRACK = px(hex("#141c1e"));
const STONE = ["#273436", "#43554f", "#6a7d70", "#a3b29a"].map((h) => px(hex(h)));
const MOSS = ["#2a4a2a", "#44712f", "#71a03b", "#b1cf5e"].map((h) => px(hex(h)));
const SOCKET = px(hex("#0c1213"));
const PETAL = px(hex("#e8579c"));
const PETAL_HI = px(hex("#ffb0d4"));
const SPORE = hex("#dceba4");
const INK = hex("#c9d0bf");
const DUST = hex("#728778");
const WHITE: RGB = [255, 255, 255];

const ZED = ["XXX", "..X", ".X.", "X..", "XXX"];

const hash = (x: number, s: number) => {
  let h = (x * 374761393 + s * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Stable noise for a pixel in a part's own coordinates. */
const noise = (x: number, y: number, s: number) => hash(x * 92821 + y * 68917, s);

interface Part {
  /** Edge metric for a part-local integer pixel: inside when ≤ 1 (before roughening). */
  metric: (lx: number, ly: number) => number;
  /** integer anchor of the part's own coordinates */
  ax: number;
  ay: number;
  /** half extents, for the shading normal */
  rx: number;
  ry: number;
  /** part-local box scanned around the anchor: x0, y0, x1, y1 */
  reach: [number, number, number, number];
  moss: [number, number];
  /** moss grows only on edges up to this part-local row (the cap, not the flanks) */
  mossTo?: number;
  dim: number;
  rough: number;
  seed: number;
  /** cracks: polylines in part coordinates */
  cracks?: [number, number][][];
}

// Part indices double as depth: a higher index sits in front.
const BODY = 2;

/** Moss drips down the body from the cap: [column offset from the body's centre, length]. */
const DRIPS: [number, number][] = [
  [-5, 2],
  [5, 4],
];

/** One clean seam across the stone, for a little character. */
const BODY_CRACKS: [number, number][][] = [[[3, 14], [5, 16]]];

export interface Pose {
  asleep: boolean;
  /** -1 left, 0 ahead, 1 right; null lets it glance around on its own */
  lookX: -1 | 0 | 1 | null;
  /** kept for the host's sake; this face has no room to look up */
  lookUp: boolean;
  /** squinting arc */
  happy: boolean;
  /** wide, bright eye (while it talks) */
  flare: boolean;
  /** right fist raised, to one side or the other; null = floating at its side */
  wave: 0 | 1 | null;
  /** extra blossoms open on the moss, 0–5 */
  bloom: number;
}

export interface Golem {
  /** advance one animation step (the host runs about 12 a second) */
  tick(): void;
  draw(pose: Pose): void;
  hop(): void;
  /** a burst of leaves off the moss cap */
  rustle(): void;
  setAccent(hex: string): void;
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

export function createGolem(canvas: HTMLCanvasElement, opts: { still?: boolean } = {}): Golem {
  canvas.width = GW;
  canvas.height = GH;
  const ctx = canvas.getContext("2d");
  const img = ctx ? ctx.createImageData(GW, GH) : null;
  const col = img ? new Uint32Array(img.data.buffer) : new Uint32Array(GW * GH);
  const id = new Int8Array(GW * GH);
  const mossK = new Uint8Array(GW * GH);
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
  let bodyX = 15;
  let bodyY = 7;
  const parts: Part[] = [];
  const particles: Particle[] = [];

  const spawn = (p: Omit<Particle, "max">) => {
    if (!still && particles.length < 30) particles.push({ ...p, max: p.life });
  };

  const HOP = [-1, -2, -2, -1, 0];

  const rect = (w: number, h: number) => (lx: number, ly: number) =>
    lx >= 0 && lx < w && ly >= 0 && ly < h
      ? Math.max(Math.abs(lx + 0.5 - w / 2) / (w / 2), Math.abs(ly + 0.5 - h / 2) / (h / 2))
      : 9;
  /** A square block centred on the anchor with its corner pixels cut. */
  const blob = (rx: number, ry: number) => (lx: number, ly: number) => {
    const dx = Math.abs(lx + 0.5) / rx;
    const dy = Math.abs(ly + 0.5) / ry;
    const corner = Math.abs(lx + 0.5) + Math.abs(ly + 0.5) > rx + ry - 1.2;
    return corner ? 9 : Math.max(dx, dy);
  };

  function build(b: number, j: number, wave: 0 | 1 | null) {
    parts.length = 0;
    const Y = j;
    const float = (phase: number) => (still ? 0 : Math.round(Math.sin(t * 0.12 + phase)));
    const add = (p: Omit<Part, "seed">) => parts.push({ ...p, seed: parts.length * 31 + 7 });
    // 0,1 legs: stubby blocks, mostly hidden behind the stone
    add({ metric: rect(4, 5), ax: 10, ay: 25 + Y, rx: 2, ry: 2.5, reach: [0, 0, 4, 5], moss: [0, 0], dim: 0.3, rough: 0 });
    add({ metric: rect(4, 5), ax: 17, ay: 25 + Y, rx: 2, ry: 2.5, reach: [0, 0, 4, 5], moss: [0, 0], dim: 0.35, rough: 0 });
    // 2 body: one monolith, narrower at the top, with rounded shoulders
    bodyX = 15;
    bodyY = 7 + Y + b;
    const H = 19;
    add({
      metric: (lx, ly) => {
        if (ly < 0 || ly >= H) return 9;
        // straight sides, flaring by a pixel at the base, with a two-step chamfer at the top
        let hw = ly >= H - 4 ? 8.5 : 7.5;
        if (ly < 2) hw -= 2 - ly;
        return Math.abs(lx + 0.5) / hw;
      },
      ax: bodyX,
      ay: bodyY,
      rx: 8,
      ry: H / 2,
      reach: [-10, 0, 10, H],
      moss: [2, 3],
      mossTo: 2,
      dim: 0,
      rough: 0,
      cracks: BODY_CRACKS,
    });
    // 3,4 floating boulder fists; the right one can rise and wave
    const fl = float(0);
    add({ metric: blob(2.7, 2.4), ax: 3, ay: 21 + Y + fl, rx: 2.7, ry: 2.4, reach: [-3, -3, 3, 3], moss: [1, 1], dim: 0.05, rough: 0 });
    if (wave === null) {
      const fr = float(2.1);
      add({ metric: blob(2.7, 2.4), ax: 27, ay: 21 + Y + fr, rx: 2.7, ry: 2.4, reach: [-3, -3, 3, 3], moss: [1, 1], dim: 0.15, rough: 0 });
    } else {
      add({ metric: blob(2.6, 2.4), ax: wave ? 27 : 26, ay: 9 + Y + b, rx: 2.6, ry: 2.4, reach: [-3, -3, 3, 3], moss: [1, 1], dim: 0, rough: 0 });
    }
  }

  function raster() {
    id.fill(-1);
    mossK.fill(0);
    col.fill(0);
    parts.forEach((p, i) => {
      const [x0, y0, x1, y1] = p.reach;
      for (let ly = y0 - 1; ly <= y1; ly++)
        for (let lx = x0 - 1; lx <= x1; lx++) {
          const x = p.ax + lx;
          const y = p.ay + ly;
          if (x < 0 || x >= GW || y < 0 || y >= GH) continue;
          const jitter = (noise(lx, ly, p.seed) - 0.5) * p.rough;
          if (p.metric(lx, ly) <= 1 + jitter) id[y * GW + x] = i;
        }
    });
  }

  const topOf = (part: number, x: number) => {
    for (let y = 0; y < GH; y++) if (id[y * GW + x] === part) return y;
    return -1;
  };

  function shade() {
    // moss: clumps of uneven depth on every upward-facing edge
    for (let p = 0; p < GW * GH; p++) {
      const i = id[p];
      if (i < 0) continue;
      const part = parts[i];
      const x = p % GW;
      const y = (p - x) / GW;
      if (part.moss[1] === 0 || (y > 0 && id[p - GW] >= i)) continue;
      if (part.mossTo !== undefined && y - part.ay > part.mossTo) continue;
      const [lo, hi] = part.moss;
      // stepped, not ragged: depth changes only every few columns
      const d = lo + Math.floor(noise(Math.floor((x - part.ax + 20) / 3), 0, part.seed + 2) * (hi - lo + 1));
      for (let k = 0; k < d; k++) {
        const q = p + k * GW;
        if (q < GW * GH && id[q] === i && !mossK[q]) mossK[q] = k + 1;
      }
      mossTops.push(p);
    }
    for (let p = 0; p < GW * GH; p++) {
      const i = id[p];
      if (i < 0) continue;
      const part = parts[i];
      const x = p % GW;
      const y = (p - x) / GW;
      const lx = x - part.ax;
      const ly = y - part.ay;
      if (mossK[p]) {
        const below = p + GW < GW * GH && id[p + GW] === i && !mossK[p + GW];
        col[p] = MOSS[mossK[p] === 1 ? 3 : below ? 1 : 2];
        continue;
      }
      const nx = (lx + 0.5 - (part.reach[0] + part.reach[2]) / 2) / part.rx;
      const ny = (ly + 0.5 - (part.reach[1] + part.reach[3]) / 2) / part.ry;
      // flat: a lit face and a shadow face, split a little right of centre
      let tone = nx > 0.3 + part.dim ? 1 : 2;
      // a single highlight edge on the lit side
      if (x > 0 && id[p - 1] !== i && nx < 0) tone = 3;
      if ((y > 0 && id[p - GW] > i) || (y > 1 && id[p - 2 * GW] > i)) tone = 0;
      col[p] = STONE[tone];
    }
    // cracks cut into the stone
    parts.forEach((part, i) => {
      for (const line of part.cracks ?? [])
        for (let s = 0; s < line.length - 1; s++) {
          const [ax, ay] = line[s];
          const [bx, by] = line[s + 1];
          const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
          for (let k = 0; k <= steps; k++) {
            const x = part.ax + Math.round(ax + ((bx - ax) * k) / steps);
            const y = part.ay + Math.round(ay + ((by - ay) * k) / steps);
            const p = y * GW + x;
            if (x >= 0 && x < GW && y >= 0 && y < GH && id[p] === i && !mossK[p]) col[p] = CRACK;
          }
        }
    });
  }

  function outline() {
    for (let p = 0; p < GW * GH; p++) {
      if (id[p] >= 0) continue;
      const x = p % GW;
      const y = (p - x) / GW;
      const touches =
        (x > 0 && id[p - 1] >= 0) ||
        (x < GW - 1 && id[p + 1] >= 0) ||
        (p >= GW && id[p - GW] >= 0) ||
        (p + GW < GW * GH && id[p + GW] >= 0);
      if (touches) col[p] = OUT;
    }
  }

  const put = (x: number, y: number, c: RGB, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= GW || y < 0 || y >= GH) return;
    const p = y * GW + x;
    if (a < 1 && col[p] >>> 24) {
      const d = col[p];
      const base: RGB = [d & 255, (d >> 8) & 255, (d >> 16) & 255];
      col[p] = px(mix(base, c, a));
    } else col[p] = px(c, a);
  };

  function shadow(j: number) {
    const s = -j;
    for (const [y, x0, x1] of [
      [30, 5 + s, 24 - s],
      [31, 8 + s, 21 - s],
    ])
      for (let x = x0; x <= x1; x++) if (!(col[y * GW + x] >>> 24)) col[y * GW + x] = px([4, 8, 9], 0.45);
  }

  function drips() {
    for (const [dx, len] of DRIPS) {
      const x = bodyX + dx;
      let y = -1;
      for (let yy = 0; yy < GH; yy++)
        if (id[yy * GW + x] === BODY && mossK[yy * GW + x]) y = yy;
        else if (y >= 0) break;
      if (y < 0) continue;
      for (let k = 1; k <= len; k++) {
        const p = (y + k) * GW + x;
        if (y + k >= GH || id[p] !== BODY) break;
        col[p] = MOSS[k === len ? 2 : 1];
      }
    }
  }

  function sprout(bloom: number) {
    const top = topOf(BODY, bodyX);
    if (top < 4) return;
    const sway = still ? 0 : Math.round(Math.sin(t * 0.1));
    const set = (x: number, y: number, c: number) => {
      if (x >= 0 && x < GW && y >= 0 && y < GH) col[y * GW + x] = c;
    };
    set(bodyX, top - 1, MOSS[1]);
    set(bodyX + (sway > 0 ? 1 : 0), top - 2, MOSS[1]);
    const cx = bodyX + sway;
    set(cx - 1, top - 3, MOSS[2]);
    set(cx - 2, top - 3, MOSS[3]);
    set(cx - 2, top - 4, MOSS[3]);
    set(cx + 1, top - 3, MOSS[2]);
    set(cx + 2, top - 4, MOSS[3]);
    if (bloom > 0) {
      set(cx, top - 3, PETAL);
      set(cx, top - 4, PETAL_HI);
    }
  }

  function flowers(bloom: number) {
    const spots = [-5, 4, -7, 7, -2, 2];
    const n = Math.min(spots.length, 1 + bloom);
    for (let f = 0; f < n; f++) {
      const x = bodyX + spots[f];
      const top = topOf(BODY, x);
      if (top < 1) continue;
      col[(top - 1) * GW + x] = f % 2 ? PETAL_HI : PETAL;
    }
  }

  function face(pose: Pose) {
    const ey = bodyY + 5;
    const look = asleep || pose.flare ? 0 : pose.lookX ?? idleLook;
    // a rough socket cut into the stone
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        if (Math.abs(dx) === 3 && dy !== 0) continue;
        const p = (ey + dy) * GW + bodyX + dx;
        if (id[p] === BODY && !mossK[p]) col[p] = SOCKET;
      }
    const ex = bodyX + look;
    // the socket is only three rows tall, so looking up stays a horizontal glance
    const y = ey;
    const hot = mix(accent, WHITE, 0.7);
    if (asleep) {
      put(ex, ey, accent, 0.35);
      return;
    }
    if (pose.happy) {
      put(ex - 1, y, hot);
      put(ex, y - 1, hot);
      put(ex + 1, y, hot);
      return;
    }
    if (t <= blinkUntil && !pose.flare) {
      for (let dx = -1; dx <= 1; dx++) put(ex + dx, y, accent, 0.3);
      return;
    }
    if (pose.flare) {
      for (let dx = -1; dx <= 1; dx++) {
        put(ex + dx, y - 1, accent, 0.4);
        put(ex + dx, y + 1, accent, 0.4);
      }
      put(ex - 2, y, accent);
      put(ex + 2, y, accent);
      for (let dx = -1; dx <= 1; dx++) put(ex + dx, y, hot);
      return;
    }
    put(ex, y - 1, accent, 0.35);
    put(ex, y + 1, accent, 0.35);
    put(ex - 2, y, accent, 0.5);
    put(ex + 2, y, accent, 0.5);
    put(ex - 1, y, accent);
    put(ex + 1, y, accent);
    put(ex, y, hot);
  }

  function rune(happy: boolean) {
    const cx = bodyX;
    const cy = bodyY + 12;
    const pulse = still ? 0.7 : 0.45 + 0.35 * Math.sin(t * 0.18) + (happy ? 0.3 : 0) - (asleep ? 0.3 : 0);
    const a = Math.max(0.15, Math.min(1, pulse));
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) put(cx + dx, cy + dy, accent, a * 0.6);
    put(cx, cy, mix(accent, WHITE, 0.4), a);
  }

  function drawParticles() {
    for (const q of particles) {
      const fade = Math.min(1, q.life / Math.min(10, q.max));
      if (q.kind === "spore") put(q.x, q.y, SPORE, (0.5 + 0.5 * Math.sin(q.life * 0.7)) * fade);
      else if (q.kind === "leaf") put(q.x, q.y, [113, 160, 59], fade);
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
          for (const s of [-1, 1]) spawn({ kind: "dust", x: 15 + s * 9, y: 29, vx: s * 0.3, vy: -0.12, life: 7 });
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
        if (Math.random() < 0.04 && mossTops.length) {
          const p = mossTops[Math.floor(Math.random() * mossTops.length)];
          spawn({
            kind: "spore",
            x: p % GW,
            y: Math.floor(p / GW) - 1,
            vx: (Math.random() - 0.5) * 0.1,
            vy: -0.08 - Math.random() * 0.06,
            life: 36 + Math.floor(Math.random() * 24),
          });
        }
      } else if (t % 30 === 0) {
        spawn({ kind: "z", x: 21, y: 4, vx: 0.08, vy: -0.14, life: 34 });
      }
      for (let k = particles.length - 1; k >= 0; k--) {
        const q = particles[k];
        q.x += q.vx;
        q.y += q.vy;
        if (q.kind === "leaf") {
          q.vy = Math.min(0.25, q.vy + 0.025);
          q.vx *= 0.95;
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
      const b = still ? 0 : (t % period < period / 2 ? 0 : 1) + (asleep ? 1 : 0);
      const j = hopAt >= 0 && hopAt < HOP.length ? HOP[hopAt] : 0;
      mossTops = [];
      build(b, j, pose.wave);
      raster();
      shade();
      outline();
      shadow(j);
      drips();
      sprout(pose.bloom);
      flowers(pose.bloom);
      rune(pose.happy);
      face(pose);
      drawParticles();
      ctx.putImageData(img, 0, 0);
    },
    hop() {
      if (!still && hopAt < 0) hopAt = 0;
    },
    rustle() {
      for (let k = 0; k < 5; k++) {
        const s = k % 2 ? 1 : -1;
        spawn({
          kind: "leaf",
          x: 15 + s * (3 + Math.random() * 5),
          y: 6,
          vx: s * (0.15 + Math.random() * 0.2),
          vy: -0.3 - Math.random() * 0.2,
          life: 22,
        });
      }
    },
    setAccent(h: string) {
      accent = hex(h);
    },
  };
}
