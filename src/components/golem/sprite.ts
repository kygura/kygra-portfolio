/**
 * Moss golem sprite, drawn after Hyper Light Drifter's dead Titans: a
 * hunched stone colossus with boulder fists, a head sunk between its
 * shoulders and a single visor slit. Flat two-tone shading lit from above,
 * indigo outlines instead of black, desaturated teal stone against neon.
 *
 * Hand-placed pixels on a 28×29 grid, built from parts (sprout, head, arms,
 * torso, legs) so a pose is offsets and swaps rather than a drawing per
 * frame. Most rows are written as the left half and mirrored; blossoms and
 * vines break the symmetry afterwards.
 */

export const W = 28;
export const H = 29;

/** `e`/`E` are filled at draw time from the theme accent and also feed the bloom layer. */
export const PALETTE: Record<string, string> = {
  o: "#120e22", // outline — deep indigo, never black
  d: "#232c3d", // stone, deep shadow
  s: "#364856", // stone, shade
  S: "#56737a", // stone
  L: "#8db0aa", // stone, lit top planes
  m: "#12504a", // moss, shade
  M: "#1f8a62", // moss
  g: "#6edc84", // moss, lit
  v: "#0d3a36", // hanging vine
  f: "#ff5f9e", // blossom
  p: "#ffc0da", // blossom, lit
};

export type Grid = (string | null)[][];

const mirror = (rows: string[]) => rows.map((l) => l + [...l].reverse().join(""));

// Rows 5–11, sunk into the chest. Row 9 is the visor slit, redrawn per expression.
const HEAD = mirror([
  "...........ooo",
  "..........oggM",
  ".........omMMM",
  ".........odLLL",
  ".........osSSS",
  ".........odSSS",
  "..........oddd",
]);

// Rows 10–22: a broad chest wedge tapering to the waist. The ring on
// rows 15–17 is the chest glyph.
const TORSO = mirror([
  ".....ooooooooo",
  "....oMMggMMMgg",
  "....omMMMMmMMM",
  "....osLLLLLLLL",
  "....osSSSSSSSS",
  "....odSSSSSSSe",
  "....odsSSSSSeS",
  ".....odSSSSSSe",
  "......odSSSSSS",
  "......odsSSSSS",
  ".......oddssss",
  ".......ooddddd",
  "........oooooo",
]);

// Left arm, columns 0–8: mossy pauldron over the chest edge, then a long
// forearm down to a fist that nearly drags on the ground.
const SHOULDER = [
  "odLSSSLdo",
  "odSSSSSdo",
];
const PAULDRON = [
  "..ooooo..",
  ".oggMggo.",
  "oMMMMMMMo",
  "omMMmMMmo",
];
const FOREARM = [
  ".odSSSo..",
  ".odSLSo..",
  ".odSSSo..",
  ".odsSSo..",
];
const ARM_DOWN = [
  ...PAULDRON,
  ...SHOULDER,
  ...FOREARM,
  "odLLLLLo.",
  "odSSLSSo.",
  "odSSSSdo.",
  "oddsssdo.",
  ".oooooo..",
];
// Raised: fist overhead, the pauldron stays where it was (row 9).
const ARM_UP = [
  ".oooooo..",
  "odLLLLLo.",
  "odSSLSSo.",
  "oddsssdo.",
  ...FOREARM,
  ".odSSSo..",
  ".odSSoo..",
  ...PAULDRON.slice(1),
  ...SHOULDER,
];

// Left leg, columns 6–12 from row 22.
const LEG = [
  ".odSSo.",
  ".odSLo.",
  ".odSSo.",
  "odSSSSo",
  "oLLLLLo",
  "oddssso",
  ".ooooo.",
];

// Rows 1–4: a sapling with one blossom, swaying left, centre, right.
const SPROUT = [
  ["............f", "...........fpf", "............fm", "............gm"],
  [".............f", "............fpf", ".............fm", ".............mg"],
  ["..............f", ".............fpf", "..............f", ".............mg"],
].map((rows) => rows.map((r) => r.padEnd(W, ".")));

export type Visor = "open" | "blink" | "bright" | "dim";

export interface Pose {
  /** Head, torso and arms drop a pixel on the out-breath. */
  breath: 0 | 1;
  /** Lift per leg while walking: [left, right]. */
  legs: [number, number];
  arms: "down" | "up" | "wave";
  visor: Visor;
  /** Horizontal glance, -1…1 pixels. */
  look: number;
  sprout: 0 | 1 | 2;
  glyph: boolean;
}

