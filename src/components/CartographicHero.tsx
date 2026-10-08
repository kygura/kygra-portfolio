import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

/**
 * Cartographic hero — animated topographic contour lines drawn with plain
 * canvas 2D (fBm value noise + marching squares), pointer ripples and
 * scroll parallax. All per-frame state lives in refs/locals; React never
 * re-renders during the animation loop.
 *
 * Performance shape:
 *  - The rAF loop runs every frame but only writes compositor-friendly
 *    transforms/opacity. The canvas repaint is throttled separately, so
 *    scroll parallax stays at display rate while the field costs far less.
 *  - Marching squares iterates cells once and visits only the contour
 *    levels that actually cross each cell, instead of sweeping every cell
 *    once per level. Segments accumulate into one Path2D per level.
 *  - Quality (grid pitch, DPR, level count, repaint rate) is picked from
 *    the device and steps down further if frames get expensive.
 */

const MOTION = 0.9;
// Flat page background — matches --bg-primary (Codex #ece3cd / Hangar #0f1114).
const DAY = { bg: [236, 227, 205], ink: [27, 26, 23] };
const NIGHT = { bg: [15, 17, 20], ink: [230, 223, 204] };
// Fallback accents (session ochre per base) when the root --accent can't be read.
const ACC_DAY = [185, 133, 14];
const ACC_NIGHT = [233, 179, 43];

