/**
 * Cairn: a small ruined survey golem that keeps the visitor company. Pixel
 * art on the site's grid: stone in the sheet's own inks, moss in the deep
 * accent, the eye and chest rune in the accent, so every theme recolours it.
 * Its head, broken forearm and loose stones float apart, held by the rune.
 *
 * Click (or `b`) opens its panel: three stats and four things to do for it.
 * Rubbing the pointer back and forth over it pets it; dragging moves it and
 * it remembers where it was put. It dozes when the page goes quiet, follows
 * the pointer with its eye, and says a word on page and theme changes and
 * when a hero easter egg is found. The simulation is golem-state.ts; the
 * state is kept in localStorage["nca-golem"].
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useLocation } from "react-router-dom";
import { ACCENTS, EGG_EVENT, GOLEM_KEY, readStored, useAccent, writeStored } from "@/theme/accent";
import { isTyping } from "@/theme/keymap";
import { act, age, decay, parse, status, type GolemAction, type GolemState } from "@/companion/golem-state";

// ── Sprite ──────────────────────────────────────────────────────────────
// Each map is drawn on a 26×25 grid; one character is one pixel.
// h/s/l stone (light/mid/shadow), o/c a gap or crack, m/M moss, r the rune, a its glow.
type Px = { x: number; y: number; w: number; c: string };

const TONE: Record<string, string> = { h: "hi", s: "mid", l: "lo", o: "gap", c: "gap", m: "moss", M: "lichen", r: "core", a: "glow", e: "edge", g: "glint" };

/** Turns a character map into one rect per horizontal run, offset to (ox, oy). */
function sprite(rows: string[], ox: number, oy: number): Px[] {
  const out: Px[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      let w = 1;
      while (row[x + w] === row[x]) w++;
      if (row[x] !== ".") out.push({ x: ox + x, y: oy + y, w, c: row[x] });
      x += w;
    }
  });
  return out;
}

const HEAD = sprite(
  ["...MmMm...", ".hhhhhhhs.", "hhhhhhhssl", "hsoooooosl", "hsssssssll", "lssscslll.", ".llll.ll.."],
  8,
  2,
);
const TORSO = sprite(
  [
    "..MmMhhhhhss..",
    ".hmhhhhhhhsssl",
    "hhhoooooosssll",
    "hhhorrrrosssml",
    "hhsorrrrossmml",
    "hssoooooossmml",
    "lsssscsssssmll",
    ".lssscclssslll",
    "..llll..lllll.",
  ],
  6,
  10,
);
const ARM = sprite([".hhs", "hhsl", "hhsl", "hsll", ".ol.", "hhss", "hhsl", "hssl", ".ll."], 2, 11);
const STUB = sprite(["sl", "l."], 20, 11);
const LEGS = [...sprite(["hhsl", "hssl", "hsml", "llll"], 7, 19), ...sprite(["hhsl", "hosl", "sssl", "llll"], 14, 19)];
const FOREARM = sprite([".hs.", "hhsl", "hssl", "hhsl", "hssl", ".ll."], 21, 14);
const FOREARM_DOWN = sprite([".hhhs.", "hhssll", ".llll."], 19, 21);
const PEBBLES = [sprite(["hs", "sl"], 3, 6), sprite(["s"], 21, 4), sprite(["hl"], 23, 8)];
const PEBBLES_DOWN = [sprite(["hs", "sl"], 2, 22), sprite(["s"], 5, 23), sprite(["l"], 25, 23)];
// Cracks that open as it wears down (form under 55), and more once it crumbles (under 30).
const CRACKS_WORN = sprite(["o", ".o"], 15, 15).concat(sprite(["o"], 11, 7));
const CRACKS_BAD = sprite(["o.", ".o", ".o"], 8, 11).concat(sprite(["oo"], 16, 3));
const TETHERS = [...sprite(["aa"], 12, 9)];
const ARM_TETHER = sprite(["a"], 21, 13);
const ZED = sprite(["aaa", ".a.", "aaa"], 0, 0);

