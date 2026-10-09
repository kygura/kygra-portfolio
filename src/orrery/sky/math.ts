// Pure sky helpers (no three, no DOM) so node --test can cover them. Numbers are lifted from initSky() in
// design/mock/index.html; Sky.ts uses these instead of repeating them.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
/** Five sections, five regions (DESIGN A3): the orrery turns 72 degrees per section. */
export const SECTIONS = 5;
export const A72 = TAU / SECTIONS;
/** Internal heights for `:res` and the automatic step-down (DESIGN A2 drops 360). */
export const RES_STEPS = [120, 180, 240] as const;
export const TWEEN_FRAMES = 12;
export const TURN_FRAMES = 8;
export const FRAME_MS = 1000 / 30;

export const SKY_TOKENS = ["bg", "panel", "rule", "fg", "dim", "acc", "acc2", "glitch"] as const;
export type SkyTokenName = (typeof SKY_TOKENS)[number];
/** Palette tokens as CSS color strings (`#rrggbb`), read from the computed custom properties. */
export type SkyTokens = Record<SkyTokenName, string>;
export type Rgb = [number, number, number];
export type Vec3 = [number, number, number];

export interface CamGoal {
  t: Vec3;
  yaw: number;
  el: number;
  d: number;
}

/** Mobile (<640) renders at 120, everything else at 240. */
export const baseHeight = (vw: number): number => (vw < 640 ? 120 : 240);

/** Render-target width for an internal height, rounded to an even number (16:9 at 240 gives 426). */
export const targetWidth = (h: number, cw: number, ch: number): number => Math.round((h * cw) / ch / 2) * 2;

/**
 * Horizontal view offset as a fraction of the canvas width. Desktop shifts the orrery right by 12% so it
 * sits in the open sky; tablet centres it on the region right of the stack; mobile (the 4:3 band) has none.
 */
export function viewOffsetFrac(vw: number, cw: number, stackRight: number): number {
  if (vw < 640) return 0;
  if (vw < 1024) return (stackRight + cw) / 2 / cw - 0.5;
  return 0.12;
}

/** Next lower internal height, or the same one at the floor. */
export function stepDown(h: number): number {
  const i = (RES_STEPS as readonly number[]).indexOf(h);
  return i > 0 ? RES_STEPS[i - 1] : h;
}

/** Closest allowed internal height for `:res <h>`. */
export function clampRes(h: number): number {
  return RES_STEPS.reduce((best, s) => (Math.abs(s - h) < Math.abs(best - h) ? s : best), RES_STEPS[0] as number);
}

/** Wraps an angle into [-PI, PI). */
export const wrapAngle = (a: number): number => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

/** Shortest-path angle interpolation. */
export const angLerp = (a: number, b: number, k: number): number => a + wrapAngle(b - a) * k;

/** Orrery Y rotation that faces section `sec`, reached the short way round from `cur`. */
export const sectionRotation = (cur: number, sec: number): number => cur + wrapAngle(sec * A72 - cur);

/**
 * Camera goals per region. Section 0 frames the selected body (see bodyGoal). Notes faces the constellations,
 * links the totem, now the dead sun, and log (A3) the far side of the monolith, away from the key light, looking
 * down onto the ruin grid.
 */
const REGION_GOALS: readonly CamGoal[] = [
  { t: [0, 0, 0], yaw: 0, el: 14 * DEG, d: 6 },
  { t: [0, 2.5, 0], yaw: 0, el: -14 * DEG, d: 11 },
  { t: [0, -1, -4], yaw: 0, el: 5 * DEG, d: 10 },
  { t: [0, 2, -2], yaw: 0, el: 3 * DEG, d: 11 },
  { t: [0, 0, 0], yaw: Math.PI, el: 18 * DEG, d: 7.5 },
];

export function sectionGoal(sec: number): CamGoal {
  const g = REGION_GOALS[((sec % SECTIONS) + SECTIONS) % SECTIONS];
  return { t: [...g.t], yaw: g.yaw, el: g.el, d: g.d };
}

/** Frames a body at world position p: the camera swings 28 degrees past it so the body lands right of centre. */
export const bodyGoal = (p: Vec3): CamGoal => ({ t: [...p], yaw: Math.atan2(p[0], p[2]) + 28 * DEG, el: 16 * DEG, d: 6.5 });

