/**
 * The ruined unit's renderer. A small survey robot that broke down out in
 * the field a long time ago and is still, mostly, switched on: slumped on
 * its seat in the rubble, the top corner of its head sheared off, a crack
 * through the visor, one arm torn off and lying beside it with a wire
 * hanging from the socket, the other arm resting on the ground.
 *
 * It is drawn in the site's own terms rather than in colours of its own:
 * hairline outlines in the ink tokens over a fill a shade darker than the
 * ground, rules for seams and the ground line, and one lit thing, the eye
 * (and the core behind its open chest plate), in the accent. Every colour
 * is read from the CSS tokens, so it follows the 1–6 theme switch.
 *
 * Parts are stamped from character maps onto a small grid, every move is a
 * whole pixel, and the host scales the canvas up with nearest-neighbour.
 */

export const GW = 32;
export const GH = 32;

type RGB = [number, number, number];

/** Character keys of the maps below, resolved to the theme's colours. */
export interface Palette {
  /** outline: --ink-3 */
  o: RGB;
  /** lit edge: --ink-2 */
  h: RGB;
  /** brightest ink, for sparks and the antenna lamp: --ink */
  i: RGB;
  /** body fill, a little darker than the ground */
  f: RGB;
  /** seams, cracks, the ground line: --rule-2 */
  s: RGB;
  /** cavities: the visor, the chest recess, the empty socket */
  k: RGB;
  /** the eye and the core: --accent */
  a: RGB;
  /** a dim eye, a resting core, lichen on the metal: --accent-deep */
  d: RGB;
}

const hexRGB = (h: string, fallback: RGB): RGB => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return fallback;
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
const BLACK: RGB = [0, 0, 0];

/** Reads the palette off the document's current theme tokens. */
export function readPalette(el: Element = document.documentElement): Palette {
  const css = getComputedStyle(el);
  const get = (name: string, fallback: string) => hexRGB(css.getPropertyValue(name) || fallback, hexRGB(fallback, BLACK));
  const bg = get("--bg", "#111617");
  return {
    o: get("--ink-3", "#75817b"),
    h: get("--ink-2", "#aab1a7"),
    i: get("--ink", "#e0d9c8"),
    f: mix(bg, BLACK, 0.45),
    s: get("--rule-2", "#3d4b4d"),
    k: mix(bg, BLACK, 0.8),
    a: get("--accent", "#bcc77c"),
    d: get("--accent-deep", "#5d7a3a"),
  };
}

// ── The parts. `.` is transparent; any other character is a palette key. ──

/** Bent antenna with its lamp ('i' is swapped for the lamp's state). */
const ANTENNA = ["i..", ".o.", ".o.", "do."];

/** Head: the top-right corner sheared off, a crack down from the break into
 *  the visor, the visor's right end shattered, a grille below. */
const HEAD = [
  "oooooooo......",
  "ohhhhhhho.....",
  "offffffffo.o..",
  "offffffffsoko.",
  "ofkkkkkkkskkoo",
  "ofkkkkkkkkkk.o",
  "ofkkkkkkkkkkso",
  "offffffffffffo",
  "offsfsfsffffho",
  "oooooooooooooo",
];

const NECK = ["..oso.."];

/** Torso: chest plate open on the core, the right shoulder broken into an
 *  empty socket, a long seam cracking down the plate. */
const TORSO = [
  ".oooooooooooooo...",
  "ohhhhhhhhhhhhhhoo.",
  "offffffffffffffsko",
  "offooooooffffffkko",
  "offokkkkoffhffffko",
  "offokkkkoffffffffo",
  "offokkkkoffffffffo",
  "offokkkkofffsffffo",
  "offooooooffsfffffo",
  "offffffffffsffffho",
  "oooooooooooooooooo",
];

/** Left leg whole, the right one buckled to a stub. */
const LEGS = [
  "offfo...o.o..",
  "ofsfo...ofoo.",
  "ooooo..oooooo",
];

/** The arm it still has, hanging, hand flat on the ground. */
const ARM_DOWN = [
  ".oo.",
  "ohfo",
  "offo",
  "ofso",
  "oooo",
  "offo",
  "ohfo",
  "offo",
  "offo",
  "oooo",
  "ofhfo",
  "offfo",
  "ooooo",
];

