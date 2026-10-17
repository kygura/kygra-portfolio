/**
 * Sheet 06 · Cipher: a black field of random strings drawn on a plain 2D
 * canvas layered over the (black) WebGL stage. Kept out of the PS1 pipeline
 * on purpose: the quarter-res dither would smear the type into mush.
 *
 * - Ambient: glyphs flicker and mutate in place.
 * - Hover: glyphs near the cursor light up and lean away from it; the run under
 *   the cursor scrambles until it locks into a word, which holds while the
 *   cursor stays near and dissolves back into noise once it leaves.
 * - Click / tap: a rainbow pulse rings out from the click, scrambling and
 *   pushing the glyphs it passes.
 *
 * The loop only runs while the sheet is active, on screen and the tab is
 * visible; under reduced motion it also stops whenever nothing is animating.
 */

export interface CipherField {
  setActive: (on: boolean) => void;
  setAccent: (hex: string) => void;
  dispose: () => void;
}

const WORDS = [
  "SIGNAL", "ORACLE", "CIPHER", "AGENT", "MARKET", "DRIFT", "ECHO", "VECTOR", "KERNEL", "LATTICE",
  "GHOST", "DAEMON", "ENTROPY", "ORBIT", "PULSE", "CRAFT", "WEB", "OPEN", "SOURCE", "MERIDIAN",
  "LEDGER", "PROTOCOL", "SYSTEM", "DREAM", "VOID", "TIDE", "RUIN", "ASTRAL", "FIELD", "RAIL",
  "OCEAN", "LOOP", "PROMPT", "TOKEN", "MEMORY", "SWARM", "HORIZON", "QUIET", "LIGHT", "SIGIL",
  "NOMAD", "ATLAS", "FORGE", "BUILD", "SHIP", "VENTURE", "WANDER", "HELLO", "NICOLAS", "KYGRA",
];

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGIT = "0123456789";
const HEX = "0123456789ABCDEF";
const SYM = "#$%&*+=~^<>/\\|{}[]():;!?_-.";
const ANY = UPPER + DIGIT + SYM;

/** Pulse front speed (px/s) and the width of its lit band (px). */
const SPEED = 820, BAND = 90;

const HUES = Array.from({ length: 36 }, (_, q) => `hsl(${q * 10},100%,66%)`);
const INK = "#d8d2c2";
const HOT = "#ffffff";

const pick = (s: string) => s[(Math.random() * s.length) | 0];
const pickWord = (max: number) => {
  const fit = WORDS.filter((w) => w.length <= max);
  return fit.length ? fit[(Math.random() * fit.length) | 0] : null;
};

/** One row of noise: runs of hex, caps, digits, binary and punctuation with gaps. */
function noiseRow(cols: number): string {
  let s = "";
  while (s.length < cols) {
    const r = Math.random();
    const n = 2 + ((Math.random() * 6) | 0);
    let tok = "";
    if (r < 0.18) tok = "0x" + Array.from({ length: 4 }, () => pick(HEX)).join("");
    else if (r < 0.42) tok = Array.from({ length: n }, () => pick(UPPER)).join("");
    else if (r < 0.56) tok = Array.from({ length: n }, () => pick(DIGIT)).join("");
    else if (r < 0.66) tok = Array.from({ length: n + 2 }, () => (Math.random() < 0.5 ? "0" : "1")).join("");
    else if (r < 0.82) tok = Array.from({ length: 1 + ((Math.random() * 3) | 0) }, () => pick(SYM)).join("");
    else tok = Array.from({ length: n }, () => pick(ANY)).join("");
    s += tok + " ".repeat(1 + ((Math.random() * (Math.random() < 0.15 ? 9 : 3)) | 0));
  }
  return s.slice(0, cols);
}

interface Word {
  row: number;
  start: number;
  text: string;
  seen: number;
  fading: boolean;
}

interface Pulse {
  x: number;
  y: number;
  t0: number;
}