export function lerpGoal(from: CamGoal, to: CamGoal, k: number): CamGoal {
  return {
    t: [0, 1, 2].map((i) => from.t[i] + (to.t[i] - from.t[i]) * k) as Vec3,
    yaw: angLerp(from.yaw, to.yaw, k),
    el: from.el + (to.el - from.el) * k,
    d: from.d + (to.d - from.d) * k,
  };
}

/** Orbit-camera position around target t. */
export function cameraPosition(t: Vec3, yaw: number, el: number, d: number): Vec3 {
  return [t[0] + Math.sin(yaw) * Math.cos(el) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(yaw) * Math.cos(el) * d];
}

/** Degrees to radians, snapped to 0.5 degree steps (pointer parallax). */
export const snapHalfDeg = (deg: number): number => (Math.round(deg * 2) / 2) * DEG;

/** Idle Lissajous drift: +-2 deg yaw over 20s, +-1 deg pitch over 10s. */
export const idleDrift = (t: number): { yaw: number; el: number } => ({
  yaw: 2 * DEG * Math.sin((TAU * t) / 20),
  el: 1 * DEG * Math.sin((TAU * t) / 10),
});

/** Dead-sun brightness: 4 quantized steps, 2s each (8s cycle). */
export const sunLevel = (t: number): number => [0.6, 0.8, 1, 0.8][Math.floor(t / 2) % 4];

/** Snaps a yaw to 45-degree steps (totem turning to face the camera). */
export const snap45 = (a: number): number => Math.round(a / (TAU / 8)) * (TAU / 8);

export const BODY_KINDS = 6;
export interface BodySpec {
  /** Ellipse semi-axes. */
  a: number;
  b: number;
  /** Orbit group rotation (x, y, z). */
  tilt: Vec3;
  scale: number;
  /** Angular speed, rad/s. Small-integer ratios so the sky has a rhythm. */
  w: number;
  phase: number;
  /** 0 tetra, 1 octa, 2 dodeca, 3 icosa, 4 low torus, 5 broken icosa. */
  kind: number;
}

/** Orbit and body parameters for project i. Kinds, scales and speeds cycle every 6 bodies. */
export function bodySpec(i: number): BodySpec {
  const k = i % BODY_KINDS;
  const a = 2.3 + i * 0.78;
  return {
    a,
    b: a * 0.72,
    tilt: [(i % 2 ? 1 : -1) * (5 + i * 2) * DEG, i * 1.05, ((i % 3) - 1) * 5 * DEG],
    scale: [0.42, 0.38, 0.5, 0.45, 0.6, 0.3][k],
    w: 0.02 * [4, 4, 3, 2, 2, 1][k],
    phase: i * 1.9,
    kind: k,
  };
}

/** Fake celestial coordinates for the HUD readout: RA in hours [0, 24), DEC in degrees. */
export function raDec(x: number, y: number, z: number): { ra: number; dec: number } {
  const len = Math.hypot(x, y, z);
  return { ra: (((Math.atan2(x, z) / TAU) * 24) % 24 + 24) % 24, dec: Math.asin(y / (len || 1)) / DEG };
}

export function hexToRgb(css: string): Rgb {
  const s = css.trim().replace(/^#/, "");
  const h = s.length === 3 ? [...s].map((c) => c + c).join("") : s.slice(0, 6);
  const n = Number.parseInt(h, 16);
  if (!/^[0-9a-f]{6}$/i.test(h) || Number.isNaN(n)) return [0, 0, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const luminance = (c: Rgb): number => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;

/** Rescales a token color to luminance l (channels clamped at 1). Material colors derive from palette tokens this way. */
export function tone(c: Rgb, l: number): Rgb {
  const k = l / Math.max(luminance(c), 0.02);
  return c.map((v) => Math.min(1, v * k)) as Rgb;
}

/** Order of the post-pass palette ramp, darkest to brightest. */
export const RAMP: readonly SkyTokenName[] = ["bg", "rule", "dim", "acc2", "acc"];

/**
 * CPU mirror of the post-pass palette lock: which ramp stop a scene luminance lands on for Bayer threshold t
 * (0..15/16). Returns -1 for the `fg` star-core stop (l > 0.95).
 */
export function rampIndex(l: number, bgL: number, t: number): number {
  if (l > 0.95) return -1;
  const ln = Math.max(l - bgL, 0) / (1 - bgL);
  return Math.max(0, Math.min(4, Math.floor(ln * 4 + t)));
}