// Fine detail on a half-pixel grid (coordinates are art pixels × 2): bevels
// catching the light (e), a brow over the eye slit, carved seams, moss drips,
// and a bright rune glyph (g) in the chest. Drawn over the coarse sprite.
const HEAD_FINE = [
  ...sprite(["eeeeeeeeeeeeee"], 18, 6),
  ...sprite(["e", "e", "e", "e"], 16, 8),
  ...sprite(["llllllllllll"], 20, 9),
  ...sprite(["m....m", "m....."], 22, 6),
  ...sprite(["m.m", ".m."], 24, 7),
  ...sprite(["l", "l"], 19, 12),
  ...sprite(["l", "l"], 32, 12),
  ...sprite(["o"], 25, 13),
  ...sprite([".o", "o."], 23, 16),
];
const TORSO_FINE = [
  ...sprite(["eeeeeeeeee"], 22, 20),
  ...sprite(["eeee..eeeeee"], 18, 32),
  ...sprite(["e", "e", "e", "e", "e", "e"], 4, 24),
  ...sprite(["l.l.l"], 5, 33),
];
const RUNE_FINE = sprite(["g...g", ".g.g.", "..g..", "..g.."], 21, 26);
const FOREARM_FINE = sprite(["l.l.l"], 43, 35);

/** Half-pixel detail: the same rects at half scale. */
const Fine = ({ px, className }: { px: Px[]; className?: string }) => (
  <g transform="scale(0.5)" className={className}>
    <Pixels px={px} />
  </g>
);

const Pixels = ({ px }: { px: Px[] }) => (
  <>
    {px.map((p) => (
      <rect key={`${p.x},${p.y}`} x={p.x} y={p.y} width={p.w} height={1} className={`g-${TONE[p.c]}`} />
    ))}
  </>
);

// Sparks thrown out of (or drawn into) the rune.
const SPARKS = [
  [-6, -4],
  [5, -6],
  [8, 1],
  [-8, 2],
  [2, -9],
  [-3, 7],
  [7, 6],
];

// ── Words ───────────────────────────────────────────────────────────────
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

const L = {
  hello: "A visitor. I am Cairn. Click me.",
  murmur: [
    "Moss grows. I let it.",
    "I was a wall once.",
    "Every ruin was a plan.",
    "The keys are written down. Press ?",
    "The grid is 48 pixels. I counted.",
    "Still standing. Mostly.",
    "Somewhere a column misses me.",
    "Try : for commands.",
    "Stone is patient. I am stone.",
  ],
  pet: ["…warm.", "Stone remembers hands.", "The moss approves.", "Rune steady.", "Again. If you like."],
  overpet: "Enough. I am stone, not a cat.",
  charge: ["Core humming.", "Light taken in.", "The rune brightens."],
  full: "Full. Any more and I glow through the sheet.",
  mend: ["A stone back in place.", "Held together. For now.", "Better. Thank you."],
  whole: "Nothing left to mend. Suspicious.",
  wait: "Give it a moment.",
  rest: "Resting. Wake me when you need a witness.",
  wake: "Awake. Watching.",
  dormant: "…",
  revive: "…systems. Mostly.",
  low: "Core fading. Charge me?",
  crumble: "Pieces keep falling off.",
  moved: ["New vantage.", "Put me down gently.", "Better view from here."],
  away: "Back to the ruins. Press b.",
  summon: "Here.",
  egg: ["You found one. I saw.", "Old secrets. Good eyes.", "That one took me a century."],
  theme: (name: string) => `Light shifts. ${name}.`,
  back: (h: number) =>
    h >= 48 ? `${Math.floor(h / 24)} days. I kept watch.` : h >= 20 ? "A day gone. Still here." : "You came back.",
};

const ROUTE_LINES: [string, string][] = [
  ["/writings/", "Reading in the ruins."],
  ["/writings", "Stones remember words."],
  ["/projects", "Things built. Some still standing."],
  ["/cv", "A record of carvings."],
  ["/artifacts", "Relics. Handle with care."],
  ["/", "The ruins. Home."],
];
const routeLine = (path: string) => ROUTE_LINES.find(([p]) => (p === "/" ? path === "/" : path.startsWith(p)))?.[1];

const STATUS_TEXT = {
  dormant: "Dormant — the core is empty",
  asleep: "Resting — the core refills",
  crumbling: "Crumbling — mend it",
  sad: "Lonely — it wants company",
  content: "Watching",
};

type Reaction = "joy" | "charge" | "mend" | "thud" | "refuse";

const DOZE_AFTER = 75_000;
const COOLDOWN = 2500;
const SIZE = { w: 26, h: 25 };

/** Inline position for a dragged golem; a spot saved on a larger window is pulled back on screen. */
const place = (q: GolemState["pos"]) =>
  q
    ? {
        right: `min(${q.r}px, calc(100vw - ${SIZE.w} * var(--golem-px)))`,
        bottom: `min(${q.b}px, calc(100vh - ${SIZE.h} * var(--golem-px)))`,
      }
    : undefined;

