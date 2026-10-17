/**
 * Sheet 06 · Cipher: a black field of random strings drawn on a plain 2D
 * canvas (no three.js, so it also runs without WebGL).
 *
 * Hovering lights the glyphs up and pushes them aside, and the run under the
 * cursor scrambles until it settles into a word; the word fades back into
 * noise a few seconds after the cursor leaves. A click sends a rainbow pulse
 * out from the centre of the stage.
 *
 * Like the hero engine, the loop only runs while there is something to draw.
 */

export interface GlyphField {
  setAccent: (hex: string) => void;
  setActive: (on: boolean) => void;
  setMotion: (on: boolean) => void;
  dispose: () => void;
}

export interface GlyphFieldOptions {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  accent: string;
  motion: boolean;
  active: boolean;
}

const WORDS = [
  "SIGNAL", "CRAFT", "AGENT", "MARKET", "OPEN WEB", "VENTURE", "BUILD", "ORBIT", "ATLAS", "CIPHER",
  "DRIFT", "ECHO", "ORIGIN", "LUMEN", "WONDER", "SYSTEM", "DREAM", "FIELD", "VECTOR", "RITUAL",
  "SOURCE", "MERIDIAN", "HORIZON", "KERNEL", "NICOLAS", "MAKE", "SHIP", "PLAY", "TRUST", "CURIOUS",
  "QUIET", "LIGHT", "NORTH", "TIDE", "EMBER", "SEED", "FORGE", "PATTERN", "NETWORK", "SPARK",
];
const NOISE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-=<>/\\|{}[]():;.,_~^!?@";
const HEX = "0123456789ABCDEF";
const rndOf = <T>(s: ArrayLike<T>): T => s[(Math.random() * s.length) | 0];

/** One token of the "random sequences of strings" the rows are built from. */
const token = (): string => {
  const r = Math.random();
  if (r < 0.22) return "0x" + Array.from({ length: 2 + ((Math.random() * 5) | 0) }, () => rndOf(HEX)).join("");
  if (r < 0.36) return Array.from({ length: 4 + ((Math.random() * 6) | 0) }, () => (Math.random() < 0.5 ? "0" : "1")).join("");
  if (r < 0.46) return rndOf(["//", "::", "=>", "<>", "{}", "[]", "&&", "||", "!=", "..", "/*", "*/", "#!", "$_"]);
  return Array.from({ length: 1 + ((Math.random() * 7) | 0) }, () => rndOf(NOISE)).join("");
};

const HOVER_R = 130; // px: light/push radius around the cursor
const PUSH = 14; // px: max displacement under the cursor
const SCRAMBLE = 0.05; // s between scrambled glyphs while decoding
const HOLD = 2.8; // s a word stays after the cursor leaves it
const PULSE_SPEED = 900; // px/s
const PULSE_W = 90; // px: half-width of the rainbow band

