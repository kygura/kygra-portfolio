/**
 * Sheet 07 · Cipher: a black field of random strings drawn on a plain 2D
 * canvas layered over the (black) WebGL stage. Kept out of the PS1 pipeline
 * on purpose: the quarter-res dither would smear the type into mush.
 *
 * - The field is still until touched.
 * - Hover: glyphs near the cursor light up and lean away from it; the run under
 *   the cursor rolls like slot reels and stops letter by letter on a word,
 *   which holds while the cursor stays near and rolls back to noise once it leaves.
 * - Click / tap: a small pulse in the current accent rings out from the click and
 *   leaves a glow behind it that fades out slowly.
 *
 * The loop only runs while the sheet is active, on screen, the tab is visible
 * and something is actually moving.
 */

export interface CipherField {
  setActive: (on: boolean) => void;
  setAccent: (hex: string) => void;
  dispose: () => void;
}

/** Vocabulary drawn from the essays under content/writings. */
const WORDS = [
  // Freedom, leverage, the cage
  "FREEDOM", "LIBERTY", "LIBERTAS", "SOVEREIGN", "SOVEREIGNTY", "AGENCY", "LEVERAGE", "EXIT", "OPTIONALITY",
  "VOLITION", "WILL", "AUTONOMY", "DISSENT", "REFUSAL", "CAPTURE", "CAPTIVE", "CAGE", "CHAINS", "CUSHIONS",
  "COMFORT", "PRECARITY", "CONDITION", "CONDITIONED", "BIRTHRIGHT", "PRIVILEGE", "PERMISSION", "PARALLEL",
  "ASYMMETRY", "COMPOUND", "CURRENCY", "DEBASED", "SACRIFICE",
  // Semper contra: containment and rupture
  "SEMPERCONTRA", "PERPETUA", "ILLUSIO", "CONTAINMENT", "PRESSURE", "RUPTURE", "CONTAINER", "REVOLUTION",
  "TYRANNY", "OBSOLESCENCE", "DIALECTIC", "NEGATION", "SYNTHESIS", "SPIRIT", "RHYTHM", "RESISTANCE",
  "OVERFLOW", "SYSTEM", "INSTITUTION", "CONTRACT", "COHESION", "NARRATIVE", "HERD", "FIRMWARE", "RITUAL",
  "FICTION", "THEATER",
  // Outsourced spirituality
  "ESOTERIC", "EXOTERIC", "MYSTIC", "GNOSIS", "VEIL", "SHADOWS", "CAVE", "SYMBOL", "MYTH", "DOCTRINE",
  "DOGMA", "RESIDUE", "VESSEL", "CONGREGATION", "ZEALOT", "PRIEST", "HERETIC", "APOSTATE", "INITIATE",
  "ADEPT", "ARCANUM", "APOCRYPHA", "SCRIPTURE", "RELIC", "CORPSE", "TRANSLATION", "BETRAYAL", "PARADOX",
  "ENCOUNTER",
  // The perpetual I
  "SELF", "EGO", "SOUL", "ESSENCE", "BEING", "BECOMING", "EXISTENCE", "ONTOLOGY", "TELEOLOGY", "DETERMINISM",
  "CAUSALITY", "FREEWILL", "ILLUSION", "UNDECIDABLE", "INSIDE", "LAMP", "DESIGN", "PATTERN", "AUTHOR",
  "SCRIPT", "MIRROR",
  // Telos and meaning
  "TELOS", "MEANING", "PURPOSE", "TERMINAL", "INSTRUMENTAL", "DEFERRAL", "NIHILISM", "ABSURD", "ABYSS",
  "VOID", "NOTHING", "DESTINY", "FATE", "PROVIDENCE", "COSMOS", "ORDER", "CHAOS", "ENTROPY", "PROGRESS",
  "ACCELERATION",
  // The sprinter's soul
  "SPRINT", "BURST", "EXPLOSION", "FASTTWITCH", "RECOVERY", "PURSUIT", "VELOCITY", "EXHAUST", "GREATNESS",
  "YIELD", "CROSSROADS", "PASSAGE", "PANORAMA", "TRANSFIGURE", "PERMUTATION", "THRESHOLD", "SPECTRE",
  "DELIVERANCE",
  // Greek and Latin
  "LOGOS", "NOUS", "PNEUMA", "PSYCHE", "ANIMA", "DAIMON", "AION", "KAIROS", "CHRONOS", "ARCHE", "APEIRON",
  "ALETHEIA", "AGORA", "POLIS", "EUDAIMONIA", "ATARAXIA", "APATHEIA", "KATHARSIS", "HUBRIS", "NEMESIS",
  "METANOIA", "AMORFATI", "MEMENTOMORI", "SAPEREAUDE", "TABULARASA",
  // Thaumazein: wonder, then stillness
  "THAUMAZEIN", "WONDER", "AWE", "BEAUTY", "GRACE", "STILLNESS", "PRESENCE", "SURRENDER", "NOW", "SILENCE",
  "LIGHT", "DAWN", "DUSK", "EMBER", "ASH", "ECHO", "DRIFT", "GHOST", "DREAM", "SIGIL", "OMEN", "ORACLE",
];

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGIT = "0123456789";
const HEX = "0123456789ABCDEF";
const SYM = "#$%&*+=~^<>/\\|{}[]():;!?_-.";
const ANY = UPPER + DIGIT + SYM;

