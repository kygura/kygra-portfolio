/**
 * A small moss golem — a Hyper Light Drifter–style Titan in miniature —
 * that lives along the bottom edge of the viewport, with a diamond sprite
 * companion hovering at its shoulder. It breathes, blinks its visor,
 * watches the pointer, wanders now and then, powers down when the page goes
 * quiet and lights up when petted. Everything moves from one rAF loop
 * writing to refs; React only renders the speech bubble and the particles.
 * With reduced motion it stays put and holds still.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useAccent, readStored, writeStored } from "@/theme/accent";
import { compose, draw, H, W, type Pose } from "./sprite";

const HIDDEN_KEY = "nca-golem-hidden";
const SLEEP_AFTER = 30_000;
const SPEED = 26; // px per second
const EDGE = 16;

const PET_LINES = [
  "hrrm.",
  "*moss rustles*",
  "i was a titan once.",
  "photosynthesizing...",
  "careful. lichen.",
  "the old light remembers.",
  "slow is a speed too.",
  "the flower is mine.",
  "you found me, drifter.",
  "stone cold. moss warm.",
];
const WAKE_LINES = ["...hm?", "systems... mossy.", "*grinds awake*"];
const MANY_PETS = "okay okay. friends now.";

type Mode = "idle" | "walk" | "sleep" | "happy";
type Particle = { id: number; kind: "mote" | "petal" | "z"; dx: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function useMedia(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, [query]);
  return matches;
}

const Petal = () => (
  <svg viewBox="0 0 3 3" shapeRendering="crispEdges" aria-hidden="true">
    <path d="M1 0h1v1h1v1H2v1H1V2H0V1h1z" fill="#ff5f9e" />
    <path d="M1 1h1v1H1z" fill="#ffc0da" />
  </svg>
);

/** The drifter's companion: a hovering diamond with a lit core. */
const Companion = () => (
  <svg viewBox="0 0 5 7" shapeRendering="crispEdges" aria-hidden="true">
    <path d="M2 0h1v1h1v2h1v1H4v2H3v1H2V6H1V4H0V3h1V1h1z" fill="#120e22" />
    <path d="M2 1h1v2h1v1H3v2H2V4H1V3h1z" fill="var(--accent)" />
    <path d="M2 2h1v3H2z" fill="#f4fffb" />
  </svg>
);

export default function MossGolem() {
  const [hidden, setHidden] = useState(() => readStored(HIDDEN_KEY) === "1");

  const hide = () => {
    writeStored(HIDDEN_KEY, "1");
    setHidden(true);
  };
  const show = () => {
    writeStored(HIDDEN_KEY, "0");
    setHidden(false);
  };

  if (hidden) {
    return (
      <button type="button" className="golem-pebble" onClick={show} aria-label="Wake the moss golem" title="Wake the moss golem" data-cursor>
        <span />
      </button>
    );
  }
  return <Golem onHide={hide} />;
}