/** The active accent from the root's computed --accent, as [r, g, b]. */
function readRootAccent(): number[] | null {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  const m = /^#([0-9a-f]{6})$/i.exec(v);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

const NAME = "NICOLAS";
// Peak extra tracking, in em, at full scroll — applied as per-letter
// translation so nothing re-lays-out mid-scroll.
const TRACK_OPEN = 0.13;

const LEVEL_LO = -1.5;
const LEVEL_HI = 2.2;

/**
 * Marching-squares edge pairs per case index, flattened. Edge ids:
 * 0 = top, 1 = right, 2 = bottom, 3 = left. Frozen at module scope so the
 * inner loop never allocates.
 */
const SEGS: readonly (readonly number[])[] = [
  [], [3, 0], [0, 1], [3, 1],
  [1, 2], [3, 0, 1, 2], [0, 2], [3, 2],
  [3, 2], [0, 2], [0, 1, 3, 2], [1, 2],
  [3, 1], [0, 1], [3, 0], [],
];

interface Tier {
  /** Grid pitch in CSS px — cost scales with 1/cell². */
  cell: number;
  /** Device pixel ratio ceiling. */
  dpr: number;
  /** Spacing between contour levels. */
  step: number;
  /** Minimum ms between canvas repaints. */
  interval: number;
  /** Pointer-follow field distortion (meaningless without a hover pointer). */
  pointer: boolean;
  maxRipples: number;
  maxLabels: number;
}

const TIERS: readonly Tier[] = [
  { cell: 15, dpr: 1.6, step: 0.17, interval: 1000 / 60, pointer: true, maxRipples: 3, maxLabels: 14 },
  { cell: 17, dpr: 1.5, step: 0.185, interval: 1000 / 40, pointer: true, maxRipples: 2, maxLabels: 10 },
  { cell: 18, dpr: 1.25, step: 0.2, interval: 1000 / 30, pointer: false, maxRipples: 1, maxLabels: 6 },
  { cell: 26, dpr: 1, step: 0.24, interval: 1000 / 24, pointer: false, maxRipples: 0, maxLabels: 0 },
];

/** Frame cost (ms) above which we drop a quality tier. */
const COST_CEILING = 11;

function pickTier(): number {
  if (typeof window === "undefined") return 2;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory || 4;
  if (coarse || window.innerWidth < 700) return 2;
  if (window.innerWidth < 1200 || cores <= 4 || mem <= 4) return 1;
  return 0;
}

function buildPermutation(): Uint8Array {
  const p = new Uint8Array(512);
  let s = 1337;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const perm: number[] = [];
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = perm[i];
    perm[i] = perm[j];
    perm[j] = t;
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  return p;
}

interface Ripple {
  x: number;
  y: number;
  t0: number;
}

const CartographicHero = () => {
  const { resolvedTheme } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const caRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const nightRef = useRef(true);
  // Live accent from the root; null falls back to the per-base constants.
  const accRef = useRef<number[] | null>(null);

  // Site default theme is dark (night)
  const isNight = resolvedTheme !== "light";

  // Theme CSS custom properties on the hero root (smooth via CSS transitions)
  useEffect(() => {
    nightRef.current = isNight;
    const el = rootRef.current;
    if (!el) return;
    const set = (k: string, v: string) => el.style.setProperty(k, v);
    if (isNight) {
      set("--bg", "#0f1114");
      set("--ink", "#e6dfcc");
      set("--soft", "rgba(230,223,204,0.55)");
      set("--line", "rgba(230,223,204,0.22)");
    } else {
      set("--bg", "#ece3cd");
      set("--ink", "#1b1a17");
      set("--soft", "rgba(27,26,23,0.55)");
      set("--line", "rgba(27,26,23,0.22)");
    }
    // Retint on theme change and whenever the picker rewrites
    // html[data-accent] (or next-themes lands its class a tick later).
    const applyAccent = () => {
      accRef.current = readRootAccent();
      const a = accRef.current ?? (nightRef.current ? ACC_NIGHT : ACC_DAY);
      set("--accent", `rgb(${a[0]},${a[1]},${a[2]})`);
    };
    applyAccent();
    const mo = new MutationObserver(applyAccent);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-accent", "class"] });
    return () => mo.disconnect();
  }, [isNight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    let reduced = mq ? mq.matches : false;
    const onReduced = () => {
      reduced = mq ? mq.matches : false;
      drawnOnce = false;
    };
    mq?.addEventListener?.("change", onReduced);

    let tierIdx = pickTier();
    let tier = TIERS[tierIdx];
    // Rolling frame cost; seeded low so we don't degrade on the first frame.
    let cost = 0;
    let costSamples = 0;

    const perm = buildPermutation();

    // value noise + fBm
    const n3 = (x: number, y: number, z: number) => {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const xf = x - xi, yf = y - yi, zf = z - zi;
      const u = xf * xf * (3 - 2 * xf);
      const v = yf * yf * (3 - 2 * yf);
      const w = zf * zf * (3 - 2 * zf);
      const X = xi & 255, Y = yi & 255, Z = zi & 255;
      const h = (a: number, b: number, c: number) =>
        perm[(perm[(perm[(X + a) & 255] + Y + b) & 255] + Z + c) & 255] / 127.5 - 1;
      const c000 = h(0, 0, 0), c100 = h(1, 0, 0), c010 = h(0, 1, 0), c110 = h(1, 1, 0);
      const c001 = h(0, 0, 1), c101 = h(1, 0, 1), c011 = h(0, 1, 1), c111 = h(1, 1, 1);
      const x00 = c000 + (c100 - c000) * u;
      const x10 = c010 + (c110 - c010) * u;
      const x01 = c001 + (c101 - c001) * u;
      const x11 = c011 + (c111 - c011) * u;
      const y0 = x00 + (x10 - x00) * v;
      const y1 = x01 + (x11 - x01) * v;
      return y0 + (y1 - y0) * w;
    };

    const fbm = (x: number, y: number, z: number) => {
      let a = 0.62, f = 1, sum = 0;
      for (let o = 0; o < 3; o++) {
        sum += a * n3(x * f, y * f, z * f);
        a *= 0.5;
        f *= 2.03;
      }
      return sum;
    };

    // ── mutable per-frame state ────────────────────────────────────────
    const t0 = performance.now();
    let rafId = 0;
    let running = false;
    let onScreen = true;
    let lastDraw = -1e9;
    let mix = nightRef.current ? 1 : 0;
    const acc = (accRef.current ?? (nightRef.current ? ACC_NIGHT : ACC_DAY)).slice();
    let scroll = 0;
    let sp = 0;
    let drawnOnce = false;
    const ptr = { x: -9e3, y: -9e3, tx: -9e3, ty: -9e3, amp: 0, tamp: 0 };
    let ripples: Ripple[] = [];
    let vals: Float32Array | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    // Per-level draw state, rebuilt only when the level count changes.
    let levelPaths: (Path2D | null)[] = [];
    let levelAlpha: Float32Array = new Float32Array(0);
    let levelWidth: Float32Array = new Float32Array(0);
    let levelKind: Uint8Array = new Uint8Array(0); // 0 hairline, 1 index, 2 accent

    // ── cached geometry (never read layout inside the loop) ────────────
    let scrollY = window.scrollY;
    let travelStart = 0;
    let runway = 1;
    let emSize = 0;
    const letters: HTMLSpanElement[] = [];

    const measure = () => {
      // The hero is pulled up under the transparent nav, so its document
      // offset can be negative; progress starts where the page does.
      const heroTop = root.getBoundingClientRect().top + window.scrollY;
      const stageH = stageRef.current?.offsetHeight ?? window.innerHeight;
      travelStart = Math.max(0, heroTop);
      runway = Math.max(1, heroTop + root.offsetHeight - stageH - travelStart);
      if (headingRef.current) {
        emSize = parseFloat(getComputedStyle(headingRef.current).fontSize) || 0;
      }
    };

    // ── quality helpers ────────────────────────────────────────────────
    const degrade = () => {
      if (tierIdx >= TIERS.length - 1) return;
      tierIdx += 1;
      tier = TIERS[tierIdx];
      cost = 0;
      costSamples = 0;
      vals = null;
      levelPaths = [];
      ripples = [];
    };

    // ── scratch used by the marching-squares inner loop ────────────────
    let sx = 0;
    let sy = 0;
    const frac = (v1: number, v2: number, lv: number) => {
      const d = v2 - v1;
      if (d === 0) return 0.5;
      const f = (lv - v1) / d;
      return f < 0 ? 0 : f > 1 ? 1 : f;
    };
    const edge = (
      e: number, x: number, y: number, cell: number,
      a: number, b: number, c: number, d: number, lv: number
    ) => {
      switch (e) {
        case 0: sx = x + cell * frac(a, b, lv); sy = y; break;
        case 1: sx = x + cell; sy = y + cell * frac(b, c, lv); break;
        case 2: sx = x + cell * frac(d, c, lv); sy = y + cell; break;
        default: sx = x; sy = y + cell * frac(a, d, lv); break;
      }
    };

    // ── DOM parallax: runs every frame, transforms/opacity only ────────
    const parallax = () => {
      scroll = Math.min(1, Math.max(0, (scrollY - travelStart) / runway));
      sp += (scroll - sp) * 0.09;
      if (reduced) return;

      const s = sp;
      // Anchored "tectonic recede": the type never slides vertically. It
      // stays pinned and pulls apart horizontally (tracking opens like
      // drifting plates), settles back in scale, and dissolves as the
      // contour field surfaces beneath it.
      if (nameRef.current) {
        nameRef.current.style.transform = `scale(${(1 - s * 0.07).toFixed(4)})`;
        nameRef.current.style.opacity = Math.max(0, 1 - s * 1.15).toFixed(3);
      }
      // Tracking as per-letter translation — setting letter-spacing here
      // would relayout a 300px headline on every single frame.
      if (letters.length && emSize) {
        const gap = s * TRACK_OPEN * emSize;
        for (let i = 0; i < letters.length; i++) {
          letters[i].style.transform = `translate3d(${(i * gap).toFixed(2)}px,0,0)`;
        }
      }
      if (caRef.current) {
        caRef.current.style.transform =
          `rotate(${(s * -3).toFixed(2)}deg) scale(${(1 - s * 0.05).toFixed(4)})`;
        caRef.current.style.opacity = Math.max(0, 1 - s * 1.25).toFixed(3);
      }
      if (taglineRef.current) {
        taglineRef.current.style.opacity = Math.max(0, 1 - s * 2.4).toFixed(3);
      }
      if (footerRef.current) footerRef.current.style.opacity = Math.max(0, 1 - s * 1.7).toFixed(3);
      if (cueRef.current) cueRef.current.style.opacity = Math.max(0, 1 - s * 5).toFixed(3);
    };

    // ── canvas field ───────────────────────────────────────────────────
    const draw = (now: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, tier.dpr);
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      if (!ctx) {
        // Opaque context: the field paints an edge-to-edge background, so
        // there is nothing to blend with what sits behind the canvas.
        ctx = canvas.getContext("2d", { alpha: false });
      }
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const t = (now - t0) / 1000;
      const intro = Math.min(1, t / 1.9);
      const ease = intro * intro * (3 - 2 * intro);
      const motion = reduced ? 0 : MOTION;

      // day/night mix
      const target = nightRef.current ? 1 : 0;
      mix += (target - mix) * 0.08;
      // accent eases toward the root's live value, like the day/night mix
      const accT = accRef.current ?? (nightRef.current ? ACC_NIGHT : ACC_DAY);
      let accGap = 0;
      for (let i = 0; i < 3; i++) {
        acc[i] += (accT[i] - acc[i]) * 0.08;
        accGap += Math.abs(accT[i] - acc[i]);
      }

      // Reduced motion: repaint only when scroll or theme mix is still moving.
      if (
        reduced &&
        drawnOnce &&
        Math.abs(sp - scroll) < 0.0005 &&
        Math.abs(mix - target) < 0.0025 &&
        accGap < 1
      ) {
        return;
      }

      // pointer smoothing
      ptr.x += (ptr.tx - ptr.x) * 0.08;
      ptr.y += (ptr.ty - ptr.y) * 0.08;
      ptr.amp += (ptr.tamp - ptr.amp) * 0.05;

      const m3 = (a: number[], b: number[]) => [
        a[0] + (b[0] - a[0]) * mix,
        a[1] + (b[1] - a[1]) * mix,
        a[2] + (b[2] - a[2]) * mix,
      ];
      const bg = m3(DAY.bg, NIGHT.bg);
      const ink = m3(DAY.ink, NIGHT.ink);

      // flat background — same surface as the rest of the site
      ctx.fillStyle = `rgb(${bg[0] | 0},${bg[1] | 0},${bg[2] | 0})`;
      ctx.fillRect(0, 0, w, h);

      // ── scalar field ────────────────────────────────────────────────
      const cell = tier.cell;
      const cols = Math.ceil(w / cell) + 2;
      const rows = Math.ceil(h / cell) + 2;
      if (!vals || vals.length < cols * rows) vals = new Float32Array(cols * rows);
      const V = vals;
      // Noise scale is per-pixel, so a narrow viewport spans less than one
      // feature and the field reads as empty. Tighten it as the canvas
      // narrows to hold roughly the same contour density on a phone;
      // desktop widths keep the original 0.0017.
      const sc = 0.0017 * Math.min(2.4, Math.max(1, 1100 / w));
      // Freeze autonomous morphing under reduced motion; scroll lift still applies.
      const tz = reduced ? 0 : t * 0.045;
      const oscA = 0.17 * motion * ease;
      const lift = scroll * 1.05;
      const cr = 200;
      const c2 = 2 * cr * cr;
      const cAmp = tier.pointer ? 0.55 * motion * ptr.amp * ease : 0;
      const tOsc = reduced ? 0 : t * 0.75;
      const pointerActive = cAmp > 0.004;
      const ptrCut = c2 * 4.5;

      // Live ripples, with the radius beyond which their contribution is
      // below a thousandth of a level and not worth the sqrt/exp.
      const rip: { x: number; y: number; age: number; reach: number }[] = [];
      if (tier.maxRipples > 0) {
        for (let r = 0; r < ripples.length; r++) {
          const age = (now - ripples[r].t0) / 1000;
          if (age >= 3) continue;
          const envelope = 0.5 * motion * Math.exp(-age * 1.6);
          if (envelope < 0.002) continue;
          rip.push({
            x: ripples[r].x,
            y: ripples[r].y,
            age,
            reach: Math.log(envelope / 0.002) / 0.006,
          });
        }
        ripples = ripples.filter((r) => (now - r.t0) / 1000 < 3);
      } else if (ripples.length) {
        ripples = [];
      }
      const nRip = rip.length;

      for (let j = 0; j < rows; j++) {
        const y = j * cell;
        const ny = y * sc + 7.31;
        const rowBase = j * cols;
        for (let i = 0; i < cols; i++) {
          const x = i * cell;
          let v = fbm(x * sc + 3.7, ny, tz);
          v += oscA * Math.sin(tOsc + v * 7.3);
          if (pointerActive) {
            const dx = x - ptr.x;
            const dy = y - ptr.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < ptrCut) v += cAmp * Math.exp(-d2 / c2);
          }
          for (let r = 0; r < nRip; r++) {
            const R = rip[r];
            const dx = x - R.x;
            const dy = y - R.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > R.reach * R.reach) continue;
            const d = Math.sqrt(d2);
            v += 0.5 * motion * Math.sin(d * 0.05 - R.age * 5) * Math.exp(-d * 0.006 - R.age * 1.6);
          }
          V[rowBase + i] = v + lift;
        }
      }

      // ── contour levels ──────────────────────────────────────────────
      const step = tier.step;
      const nLev = Math.round((LEVEL_HI - LEVEL_LO) / step);
      const accentK = Math.round((0.3 + scroll * 0.9 - LEVEL_LO) / step);

      if (levelAlpha.length !== nLev + 1) {
        levelAlpha = new Float32Array(nLev + 1);
        levelWidth = new Float32Array(nLev + 1);
        levelKind = new Uint8Array(nLev + 1);
        levelPaths = new Array(nLev + 1).fill(null);
      }
      let anyLevel = false;
      for (let k = 0; k <= nLev; k++) {
        const isAccent = k === accentK;
        const isIndex = !isAccent && k % 5 === 0;
        let alpha: number;
        let lw: number;
        if (isAccent) {
          alpha = 0.9 * ease;
          lw = 1.5;
        } else if (isIndex) {
          alpha = (0.33 - 0.08 * mix) * ease;
          lw = 1.2;
        } else {
          alpha = (0.15 - 0.03 * mix) * ease;
          lw = 0.8;
        }
        const active = alpha >= 0.01;
        levelAlpha[k] = active ? alpha : 0;
        levelWidth[k] = lw * 1.4;
        levelKind[k] = isAccent ? 2 : isIndex ? 1 : 0;
        levelPaths[k] = null;
        if (active) anyLevel = true;
      }

      // Marching squares, cell-major: each cell only visits the levels
      // that actually fall between its own min and max corner value.
      // Sweeping every level over every cell was ~15x this much work.
      const labelX: number[] = [];
      const labelY: number[] = [];
      const labelLv: number[] = [];
      const wantLabels = tier.maxLabels > 0;

      if (anyLevel) {
        for (let j = 0; j < rows - 1; j++) {
          const y = j * cell;
          const r0 = j * cols;
          const r1 = r0 + cols;
          for (let i = 0; i < cols - 1; i++) {
            const a = V[r0 + i];
            const b = V[r0 + i + 1];
            const c = V[r1 + i + 1];
            const d = V[r1 + i];
            let lo = a < b ? a : b;
            if (c < lo) lo = c;
            if (d < lo) lo = d;
            let hi = a > b ? a : b;
            if (c > hi) hi = c;
            if (d > hi) hi = d;
            if (hi < LEVEL_LO || lo > LEVEL_HI) continue;

            let kStart = Math.ceil((lo - LEVEL_LO) / step);
            let kEnd = Math.floor((hi - LEVEL_LO) / step);
            if (kStart < 0) kStart = 0;
            if (kEnd > nLev) kEnd = nLev;
            if (kEnd < kStart) continue;

            const x = i * cell;
            const sampled = wantLabels && ((i * 31 + j * 17) & 127) === 0;

            for (let k = kStart; k <= kEnd; k++) {
              if (levelAlpha[k] === 0) continue;
              const lv = LEVEL_LO + k * step;
              let idx = 0;
              if (a > lv) idx |= 1;
              if (b > lv) idx |= 2;
              if (c > lv) idx |= 4;
              if (d > lv) idx |= 8;
              const seg = SEGS[idx];
              if (seg.length === 0) continue;
              let path = levelPaths[k];
              if (!path) {
                path = new Path2D();
                levelPaths[k] = path;
              }
              for (let s = 0; s < seg.length; s += 2) {
                edge(seg[s], x, y, cell, a, b, c, d, lv);
                const x1 = sx, y1 = sy;
                edge(seg[s + 1], x, y, cell, a, b, c, d, lv);
                path.moveTo(x1, y1);
                path.lineTo(sx, sy);
                if (sampled && levelKind[k] !== 0 && labelX.length < tier.maxLabels * 4) {
                  labelX.push((x1 + sx) / 2);
                  labelY.push((y1 + sy) / 2);
                  labelLv.push(lv);
                }
              }
            }
          }
        }
      }

      ctx.lineJoin = "round";
      const inkStr = `${ink[0] | 0},${ink[1] | 0},${ink[2] | 0}`;
      const accStr = `${acc[0] | 0},${acc[1] | 0},${acc[2] | 0}`;
      for (let k = 0; k <= nLev; k++) {
        const path = levelPaths[k];
        if (!path) continue;
        const rgb = levelKind[k] === 2 ? accStr : inkStr;
        ctx.strokeStyle = `rgba(${rgb},${levelAlpha[k].toFixed(3)})`;
        ctx.lineWidth = levelWidth[k];
        ctx.stroke(path);
        levelPaths[k] = null;
      }

      // elevation labels
      if (labelX.length) {
        ctx.font = '500 10px "IBM Plex Mono", monospace';
        ctx.textBaseline = "middle";
        const halo = `rgb(${bg[0] | 0},${bg[1] | 0},${bg[2] | 0})`;
        const inkA = `rgba(${inkStr},${(0.6 * ease).toFixed(2)})`;
        let drawn = 0;
        for (let i = 0; i < labelX.length && drawn < tier.maxLabels; i++) {
          const lx = labelX[i];
          const ly = labelY[i];
          if (lx < 40 || lx > w - 60 || ly < 70 || ly > h - 70) continue;
          const txt = String(Math.max(0, Math.round(240 + labelLv[i] * 160)));
          ctx.lineWidth = 4;
          ctx.strokeStyle = halo;
          ctx.strokeText(txt, lx + 5, ly);
          ctx.fillStyle = inkA;
          ctx.fillText(txt, lx + 5, ly);
          drawn++;
        }
      }

      drawnOnce = true;
    };

    // ── loop ───────────────────────────────────────────────────────────
    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);
      // Cheap every frame: keeps scroll parallax at display rate.
      parallax();
      // Expensive: throttled to the tier's repaint budget. The 1ms slack
      // stops a frame landing a hair early from costing a whole interval.
      if (now - lastDraw < tier.interval - 1) return;
      lastDraw = now;

      const started = performance.now();
      draw(now);
      const spent = performance.now() - started;
      cost = costSamples < 8 ? spent : cost * 0.9 + spent * 0.1;
      costSamples++;
      if (costSamples > 24 && cost > COST_CEILING) degrade();
    };

    const start = () => {
      if (running) return;
      running = true;
      lastDraw = -1e9;
      rafId = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
    };

    // Pause while off-screen or backgrounded.
    const sync = () => {
      if (onScreen && !document.hidden) start();
      else stop();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0 }
    );
    observer.observe(root);

    // ── input ──────────────────────────────────────────────────────────
    const onPtr = (e: PointerEvent) => {
      if (!tier.pointer) return;
      ptr.tx = e.clientX;
      ptr.ty = e.clientY;
      ptr.tamp = 1;
    };
    const onDown = (e: PointerEvent) => {
      if (tier.maxRipples === 0) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest("a,button")) return;
      ripples.push({ x: e.clientX, y: e.clientY, t0: performance.now() });
      while (ripples.length > tier.maxRipples) ripples.shift();
    };
    const onLeave = () => {
      ptr.tamp = 0;
    };
    const onScroll = () => {
      // Read only — no layout is forced here; geometry is cached.
      scrollY = window.scrollY;
    };

    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        measure();
        drawnOnce = false;
      });
    };

    // Catches font-load reflow and hero height changes as well as resizes.
    const ro = new ResizeObserver(onResize);
    ro.observe(root);

    window.addEventListener("pointermove", onPtr, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", sync);

    if (headingRef.current) {
      letters.push(
        ...Array.from(headingRef.current.querySelectorAll<HTMLSpanElement>("[data-letter]"))
      );
    }
    measure();
    onScroll();
    sync();

    return () => {
      stop();
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener("pointermove", onPtr);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", sync);
      mq?.removeEventListener?.("change", onReduced);
      observer.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef} className="hero">
      <div ref={stageRef} className="hero__stage">
        <canvas ref={canvasRef} className="hero__canvas" />

        {/* Display name + tagline share one column so their left edge and
            vertical gap hold at every width. */}
        <div className="hero__intro">
          <p className="eyebrow hero__eyebrow">Fig. 1 — General arrangement</p>
          <div ref={nameRef} className="hero__name">
            <h1 ref={headingRef} className="hero__name-text">
              {NAME.split("").map((ch, i) => (
                <span key={i} data-letter className="hero__letter">
                  {ch}
                </span>
              ))}
            </h1>
          </div>

          <p ref={taglineRef} className="hero__tagline">
            Software ventures &amp; craft &mdash; agentic systems, markets and the open web.
          </p>
        </div>

        {/* Italic accent initials */}
        <div ref={caRef} className="hero__mark">
          <div className="hero__mark-text">C.A</div>
        </div>

        {/* Title block over the hairline strip with the scroll cue */}
        <footer ref={footerRef} className="hero__foot">
          <div className="titleblock hero__titleblock">
            <div><b>Drawn</b>N. Cerrato</div>
            <div><b>Checked</b>—</div>
            <div><b>Scale</b>1 : 1</div>
            <div><b>Sheet</b>01</div>
          </div>
          <div className="hero__strip">
            <div ref={cueRef} className="hero__cue">scroll &darr;</div>
          </div>
        </footer>
      </div>

      {/* Scroll runway for the sticky stage, and the marker leading into
          the Manifesto. The shell height is the sum of this and the stage,
          so the two can never drift out of sync. */}
      <div className="hero__marker">Plate I &mdash; On software craft</div>
    </div>
  );
};

export default CartographicHero;