/** Pulse: front speed (px/s), lit band ahead of the front, glow trailing behind it,
 *  and the fade-out time (s) once the front has run off the far corner. A pulse travels
 *  until it has covered the whole sheet. */
const SPEED = 520, BAND = 36, TAIL = 55, FADE = 1.6;
/** Reel timing: ms per extra stop, and the stagger between neighbouring letters. */
const REEL_MS = 520, REEL_STAGGER = 70;
/** Click surge on a word: delay between neighbouring letters and the pop length (s). */
const HIT_STAGGER = 0.05, HIT_POP = 0.55;

// Neutral grey, so the accent (in the pulse and in words) is the only colour on the sheet.
const INK = "#b4b4b4";
const HOT = "#ffffff";

const pick = (s: string) => s[(Math.random() * s.length) | 0];
const pickWord = (max: number) => {
  const fit = WORDS.filter((w) => w.length <= max);
  return fit.length ? fit[(Math.random() * fit.length) | 0] : null;
};
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

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
  /** When the word was clicked; drives the letter-by-letter surge. */
  hit?: number;
}

interface Pulse {
  x: number;
  y: number;
  t0: number;
  /** Distance to the farthest corner, so the front sweeps the entire sheet. */
  reach: number;
  /** Seconds the front takes to get there plus the fade. */
  life: number;
}

/** A reel strip: rolls from strip[0] to the last stop between t0 and t1. */
interface Reel {
  strip: string[];
  t0: number;
  t1: number;
}

