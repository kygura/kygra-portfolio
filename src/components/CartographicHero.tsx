import { useEffect, useRef, useState } from "react";
import { ACCENTS, SHEET_KEY, storedIndex, useAccent, writeStored } from "@/theme/accent";
import { isTyping } from "@/theme/keymap";
import { SHEETS } from "@/hero/sheets";
import type { HeroEngine } from "@/hero/engine/hero-engine";

/**
 * Cartographic hero — the sticky stage, name, tagline, accent initials,
 * hairline strip and scroll parallax are unchanged; the field behind them is
 * the PS1 three-scene renderer (ruins / topo / astral). three.js is fetched
 * with a dynamic import on mount, so no other route downloads it. Without
 * WebGL the stage falls back to a CSS contour sheet.
 *
 * The parallax loop only writes compositor-friendly transforms/opacity; the
 * engine runs its own render loop and stops it when offscreen, hidden, or
 * paused under reduced motion.
 */

const NAME = "NICOLAS";
// Peak extra tracking, in em, at full scroll — applied as per-letter
// translation so nothing re-lays-out mid-scroll.
const TRACK_OPEN = 0.13;

const reduceQuery = () =>
  typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

const CartographicHero = () => {
  const accent = useAccent();
  const [sheet, setSheet] = useState(() => storedIndex(SHEET_KEY, SHEETS.length));
  const [noGl, setNoGl] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const caRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const engineRef = useRef<HeroEngine | null>(null);
  const live = useRef({ accent, sheet });
  live.current = { accent, sheet };

  // ── PS1 renderer: lazy-loaded, disposed on unmount ───────────────────
  useEffect(() => {
    let dead = false;
    let engine: HeroEngine | null = null;
    import("@/hero/engine/hero-engine")
      .then(({ createHeroEngine }) => {
        if (dead || !canvasRef.current || !stageRef.current || !labelsRef.current) return;
        const reduced = Boolean(reduceQuery()?.matches);
        engine = createHeroEngine({
          canvas: canvasRef.current,
          host: stageRef.current,
          labelLayer: labelsRef.current,
          readKeys: [],
          readVals: [],
          compass: null,
          accent: ACCENTS[live.current.accent],
          sheet: live.current.sheet,
          motion: !reduced,
          psx: true,
          reducedMotion: reduced,
          onContextLost: () => setNoGl(true),
        });
        engineRef.current = engine;
      })
      .catch(() => {
        if (!dead) setNoGl(true);
      });
    return () => {
      dead = true;
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => engineRef.current?.setAccent(ACCENTS[accent]), [accent]);
  useEffect(() => {
    engineRef.current?.setSheet(sheet);
    writeStored(SHEET_KEY, String(sheet));
  }, [sheet]);

  const goSheet = (i: number) => setSheet(((i % SHEETS.length) + SHEETS.length) % SHEETS.length);

  // [ ] cycle scenes while the hero is mounted.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return;
      if (e.key === "[") setSheet((s) => (s + SHEETS.length - 1) % SHEETS.length);
      else if (e.key === "]") setSheet((s) => (s + 1) % SHEETS.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── scroll parallax (DOM transforms/opacity only) ────────────────────
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mq = reduceQuery();
    let reduced = mq ? mq.matches : false;
    const onReduced = () => {
      reduced = mq ? mq.matches : false;
    };
    mq?.addEventListener?.("change", onReduced);

    let rafId = 0;
    let running = false;
    let onScreen = true;
    let sp = 0;

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

    const parallax = () => {
      const scroll = Math.min(1, Math.max(0, (scrollY - travelStart) / runway));
      sp += (scroll - sp) * 0.09;
      if (reduced) return;

      const s = sp;
      // Anchored "tectonic recede": the type never slides vertically. It
      // stays pinned and pulls apart horizontally (tracking opens like
      // drifting plates), settles back in scale, and dissolves as the
      // scene surfaces beneath it.
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

    const frame = () => {
      rafId = requestAnimationFrame(frame);
      parallax();
    };

    const start = () => {
      if (running) return;
      running = true;
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

    const onScroll = () => {
      // Read only — no layout is forced here; geometry is cached.
      scrollY = window.scrollY;
    };

    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(measure);
    };

    // Catches font-load reflow and hero height changes as well as resizes.
    const ro = new ResizeObserver(onResize);
    ro.observe(root);

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
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", sync);
      mq?.removeEventListener?.("change", onReduced);
      observer.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef} className={`hero${noGl ? " hero--no-gl" : ""}`}>
      <div ref={stageRef} className="hero__stage">
        <canvas ref={canvasRef} className="hero__canvas" role="img" aria-label={SHEETS[sheet].aria} />
        <div ref={labelsRef} className="hero__labels" aria-hidden="true" />
        <div className="hero__vignette" />

        {/* Display name + tagline share one column so their left edge and
            vertical gap hold at every width. */}
        <div className="hero__intro">
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

        {/* Hairline footer strip: scene tabs on the left, scroll cue right. */}
        <footer ref={footerRef} className="hero__strip">
          <div className="hero__sheets" role="group" aria-label="Hero scene">
            {SHEETS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className="hero__sheet"
                aria-pressed={i === sheet}
                onClick={() => goSheet(i)}
              >
                <small>{s.no}</small>
                {s.name}
              </button>
            ))}
            <span className="hero__sheet-keys" aria-hidden="true">
              <kbd>[</kbd>
              <kbd>]</kbd>
            </span>
          </div>
          <div ref={cueRef} className="hero__cue">
            <span>SCROLL</span>
            <span className="hero__cue-arrow">&darr;</span>
          </div>
        </footer>
      </div>

      {/* Scroll runway for the sticky stage, and the marker leading into
          the Manifesto. The shell height is the sum of this and the stage,
          so the two can never drift out of sync. */}
      <div className="hero__marker">( 02 &mdash; ON SOFTWARE CRAFT &middot; NEXT )</div>
    </div>
  );
};

export default CartographicHero;