/** The arm raised in a wave: up beside the head, palm out. Two frames. */
const ARM_UP = [
  [
    "ooooo...",
    "ohffo...",
    "offfo...",
    "ooooo...",
    ".ohfo...",
    ".offo...",
    ".offo...",
    ".oooo...",
    ".offo...",
    ".offoooo",
    ".ofhfffo",
    ".oooooo.",
  ],
  [
    ".ooooo..",
    ".ohffo..",
    ".offfo..",
    ".ooooo..",
    "..ohfo..",
    "..offo..",
    ".offo...",
    ".oooo...",
    ".offo...",
    ".offoooo",
    ".ofhfffo",
    ".oooooo.",
  ],
];

/** The torn-off forearm, lying on the ground, lichen growing on it. */
const LOST_ARM = ["....d.oo", "oooooodo", "ofhffffo", "oooooooo"];

/** Rubble and the ground line it sits on (drawn first, under everything). */
const GROUND: [string, number, number][] = [
  ["sssssssssssssssssss.sssss..sssss", 0, 29],
  ["oo", 1, 28],
  ["d", 3, 28],
  ["oo", 20, 28],
];

const ZED = ["ooo", "..o", ".o.", "o..", "ooo"];

// Anchors on the grid.
const HEAD_X = 10;
const HEAD_Y = 4;
const TORSO_X = 8;
const TORSO_Y = 15;

export interface Pose {
  asleep: boolean;
  /** -1 left, 0 ahead, 1 right; null lets it glance around on its own */
  lookX: -1 | 0 | 1 | null;
  lookUp: boolean;
  /** the eye curves into a smile */
  happy: boolean;
  /** bright, wide eye and a lit antenna (while it talks) */
  flare: boolean;
  /** arm raised in a wave, frame 0 or 1; null = resting */
  wave: 0 | 1 | null;
}

export interface Unit {
  /** advance one animation step (the host runs about 12 a second) */
  tick(): void;
  draw(pose: Pose): void;
  /** a jolt: the whole frame jumps a pixel and the wire sparks */
  jolt(): void;
  /** the wire in the empty socket throws sparks */
  spark(): void;
  setPalette(p: Palette): void;
}