export function createCipherField(canvas: HTMLCanvasElement, opts: { accent: string; reducedMotion: boolean }): CipherField {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return { setActive: () => {}, setAccent: () => {}, dispose: () => {} };
  const reduced = opts.reducedMotion;
  let accent = opts.accent;

  let cssW = 1, cssH = 1, dpr = 1;
  let cols = 0, rows = 0, cw = 8, ch = 18, fontSize = 14, ox = 0, oy = 0;
  let glyph: string[] = [];
  let base = new Float32Array(0);
  let heat = new Float32Array(0);
  let dx = new Float32Array(0), dy = new Float32Array(0);
  let owner = new Int32Array(0);
  let lockAt = new Float64Array(0);
  let releaseAt = new Float64Array(0);
  let flipAt = new Float64Array(0);

  const words = new Map<number, Word>();
  let nextWord = 1;
  let lastSpawn = 0;
  const pulses: Pulse[] = [];

  const ptr = { x: 0, y: 0, sx: 0, sy: 0, in: false, moved: false };
  let active = false, visible = true, raf = 0, last = performance.now();

  const layout = () => {
    cssW = Math.max(1, canvas.clientWidth);
    cssH = Math.max(1, canvas.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    fontSize = cssW < 640 ? 12 : 14;
    ctx.font = `${fontSize}px ${getComputedStyle(canvas).fontFamily || "monospace"}`;
    cw = Math.ceil(ctx.measureText("M").width) + 1;
    ch = Math.round(fontSize * 1.5);
    cols = Math.ceil(cssW / cw) + 1;
    rows = Math.ceil(cssH / ch) + 1;
    ox = (cssW - (cols - 1) * cw) / 2;
    oy = (cssH - (rows - 1) * ch) / 2;
    const n = cols * rows;
    glyph = [];
    for (let r = 0; r < rows; r++) glyph.push(...noiseRow(cols));
    base = new Float32Array(n);
    // Rows breathe at slightly different strengths so the sheet reads as strata.
    for (let r = 0; r < rows; r++) {
      const rowA = 0.16 + Math.random() * 0.16;
      for (let c = 0; c < cols; c++) base[r * cols + c] = rowA * (0.6 + Math.random() * 0.6);
    }
    heat = new Float32Array(n);
    dx = new Float32Array(n);
    dy = new Float32Array(n);
    owner = new Int32Array(n);
    lockAt = new Float64Array(n);
    releaseAt = new Float64Array(n);
    flipAt = new Float64Array(n);
    words.clear();
    draw(performance.now(), 0);
  };

  const flip = (i: number) => {
    const g = glyph[i];
    if (g === " ") return;
    glyph[i] = DIGIT.includes(g) ? pick(DIGIT) : UPPER.includes(g) ? pick(UPPER) : pick(ANY);
  };

  /** Drop a word into the free run of the row under the cursor. */
  const spawnWord = (now: number) => {
    const c = Math.round((ptr.x - ox) / cw), r = Math.round((ptr.y - oy) / ch);
    if (c < 0 || c >= cols || r < 0 || r >= rows || owner[r * cols + c]) return;
    let lo = c, hi = c;
    while (lo > 0 && c - lo < 9 && !owner[r * cols + lo - 1]) lo--;
    while (hi < cols - 1 && hi - c < 9 && !owner[r * cols + hi + 1]) hi++;
    // Keep a blank cell against any neighbouring word so the two never read as one.
    if (lo > 0 && owner[r * cols + lo - 1]) lo++;
    if (hi < cols - 1 && owner[r * cols + hi + 1]) hi--;
    const text = pickWord(hi - lo + 1);
    if (!text) return;
    const start = Math.max(lo, Math.min(hi - text.length + 1, c - (text.length >> 1)));
    const id = nextWord++;
    words.set(id, { row: r, start, text, seen: now, fading: false });
    for (let k = 0; k < text.length; k++) {
      const i = r * cols + start + k;
      owner[i] = id;
      // Letters lock in a ragged left-to-right sweep.
      lockAt[i] = now + (reduced ? 0 : 160 + k * 55 + Math.random() * 160);
      releaseAt[i] = 0;
      if (glyph[i] === " ") glyph[i] = pick(ANY);
    }
    lastSpawn = now;
  };

  const step = (now: number, dt: number) => {
    const R = Math.max(90, cw * 9);
    const hovering = ptr.in;
    if (hovering && !reduced) {
      ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 18);
      ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 18);
    } else {
      ptr.sx = ptr.x;
      ptr.sy = ptr.y;
    }
    if (hovering && ptr.moved && now - lastSpawn > 70) spawnWord(now);
    ptr.moved = false;

    // Words: refresh while the cursor is near, then dissolve.
    for (const [id, w] of words) {
      const wy = oy + w.row * ch, wx0 = ox + w.start * cw, wx1 = wx0 + (w.text.length - 1) * cw;
      const near = hovering && Math.abs(ptr.y - wy) < ch * 2.2 && ptr.x > wx0 - R * 0.5 && ptr.x < wx1 + R * 0.5;
      if (near && !w.fading) w.seen = now;
      if (!w.fading && now - w.seen > 2400) {
        w.fading = true;
        for (let k = 0; k < w.text.length; k++) releaseAt[w.row * cols + w.start + k] = now + k * 35 + Math.random() * 140;
      }
      if (w.fading) {
        let left = 0;
        for (let k = 0; k < w.text.length; k++) {
          const i = w.row * cols + w.start + k;
          if (owner[i] !== id) continue;
          if (now >= releaseAt[i]) {
            owner[i] = 0;
            glyph[i] = Math.random() < 0.2 ? " " : pick(ANY);
            heat[i] = Math.max(heat[i], 0.5);
          } else left++;
        }
        if (!left) words.delete(id);
      }
    }

    // Ambient mutation.
    if (!reduced) {
      const flips = Math.ceil(cols * rows * 0.6 * dt);
      for (let f = 0; f < flips; f++) {
        const i = (Math.random() * glyph.length) | 0;
        if (!owner[i]) flip(i);
      }
    }

    const decay = Math.exp(-dt * 2.6);
    const spring = 1 - Math.exp(-dt * 14);
    const maxD = Math.hypot(cssW, cssH);
    for (let p = pulses.length - 1; p >= 0; p--) if ((now - pulses[p].t0) / 1000 > maxD / SPEED + 0.4) pulses.splice(p, 1);

    for (let r = 0; r < rows; r++) {
      const cy = oy + r * ch;
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c, cx = ox + c * cw;
        heat[i] *= decay;
        let tx = 0, ty = 0;
        if (hovering) {
          const ddx = cx - ptr.sx, ddy = cy - ptr.sy;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1, f = 1 - d / R;
            if (f > heat[i]) heat[i] = f;
            if (!reduced) {
              const push = f * f * 16;
              tx += (ddx / d) * push;
              ty += (ddy / d) * push;
            }
            // The cursor's wake keeps the loose glyphs churning.
            if (!owner[i] && f > 0.25 && now >= flipAt[i]) {
              flip(i);
              flipAt[i] = now + 40 + Math.random() * 90;
            }
          }
        }
        for (const p of pulses) {
          const age = (now - p.t0) / 1000;
          const ddx = cx - p.x, ddy = cy - p.y, d = Math.hypot(ddx, ddy) || 1;
          const k = 1 - Math.abs(d - age * SPEED) / BAND;
          if (k <= 0) continue;
          const amp = k * Math.max(0, 1 - age / (maxD / SPEED + 0.4));
          tx += (ddx / d) * amp * 12;
          ty += (ddy / d) * amp * 12;
          if (!owner[i] && Math.random() < amp * 0.35) flip(i);
        }
        dx[i] += (tx - dx[i]) * spring;
        dy[i] += (ty - dy[i]) * spring;
      }
    }
  };

  const draw = (now: number, dt: number) => {
    if (dt > 0) step(now, dt);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.font = `${fontSize}px ${getComputedStyle(canvas).fontFamily || "monospace"}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const maxD = Math.hypot(cssW, cssH);

    // Soft rings under the type.
    for (const p of pulses) {
      const age = (now - p.t0) / 1000, rad = age * SPEED;
      const amp = Math.max(0, 1 - age / (maxD / SPEED + 0.4));
      if (rad < 1) continue;
      ctx.globalAlpha = 0.35 * amp;
      ctx.lineWidth = 2;
      if (typeof ctx.createConicGradient === "function") {
        const g = ctx.createConicGradient(age * 3, p.x, p.y);
        for (let s = 0; s <= 6; s++) g.addColorStop(s / 6, `hsl(${s * 60},100%,60%)`);
        ctx.strokeStyle = g;
      } else ctx.strokeStyle = HUES[((age * 36) | 0) % 36];
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.stroke();
    }

    let fill = "";
    for (let r = 0; r < rows; r++) {
      const cy = oy + r * ch;
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const id = owner[i];
        let g = glyph[i];
        const cx = ox + c * cw;
        let col = INK, a = base[i] + heat[i] * 0.75;

        // Rainbow from any pulse front crossing this cell.
        let best = 0, hue = 0;
        for (const p of pulses) {
          const age = (now - p.t0) / 1000;
          const ddx = cx - p.x, ddy = cy - p.y, d = Math.hypot(ddx, ddy);
          const k = 1 - Math.abs(d - age * SPEED) / BAND;
          if (k <= 0) continue;
          const amp = k * Math.max(0, 1 - age / (maxD / SPEED + 0.4));
          if (amp > best) {
            best = amp;
            hue = d * 0.5 + (Math.atan2(ddy, ddx) * 180) / Math.PI + age * 220;
          }
        }

        if (id) {
          const w = words.get(id);
          const locked = now >= lockAt[i];
          if (!locked) {
            if (now >= flipAt[i]) {
              glyph[i] = pick(ANY);
              flipAt[i] = now + 45 + Math.random() * 40;
            }
            g = glyph[i];
            col = HOT;
            a = 0.85;
          } else if (w) {
            g = w.text[c - w.start];
            glyph[i] = g;
            col = accent;
            a = 1;
            ctx.globalAlpha = 0.14;
            if (fill !== accent) ctx.fillStyle = fill = accent;
            ctx.fillRect(cx - cw / 2, cy - ch / 2 + 1, cw, ch - 2);
          }
        } else if (heat[i] > 0.35) col = HOT;

        if (best > 0.06) {
          col = HUES[(((hue % 360) + 360) % 360 / 10) | 0];
          a = Math.max(a, 0.35 + best * 0.65);
        }
        if (g === " " || a < 0.03) continue;
        ctx.globalAlpha = Math.min(1, a);
        if (fill !== col) ctx.fillStyle = fill = col;
        ctx.fillText(g, cx + dx[i], cy + dy[i]);
      }
    }
    ctx.globalAlpha = 1;
  };

  const busy = () => {
    if (pulses.length || words.size || ptr.in) return true;
    for (let i = 0; i < heat.length; i++) if (heat[i] > 0.02) return true;
    return false;
  };
  const wants = () => active && visible && !document.hidden && (!reduced || busy());
  function loop(now: number) {
    raf = 0;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    draw(now, dt);
    if (wants()) raf = requestAnimationFrame(loop);
  }
  const kick = () => {
    if (raf || !wants()) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };

  const local = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ptr.x = e.clientX - r.left;
    ptr.y = e.clientY - r.top;
  };
  const onMove = (e: PointerEvent) => {
    local(e);
    if (!ptr.in) { ptr.sx = ptr.x; ptr.sy = ptr.y; }
    ptr.in = true;
    ptr.moved = true;
    kick();
  };
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === "touch" || e.type === "pointerleave") ptr.in = false;
    kick();
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    local(e);
    if (e.pointerType === "touch") {
      ptr.sx = ptr.x;
      ptr.sy = ptr.y;
      ptr.in = true;
      ptr.moved = true;
    }
    if (!reduced) pulses.push({ x: ptr.x, y: ptr.y, t0: performance.now() });
    kick();
  };
  const onVisibility = () => kick();

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerup", onLeave);
  canvas.addEventListener("pointercancel", onLeave);
  document.addEventListener("visibilitychange", onVisibility);
  const io = new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    kick();
  });
  io.observe(canvas);
  const ro = new ResizeObserver(() => {
    layout();
    kick();
  });
  ro.observe(canvas);
  // The mono face may land after first layout; re-measure once it does.
  document.fonts?.ready.then(() => {
    if (cols) layout();
  });

  return {
    setActive(on) {
      active = on;
      if (!on) {
        ptr.in = false;
        pulses.length = 0;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else {
        draw(performance.now(), 0);
        kick();
      }
    },
    setAccent(hex) {
      accent = hex;
      if (active) kick();
    },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerup", onLeave);
      canvas.removeEventListener("pointercancel", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