export function createCipherField(canvas: HTMLCanvasElement, opts: { accent: string; reducedMotion: boolean }): CipherField {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return { setActive: () => {}, setAccent: () => {}, dispose: () => {} };
  const reduced = opts.reducedMotion;
  let accent = opts.accent;

  let cssW = 1, cssH = 1, dpr = 1;
  let cols = 0, rows = 0, cw = 8, ch = 18, fontSize = 14, ox = 0, oy = 0, fontStr = "14px monospace";
  let glyph: string[] = [];
  let base = new Float32Array(0);
  let heat = new Float32Array(0);
  let glow = new Float32Array(0);
  let dx = new Float32Array(0), dy = new Float32Array(0);
  let owner = new Int32Array(0);
  let reels: (Reel | null)[] = [];
  // Only cells with something going on are stepped and redrawn each frame;
  // everything else is a blit of the pre-drawn quiet field.
  let live: number[] = [];
  let seenAt = new Uint32Array(0);
  let frame = 0;
  const quiet = document.createElement("canvas");
  const qctx = quiet.getContext("2d", { alpha: false })!;

  const words = new Map<number, Word>();
  let nextWord = 1;
  let lastSpawn = 0;
  const pulses: Pulse[] = [];

  const ptr = { x: 0, y: 0, sx: 0, sy: 0, in: false, moved: false };
  let active = false, visible = true, raf = 0, last = performance.now();

  const textSetup = (c: CanvasRenderingContext2D) => {
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.font = fontStr;
    c.textAlign = "center";
    c.textBaseline = "middle";
  };

  /** Redraw one cell of the quiet field (its resting glyph at its resting strength). */
  const paintQuiet = (i: number) => {
    const cx = ox + (i % cols) * cw, cy = oy + ((i / cols) | 0) * ch;
    qctx.globalAlpha = 1;
    qctx.fillStyle = "#000";
    qctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
    if (glyph[i] === " ") return;
    qctx.globalAlpha = base[i];
    qctx.fillStyle = INK;
    qctx.fillText(glyph[i], cx, cy);
  };

  const layout = () => {
    cssW = Math.max(1, canvas.clientWidth);
    cssH = Math.max(1, canvas.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = quiet.width = Math.round(cssW * dpr);
    canvas.height = quiet.height = Math.round(cssH * dpr);
    fontSize = cssW < 640 ? 12 : 14;
    fontStr = `${fontSize}px ${getComputedStyle(canvas).fontFamily || "monospace"}`;
    ctx.font = fontStr;
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
    // Rows sit at slightly different strengths so the sheet reads as strata.
    for (let r = 0; r < rows; r++) {
      const rowA = 0.16 + Math.random() * 0.16;
      for (let c = 0; c < cols; c++) base[r * cols + c] = rowA * (0.6 + Math.random() * 0.6);
    }
    heat = new Float32Array(n);
    glow = new Float32Array(n);
    dx = new Float32Array(n);
    dy = new Float32Array(n);
    owner = new Int32Array(n);
    seenAt = new Uint32Array(n);
    reels = new Array(n).fill(null);
    live = [];
    words.clear();
    textSetup(qctx);
    qctx.fillStyle = "#000";
    qctx.fillRect(0, 0, cssW, cssH);
    qctx.fillStyle = INK;
    for (let i = 0; i < n; i++) {
      if (glyph[i] === " ") continue;
      qctx.globalAlpha = base[i];
      qctx.fillText(glyph[i], ox + (i % cols) * cw, oy + ((i / cols) | 0) * ch);
    }
    draw(performance.now(), 0);
  };

  /** Spin cell i from what it shows now to `to`, passing `stops` random glyphs. */
  const spin = (i: number, to: string, t0: number, stops: number) => {
    const strip = [glyph[i] === " " ? pick(ANY) : glyph[i]];
    for (let s = 0; s < stops; s++) strip.push(pick(UPPER + DIGIT));
    strip.push(to);
    reels[i] = { strip, t0, t1: reduced ? t0 : t0 + REEL_MS + stops * 28 };
    live.push(i);
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
    // Reels stop left to right, each one spinning a little longer than the last.
    for (let k = 0; k < text.length; k++) {
      const i = r * cols + start + k;
      owner[i] = id;
      spin(i, text[k], now + k * REEL_STAGGER, 6 + k * 2);
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
    if (hovering && ptr.moved && now - lastSpawn > 90) spawnWord(now);
    ptr.moved = false;

    // Words: refresh while the cursor is near, then roll back to noise.
    for (const [id, w] of words) {
      const wy = oy + w.row * ch, wx0 = ox + w.start * cw, wx1 = wx0 + (w.text.length - 1) * cw;
      const near = hovering && Math.abs(ptr.y - wy) < ch * 2.2 && ptr.x > wx0 - R * 0.5 && ptr.x < wx1 + R * 0.5;
      if (near && !w.fading) w.seen = now;
      if (!w.fading && now - w.seen > 2400) {
        w.fading = true;
        for (let k = 0; k < w.text.length; k++) {
          const i = w.row * cols + w.start + k;
          glyph[i] = w.text[k];
          spin(i, pick(ANY), now + k * REEL_STAGGER * 0.6, 4);
        }
      }
      if (w.fading) {
        let left = 0;
        for (let k = 0; k < w.text.length; k++) {
          const i = w.row * cols + w.start + k;
          if (owner[i] !== id) continue;
          if (reels[i] && now < reels[i]!.t1) left++;
          else owner[i] = 0;
        }
        if (!left) words.delete(id);
      }
    }

    for (let p = pulses.length - 1; p >= 0; p--) if ((now - pulses[p].t0) / 1000 > pulses[p].life) pulses.splice(p, 1);

    // Gather this frame's cells: last frame's live ones plus everything under the
    // cursor and inside each pulse's reach.
    frame++;
    const cand: number[] = [];
    const add = (i: number) => {
      if (seenAt[i] !== frame) { seenAt[i] = frame; cand.push(i); }
    };
    const box = (x: number, y: number, rad: number) => {
      const c0 = Math.max(0, Math.floor((x - rad - ox) / cw)), c1 = Math.min(cols - 1, Math.ceil((x + rad - ox) / cw));
      const r0 = Math.max(0, Math.floor((y - rad - oy) / ch)), r1 = Math.min(rows - 1, Math.ceil((y + rad - oy) / ch));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) add(r * cols + c);
    };
    for (const i of live) add(i);
    if (hovering) box(ptr.sx, ptr.sy, R);
    for (const p of pulses) box(p.x, p.y, Math.min(((now - p.t0) / 1000) * SPEED, p.reach) + BAND);

    const decay = Math.exp(-dt * 2.6);
    const spring = 1 - Math.exp(-dt * 14);
    const next: number[] = [];
    for (const i of cand) {
      const cx = ox + (i % cols) * cw, cy = oy + ((i / cols) | 0) * ch;
      heat[i] *= decay;
      let tx = 0, ty = 0, g = 0;
      if (hovering) {
        const ddx = cx - ptr.sx, ddy = cy - ptr.sy;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1, f = 1 - d / R;
          if (f > heat[i]) heat[i] = f;
          // Words hold their line so they stay readable under the cursor.
          if (!reduced && !owner[i]) {
            const push = f * f * 16;
            tx += (ddx / d) * push;
            ty += (ddy / d) * push;
          }
        }
      }
      for (const p of pulses) {
        const age = (now - p.t0) / 1000;
        const ddx = cx - p.x, ddy = cy - p.y, d = Math.hypot(ddx, ddy) || 1;
        // The front stops at the far corner; inside it the glow falls off behind the front.
        const front = Math.min(age * SPEED, p.reach);
        const k = d > front ? 1 - (d - front) / BAND : Math.exp(-(front - d) / TAIL);
        if (k <= 0.01) continue;
        const life = Math.max(0, 1 - Math.max(0, age - p.reach / SPEED) / FADE);
        if (k * life > g) g = k * life;
        // Only the moving front pushes; the trailing glow just lights.
        if (age * SPEED < p.reach) {
          const push = Math.max(0, 1 - Math.abs(d - front) / BAND) * life * 5;
          tx += (ddx / d) * push;
          ty += (ddy / d) * push;
        }
      }
      glow[i] = g;
      dx[i] += (tx - dx[i]) * spring;
      dy[i] += (ty - dy[i]) * spring;
      if (Math.abs(dx[i]) < 0.05) dx[i] = 0;
      if (Math.abs(dy[i]) < 0.05) dy[i] = 0;
      if (heat[i] < 0.02) heat[i] = 0;
      if (heat[i] || glow[i] > 0.04 || dx[i] || dy[i] || reels[i] || owner[i]) next.push(i);
      else {
        glow[i] = 0;
        paintQuiet(i);
      }
    }
    live = next;
  };

  const draw = (now: number, dt: number) => {
    if (dt > 0) step(now, dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(quiet, 0, 0);
    textSetup(ctx);

    // Blank the live cells' resting glyphs, then draw them in their current state.
    ctx.fillStyle = "#000";
    for (const i of live) ctx.fillRect(ox + (i % cols) * cw - cw / 2, oy + ((i / cols) | 0) * ch - ch / 2, cw, ch);

    let fill = "";
    for (const i of live) {
      const x = ox + (i % cols) * cw + dx[i], y = oy + ((i / cols) | 0) * ch + dy[i];
      let col = INK, a = base[i] + heat[i] * 0.75;

      const reel = reels[i];
      const rolling = reel !== null && now < reel.t1;
      if (reel && !rolling) {
        glyph[i] = reel.strip[reel.strip.length - 1];
        reels[i] = null;
        paintQuiet(i);
      }
      const w = owner[i] ? words.get(owner[i]) : undefined;
      if (rolling) {
        col = HOT;
        a = 0.9;
      } else if (w && !w.fading) {
        col = accent;
        a = 1;
      } else if (heat[i] > 0.35) col = HOT;

      if (glow[i] > 0.04) {
        col = accent;
        a = Math.max(a, 0.45 + glow[i] * 0.55);
      }

      if (rolling) {
        // The strip slides up through a one-cell window and eases onto its last stop.
        const n = reel.strip.length - 1;
        const pos = n * easeOut(Math.max(0, Math.min(1, (now - reel.t0) / (reel.t1 - reel.t0))));
        const k = Math.floor(pos), frac = pos - k;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - cw / 2, y - ch / 2, cw, ch);
        ctx.clip();
        ctx.globalAlpha = a;
        ctx.fillStyle = fill = col;
        ctx.fillText(reel.strip[k], x, y - frac * ch);
        if (k < n) ctx.fillText(reel.strip[k + 1], x, y + (1 - frac) * ch);
        ctx.restore();
        fill = "";
        continue;
      }

      const g = glyph[i];
      if (w && w.hit !== undefined && !w.fading) {
        const t = (now - w.hit) / 1000 - (i - (w.row * cols + w.start)) * HIT_STAGGER;
        if (t >= 0 && t < HIT_POP) {
          const e = Math.sin((Math.PI * t) / HIT_POP);
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.fillStyle = HOT;
          if (!reduced) {
            ctx.shadowColor = accent;
            ctx.shadowBlur = 16 * e;
            ctx.translate(x, y - e * ch * 0.25);
            ctx.scale(1 + 0.6 * e, 1 + 0.6 * e);
            ctx.fillText(g, 0, 0);
          } else ctx.fillText(g, x, y);
          ctx.restore();
          fill = "";
          continue;
        }
      }
      if (g === " " || a < 0.03) continue;
      ctx.globalAlpha = Math.min(1, a);
      if (fill !== col) ctx.fillStyle = fill = col;
      ctx.fillText(g, x, y);
    }
    ctx.globalAlpha = 1;
  };

  const busy = () => live.length > 0 || pulses.length > 0 || words.size > 0 || ptr.in;
  const wants = () => active && visible && !document.hidden && busy();
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
  /** A click on a live word sets it off: its letters surge in turn and a shock ring leaves from its centre. */
  const hitWord = (now: number) => {
    const c = Math.round((ptr.x - ox) / cw), r = Math.round((ptr.y - oy) / ch);
    if (c < 0 || c >= cols || r < 0 || r >= rows) return;
    const w = words.get(owner[r * cols + c]);
    if (!w || w.fading) return;
    w.hit = now;
    w.seen = now + 1500;
    if (reduced) return;
    const x = ox + (w.start + (w.text.length - 1) / 2) * cw, y = oy + w.row * ch;
    const reach = Math.hypot(Math.max(x, cssW - x), Math.max(y, cssH - y)) + BAND;
    pulses.push({ x, y, t0: now, reach: Math.min(reach, 520), life: Math.min(reach, 520) / SPEED + FADE });
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
    hitWord(performance.now());
    if (!reduced) {
      const reach = Math.hypot(Math.max(ptr.x, cssW - ptr.x), Math.max(ptr.y, cssH - ptr.y)) + BAND;
      pulses.push({ x: ptr.x, y: ptr.y, t0: performance.now(), reach, life: reach / SPEED + FADE });
    }
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
      if (active) draw(performance.now(), 0);
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