interface Particle {
  kind: "spark" | "z" | "dust";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export function createUnit(canvas: HTMLCanvasElement, palette: Palette, opts: { still?: boolean } = {}): Unit {
  canvas.width = GW;
  canvas.height = GH;
  const ctx = canvas.getContext("2d");
  const img = ctx ? ctx.createImageData(GW, GH) : null;
  const grid: string[] = new Array(GW * GH).fill(".");
  const still = !!opts.still;

  let pal = palette;
  let t = 0;
  let idleLook = 0;
  let nextGlance = 40;
  let nextBlink = 30;
  let blinkUntil = -1;
  let joltAt = -1;
  let sparkUntil = -1;
  /** The servo in its neck gives now and then: the head sags a pixel, then catches. */
  let sagUntil = -1;
  let nextSag = 70;
  const particles: Particle[] = [];

  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && x < GW && y >= 0 && y < GH && c !== ".") grid[y * GW + x] = c;
  };
  /** `drop` lowers a column by a pixel or two: the head is drawn tilted with it. */
  const stamp = (rows: string[], x: number, y: number, drop?: (x: number) => number) => {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) set(x + i, y + j + (drop ? drop(x + i) : 0), row[i]);
    });
  };
  const spawn = (p: Particle) => {
    if (!still && particles.length < 24) particles.push(p);
  };

  /** End of the wire hanging from the socket, which sways a little. */
  const wireTip = (j: number) => ({ x: TORSO_X + 18 + (Math.sin(t * 0.2) > 0.6 ? 1 : 0), y: TORSO_Y + 7 + j });

  return {
    tick() {
      t++;
      if (t >= nextGlance) {
        idleLook = [-1, 0, 0, 1][Math.floor(Math.random() * 4)];
        nextGlance = t + 30 + Math.floor(Math.random() * 50);
      }
      if (t >= nextBlink) {
        blinkUntil = t + 2;
        nextBlink = t + 40 + Math.floor(Math.random() * 60);
      }
      if (t >= nextSag) {
        sagUntil = t + 14;
        nextSag = t + 80 + Math.floor(Math.random() * 90);
      }
      if (t < sparkUntil && Math.random() < 0.6) {
        const tip = wireTip(0);
        spawn({ kind: "spark", x: tip.x, y: tip.y, vx: (Math.random() - 0.3) * 0.9, vy: -0.4 - Math.random() * 0.8, life: 4 + Math.floor(Math.random() * 4) });
      }
      if (Math.random() < 0.03) {
        spawn({ kind: "dust", x: 4 + Math.random() * 24, y: 28, vx: (Math.random() - 0.5) * 0.15, vy: -0.12, life: 24 });
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.kind === "spark") p.vy += 0.18;
        if (--p.life <= 0) particles.splice(i, 1);
      }
    },

    draw(pose) {
      grid.fill(".");
      const j = t - joltAt < 3 && joltAt >= 0 ? -1 : 0;
      const asleep = pose.asleep;
      if (asleep && !still && t % 30 === 0) {
        spawn({ kind: "z", x: HEAD_X + 13, y: HEAD_Y - 1, vx: 0.08, vy: -0.12, life: 26 });
      }
      // Asleep, the head hangs a pixel low; awake, it sags only when the servo slips.
      const sag = asleep || (!still && t < sagUntil && !pose.flare) ? 1 : 0;

      for (const [row, x, y] of GROUND) stamp([row], x, y);
      stamp(LOST_ARM, 24, 25);

      stamp(LEGS, TORSO_X + 2, 26 + j);
      stamp(TORSO, TORSO_X, TORSO_Y + j);
      // The core: a slow pulse, steady while it talks, dim while it sleeps.
      const beat = still || pose.flare || Math.sin(t * 0.25) > -0.2;
      const core = asleep ? "d" : beat ? "a" : "d";
      stamp([core + core, core + core], TORSO_X + 5, TORSO_Y + 5 + j);
      // The wire hanging out of the socket.
      for (let k = 0; k < 4; k++) {
        const w = wireTip(k);
        set(w.x - (k === 3 ? 1 : 0), w.y + j, k === 3 && t < sparkUntil ? "i" : "o");
      }

      if (pose.wave === null) stamp(ARM_DOWN, TORSO_X - 4, TORSO_Y + 1 + j);
      else stamp(ARM_UP[pose.wave], TORSO_X - 8, TORSO_Y - 9 + j);

      const hy = HEAD_Y + j + sag;
      stamp(NECK, HEAD_X + 2, hy + 10);
      // The head hangs crooked, dropping toward the side that lost its arm.
      const tilt = (x: number) => Math.floor((x - HEAD_X) / 6);
      const head = (rows: string[], x: number, y: number) => stamp(rows, x, y, tilt);
      // The eye keeps its shape: it drops with the column it starts in.
      const eye = (rows: string[], x: number, y: number) => stamp(rows, x, y + tilt(x));
      head(HEAD, HEAD_X, hy);
      // The antenna lamp: lit while it talks, a slow blink otherwise, dark asleep.
      const lamp = pose.flare ? "a" : !asleep && t % 48 < 4 ? "d" : "o";
      head(ANTENNA.map((r) => r.replace("i", lamp)), HEAD_X + 2, hy - 4);

      // The eye: a lamp in the visor's left, working part.
      const ex = HEAD_X + 4 + (pose.lookX ?? (still ? 0 : idleLook)) * 2;
      const ey = hy + 4 + (pose.lookUp ? 0 : 1);
      if (asleep) {
        eye(["ddd"], HEAD_X + 3, hy + 6);
      } else if (pose.happy) {
        eye([".a.", "a.a"], ex, hy + 4);
      } else if (!still && t < blinkUntil) {
        eye(["aaa"], ex, hy + 5);
      } else if (pose.flare) {
        eye(["aaa", "aaa"], ex, ey - (pose.lookUp ? 0 : 1));
      } else {
        eye(["aa", "aa"], ex, ey);
      }

      for (const p of particles) {
        const x = Math.round(p.x);
        const y = Math.round(p.y);
        if (p.kind === "z") {
          const z = p.life > 13 ? ZED.map((r) => r.replace(/o/g, "s")) : ZED;
          stamp(z.slice(0, 5), x, y);
        } else if (p.kind === "spark") set(x, y, p.life > 3 ? "i" : "a");
        else set(x, y, "s");
      }

      if (!ctx || !img) return;
      const d = img.data;
      for (let n = 0; n < GW * GH; n++) {
        const c = grid[n];
        const o = n * 4;
        if (c === ".") {
          d[o + 3] = 0;
          continue;
        }
        const rgb = pal[c as keyof Palette] ?? pal.o;
        d[o] = rgb[0];
        d[o + 1] = rgb[1];
        d[o + 2] = rgb[2];
        d[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    },

    jolt() {
      joltAt = t;
      sagUntil = -1;
      this.spark();
    },

    spark() {
      sparkUntil = t + 8;
    },

    setPalette(p) {
      pal = p;
    },
  };
}
