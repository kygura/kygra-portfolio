import { Fragment, useEffect, useRef, useState } from "react";
import { ACCENTS, EGGS_KEY, SHEET_KEY, readStored, storedIndex, useAccent, writeStored } from "@/theme/accent";
import { isTyping } from "@/theme/keymap";
import { SHEETS } from "@/hero/sheets";
import type { HeroEngine } from "@/hero/engine/hero-engine";

/**
 * Cartographic hero: stage, name, tagline, accent initials and hairline
 * strip sit in normal flow and scroll away with the page; the field behind them is
 * the PS1 five-scene renderer (ocean / astral / ruins / rail / field). three.js is fetched
 * with a dynamic import on mount, so no other route downloads it. Without
 * WebGL the stage falls back to a CSS contour sheet.
 *
 * The engine runs its own render loop and stops it when offscreen, hidden, or
 * paused under reduced motion.
 */

const NAME = "NICOLAS";
const MARK = "C.A";

/** Types NAME, then MARK, one character at a time; the caret rides the one being typed. */
function useTyping(reduced: boolean) {
  const total = NAME.length + MARK.length;
  const [n, setN] = useState(reduced ? total : 0);
  const [caret, setCaret] = useState(!reduced);
  useEffect(() => {
    if (reduced) return;
    let i = 0, t = 0;
    const step = () => {
      i++;
      setN(i);
      if (i >= total) {
        t = window.setTimeout(() => setCaret(false), 1000);
        return;
      }
      t = window.setTimeout(step, i === NAME.length ? 420 : i < NAME.length ? 95 : 150);
    };
    t = window.setTimeout(step, 650);
    return () => window.clearTimeout(t);
  }, [reduced, total]);
  return { name: Math.min(n, NAME.length), mark: Math.max(0, n - NAME.length), caret };
}

const Caret = () => <span className="hero__caret" aria-hidden="true" />;

