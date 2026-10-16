import { useCallback, useEffect, useRef, useState } from "react";
import { ACCENTS, EGGS_KEY, SHEET_KEY, readStored, storedIndex, useAccent, writeStored } from "@/theme/accent";
import { isTyping } from "@/theme/keymap";
import { SHEETS } from "@/hero/sheets";
import type { HeroEngine } from "@/hero/engine/hero-engine";

/**
 * Cartographic hero — a desktop on the survey sheet. Name, tagline and accent
 * initials sit on the bare ground; the PS1 five-scene renderer (ocean / astral /
 * ruins / rail / field) runs inside a window with a title bar, scene tabs and a
 * status line. The window drags by its title bar, maximizes to the whole stage
 * (the old full-bleed look) and shades down to its title bar. three.js is
 * fetched with a dynamic import on mount, so no other route downloads it.
 * Without WebGL the window shows a CSS contour sheet.
 *
 * The engine runs its own render loop and stops it when offscreen, hidden, or
 * paused under reduced motion.
 */

const NAME = "NICOLAS";

const readFound = (): string[] => {
  try {
    const v = JSON.parse(readStored(EGGS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

type WinMode = "normal" | "max" | "shade";

/** Keep at least this much of the title bar on the stage while dragging. */
const GRIP = 96;
/** Smallest window a resize can leave: room for the chrome and a usable frame. */
const MIN_W = 320, MIN_H = 220;

/** Resize handles: which edges each one moves (x: -1 left, 1 right; y: -1 top, 1 bottom). */
const EDGES = [
  { id: "n", x: 0, y: -1 }, { id: "s", x: 0, y: 1 }, { id: "e", x: 1, y: 0 }, { id: "w", x: -1, y: 0 },
  { id: "ne", x: 1, y: -1 }, { id: "nw", x: -1, y: -1 }, { id: "se", x: 1, y: 1 }, { id: "sw", x: -1, y: 1 },
] as const;

/** Follow one pointer on `el` until it lifts. */
const track = (el: HTMLElement, e: React.PointerEvent, move: (ev: PointerEvent) => void, end: () => void) => {
  el.setPointerCapture(e.pointerId);
  const up = (ev: PointerEvent) => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    if (el.hasPointerCapture(ev.pointerId)) el.releasePointerCapture(ev.pointerId);
    end();
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
};

const desktop = () => window.matchMedia("(min-width: 768px)").matches;

const reduceQuery = () =>
  typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

const CartographicHero = () => {
  const accent = useAccent();
  const [sheet, setSheet] = useState(() => storedIndex(SHEET_KEY, SHEETS.length));
  const [noGl, setNoGl] = useState(false);
  const [egg, setEgg] = useState<{ n: number; text: string; total: number; fresh: boolean; key: number } | null>(null);
  const [mode, setMode] = useState<WinMode>("normal");
  const [sized, setSized] = useState(false);
  /** The window is being moved or resized (lifts the accent onto its frame). */
  const [handling, setHandling] = useState<"" | "is-moving" | "is-resizing">("");
  const found = useRef<Set<string> | null>(null);
  const eggTimer = useRef(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const winRef = useRef<HTMLElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const offset = useRef({ x: 0, y: 0 });
  /** Explicit window size once the user has resized it; null fills the grid slot. */
  const size = useRef<{ w: number; h: number } | null>(null);
  const engineRef = useRef<HeroEngine | null>(null);
  const live = useRef({ accent, sheet });
  live.current = { accent, sheet };

  // ── PS1 renderer: lazy-loaded, disposed on unmount ───────────────────
  useEffect(() => {
    let dead = false;
    let engine: HeroEngine | null = null;
    import("@/hero/engine/hero-engine")
      .then(({ createHeroEngine }) => {
        if (dead || !canvasRef.current || !viewRef.current) return;
        const reduced = Boolean(reduceQuery()?.matches);
        engine = createHeroEngine({
          canvas: canvasRef.current,
          host: viewRef.current,
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

  // ── Window: drag offset, clamped so the title bar never leaves the stage ──
  const stageBox = useCallback(() => {
    const stage = stageRef.current!;
    return { w: stage.clientWidth, h: stage.clientHeight, top: parseFloat(getComputedStyle(stage).paddingTop) || 0 };
  }, []);

  const placeWin = useCallback((x: number, y: number) => {
    const win = winRef.current, stage = stageRef.current;
    if (!win || !stage) return;
    const s = stageBox();
    // Measure from the untranslated slot, so clamping holds after resizes.
    // Phones dock the window in the flow, where an offset would push it off screen.
    if (!desktop()) x = y = 0;
    const left = win.offsetLeft, top = win.offsetTop, w = win.offsetWidth;
    x = Math.max(GRIP - left - w, Math.min(s.w - GRIP - left, x));
    y = Math.max(s.top - top, Math.min(s.h - top - 40, y));
    offset.current = { x, y };
    win.style.transform = x || y ? `translate(${Math.round(x)}px, ${Math.round(y)}px)` : "";
  }, [stageBox]);

  const applySize = useCallback((next: { w: number; h: number } | null) => {
    const win = winRef.current;
    if (!win) return;
    size.current = next;
    setSized(Boolean(next));
    if (next) {
      win.style.setProperty("--win-w", `${Math.round(next.w)}px`);
      win.style.setProperty("--win-h", `${Math.round(next.h)}px`);
    } else {
      win.style.removeProperty("--win-w");
      win.style.removeProperty("--win-h");
    }
  }, []);

  /** Keep a resized window no larger than the stage it sits on. */
  const fitWin = useCallback(() => {
    if (size.current && stageRef.current) {
      const s = stageBox();
      applySize({
        w: Math.max(MIN_W, Math.min(s.w, size.current.w)),
        h: Math.max(MIN_H, Math.min(s.h - s.top, size.current.h)),
      });
    }
    placeWin(offset.current.x, offset.current.y);
  }, [stageBox, applySize, placeWin]);

  useEffect(() => {
    const win = winRef.current;
    if (!win) return;
    if (mode === "max") win.style.transform = "";
    else placeWin(offset.current.x, offset.current.y);
    // A shaded window has nothing to draw; the restored one picks motion back up.
    engineRef.current?.setMotion(mode !== "shade" && !reduceQuery()?.matches);
  }, [mode, placeWin]);

  useEffect(() => {
    const onResize = () => {
      if (mode !== "max") fitWin();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mode, fitWin]);

  const onBarDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || mode === "max" || (e.target as Element).closest("button")) return;
    // Phones dock the window in the flow; there is nowhere to drag it to.
    if (!desktop()) return;
    const start = { x: e.clientX, y: e.clientY, ox: offset.current.x, oy: offset.current.y };
    setHandling("is-moving");
    track(
      e.currentTarget,
      e,
      (ev) => placeWin(start.ox + ev.clientX - start.x, start.oy + ev.clientY - start.y),
      () => setHandling(""),
    );
  };

  // ── Window: resize from any edge or corner ──
  // Works on the window's edges in stage coordinates, so a left or top drag
  // moves that edge and leaves the opposite one where it was.
  const onEdgeDown = (dir: (typeof EDGES)[number]) => (e: React.PointerEvent<HTMLElement>) => {
    const win = winRef.current;
    if (e.button !== 0 || mode !== "normal" || !win || !desktop()) return;
    e.preventDefault();
    e.stopPropagation();
    const s = stageBox();
    const L0 = win.offsetLeft + offset.current.x, T0 = win.offsetTop + offset.current.y;
    const R0 = L0 + win.offsetWidth, B0 = T0 + win.offsetHeight;
    const start = { x: e.clientX, y: e.clientY };
    setHandling("is-resizing");
    track(
      e.currentTarget,
      e,
      (ev) => {
        const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
        let L = L0, T = T0, R = R0, B = B0;
        if (dir.x < 0) L = Math.max(0, Math.min(R0 - MIN_W, L0 + dx));
        if (dir.x > 0) R = Math.min(s.w, Math.max(L0 + MIN_W, R0 + dx));
        if (dir.y < 0) T = Math.max(s.top, Math.min(B0 - MIN_H, T0 + dy));
        if (dir.y > 0) B = Math.min(s.h, Math.max(T0 + MIN_H, B0 + dy));
        applySize({ w: R - L, h: B - T });
        placeWin(L - win.offsetLeft, T - win.offsetTop);
      },
      () => setHandling(""),
    );
  };

  /** Double-clicking a handle gives the window back its slot. */
  const resetSize = () => {
    applySize(null);
    placeWin(0, 0);
  };

  const toggleMax = () => setMode((m) => (m === "max" ? "normal" : "max"));
  const toggleShade = () => setMode((m) => (m === "shade" ? "normal" : "shade"));

  const goSheet = (i: number) => setSheet(((i % SHEETS.length) + SHEETS.length) % SHEETS.length);

  // [ ] cycle scenes; Shift+arrows orbit, + / - dolly, 0 resets the camera
  // (while the stage is on screen).
  useEffect(() => {
    const STEP = 0.18;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return;
      if (e.key === "[") return setSheet((s) => (s + SHEETS.length - 1) % SHEETS.length);
      if (e.key === "]") return setSheet((s) => (s + 1) % SHEETS.length);
      const r = stageRef.current?.getBoundingClientRect();
      if (!r || r.bottom < window.innerHeight * 0.4 || r.top > window.innerHeight * 0.6) return;
      if (e.key === "f" && !e.shiftKey) {
        e.preventDefault();
        return setMode((m) => (m === "max" ? "normal" : "max"));
      }
      if (e.key === "Escape") {
        // Only claim Esc when there is a maximized window to give back.
        setMode((m) => (m === "max" ? "normal" : m));
        return;
      }
      const eng = engineRef.current;
      if (!eng) return;
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

  const cur = SHEETS[sheet];

  return (
    <div ref={rootRef} className={`hero${noGl ? " hero--no-gl" : ""}`}>
      <div ref={stageRef} className={`hero__stage hero__stage--${mode}`}>
        {/* Display name + tagline share one column so their left edge and
            vertical gap hold at every width. */}
        <div className="hero__intro">
          <div className="hero__name">
            <h1 className="hero__name-text">
              {NAME.split("").map((ch, i) => (
                <span key={i} data-letter className="hero__letter">
                  {ch}
                </span>
              ))}
            </h1>
          </div>
        </div>

        <div className="hero__side">
          <p className="hero__tagline">
            Software ventures &amp; craft: agentic systems, markets and the open web.
          </p>
          {/* Italic accent initials */}
          <div className="hero__mark">
            <div className="hero__mark-text">C.A</div>
          </div>
        </div>

        {/* The scene window: title bar, scene tabs, viewport, status line. */}
        <section ref={winRef} className={["hero__win", `hero__win--${mode}`, sized && "is-sized", handling].filter(Boolean).join(" ")} aria-label="Scene viewer">
          <header className="hero__bar" onPointerDown={onBarDown} onDoubleClick={toggleMax}>
            <span className="hero__bar-grip" aria-hidden="true" />
            <h2 className="hero__bar-title">
              <small>{cur.no}</small>
              {cur.name.toUpperCase()}.PSX
            </h2>
            <span className="hero__bar-grip" aria-hidden="true" />
            <div className="hero__bar-ctl">
              <button
                type="button"
                onClick={toggleShade}
                aria-pressed={mode === "shade"}
                aria-label={mode === "shade" ? "Restore scene window" : "Shade scene window"}
                title={mode === "shade" ? "Restore" : "Shade"}
              >
                <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 7.5h6" /></svg>
              </button>
              <button
                type="button"
                onClick={toggleMax}
                aria-pressed={mode === "max"}
                aria-label={mode === "max" ? "Restore scene window size" : "Maximize scene window"}
                aria-keyshortcuts="f"
                title={mode === "max" ? "Restore (F / Esc)" : "Maximize (F)"}
              >
                <svg viewBox="0 0 10 10" aria-hidden="true">
                  {mode === "max" ? <path d="M3.5 1.5h5v5M1.5 3.5h5v5h-5z" /> : <path d="M1.5 1.5h7v7h-7zM1.5 3h7" />}
                </svg>
              </button>
            </div>
          </header>

          <div className="hero__tabs" role="group" aria-label="Hero scene">
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

          <div ref={viewRef} className="hero__view" hidden={mode === "shade"}>
            <canvas ref={canvasRef} className="hero__canvas" role="img" aria-label={cur.aria} />

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
          </div>

          {EDGES.map((d) => (
            <span
              key={d.id}
              className={`hero__edge hero__edge--${d.id}`}
              aria-hidden="true"
              data-no-orbit
              onPointerDown={onEdgeDown(d)}
              onDoubleClick={resetSize}
            />
          ))}

          <footer className="hero__status" aria-hidden="true">
            <span className="hero__orbit-hint">
              {cur.hint ?? "DRAG TO ORBIT \u00b7 CTRL+WHEEL TO ZOOM \u00b7 DOUBLE-CLICK TO RESET"}
            </span>
            <span className="hero__status-meta">
              {cur.no}/{String(SHEETS.length).padStart(2, "0")} &middot; 15-BIT
            </span>
          </footer>
        </section>

        {/* Hairline footer strip: scroll cue on the right. */}
        <footer ref={footerRef} className="hero__strip">
          <span className="hero__strip-keys" aria-hidden="true">
            <kbd>F</kbd> MAXIMIZE &middot; DRAG TITLE TO MOVE &middot; DRAG EDGES TO RESIZE
          </span>
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
