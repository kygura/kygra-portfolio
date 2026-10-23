/**
 * Pixel data for the moss golem: a pocket-sized Titan in the Hyper Light
 * Drifter mould (stone shell, one glowing eye in a dark visor, moss grown
 * over the crown and shoulders). Each part is a grid of palette keys; a
 * frame is composed from the parts, then given a 1px outline wherever a
 * pixel touches empty space, so the art itself never draws its own outline.
 */

export const W = 26;
export const H = 28;
/** The outline adds a pixel on every side. */
export const VIEW_W = W + 2;
export const VIEW_H = H + 2;

/** Palette. `e` (eye, rune) follows the site accent so a theme switch repaints it. */
export const PALETTE: Record<string, string> = {
  o: "#0b100f",
  d: "#46514f",
  s: "#6c7a75",
  l: "#97a49c",
  h: "#c3cbbf",
  g: "#3b5226",
  m: "#5d7a3a",
  M: "#8fa84a",
  y: "#c9d48a",
  v: "#121819",
  f: "#e5787f",
  F: "#f6c1bd",
  e: "var(--accent)",
  z: "color-mix(in srgb, var(--accent) 35%, #121819)",
  E: "#f6f8e4",
};

type Part = { x: number; y: number; rows: string[] };

const SPROUT: Part[] = [
  { x: 9, y: 0, rows: ["yM.My", ".MgM.", "..g.."] },
  { x: 9, y: 0, rows: [".yM.My", "..MgM", "..g.."] },
  // In bloom, while being petted.
  { x: 9, y: 0, rows: ["yMfMy", ".fFf.", "..g.."] },
];

const HEAD: Part = {
  x: 0,
  y: 3,
  rows: [
    "......gmMMMMMmg",
    "....gmMMyMMMMMMmgf",
    "...gMMMMMMmMMMMMMmg",
    "...mMmllhmmlhllmMMm",
    "...glhllllllllllsMmg",
    "...sllllvvvvvvvllssm",
    "...slllvvvvvvvvvlssd",
    "...slllvvvvvvvvvlssd",
    "...slllvvvvvvvvvlssd",
    "...sllllvvvvvvvllssd",
    "...slllllllllllllssg",
    "....dssssssssssssdg",
    "......dddsssssddd",
  ],
};

export type Eye = "open" | "blink" | "left" | "right" | "up" | "upleft" | "upright" | "big" | "happy" | "sleep";

const EYES: Record<Eye, Part> = {
  open: { x: 9, y: 9, rows: [".eEe.", "eEEEe", ".eEe."] },
  left: { x: 8, y: 9, rows: [".eEe.", "eEEEe", ".eEe."] },
  right: { x: 10, y: 9, rows: [".eEe.", "eEEEe", ".eEe."] },
  up: { x: 9, y: 8, rows: [".eEe.", "eEEEe", ".eEe."] },
  upleft: { x: 8, y: 8, rows: [".eEe.", "eEEEe", ".eEe."] },
  upright: { x: 10, y: 8, rows: [".eEe.", "eEEEe", ".eEe."] },
  blink: { x: 9, y: 10, rows: ["eEEEe"] },
  sleep: { x: 9, y: 11, rows: ["zzzzz"] },
  big: { x: 8, y: 8, rows: ["...e...", "..eEe..", ".eEEEe.", "..eEe..", "...e..."] },
  happy: { x: 9, y: 9, rows: [".eEe.", "eE.Ee", "e...e"] },
};

const BODY: Part = {
  x: 0,
  y: 16,
  rows: [
    "....gmmlhllllllsmg",
    "..lgMMmlhlllllsssg",
    ".lhmmllllllslllssd",
    ".lsg.lllllllsllssd",
    ".ls..dsllllllsssdd",
    ".ls..dsslllsssssdd",
    ".ls..ddsssssssssdd",
    ".hl...dddddddddddd",
    ".hhl..dds.....sdd",
    "......dds.....sdd",
    ".....hlsdd...hlsdd",
    ".....ddddd...ddddd",
  ],
};