const readFound = (): string[] => {
  try {
    const v = JSON.parse(readStored(EGGS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const reduceQuery = () =>
  typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

const CartographicHero = () => {
  const accent = useAccent();
  const [sheet, setSheet] = useState(() => storedIndex(SHEET_KEY, SHEETS.length));
  const [noGl, setNoGl] = useState(false);
  const typing = useTyping(Boolean(reduceQuery()?.matches));
  const [egg, setEgg] = useState<{ n: number; text: string; total: number; fresh: boolean; key: number } | null>(null);
  const found = useRef<Set<string> | null>(null);
  const eggTimer = useRef(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
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
        if (dead || !canvasRef.current || !stageRef.current) return;
        const reduced = Boolean(reduceQuery()?.matches);
        engine = createHeroEngine({
          canvas: canvasRef.current,
          host: stageRef.current,
          readKeys: [],
          readVals: [],
          compass: null,
          accent: ACCENTS[live.current.accent],
          sheet: live.current.sheet,
          motion: !reduced,
          psx: true,
          reducedMotion: reduced,
          onContextLost: () => setNoGl(true),
          onEgg: ({ id, text, total }) => {
            found.current ??= new Set(readFound());
            const fresh = !found.current.has(id);
            if (fresh) {
              found.current.add(id);
              writeStored(EGGS_KEY, JSON.stringify([...found.current]));
            }
            setEgg({ n: found.current.size, text, total, fresh, key: Date.now() });
            window.clearTimeout(eggTimer.current);
            eggTimer.current = window.setTimeout(() => setEgg(null), 5000);
          },
        });
        engineRef.current = engine;
      })
      .catch(() => {
        if (!dead) setNoGl(true);
      });
    return () => {
      dead = true;
      window.clearTimeout(eggTimer.current);
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => engineRef.current?.setAccent(ACCENTS[accent]), [accent]);
  useEffect(() => {
    engineRef.current?.setSheet(sheet);
    writeStored(SHEET_KEY, String(sheet));
  }, [sheet]);

  // The strip wraps to two rows on phones; keep the monogram clear of its hairline.
  useEffect(() => {
    const stage = stageRef.current, strip = footerRef.current;
    if (!stage || !strip) return;
    const sync = () => stage.style.setProperty("--strip-h", `${strip.offsetHeight}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(strip);
    return () => ro.disconnect();
  }, []);

  const goSheet = (i: number) => setSheet(((i % SHEETS.length) + SHEETS.length) % SHEETS.length);

  // [ ] cycle scenes; Shift+arrows orbit, + / - dolly, 0 resets the camera
  // (while the stage is on screen).
  useEffect(() => {
    const STEP = 0.18;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return;
      if (e.key === "[") return setSheet((s) => (s + SHEETS.length - 1) % SHEETS.length);
      if (e.key === "]") return setSheet((s) => (s + 1) % SHEETS.length);
      const eng = engineRef.current;
      const r = stageRef.current?.getBoundingClientRect();
      if (!eng || !r || r.bottom < window.innerHeight * 0.4 || r.top > window.innerHeight * 0.6) return;
      let used = true;
      if (e.shiftKey && e.key === "ArrowLeft") eng.nudge(-STEP, 0);
      else if (e.shiftKey && e.key === "ArrowRight") eng.nudge(STEP, 0);
      else if (e.shiftKey && e.key === "ArrowUp") eng.nudge(0, -STEP * 0.6);
      else if (e.shiftKey && e.key === "ArrowDown") eng.nudge(0, STEP * 0.6);
      else if (e.key === "+" || e.key === "=") eng.nudge(0, 0, 1.2);
      else if (e.key === "-" || e.key === "_") eng.nudge(0, 0, 1 / 1.2);
      else if (e.key === "0") eng.resetView();
      else used = false;
      if (used) e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={rootRef} className={`hero${noGl ? " hero--no-gl" : ""}`}>
      <div ref={stageRef} className="hero__stage">
        <canvas ref={canvasRef} className="hero__canvas" role="img" aria-label={SHEETS[sheet].aria} />
        <div className="hero__vignette" />

        <div className="hero__egg" role="status" aria-live="polite">
          {egg && (
            <p key={egg.key} className={egg.fresh ? "is-new" : undefined}>
              <small>
                {egg.fresh ? "FOUND" : "AGAIN"} {String(egg.n).padStart(2, "0")}/{String(egg.total).padStart(2, "0")}
              </small>
              {egg.text}
            </p>
          )}
        </div>

        {/* Display name + tagline share one column so their left edge and
            vertical gap hold at every width. */}
        <div className="hero__intro">
          <div className="hero__win">
            <div className="hero__win-body">
              <div className="hero__name">
                <h1 className="hero__name-text" aria-label={NAME}>
                  {typing.caret && typing.name === 0 && <Caret />}
                  {NAME.split("").map((ch, i) => (
                    <Fragment key={i}>
                      <span data-letter className="hero__letter" aria-hidden="true" data-pending={i >= typing.name || undefined}>
                        {ch}
                      </span>
                      {typing.caret && typing.mark === 0 && typing.name === i + 1 && <Caret />}
                    </Fragment>
                  ))}
                </h1>
              </div>

              <p className="hero__tagline">
                Software ventures &amp; craft: agentic systems, markets and the open web.
              </p>
            </div>
          </div>
        </div>

        {/* Italic accent initials */}
        <div className="hero__mark">
          <div className="hero__win hero__win--mark">
            <div className="hero__mark-text" aria-label={MARK}>
              {MARK.split("").map((ch, i) => (
                <Fragment key={i}>
                  <span className="hero__letter" aria-hidden="true" data-pending={i >= typing.mark || undefined}>
                    {ch}
                  </span>
                  {typing.caret && typing.name === NAME.length && typing.mark === i + 1 && <Caret />}
                </Fragment>
              ))}
            </div>
          </div>
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
            <span className="hero__orbit-hint" aria-hidden="true">
              {SHEETS[sheet].hint ?? "DRAG TO ORBIT \u00b7 CTRL+WHEEL TO ZOOM \u00b7 DOUBLE-CLICK TO RESET"}
            </span>
          </div>
          <div className="hero__cue">
            <span>SCROLL</span>
            <span className="hero__cue-arrow">&darr;</span>
          </div>
        </footer>
      </div>

    </div>
  );
};

export default CartographicHero;
