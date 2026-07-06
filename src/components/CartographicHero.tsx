import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

/**
 * Cartographic hero — animated topographic contour lines drawn with plain
 * canvas 2D (fBm value noise + marching squares), pointer ripples and
 * scroll parallax. All per-frame state lives in refs/locals; React never
 * re-renders during the animation loop.
 */

const MOTION = 0.9;
// Flat page background — matches --bg-primary (day #ece7db / night #14110a).
const DAY = { bg: [236, 231, 219], ink: [33, 28, 18] };
const NIGHT = { bg: [20, 17, 10], ink: [234, 227, 207] };
// Accent #a9853b; night variant lifted toward warm paper (mix 0.35 to 242/223/168)
const ACC_DAY = [169, 133, 59];
const ACC_NIGHT = [195, 165, 97];

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

interface Label {
  x: number;
  y: number;
  lv: number;
}

const EDGE_PAD = "clamp(20px,3.4vw,46px)";

const CartographicHero = () => {
  const { resolvedTheme } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const caRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const nightRef = useRef(true);

  // Site default theme is dark (night)
  const isNight = resolvedTheme !== "light";

  // Theme CSS custom properties on the hero root (smooth via CSS transitions)
  useEffect(() => {
    nightRef.current = isNight;
    const el = rootRef.current;
    if (!el) return;
    const set = (k: string, v: string) => el.style.setProperty(k, v);
    const a = isNight ? ACC_NIGHT : ACC_DAY;
    if (isNight) {
      set("--bg", "#14110a");
      set("--ink", "#eae3cf");
      set("--soft", "rgba(234,227,207,0.55)");
      set("--line", "rgba(234,227,207,0.22)");
      set("--vig", "rgba(0,0,0,0.42)");
    } else {
      set("--bg", "#ece7db");
      set("--ink", "#211c12");
      set("--soft", "rgba(33,28,18,0.55)");
      set("--line", "rgba(33,28,18,0.22)");
      set("--vig", "rgba(66,50,22,0.12)");
    }
    set("--accent", `rgb(${a[0]},${a[1]},${a[2]})`);
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
    };
    mq?.addEventListener?.("change", onReduced);
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

    // mutable per-frame state
    const t0 = performance.now();
    let raf = 0;
    let mix = nightRef.current ? 1 : 0;
    let scroll = 0;
    let sp = 0;
    let drawnOnce = false;
    const ptr = { x: -9e3, y: -9e3, tx: -9e3, ty: -9e3, amp: 0, tamp: 0 };
    let ripples: Ripple[] = [];
    let vals: Float32Array | null = null;
    let mn: Float32Array | null = null;
    let mx: Float32Array | null = null;

    const march = (
      ctx: CanvasRenderingContext2D,
      cols: number,
      rows: number,
      cell: number,
      lv: number,
      labels: Label[] | null
    ) => {
      const V = vals!, MN = mn!, MX = mx!;
      ctx.beginPath();
      const fr = (v1: number, v2: number) => {
        const d = v2 - v1;
        if (d === 0) return 0.5;
        const f = (lv - v1) / d;
        return f < 0 ? 0 : f > 1 ? 1 : f;
      };
      for (let j = 0; j < rows - 1; j++) {
        const y = j * cell;
        for (let i = 0; i < cols - 1; i++) {
          const ci = j * (cols - 1) + i;
          if (lv < MN[ci] || lv > MX[ci]) continue;
          const a = V[j * cols + i];
          const b = V[j * cols + i + 1];
          const c = V[(j + 1) * cols + i + 1];
          const d = V[(j + 1) * cols + i];
          let idx = 0;
          if (a > lv) idx |= 1;
          if (b > lv) idx |= 2;
          if (c > lv) idx |= 4;
          if (d > lv) idx |= 8;
          if (idx === 0 || idx === 15) continue;
          const x = i * cell;
          const pt = (e: number): [number, number] => {
            switch (e) {
              case 0: return [x + cell * fr(a, b), y];
              case 1: return [x + cell, y + cell * fr(b, c)];
              case 2: return [x + cell * fr(d, c), y + cell];
              default: return [x, y + cell * fr(a, d)];
            }
          };
          let segs: number[][];
          switch (idx) {
            case 1: case 14: segs = [[3, 0]]; break;
            case 2: case 13: segs = [[0, 1]]; break;
            case 3: case 12: segs = [[3, 1]]; break;
            case 4: case 11: segs = [[1, 2]]; break;
            case 5: segs = [[3, 0], [1, 2]]; break;
            case 6: case 9: segs = [[0, 2]]; break;
            case 7: case 8: segs = [[3, 2]]; break;
            case 10: segs = [[0, 1], [3, 2]]; break;
            default: segs = [];
          }
          for (let s = 0; s < segs.length; s++) {
            const p1 = pt(segs[s][0]);
            const p2 = pt(segs[s][1]);
            ctx.moveTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]);
            if (labels && ((i * 31 + j * 17) & 255) === 0) {
              labels.push({ x: (p1[0] + p2[0]) / 2, y: (p1[1] + p2[1]) / 2, lv });
            }
          }
        }
      }
      ctx.stroke();
    };

    const draw = (now: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const t = (now - t0) / 1000;
      const intro = Math.min(1, t / 1.9);
      const ease = intro * intro * (3 - 2 * intro);
      const motion = reduced ? 0 : MOTION;

      // smoothed scroll
      sp += (scroll - sp) * 0.09;

      // scroll-driven composition — transforms/opacity only.
      // Skipped entirely under reduced motion (static hero).
      if (!reduced) {
        const s = sp;
        // Anchored "tectonic recede": the type never slides vertically. It
        // stays pinned and pulls apart horizontally (tracking opens like
        // drifting plates), settles back in scale, and dissolves as the
        // contour field surfaces beneath it.
        if (nameRef.current) {
          nameRef.current.style.transform = `scale(${(1 - s * 0.07).toFixed(4)})`;
          nameRef.current.style.letterSpacing = `${(-0.015 + s * 0.13).toFixed(4)}em`;
          nameRef.current.style.opacity = Math.max(0, 1 - s * 1.15).toFixed(3);
        }
        if (caRef.current) {
          caRef.current.style.transform =
            `rotate(${(s * -3).toFixed(2)}deg) scale(${(1 - s * 0.05).toFixed(4)})`;
          caRef.current.style.opacity = Math.max(0, 1 - s * 1.25).toFixed(3);
        }
        const early = Math.max(0, 1 - s * 2.4);
        if (eyebrowRef.current) eyebrowRef.current.style.opacity = early.toFixed(3);
        if (taglineRef.current) taglineRef.current.style.opacity = early.toFixed(3);
        if (footerRef.current) footerRef.current.style.opacity = Math.max(0, 1 - s * 1.7).toFixed(3);
        if (cueRef.current) cueRef.current.style.opacity = Math.max(0, 1 - s * 5).toFixed(3);
      }

      // pointer smoothing
      ptr.x += (ptr.tx - ptr.x) * 0.08;
      ptr.y += (ptr.ty - ptr.y) * 0.08;
      ptr.amp += (ptr.tamp - ptr.amp) * 0.05;

      // day/night mix
      const target = nightRef.current ? 1 : 0;
      mix += (target - mix) * 0.08;

      // Reduced motion: repaint only when scroll or theme mix is still moving.
      if (
        reduced &&
        drawnOnce &&
        Math.abs(sp - scroll) < 0.0005 &&
        Math.abs(mix - target) < 0.0025
      ) {
        return;
      }

      const m3 = (a: number[], b: number[]) => [
        a[0] + (b[0] - a[0]) * mix,
        a[1] + (b[1] - a[1]) * mix,
        a[2] + (b[2] - a[2]) * mix,
      ];
      const bg = m3(DAY.bg, NIGHT.bg);
      const ink = m3(DAY.ink, NIGHT.ink);
      const acc = m3(ACC_DAY, ACC_NIGHT);

      // flat background — same surface as the rest of the site
      ctx.fillStyle = `rgb(${bg[0] | 0},${bg[1] | 0},${bg[2] | 0})`;
      ctx.fillRect(0, 0, w, h);

      // field
      const cell = w < 720 ? 15 : 13;
      const cols = Math.ceil(w / cell) + 2;
      const rows = Math.ceil(h / cell) + 2;
      if (!vals || vals.length < cols * rows) vals = new Float32Array(cols * rows);
      const V = vals;
      const sc = 0.0017;
      // Freeze autonomous morphing under reduced motion; scroll lift still applies.
      const tz = reduced ? 0 : t * 0.045;
      const oscA = 0.17 * motion * ease;
      const lift = scroll * 1.05;
      const cr = 200;
      const c2 = 2 * cr * cr;
      const cAmp = 0.55 * motion * ptr.amp * ease;
      const tOsc = reduced ? 0 : t * 0.75;

      const rip: { x: number; y: number; age: number }[] = [];
      for (let r = 0; r < ripples.length; r++) {
        const age = (now - ripples[r].t0) / 1000;
        if (age < 3) rip.push({ x: ripples[r].x, y: ripples[r].y, age });
      }
      ripples = ripples.filter((r) => (now - r.t0) / 1000 < 3);

      for (let j = 0; j < rows; j++) {
        const y = j * cell;
        const ny = y * sc + 7.31;
        for (let i = 0; i < cols; i++) {
          const x = i * cell;
          let v = fbm(x * sc + 3.7, ny, tz);
          v += oscA * Math.sin(tOsc + v * 7.3);
          if (cAmp > 0.004) {
            const dx = x - ptr.x;
            const dy = y - ptr.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < c2 * 4.5) v += cAmp * Math.exp(-d2 / c2);
          }
          for (let r = 0; r < rip.length; r++) {
            const R = rip[r];
            const dx = x - R.x;
            const dy = y - R.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            v += 0.5 * motion * Math.sin(d * 0.05 - R.age * 5) * Math.exp(-d * 0.006 - R.age * 1.6);
          }
          V[j * cols + i] = v + lift;
        }
      }

      // per-cell min/max
      const nc = (cols - 1) * (rows - 1);
      if (!mn || mn.length < nc) {
        mn = new Float32Array(nc);
        mx = new Float32Array(nc);
      }
      const MN = mn, MX = mx!;
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const a = V[j * cols + i];
          const b = V[j * cols + i + 1];
          const c = V[(j + 1) * cols + i + 1];
          const d = V[(j + 1) * cols + i];
          let lo = a < b ? a : b;
          if (c < lo) lo = c;
          if (d < lo) lo = d;
          let hi = a > b ? a : b;
          if (c > hi) hi = c;
          if (d > hi) hi = d;
          const ci = j * (cols - 1) + i;
          MN[ci] = lo;
          MX[ci] = hi;
        }
      }

      // contour levels — "labeled" style
      const step = 0.17;
      const lo = -1.5;
      const hi = 2.2;
      const nLev = Math.round((hi - lo) / step);
      const accentK = Math.round((0.3 + scroll * 0.9 - lo) / step);
      const labels: Label[] = [];
      ctx.lineJoin = "round";
      for (let k = 0; k <= nLev; k++) {
        const lv = lo + k * step;
        const isAccent = k === accentK;
        const isIndex = !isAccent && k % 5 === 0;
        let alpha: number, lw: number, col: number[];
        if (isAccent) {
          alpha = 0.9 * ease;
          lw = 1.5;
          col = acc;
        } else if (isIndex) {
          alpha = (0.33 - 0.08 * mix) * ease;
          lw = 1.2;
          col = ink;
        } else {
          alpha = (0.15 - 0.03 * mix) * ease;
          lw = 0.8;
          col = ink;
        }
        lw *= 1.4;
        if (alpha < 0.01) continue;
        ctx.strokeStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${alpha.toFixed(3)})`;
        ctx.lineWidth = lw;
        march(ctx, cols, rows, cell, lv, isIndex || isAccent ? labels : null);
      }

      // elevation labels
      if (labels.length) {
        ctx.font = '500 10px "IBM Plex Mono", monospace';
        ctx.textBaseline = "middle";
        const halo = `rgb(${bg[0] | 0},${bg[1] | 0},${bg[2] | 0})`;
        const inkA = `rgba(${ink[0] | 0},${ink[1] | 0},${ink[2] | 0},${(0.6 * ease).toFixed(2)})`;
        let drawn = 0;
        for (let i = 0; i < labels.length && drawn < 14; i++) {
          const L = labels[i];
          if (L.x < 40 || L.x > w - 60 || L.y < 70 || L.y > h - 70) continue;
          const txt = String(Math.max(0, Math.round(240 + L.lv * 160)));
          ctx.lineWidth = 4;
          ctx.strokeStyle = halo;
          ctx.strokeText(txt, L.x + 5, L.y);
          ctx.fillStyle = inkA;
          ctx.fillText(txt, L.x + 5, L.y);
          drawn++;
        }
      }

      drawnOnce = true;
    };

    const frame = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(frame);
    };

    const onPtr = (e: PointerEvent) => {
      ptr.tx = e.clientX;
      ptr.ty = e.clientY;
      ptr.tamp = 1;
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest("a,button")) return;
      ripples.push({ x: e.clientX, y: e.clientY, t0: performance.now() });
      if (ripples.length > 4) ripples.shift();
    };
    const onLeave = () => {
      ptr.tamp = 0;
    };
    const onScroll = () => {
      const max = Math.max(1, root.offsetHeight - window.innerHeight);
      const y = -root.getBoundingClientRect().top;
      scroll = Math.max(0, Math.min(1, y / max));
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(frame);
      }
    };

    window.addEventListener("pointermove", onPtr, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    onScroll();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPtr);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      mq?.removeEventListener?.("change", onReduced);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative h-[200vh] font-mono md:-mt-[72px]"
      style={{
        background: "var(--bg, #14110a)",
        color: "var(--ink, #eae3cf)",
        transition: "background 0.6s ease",
      }}
    >
      <div className="sticky top-0 h-screen overflow-hidden cursor-crosshair">
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 40%, transparent 55%, var(--vig, rgba(0,0,0,0.42)))",
          }}
        />

        {/* Eyebrow */}
        <div
          ref={eyebrowRef}
          className="pointer-events-none absolute flex items-center gap-2.5 text-[11px] tracking-[0.2em] will-change-[opacity]"
          style={{
            left: EDGE_PAD,
            top: "23vh",
            animation: "cartoFadeUp 0.8s ease 0.25s both",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-[1px]"
            style={{ background: "var(--accent, #c3a561)", transition: "background 0.6s ease" }}
          />
          <span>FRONTIER SOFTWARE STUDIO &mdash; VENTURES BY NCA</span>
        </div>

        {/* Display name */}
        <div
          ref={nameRef}
          className="pointer-events-none absolute will-change-transform"
          style={{
            left: "clamp(16px,2.9vw,40px)",
            top: "29vh",
            letterSpacing: "-0.015em",
            transformOrigin: "left center",
          }}
        >
          <h1
            className="m-0 font-display font-normal"
            style={{
              fontSize: "clamp(72px,16vw,300px)",
              lineHeight: 0.82,
              animation:
                "cartoFadeUp 1s ease 0.35s both, cartoNameReveal 1.15s cubic-bezier(0.22,1,0.36,1) 0.35s both",
            }}
          >
            NICOLAS
          </h1>
        </div>

        {/* Tagline */}
        <p
          ref={taglineRef}
          className="pointer-events-none absolute m-0 font-display will-change-[opacity]"
          style={{
            left: EDGE_PAD,
            top: "calc(29vh + 15vw)",
            width: "clamp(210px,24vw,340px)",
            fontSize: "clamp(16px,1.45vw,23px)",
            lineHeight: 1.45,
            color: "var(--ink, #eae3cf)",
            transition: "color 0.6s ease",
            animation: "cartoFadeUp 0.9s ease 0.55s both",
            textWrap: "pretty",
          }}
        >
          Software ventures &amp; craft &mdash; agentic systems, markets and the open web.
        </p>

        {/* Italic accent initials */}
        <div
          ref={caRef}
          className="pointer-events-none absolute will-change-transform"
          style={{ right: EDGE_PAD, bottom: "7vh", transformOrigin: "center center" }}
        >
          <div
            className="font-display italic"
            style={{
              fontSize: "clamp(96px,19vw,360px)",
              lineHeight: 0.78,
              color: "var(--accent, #c3a561)",
              transition: "color 0.6s ease",
              animation: "cartoFadeUp 1.1s ease 0.5s both",
            }}
          >
            C.A
          </div>
        </div>

        {/* Hairline footer strip */}
        <footer
          ref={footerRef}
          className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-[10.5px] tracking-[0.16em] will-change-[opacity]"
          style={{
            padding: `14px ${EDGE_PAD}`,
            borderTop: "1px solid var(--line, rgba(234,227,207,0.22))",
            transition: "border-color 0.6s ease",
            animation: "cartoFadeUp 0.8s ease 0.8s both",
          }}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--accent, #c3a561)",
                animation: "cartoPulse 2.4s ease-in-out infinite",
                transition: "background 0.6s ease",
              }}
            />
            <span>VENTURES &mdash; 2026</span>
          </div>
          <div ref={cueRef} className="flex items-center gap-2 whitespace-nowrap">
            <span>SCROLL</span>
            <span
              className="inline-block"
              style={{ animation: "cartoCueBob 1.6s ease-in-out infinite" }}
            >
              &darr;
            </span>
          </div>
        </footer>
      </div>

      {/* Trailing section marker leading into the Manifesto */}
      <div
        className="flex h-[100vh] items-end justify-center pb-12 text-[10.5px] tracking-[0.2em]"
        style={{ color: "var(--soft, rgba(234,227,207,0.55))", transition: "color 0.6s ease" }}
      >
        ( 02 &mdash; ON SOFTWARE CRAFT &middot; NEXT )
      </div>
    </div>
  );
};

export default CartographicHero;