/** The glyph on the chest, drawn apart so it can pulse on its own. */
export const RUNE: Part = { x: 9, y: 18, rows: [".e.", "eEe", ".e."] };

export type Arm = "down" | "up" | "wave";

const ARMS: Record<Arm, Part> = {
  down: {
    x: 18,
    y: 17,
    rows: ["ml.", "sdd", ".sd", ".sd", ".sd", ".sd", ".ld", "lld"],
  },
  up: {
    x: 18,
    y: 10,
    rows: ["...hhl", "...hld", "...ls", "...ls", "...ls", "...sd", "..lsd", "mls", "sd"],
  },
  wave: {
    x: 18,
    y: 10,
    rows: ["....hhl", "....hld", "...ls", "...ls", "...ls", "...sd", "..lsd", "mls", "sd"],
  },
};

export interface Pose {
  /** Head and sprout sink 1px on the down beat. */
  bob: 0 | 1;
  sprout: 0 | 1 | 2;
  eye: Eye;
  arm: Arm;
}

function stamp(grid: string[][], part: Part, dy = 0) {
  part.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      const y = part.y + j + dy;
      const x = part.x + i;
      if (c !== "." && y >= 0 && y < H && x >= 0 && x < W) grid[y][x] = c;
    }
  });
}

function outline(grid: string[][]): string[][] {
  const out = Array.from({ length: VIEW_H }, () => Array<string>(VIEW_W).fill("."));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[y + 1][x + 1] = grid[y][x];
  const filled = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < VIEW_W && y < VIEW_H && out[y][x] !== "." && out[y][x] !== "o";
  const edge: [number, number][] = [];
  for (let y = 0; y < VIEW_H; y++)
    for (let x = 0; x < VIEW_W; x++)
      if (out[y][x] === "." && (filled(x + 1, y) || filled(x - 1, y) || filled(x, y + 1) || filled(x, y - 1)))
        edge.push([x, y]);
  for (const [x, y] of edge) out[y][x] = "o";
  return out;
}

/** One SVG path per palette key, with horizontal runs merged into single rects. */
function toPaths(grid: string[][]): [string, string][] {
  const d: Record<string, string> = {};
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === c) end++;
      if (c !== ".") d[c] = (d[c] ?? "") + `M${x} ${y}h${end - x}v1h${x - end}z`;
      x = end;
    }
  });
  return Object.entries(d);
}

const cache = new Map<string, [string, string][]>();

/** Paths for a pose, keyed by palette letter. The rune is left out (see RUNE). */
export function frame(pose: Pose): [string, string][] {
  const key = `${pose.bob}${pose.sprout}${pose.eye}${pose.arm}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const grid = Array.from({ length: H }, () => Array<string>(W).fill("."));
  stamp(grid, BODY);
  stamp(grid, ARMS[pose.arm]);
  stamp(grid, HEAD, pose.bob);
  stamp(grid, SPROUT[pose.sprout], pose.bob);
  stamp(grid, EYES[pose.eye], pose.bob);
  const paths = toPaths(outline(grid));
  cache.set(key, paths);
  return paths;
}

/** The rune's pixels in view coordinates (the outline shifts everything by 1). */
export function runePaths(): [string, string][] {
  const grid = Array.from({ length: VIEW_H }, () => Array<string>(VIEW_W).fill("."));
  RUNE.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== ".") grid[RUNE.y + j + 1][RUNE.x + i + 1] = row[i];
  });
  return toPaths(grid);
}

/** A small pixel heart for the petting effect, in its own 7x6 view. */
export const HEART = toPaths(
  [".ff.ff.", "fFfffff", "fffffff", ".fffff.", "..fff..", "...f..."].map((r) => r.split("")),
);
