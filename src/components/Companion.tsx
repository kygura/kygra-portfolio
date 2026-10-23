/**
 * Theo, the survey companion: a pixel theodolite on a tripod that stands in
 * the bottom-right corner. Its lens follows the pointer, it blinks, shuffles
 * along the corner now and then, dozes after a minute without input, and
 * logs a line when clicked, when the theme changes or when the page does.
 * Drawn from a character grid as square SVG cells in the theme's tokens, so
 * every accent variant recolours it. `m` (or the command palette) hides it;
 * the choice is kept in localStorage["nca-companion"]. On the home page it
 * waits until the hero's strip has scrolled away, so it never sits on the
 * scene tabs.
 */
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { useLocation } from "react-router-dom";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { ACCENTS, COMPANION_KEY, readStored, useAccent, writeStored } from "@/theme/accent";
import { CHORDS, COMPANION_EVENT, isTyping } from "@/theme/keymap";

// o ink · s sheet · L accent · c code · l ink-3. The lens interior (c) is
// where the pupil moves; the legs come from LEGS so they can step.
const HEAD = [
  "......oooo......",
  ".....o....o.....",
  "..oooooooooooo..",
  "..osssssssssso..",
  ".oossLLLLLLssoo.",
  ".oosLccccccLsoo.",
  ".oosLccccccLsoo.",
  ".oosLccccccLsoo.",
  ".oossLLLLLLssoo.",
  "..osssssssssso..",
  "..oooooooooooo..",
  "......o..o......",
  ".....oooooo.....",
];

const LEGS = [
  [
    "......l..l......",
    ".....l.ll.l.....",
    "....l..ll..l....",
    "...l...ll...l...",
    "..l....ll....l..",
    ".ll....ll....ll.",
  ],
  [
    "......l..l......",
    "......lllll.....",
    ".....l.ll..l....",
    "....l..ll...l...",
    "...l...ll....l..",
    "..ll...ll....ll.",
  ],
];

const FILL: Record<string, string> = {
  o: "var(--ink)",
  s: "var(--sheet)",
  L: "var(--accent)",
  c: "var(--code)",
  l: "var(--ink-3)",
};

const W = 16;
const H = HEAD.length + LEGS[0].length;

function cells(rows: string[], y0: number) {
  const out: ReactElement[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const f = FILL[row[x]];
      if (f) out.push(<rect key={`${x}-${y + y0}`} x={x} y={y + y0} width={1} height={1} fill={f} />);
    }
  });
  return out;
}

const HEAD_CELLS = cells(HEAD, 0);
const LEG_CELLS = LEGS.map((l) => cells(l, HEAD.length));

const IDLE_LINES = [
  "Station set. Bubble level.",
  "Taking a backsight.",
  "Contour interval: one idea.",
  "Grid north is a suggestion.",
  "Still charting this sheet.",
  "Benchmark recorded.",
  "Fog on the far ridge.",
  "Press ? for the keys.",
  "Press : for commands.",
  "Every map is a draft.",
];