const reduced = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Meter({ label, value }: { label: string; value: number }) {
  const n = Math.round(value);
  return (
    <div className="golem__stat">
      <dt>{label}</dt>
      <dd role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={n}>
        <span className="golem__bar" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} data-on={n >= (i + 1) * 10 - 5 || undefined} />
          ))}
        </span>
        <span className="golem__num">{n}</span>
      </dd>
    </div>
  );
}

export default function Golem() {
  const { pathname } = useLocation();
  const accent = useAccent();
  // What the visitor's last visit left behind, read once, for the greeting.
  const boot = useRef({ first: false, awayH: 0 });
  const [s, setS] = useState<GolemState>(() => {
    const raw = readStored(GOLEM_KEY);
    const now = Date.now();
    const stored = parse(raw, now);
    boot.current = { first: raw === null, awayH: (now - stored.last) / 3_600_000 };
    return decay(stored, now);
  });
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState<{ text: string; key: number } | null>(null);
  const [fx, setFx] = useState<{ kind: Reaction; key: number } | null>(null);
  const [look, setLook] = useState(0);
  const [blink, setBlink] = useState(false);
  const [doze, setDoze] = useState(false);
  const [drag, setDrag] = useState<{ r: number; b: number } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const live = useRef({ s, open, doze });
  live.current = { s, open, doze };
  const timers = useRef({ line: 0, fx: 0 });
  const lastActive = useRef(Date.now());
  const cool = useRef<Record<string, number>>({});
  const petTimes = useRef<number[]>([]);
  const press = useRef<{ x: number; y: number; r: number; b: number; moved: boolean; id: number } | null>(null);
  const dragTo = useRef<{ r: number; b: number } | null>(null);
  const dragged = useRef(false);
  const rub = useRef({ x: 0, dir: 0, flips: 0, t: 0 });
  const seenRoutes = useRef(new Set<string>());

  const st = status(s);
  const resting = st === "asleep" || (doze && st !== "dormant");

  // ── speech and one-shot reactions ─────────────────────────────────────
  const say = useCallback((text: string, ms = 3800) => {
    window.clearTimeout(timers.current.line);
    setLine({ text, key: Date.now() });
    timers.current.line = window.setTimeout(() => setLine(null), ms);
  }, []);

  const flash = useCallback((kind: Reaction) => {
    window.clearTimeout(timers.current.fx);
    setFx({ kind, key: Date.now() });
    timers.current.fx = window.setTimeout(() => setFx(null), 900);
  }, []);

  useEffect(() => {
    const t = timers.current;
    return () => {
      window.clearTimeout(t.line);
      window.clearTimeout(t.fx);
    };
  }, []);

  // ── persistence and the passing of time ───────────────────────────────
  useEffect(() => writeStored(GOLEM_KEY, JSON.stringify(s)), [s]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const prev = live.current.s;
      const next = decay(prev, Date.now());
      // One warning as each threshold is crossed.
      if (prev.core >= 20 && next.core < 20 && next.core > 0) say(L.low);
      else if (prev.form >= 30 && next.form < 30) say(L.crumble);
      setS(next);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [say]);

  // Greeting: first meeting, or a return after a while away.
  useEffect(() => {
    const { first, awayH } = boot.current;
    const id = window.setTimeout(() => {
      const cur = live.current.s;
      if (cur.hidden || status(cur) === "dormant") return;
      if (first) say(L.hello, 5200);
      else if (awayH >= 6) say(L.back(awayH));
    }, 1600);
    return () => window.clearTimeout(id);
  }, [say]);

  // ── actions ───────────────────────────────────────────────────────────
  const run = useCallback(
    (a: GolemAction) => {
      const now = Date.now();
      const prev = decay(live.current.s, now);
      if (status(prev) === "dormant" && a !== "charge") {
        say(L.dormant);
        flash("refuse");
        setS(prev);
        return;
      }
      if ((a === "charge" || a === "mend") && now - (cool.current[a] ?? 0) < COOLDOWN) {
        say(L.wait);
        return;
      }
      if (a === "pet") {
        petTimes.current = [...petTimes.current.filter((t) => now - t < 15_000), now];
        if (petTimes.current.length > 7) {
          say(L.overpet);
          flash("refuse");
          return;
        }
      }
      cool.current[a] = now;
      const next = act(prev, a, now);
      setS(next);
      setDoze(false);
      switch (a) {
        case "pet":
          say(pick(L.pet));
          flash("joy");
          break;
        case "charge":
          say(prev.core <= 0 ? L.revive : prev.core >= 100 ? L.full : pick(L.charge));
          flash("charge");
          break;
        case "mend":
          say(prev.form >= 100 ? L.whole : pick(L.mend));
          flash("mend");
          break;
        case "rest":
          say(L.rest);
          break;
        case "wake":
          say(L.wake);
          flash("joy");
          break;
      }
    },
    [say, flash],
  );

  const setHidden = useCallback(
    (hidden: boolean) => {
      setOpen(false);
      setS((prev) => ({ ...decay(prev, Date.now()), hidden }));
      say(hidden ? L.away : L.summon, 3000);
    },
    [say],
  );

  // ── keyboard: `b` summons it or toggles the panel, Esc closes ─────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && live.current.open) {
        const inside = panelRef.current?.contains(document.activeElement);
        setOpen(false);
        if (inside) btnRef.current?.focus();
        return;
      }
      if (e.key !== "b" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return;
      if (live.current.s.hidden) setHidden(false);
      else setOpen((o) => !o);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setHidden]);

  // Moving focus into the panel when it opens, so keys reach its buttons.
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLButtonElement>(".golem__act")?.focus({ preventScroll: true });
  }, [open]);

  // A press anywhere outside closes the panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // ── the eye follows the pointer; quiet pages make it doze ─────────────
  useEffect(() => {
    let frame = 0;
    let px = 0;
    const wake = () => {
      lastActive.current = Date.now();
      if (live.current.doze) setDoze(false);
    };
    const onMove = (e: PointerEvent) => {
      wake();
      px = e.clientX;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = btnRef.current?.getBoundingClientRect();
        if (!box) return;
        setLook(Math.max(-2, Math.min(2, Math.round((px - (box.left + box.width / 2)) / 140))));
      });
    };
    const id = window.setInterval(() => {
      if (!live.current.doze && Date.now() - lastActive.current > DOZE_AFTER) setDoze(true);
    }, 5000);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", wake, { passive: true });
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("pointerdown", wake, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(id);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("pointerdown", wake);
    };
  }, []);

  // Blinks now and then.
  useEffect(() => {
    if (reduced()) return;
    let id = 0;
    const loop = () => {
      id = window.setTimeout(() => {
        setBlink(true);
        id = window.setTimeout(() => {
          setBlink(false);
          loop();
        }, 140);
      }, 2400 + Math.random() * 4200);
    };
    loop();
    return () => window.clearTimeout(id);
  }, []);

  // Murmurs to itself once in a while, when nothing else is going on.
  useEffect(() => {
    let id = 0;
    const loop = () => {
      id = window.setTimeout(() => {
        const { s: cur, open: o, doze: d } = live.current;
        if (!document.hidden && !o && !d && !cur.hidden && status(cur) !== "dormant" && !cur.asleep && Math.random() < 0.6)
          say(pick(L.murmur));
        loop();
      }, 55_000 + Math.random() * 60_000);
    };
    loop();
    return () => window.clearTimeout(id);
  }, [say]);

  // ── the site around it: pages, themes, easter eggs ────────────────────
  const firstRoute = useRef(true);
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      seenRoutes.current.add(pathname);
      return;
    }
    const text = routeLine(pathname);
    const cur = live.current.s;
    if (!text || seenRoutes.current.has(pathname) || cur.hidden || cur.asleep || status(cur) === "dormant") return;
    seenRoutes.current.add(pathname);
    say(text);
  }, [pathname, say]);

  const firstAccent = useRef(true);
  useEffect(() => {
    if (firstAccent.current) {
      firstAccent.current = false;
      return;
    }
    if (live.current.s.hidden || status(live.current.s) === "dormant") return;
    say(L.theme(ACCENTS[accent].name));
    flash("joy");
  }, [accent, say, flash]);

  useEffect(() => {
    const onEgg = () => {
      if (live.current.s.hidden || status(live.current.s) === "dormant") return;
      setDoze(false);
      say(pick(L.egg));
      flash("joy");
    };
    window.addEventListener(EGG_EVENT, onEgg);
    return () => window.removeEventListener(EGG_EVENT, onEgg);
  }, [say, flash]);

  // ── pointer: click opens, drag moves, rubbing pets ────────────────────
  const onPointerDown = (e: RPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    // Captured from the start, so a quick flick that leaves the button still drags.
    e.currentTarget.setPointerCapture(e.pointerId);
    const box = e.currentTarget.getBoundingClientRect();
    press.current = {
      x: e.clientX,
      y: e.clientY,
      r: window.innerWidth - box.right,
      b: window.innerHeight - box.bottom,
      moved: false,
      id: e.pointerId,
    };
  };

  const onPointerMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (p && p.id === e.pointerId) {
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!p.moved && Math.hypot(dx, dy) < 5) return;
      if (!p.moved) {
        p.moved = true;
        setOpen(false);
      }
      const box = e.currentTarget.getBoundingClientRect();
      dragTo.current = {
        r: Math.round(Math.max(0, Math.min(window.innerWidth - box.width, p.r - dx))),
        b: Math.round(Math.max(0, Math.min(window.innerHeight - box.height, p.b - dy))),
      };
      setDrag(dragTo.current);
      return;
    }
    // Rubbing: a mouse sweeping back and forth across it, four turns in a second.
    if (e.pointerType !== "mouse") return;
    const r = rub.current;
    const now = performance.now();
    const step = e.clientX - r.x;
    r.x = e.clientX;
    if (Math.abs(step) < 2) return;
    const dir = Math.sign(step);
    if (now - r.t > 1000) r.flips = 0;
    if (dir !== r.dir) {
      r.dir = dir;
      r.flips++;
      r.t = now;
    }
    if (r.flips >= 5) {
      r.flips = 0;
      run("pet");
    }
  };

  const onPointerUp = (e: RPointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    if (p.moved) {
      const to = dragTo.current;
      dragTo.current = null;
      setDrag(null);
      if (to) setS((prev) => ({ ...prev, pos: to }));
      // The click that follows this release is the drag's, not a press.
      dragged.current = true;
      window.setTimeout(() => (dragged.current = false), 0);
      flash("thud");
      if (status(live.current.s) !== "dormant" && !live.current.s.asleep) say(pick(L.moved), 2400);
    }
  };

  const onClick = () => {
    // A drag ends in a click too; only a press that stayed put opens the panel.
    if (dragged.current) return;
    lastActive.current = Date.now();
    setDoze(false);
    setOpen((o) => !o);
  };

  // Sent away: only its parting word stays, where it stood.
  if (s.hidden)
    return line ? (
      <div className="golem" data-side="right" style={place(s.pos)}>
        <p key={line.key} className="golem__say" aria-hidden="true">
          {line.text}
        </p>
      </div>
    ) : null;

  // ── drawing ───────────────────────────────────────────────────────────
  const dormant = st === "dormant";
  const fallen = dormant || s.form < 30;
  const pos = drag ?? s.pos;
  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const side = pos && pos.r > vw / 2 ? "left" : "right";
  const below = pos && pos.b > vh / 2;
  const joy = fx && (fx.kind === "joy" || fx.kind === "charge");
  const eye = joy ? "joy" : dormant ? "off" : resting ? "shut" : blink ? "off" : st === "sad" ? "dim" : "open";
  const lean = resting || dormant ? 0 : look >= 2 ? 1 : look <= -2 ? -1 : 0;
  const ex = 12 + look;

  return (
    <div
      ref={rootRef}
      className="golem"
      data-status={st}
      data-rest={resting || undefined}
      data-react={fx?.kind}
      data-drag={drag ? "" : undefined}
      data-side={side}
      data-below={below || undefined}
      style={place(pos)}
    >
      {line && !open && (
        <p key={line.key} className="golem__say" aria-hidden="true">
          {line.text}
        </p>
      )}

      <button
        ref={btnRef}
        type="button"
        className="golem__btn"
        aria-label="Cairn, the site golem"
        aria-expanded={open}
        aria-controls="golem-panel"
        aria-keyshortcuts="b"
        title="Cairn — click to tend, drag to move (b)"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          press.current = null;
          dragTo.current = null;
          setDrag(null);
        }}
        onClick={onClick}
      >
        <svg
          className="golem__svg"
          viewBox={`0 0 ${SIZE.w} ${SIZE.h}`}
          shapeRendering="crispEdges"
          aria-hidden="true"
          style={{ ["--core-a" as string]: 0.35 + (s.core / 100) * 0.65 }}
        >
          <rect className="golem__shadow" x={5} y={23} width={16} height={1} />
          {fallen && PEBBLES_DOWN.map((p, i) => <Pixels key={i} px={p} />)}
          {fallen && <Pixels px={FOREARM_DOWN} />}
          <g className="golem__fig">
            <Pixels px={LEGS} />
            <Pixels px={ARM} />
            <Pixels px={TORSO} />
            <Fine px={TORSO_FINE} />
            {!dormant && <Fine px={RUNE_FINE} className="golem__rune" />}
            <Pixels px={STUB} />
            {s.form < 55 && <Pixels px={CRACKS_WORN} />}
            {fallen && <Pixels px={CRACKS_BAD} />}
            {!dormant && (
              <g className="golem__tether">
                <Pixels px={TETHERS} />
                {!fallen && <Pixels px={ARM_TETHER} />}
              </g>
            )}
            {!fallen && (
              <g className="golem__arm">
                <Pixels px={FOREARM} />
                <Fine px={FOREARM_FINE} />
              </g>
            )}
            {!fallen &&
              PEBBLES.map((p, i) => (
                <g key={i} className={`golem__peb golem__peb--${i}`}>
                  <Pixels px={p} />
                </g>
              ))}
            <g transform={`translate(${lean} 0)`}>
              <g className="golem__head">
                <Pixels px={HEAD} />
                <Fine px={HEAD_FINE} />
                {eye === "open" && (
                  <>
                    <rect className="g-eye" x={ex} y={5} width={2} height={1} />
                    <rect className="g-glint" x={ex} y={5} width={0.5} height={0.5} />
                  </>
                )}
                {eye === "dim" && <rect className="g-eye g-eye--dim" x={ex} y={5} width={2} height={1} />}
                {eye === "shut" && <rect className="g-eye g-eye--dim" x={11} y={5} width={4} height={1} />}
                {eye === "joy" && (
                  <>
                    <rect className="g-eye" x={11} y={5} width={1} height={1} />
                    <rect className="g-eye" x={12} y={4} width={2} height={1} />
                    <rect className="g-eye" x={14} y={5} width={1} height={1} />
                  </>
                )}
              </g>
            </g>
          </g>
          {resting && (
            <g className="golem__zz" aria-hidden="true">
              <g transform="translate(18 0)">
                <g className="golem__z">
                  <Pixels px={ZED} />
                </g>
              </g>
              <g transform="translate(21 -3)">
                <g className="golem__z golem__z--2">
                  <Pixels px={ZED} />
                </g>
              </g>
            </g>
          )}
          {fx && (fx.kind === "joy" || fx.kind === "charge" || fx.kind === "mend") && (
            <g key={fx.key} className={`golem__sparks golem__sparks--${fx.kind}`}>
              {SPARKS.map(([dx, dy], i) => (
                <rect
                  key={i}
                  className="golem__spark"
                  x={11.5}
                  y={13.5}
                  width={1}
                  height={1}
                  style={{ ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`, animationDelay: `${i * 30}ms` }}
                />
              ))}
            </g>
          )}
        </svg>
      </button>

      {open && (
        <div ref={panelRef} id="golem-panel" className="golem__panel" role="dialog" aria-labelledby="golem-h" data-lenis-prevent>
          <div className="golem__top">
            <h2 id="golem-h">Unit 07 · Cairn</h2>
            <button
              type="button"
              className="help-close"
              aria-label="Close"
              onClick={() => {
                setOpen(false);
                btnRef.current?.focus();
              }}
            >
              <kbd>Esc</kbd>
            </button>
          </div>
          <p className="golem__desc">A survey golem, mostly ruin. It keeps watch over the sheet.</p>
          <dl className="golem__stats">
            <Meter label="Core" value={s.core} />
            <Meter label="Form" value={s.form} />
            <Meter label="Mood" value={s.mood} />
          </dl>
          <p className="golem__log" aria-live="polite">
            <span>{STATUS_TEXT[st]}</span>
            {line && <q key={line.key}>{line.text}</q>}
          </p>
          <div className="golem__acts">
            <button type="button" className="golem__act" onClick={() => run("pet")}>
              Pet
            </button>
            <button type="button" className="golem__act" onClick={() => run("charge")}>
              Charge
            </button>
            <button type="button" className="golem__act" onClick={() => run("mend")}>
              Mend
            </button>
            <button type="button" className="golem__act" onClick={() => run(s.asleep ? "wake" : "rest")} disabled={dormant}>
              {s.asleep ? "Wake" : "Rest"}
            </button>
          </div>
          <div className="golem__foot">
            <span>
              Day {age(s, Date.now()) + 1} · {s.pets} {s.pets === 1 ? "pet" : "pets"}
            </span>
            <button type="button" className="golem__away" onClick={() => setHidden(true)}>
              Send away
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