function Golem({ onHide }: { onHide: () => void }) {
  const still = useMedia("(prefers-reduced-motion: reduce)");
  const narrow = useMedia("(max-width: 639px)");
  const scale = narrow ? 2 : 3;
  const accent = useAccent();

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bloomRef = useRef<HTMLCanvasElement>(null);
  const glow = useRef("#bcc77c");
  const [bubble, setBubble] = useState<{ text: string; id: number } | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flipBubble, setFlipBubble] = useState(false);

  const s = useRef({
    mode: "idle" as Mode,
    x: -1,
    dir: -1 as 1 | -1,
    target: 0,
    until: 0,
    nextWander: 0,
    nextBlink: 0,
    blinkUntil: 0,
    lastActive: 0,
    pointerX: -1,
    pets: [] as number[],
    pid: 0,
    nextZ: 0,
    redraw: true,
    lastKey: "",
  });

  const say = useCallback((text: string, ms = 2600) => {
    const id = Date.now();
    setBubble({ text, id });
    window.setTimeout(() => setBubble((b) => (b && b.id === id ? null : b)), ms);
  }, []);

  const emit = useCallback((kind: Particle["kind"], n: number) => {
    const st = s.current;
    const fresh = Array.from({ length: n }, () => ({ id: ++st.pid, kind, dx: Math.round(rand(-22, 22)) }));
    setParticles((ps) => [...ps.slice(-12), ...fresh]);
    window.setTimeout(() => setParticles((ps) => ps.filter((p) => !fresh.includes(p))), 1800);
  }, []);

  // Accent drives the visor, glyph and companion; re-read the token whenever it changes.
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    if (v) glow.current = v;
    s.current.redraw = true;
  }, [accent]);

  // Any sign of life on the page keeps the golem awake (and wakes it).
  useEffect(() => {
    const st = s.current;
    st.lastActive = performance.now();
    const active = (e: Event) => {
      st.lastActive = performance.now();
      if (e instanceof PointerEvent) st.pointerX = e.clientX;
      if (st.mode === "sleep") {
        st.mode = "idle";
        st.nextWander = st.lastActive + rand(3000, 6000);
        st.redraw = true;
        if (Math.random() < 0.5) say(pick(WAKE_LINES), 1800);
      }
    };
    const evs = ["pointermove", "pointerdown", "keydown", "scroll", "wheel", "touchstart"] as const;
    evs.forEach((ev) => window.addEventListener(ev, active, { passive: true }));
    return () => evs.forEach((ev) => window.removeEventListener(ev, active));
  }, [say]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const ctx = canvas?.getContext("2d");
    const bloom = bloomRef.current?.getContext("2d") ?? null;
    if (!canvas || !root || !ctx) return;
    const st = s.current;
    const w = W * scale;
    const maxX = () => Math.max(EDGE, window.innerWidth - w - EDGE);
    // Start clear of the corner, where the home hero keeps its scroll cue.
    if (st.x < 0) st.x = Math.max(EDGE, maxX() - (narrow ? 0 : 150));
    st.x = Math.min(st.x, maxX());
    const now0 = performance.now();
    st.nextWander = now0 + rand(4000, 8000);
    st.nextBlink = now0 + rand(1500, 4000);
    st.redraw = true;

    let raf = 0;
    let last = now0;
    let lastFlip = false;

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      if (st.mode === "happy" && now > st.until) {
        st.mode = "idle";
        st.nextWander = now + rand(3000, 7000);
      }
      if (st.mode !== "sleep" && st.mode !== "happy" && now - st.lastActive > SLEEP_AFTER) {
        st.mode = "sleep";
        st.nextZ = now;
      }
      if (!still && !narrow && st.mode === "idle" && now > st.nextWander) {
        const span = maxX() - EDGE;
        let t = EDGE + Math.random() * span;
        if (Math.abs(t - st.x) < 80) t = st.x > span / 2 ? st.x - rand(80, 200) : st.x + rand(80, 200);
        st.target = Math.min(maxX(), Math.max(EDGE, t));
        st.dir = st.target > st.x ? 1 : -1;
        st.mode = "walk";
      }
      if (st.mode === "walk") {
        st.x += st.dir * SPEED * dt;
        if ((st.dir > 0 && st.x >= st.target) || (st.dir < 0 && st.x <= st.target)) {
          st.x = st.target;
          st.mode = "idle";
          st.nextWander = now + rand(6000, 14000);
        }
      }
      if (st.mode === "sleep" && !still && now > st.nextZ) {
        st.nextZ = now + 1400;
        emit("z", 1);
      }
      if (now > st.nextBlink) {
        st.blinkUntil = now + 140;
        st.nextBlink = now + rand(2500, 6000) * (Math.random() < 0.2 ? 0.1 : 1);
      }

      // Pose from the clock — ticks are coarse on purpose, it's pixel art.
      const centre = st.x + w / 2;
      const look = st.mode === "walk" ? 0 : st.pointerX < 0 ? 0 : Math.abs(st.pointerX - centre) < w ? 0 : st.pointerX > centre ? 1 : -1;
      const step = Math.floor(now / 170) % 4;
      const pose: Pose = {
        breath: still ? 0 : st.mode === "walk" ? (step % 2 ? 1 : 0) : st.mode === "sleep" ? (Math.floor(now / 1300) % 2 as 0 | 1) : (Math.floor(now / 800) % 2 as 0 | 1),
        legs: st.mode === "walk" ? (step === 0 ? [2, 0] : step === 2 ? [0, 2] : [0, 0]) : [0, 0],
        arms: st.mode === "happy" ? (Math.floor(now / 220) % 2 ? "up" : "wave") : "down",
        visor: st.mode === "sleep" ? "dim" : st.mode === "happy" ? "bright" : now < st.blinkUntil ? "blink" : "open",
        // Walking flips the whole sprite, so the glance is always "forward" there.
        look: st.dir < 0 ? -look : look,
        sprout: still ? 1 : ([0, 1, 2, 1] as const)[Math.floor(now / (st.mode === "walk" ? 260 : 600)) % 4],
        glyph: st.mode !== "sleep",
      };
      const flip = st.dir < 0;
      const key = JSON.stringify(pose) + flip;
      if (st.redraw || key !== st.lastKey) {
        draw(ctx, bloom, compose(pose), glow.current, flip);
        root.dataset.mode = st.mode;
        root.dataset.facing = flip ? "left" : "right";
        st.lastKey = key;
        st.redraw = false;
      }

      root.style.transform = `translate3d(${Math.round(st.x)}px,0,0)`;
      const nearRight = st.x > window.innerWidth - 220;
      if (nearRight !== lastFlip) {
        lastFlip = nearRight;
        setFlipBubble(nearRight);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onResize = () => {
      st.x = Math.min(st.x, maxX());
      st.target = Math.min(st.target, maxX());
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [scale, still, narrow, emit]);

  const pet = () => {
    const st = s.current;
    const now = performance.now();
    st.lastActive = now;
    st.pets = [...st.pets.filter((t) => now - t < 4000), now];
    st.mode = "happy";
    st.until = now + 1600;
    st.redraw = true;
    emit("mote", 3);
    emit("petal", 2);
    say(st.pets.length >= 5 ? MANY_PETS : pick(PET_LINES));
    if (st.pets.length >= 5) st.pets = [];
  };

  return (
    <div ref={rootRef} className="golem" style={{ width: W * scale }}>
      <div className={`golem-bubble-wrap${flipBubble ? " is-flipped" : ""}`} role="status" aria-live="polite">
        {bubble && (
          <p key={bubble.id} className="golem-bubble">
            {bubble.text}
          </p>
        )}
      </div>
      <div className="golem-particles" aria-hidden="true">
        {particles.map((p) => (
          <span key={p.id} className={`golem-p golem-p-${p.kind}`} style={{ "--dx": `${p.dx}px` } as CSSProperties}>
            {p.kind === "petal" ? <Petal /> : p.kind === "mote" ? null : "z"}
          </span>
        ))}
      </div>
      <span className="golem-companion" aria-hidden="true">
        <Companion />
      </span>
      <button type="button" className="golem-body" onClick={pet} aria-label="Pet the moss golem" data-cursor>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: W * scale, height: H * scale }} />
        <canvas ref={bloomRef} className="golem-bloom" width={W} height={H} style={{ width: W * scale, height: H * scale }} />
      </button>
      <button type="button" className="golem-hide" onClick={onHide} aria-label="Send the golem to sleep under a pebble" title="Hide">
        ×
      </button>
    </div>
  );
}