export function createGlyphField(o: GlyphFieldOptions): GlyphField {
  const { canvas, host } = o;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  let accent = o.accent;
  let motion = o.motion;
  let active = o.active;

  let cw = 12, chH = 20, cols = 0, rows = 0, cssW = 1, cssH = 1, dpr = 1, font = "";
  // Per-cell state, flat arrays indexed r * cols + c.
  let ch: string[] = [];
  let base = new Float32Array(0); // resting brightness
  let glow = new Float32Array(0); // eased hover light
  let ox = new Float32Array(0), oy = new Float32Array(0); // displacement
  let word = new Int32Array(0); // index into `words`, -1 when the cell is noise
  let lockAt = new Float32Array(0); // time the decoding glyph settles
  let nextTick = new Float32Array(0); // next scramble step

  interface Word { r: number; c0: number; text: string; seen: number; done: boolean }
  const words: (Word | null)[] = [];
  const pulses: number[] = []; // start times

  const ptr = { x: 0, y: 0, in: false };
  let t = 0, last = performance.now(), raf = 0, visible = true;

  const fill = (i: number) => {
    ch[i] = rndOf(NOISE);
    base[i] = 0.1 + Math.random() * 0.22;
  };
  const layout = () => {
    cssW = Math.max(1, host.clientWidth);
    cssH = Math.max(1, host.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const size = cssW < 640 ? 13 : 15;
    font = `${size}px "Fragment Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`;
    ctx.font = font;
    cw = Math.ceil(ctx.measureText("M").width) + 1;
    chH = Math.round(size * 1.45);
    cols = Math.ceil(cssW / cw) + 1;
    rows = Math.ceil(cssH / chH) + 1;
    const n = cols * rows;
    ch = new Array(n);
    base = new Float32Array(n);
    glow = new Float32Array(n);
    ox = new Float32Array(n);
    oy = new Float32Array(n);
    word = new Int32Array(n).fill(-1);
    lockAt = new Float32Array(n);
    nextTick = new Float32Array(n);
    words.length = 0;
    // Rows of tokens separated by gaps; the gaps stay empty.
    for (let r = 0; r < rows; r++) {
      let c = (Math.random() * 4) | 0;
      for (let i = r * cols; i < r * cols + c; i++) ch[i] = " ";
      while (c < cols) {
        const tk = token();
        for (let k = 0; k < tk.length && c < cols; k++, c++) {
          const i = r * cols + c;
          ch[i] = tk[k];
          base[i] = 0.1 + Math.random() * 0.22;
        }
        const gap = 1 + ((Math.random() * 3) | 0);
        for (let k = 0; k < gap && c < cols; k++, c++) ch[r * cols + c] = " ";
      }
    }
  };

  /** Claim a word for the run under (r, c), unless one already lives there. */
  const decodeAt = (r: number, c: number) => {
    const i = r * cols + c;
    if (word[i] >= 0) {
      const w = words[word[i]];
      if (w) w.seen = t;
      return;
    }
    const pool = WORDS.filter((w) => w.length <= cols - 2);
    const text = pool[(Math.random() * pool.length) | 0];
    if (!text) return;
    let c0 = Math.max(0, Math.min(cols - text.length, c - (text.length >> 1)));
    // Slide off any neighbouring word, keeping one blank cell between them.
    const free = (s: number) => {
      for (let k = Math.max(0, s - 1); k <= Math.min(cols - 1, s + text.length); k++) if (word[r * cols + k] >= 0) return false;
      return true;
    };
    if (!free(c0)) {
      let found = -1;
      for (let d = 1; d < text.length && found < 0; d++) {
        if (c0 - d >= 0 && free(c0 - d) && c0 - d + text.length > c) found = c0 - d;
        else if (c0 + d + text.length <= cols && free(c0 + d) && c0 + d <= c) found = c0 + d;
      }
      if (found < 0) return;
      c0 = found;
    }
    let id = words.indexOf(null);
    if (id < 0) id = words.push(null) - 1;
    words[id] = { r, c0, text, seen: t, done: false };
    for (let k = 0; k < text.length; k++) {
      const j = r * cols + c0 + k;
      word[j] = id;
      lockAt[j] = t + 0.25 + k * 0.07 + Math.random() * 0.25;
      nextTick[j] = 0;
    }
  };

  /** Scramble a stale word back into noise. */
  const release = (id: number) => {
    const w = words[id]!;
    for (let k = 0; k < w.text.length; k++) {
      const j = w.r * cols + w.c0 + k;
      word[j] = -1;
      fill(j);
      glow[j] = Math.max(glow[j], 0.6);
    }
    words[id] = null;
  };

  const hsl = (h: number, l: number, a: number) => `hsla(${h | 0},95%,${l | 0}%,${a.toFixed(2)})`;

  const step = (dt: number) => {
    const cx = cssW / 2, cy = cssH / 2;
    const ease = 1 - Math.pow(0.82, dt * 60);
    const glowEase = 1 - Math.pow(0.88, dt * 60);
    // Drop pulses once their band has left the stage.
    const reach = Math.hypot(cx, cy) + PULSE_W * 2;
    while (pulses.length && (t - pulses[0]) * PULSE_SPEED > reach) pulses.shift();

    // Words under the cursor.
    if (ptr.in) {
      const r0 = Math.floor(ptr.y / chH), c0 = Math.floor(ptr.x / cw);
      for (let r = r0 - 1; r <= r0 + 1; r++) {
        if (r < 0 || r >= rows) continue;
        for (let c = c0 - 2; c <= c0 + 2; c++) {
          if (c < 0 || c >= cols) continue;
          if (Math.hypot((c + 0.5) * cw - ptr.x, (r + 0.5) * chH - ptr.y) < cw * 2.2) decodeAt(r, c);
        }
      }
    }
    for (let id = 0; id < words.length; id++) {
      const w = words[id];
      if (w && t - w.seen > HOLD) release(id);
    }

    // Ambient flicker: a few glyphs reshuffle every frame.
    if (motion) {
      const n = Math.ceil(cols * rows * 0.0025);
      for (let k = 0; k < n; k++) {
        const i = (Math.random() * cols * rows) | 0;
        if (word[i] < 0 && ch[i] !== " ") ch[i] = rndOf(NOISE);
      }
    }

    let busy = pulses.length > 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = (c + 0.5) * cw, y = (r + 0.5) * chH;
        let tx = 0, ty = 0, g = 0;
        if (ptr.in) {
          const dx = x - ptr.x, dy = y - ptr.y, d = Math.hypot(dx, dy);
          if (d < HOVER_R) {
            const f = 1 - d / HOVER_R, ff = f * f;
            g = ff;
            const k = (PUSH * ff) / (d || 1);
            tx = dx * k;
            ty = dy * k;
          }
        }
        for (const p0 of pulses) {
          const R = (t - p0) * PULSE_SPEED;
          const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
          const band = 1 - Math.abs(d - R) / PULSE_W;
          if (band > 0) {
            const k = (18 * band) / (d || 1);
            tx += dx * k;
            ty += dy * k;
          }
        }
        ox[i] += (tx - ox[i]) * ease;
        oy[i] += (ty - oy[i]) * ease;
        glow[i] += (g - glow[i]) * glowEase;
        if (Math.abs(ox[i]) > 0.05 || Math.abs(oy[i]) > 0.05 || glow[i] > 0.01) busy = true;
        // Decoding: scramble until the lock time, then settle on the letter.
        const id = word[i];
        if (id >= 0) {
          const w = words[id]!;
          if (t < lockAt[i]) {
            busy = true;
            if (t >= nextTick[i]) {
              ch[i] = rndOf(NOISE);
              nextTick[i] = t + SCRAMBLE;
            }
          } else {
            ch[i] = w.text[c - w.c0];
          }
          busy = true; // a held word still has to time out
        }
      }
    }
    return busy;
  };

  const draw = () => {
    const cx = cssW / 2, cy = cssH / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.font = font;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const s = ch[i];
        if (s === " ") continue;
        const x = (c + 0.5) * cw + ox[i], y = (r + 0.5) * chH + oy[i];
        // Rainbow band: hue follows the angle around the centre.
        let pulseA = 0, hue = 0;
        for (const p0 of pulses) {
          const R = (t - p0) * PULSE_SPEED;
          const d = Math.hypot(x - cx, y - cy);
          const band = 1 - Math.abs(d - R) / PULSE_W;
          if (band > pulseA) {
            pulseA = band;
            hue = ((Math.atan2(y - cy, x - cx) * 180) / Math.PI + 360 + d * 0.25 - (t - p0) * 120) % 360;
          }
        }
        const id = word[i];
        if (pulseA > 0) {
          ctx.fillStyle = hsl(hue, 58 + pulseA * 14, Math.min(1, 0.5 + pulseA));
        } else if (id >= 0 && t >= lockAt[i]) {
          ctx.globalAlpha = Math.min(1, 0.75 + glow[i] * 0.25);
          ctx.fillStyle = accent;
        } else if (id >= 0) {
          ctx.fillStyle = `rgba(255,255,255,${(0.55 + glow[i] * 0.45).toFixed(2)})`;
        } else {
          const a = Math.min(1, base[i] + glow[i] * 0.85);
          ctx.fillStyle = glow[i] > 0.05 ? mixAccent(accent, glow[i], a) : `rgba(200,200,200,${a.toFixed(2)})`;
        }
        ctx.fillText(s, x, y);
        ctx.globalAlpha = 1;
      }
    }
  };

  const wants = () => active && visible && !document.hidden;
  function loop(now: number) {
    raf = 0;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    t += dt;
    const busy = step(dt);
    draw();
    if (wants() && (busy || motion || ptr.in)) raf = requestAnimationFrame(loop);
  }
  function kick() {
    if (raf || !wants()) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  /* ---- input ---- */
  const interactive = (el: EventTarget | null) => el instanceof Element && el.closest("button, a, input, kbd");
  const onMove = (e: PointerEvent) => {
    if (!active) return;
    if (e.pointerType === "touch" || interactive(e.target)) {
      ptr.in = false;
      return;
    }
    const r = host.getBoundingClientRect();
    ptr.x = e.clientX - r.left;
    ptr.y = e.clientY - r.top;
    ptr.in = true;
    kick();
  };
  const onLeave = () => {
    ptr.in = false;
    kick();
  };
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    down = e.button === 0 && !interactive(e.target) ? { x: e.clientX, y: e.clientY } : null;
  };
  const onUp = (e: PointerEvent) => {
    if (!active || !down) return;
    const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8;
    down = null;
    if (!tap) return;
    pulses.push(t);
    // A touch tap also decodes the word under the finger.
    if (e.pointerType === "touch") {
      const r = host.getBoundingClientRect();
      const rr = Math.floor((e.clientY - r.top) / chH), cc = Math.floor((e.clientX - r.left) / cw);
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) decodeAt(rr, cc);
    }
    kick();
  };
  const onVisibility = () => {
    if (!document.hidden) kick();
  };
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerleave", onLeave);
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointerup", onUp);
  document.addEventListener("visibilitychange", onVisibility);
  const io = new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    kick();
  });
  io.observe(host);
  const ro = new ResizeObserver(() => {
    layout();
    kick();
  });
  ro.observe(host);
  layout();
  // The web font may land after the first layout; re-measure once it does.
  document.fonts?.ready.then(() => {
    if (font) {
      layout();
      kick();
    }
  });
  kick();

  return {
    setAccent(hex) {
      accent = hex;
      kick();
    },
    setActive(on) {
      active = on;
      if (!on) {
        ptr.in = false;
        pulses.length = 0;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      }
      kick();
    },
    setMotion(on) {
      motion = on;
      kick();
    },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      font = "";
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointerup", onUp);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

/** Grey glyph tinted toward the accent as the hover light rises. */
function mixAccent(hex: string, k: number, a: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const m = (x: number) => Math.round(200 + (x - 200) * Math.min(1, k * 1.2));
  return `rgba(${m(r)},${m(g)},${m(b)},${a.toFixed(2)})`;
}