function stamp(g: Grid, rows: string[], x: number, y: number, flip = false) {
  rows.forEach((row, j) => {
    const chars = flip ? [...row].reverse() : [...row];
    chars.forEach((c, i) => {
      const yy = y + j;
      const xx = x + i;
      if (c === "." || yy < 0 || yy >= H || xx < 0 || xx >= W) return;
      g[yy][xx] = c;
    });
  });
}

function dot(g: Grid, x: number, y: number, c: string) {
  if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = c;
}

export function compose(p: Pose): Grid {
  const g: Grid = Array.from({ length: H }, () => Array<string | null>(W).fill(null));
  const b = p.breath;

  // Legs first so the torso's bottom edge overlaps a lifted leg.
  stamp(g, LEG, 6, 22 - p.legs[0]);
  stamp(g, LEG, 15, 22 - p.legs[1], true);

  stamp(g, TORSO, 0, 10 + b);
  stamp(g, HEAD, 0, 5 + b);
  stamp(g, SPROUT[p.sprout], 0, 1 + b);

  const leftUp = p.arms !== "down";
  const rightUp = p.arms === "up";
  stamp(g, leftUp ? ARM_UP : ARM_DOWN, 0, (leftUp ? 0 : 9) + b);
  stamp(g, rightUp ? ARM_UP : ARM_DOWN, 19, (rightUp ? 0 : 9) + b, true);

  // Vines off the right forearm and the torso, moss on the left fist.
  if (!rightUp) {
    dot(g, 23, 15 + b, "v");
    dot(g, 23, 16 + b, "v");
    dot(g, 23, 17 + b, "m");
  }
  dot(g, 17, 18 + b, "m");
  dot(g, 17, 19 + b, "v");
  dot(g, 10, 20 + b, "M");
  dot(g, 11, 20 + b, "m");
  if (!leftUp) {
    dot(g, 2, 19 + b, "g");
    dot(g, 3, 19 + b, "M");
    dot(g, 4, 19 + b, "M");
  }

  // A blossom cluster on the left pauldron.
  const sy = 9 + b;
  dot(g, 2, sy, "f");
  dot(g, 3, sy - 1, "f");
  dot(g, 3, sy, "p");
  dot(g, 4, sy, "f");
  dot(g, 3, sy + 1, "f");
  dot(g, 6, sy, "f");

  if (!p.glyph) {
    for (let y = 10; y < H; y++) for (let x = 9; x < 19; x++) if (g[y][x] === "e") g[y][x] = "s";
  }

  // Visor: a slit across row 9, six pixels of glow with a two-pixel core.
  const vy = 9 + b;
  const look = Math.max(-1, Math.min(1, Math.round(p.look)));
  for (let x = 10; x < 18; x++) dot(g, x, vy, "o");
  if (p.visor === "open" || p.visor === "bright") {
    for (let x = 11; x < 17; x++) dot(g, x + look, vy, "e");
    const core = p.visor === "bright" ? [11, 12, 13, 14, 15, 16] : [13, 14];
    for (const x of core) dot(g, x + look, vy, "E");
  } else if (p.visor === "dim") {
    for (let x = 12; x < 16; x++) dot(g, x, vy, "s");
  }

  return g;
}

/**
 * Paints the sprite, and onto `bloom` only its emissive pixels — the page
 * blurs that layer and screens it over the sprite for the HLD glow.
 */
export function draw(
  ctx: CanvasRenderingContext2D,
  bloom: CanvasRenderingContext2D | null,
  grid: Grid,
  glow: string,
  flip: boolean
) {
  ctx.clearRect(0, 0, W, H);
  bloom?.clearRect(0, 0, W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = grid[y][x];
      if (!c) continue;
      const xx = flip ? W - 1 - x : x;
      const emissive = c === "e" || c === "E";
      ctx.fillStyle = c === "E" ? "#f4fffb" : c === "e" ? glow : PALETTE[c];
      ctx.fillRect(xx, y, 1, 1);
      if (bloom && (emissive || c === "f")) {
        bloom.fillStyle = c === "f" ? PALETTE.f : glow;
        bloom.fillRect(xx, y, 1, 1);
      }
    }
  }
}