const PAGE_NAME: Record<string, string> = Object.fromEntries(
  Object.values(CHORDS).map((c) => [c.to, c.label]),
);

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function useHasPointer() {
  const [has, setHas] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHas(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return has;
}

/** False on the home page while the hero strip is on screen. */
function useClearOfHero(pathname: string) {
  const [clear, setClear] = useState(pathname !== "/");
  useEffect(() => {
    if (pathname !== "/") {
      setClear(true);
      return;
    }
    setClear(false);
    let io: IntersectionObserver | undefined;
    let raf = 0;
    const attach = () => {
      const strip = document.querySelector(".hero__strip");
      if (!strip) {
        raf = requestAnimationFrame(attach);
        return;
      }
      io = new IntersectionObserver(([e]) => setClear(!e.isIntersecting));
      io.observe(strip);
    };
    attach();
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [pathname]);
  return clear;
}

export default function Companion() {
  const [on, setOn] = useState(() => readStored(COMPANION_KEY) !== "off");

  useEffect(() => {
    const flip = () =>
      setOn((v) => {
        writeStored(COMPANION_KEY, v ? "off" : "on");
        return !v;
      });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "m" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (isTyping(e.target)) return;
      flip();
    };
    window.addEventListener(COMPANION_EVENT, flip);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(COMPANION_EVENT, flip);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return on ? <Theo /> : null;
}

const SCALE = 3;
const SLEEP_AFTER = 60_000;

function Theo() {
  const { pathname } = useLocation();
  const accent = useAccent();
  const reduce = useReducedMotion();
  const hasPointer = useHasPointer();
  const visible = useClearOfHero(pathname);

  const rootRef = useRef<HTMLDivElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [asleep, setAsleep] = useState(false);
  const [walk, setWalk] = useState({ x: 0, step: 0 });
  // Each bump replays a short hop, or a full turn after a burst of clicks.
  const [bump, setBump] = useState({ n: 0, spin: false });
  const [line, setLine] = useState<string | null>(null);
  const lineTimer = useRef(0);
  const clicks = useRef<number[]>([]);
  const lastInput = useRef(Date.now());

  const say = useCallback((text: string, ms = 3200) => {
    setLine(text);
    window.clearTimeout(lineTimer.current);
    lineTimer.current = window.setTimeout(() => setLine(null), ms);
  }, []);

  // Any input wakes it and resets the doze clock.
  useEffect(() => {
    const wake = () => {
      lastInput.current = Date.now();
      setAsleep((s) => (s ? false : s));
    };
    const events = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
    const t = window.setInterval(() => {
      if (Date.now() - lastInput.current > SLEEP_AFTER) setAsleep(true);
    }, 5000);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, wake));
      window.clearInterval(t);
    };
  }, []);

  // Lens follows the pointer; on touch it glances around on its own.
  useEffect(() => {
    if (hasPointer) {
      const onMove = (e: PointerEvent) => {
        const r = rootRef.current?.getBoundingClientRect();
        if (!r) return;
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height * 0.3);
        const d = Math.hypot(dx, dy) || 1;
        setGaze({ x: Math.round((dx / d) * 2), y: Math.round((dy / d) * 1) });
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      return () => window.removeEventListener("pointermove", onMove);
    }
    const t = window.setInterval(() => {
      setGaze({ x: Math.round(Math.random() * 4 - 2), y: Math.round(Math.random() * 2 - 1) });
    }, 2600);
    return () => window.clearInterval(t);
  }, [hasPointer]);

  // Blink every few seconds.
  useEffect(() => {
    let t = 0;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 140);
        loop();
      }, 2800 + Math.random() * 3600);
    };
    loop();
    return () => window.clearTimeout(t);
  }, []);

  // Shuffle a few steps along the corner now and then.
  const walkX = useRef(0);
  useEffect(() => {
    if (reduce || asleep) return;
    let t = 0;
    const range = () => Math.min(180, window.innerWidth * 0.22);
    const stroll = () => {
      t = window.setTimeout(() => {
        const target = Math.round(Math.random() * range());
        const tick = () => {
          const x = walkX.current;
          if (x === target) return stroll();
          walkX.current = x + Math.sign(target - x) * Math.min(6, Math.abs(target - x));
          setWalk((w) => ({ x: walkX.current, step: w.step + 1 }));
          t = window.setTimeout(tick, 110);
        };
        tick();
      }, 7000 + Math.random() * 9000);
    };
    stroll();
    return () => window.clearTimeout(t);
  }, [reduce, asleep]);

  // React to a theme switch (skip the first render).
  const firstAccent = useRef(true);
  useEffect(() => {
    if (firstAccent.current) {
      firstAccent.current = false;
      return;
    }
    setBump((b) => ({ n: b.n + 1, spin: false }));
    say(`New sheet: ${ACCENTS[accent].name}.`, 2400);
  }, [accent, say]);

  // And to a page change.
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    const name = PAGE_NAME[pathname] ?? (pathname.startsWith("/writings/") ? "a writing" : null);
    if (name) say(`Surveying ${name}.`, 2200);
  }, [pathname, say]);

  const onClick = () => {
    lastInput.current = Date.now();
    if (asleep) {
      setAsleep(false);
      say("Hm? Awake. Recalibrating.");
      return;
    }
    const now = Date.now();
    clicks.current = [...clicks.current.filter((c) => now - c < 1500), now];
    if (clicks.current.length >= 5) {
      clicks.current = [];
      setBump((b) => ({ n: b.n + 1, spin: true }));
      say("Dizzy. Re-levelling the tripod.");
      return;
    }
    setBump((b) => ({ n: b.n + 1, spin: false }));
    const depth = Math.round(
      (window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)) * 100,
    );
    const hour = new Date().getHours();
    const extra = [
      `Depth ${depth}% down this sheet.`,
      hour < 6 || hour >= 22 ? "Late survey. Mind the dark." : `Local time ${String(hour).padStart(2, "0")}h. Good light.`,
    ];
    say(pick([...IDLE_LINES, ...extra]));
  };

  useEffect(() => () => window.clearTimeout(lineTimer.current), []);

  const body = useAnimationControls();
  useEffect(() => {
    if (reduce || bump.n === 0) return;
    if (bump.spin) void body.start({ rotate: [0, 360], transition: { duration: 0.6, ease: "easeOut" } });
    else void body.start({ y: [0, -8, 0], transition: { duration: 0.32, ease: "easeOut" } });
  }, [bump, reduce, body]);

  const legs = LEG_CELLS[asleep || reduce ? 0 : walk.step % 2];
  // Pupil stays inside the lens (cols 5–10, rows 5–7).
  const px = { x: 7 + gaze.x, y: gaze.y < 0 ? 5 : 6 };

  return (
    <motion.div
      ref={rootRef}
      className="theo"
      initial={false}
      animate={{ x: -walk.x, opacity: visible ? 1 : 0, y: visible ? 0 : 24 }}
      transition={{ x: { duration: 0.11, ease: "linear" }, default: { duration: reduce ? 0 : 0.35 } }}
      style={{ pointerEvents: visible ? "auto" : "none" }}
      aria-hidden={!visible}
    >
      {line && (
        <div className="theo-line" role="status">
          <span className="theo-tag">THEO</span> {line}
        </div>
      )}
      <motion.button
        type="button"
        className="theo-body"
        onClick={onClick}
        aria-label="Theo, the survey companion. Click for a field note; press m to hide."
        title="Theo · m to hide"
        tabIndex={visible ? 0 : -1}
        animate={body}
      >
        <svg
          width={W * SCALE}
          height={H * SCALE}
          viewBox={`0 0 ${W} ${H}`}
          shapeRendering="crispEdges"
        >
          {HEAD_CELLS}
          {asleep || blink ? (
            <rect x={5} y={7} width={6} height={1} fill="var(--accent)" />
          ) : (
            <rect x={px.x} y={px.y} width={2} height={2} fill="var(--accent)" />
          )}
          {legs}
        </svg>
        {asleep && !reduce && (
          <span className="theo-z" aria-hidden="true">
            <span>z</span>
            <span>z</span>
            <span>Z</span>
          </span>
        )}
      </motion.button>
    </motion.div>
  );
}
