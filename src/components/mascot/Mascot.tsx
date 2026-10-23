import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { ACCENTS, useAccent } from "@/theme/accent";
import { GH, GW, createGolem } from "./golem";
import type { Golem, Pose } from "./golem";
import { HEART, HEART_FILL } from "./heart";
import { HELLO, LINES, PESTERED, PETTED, WOKEN } from "./lines";

/**
 * The moss golem in the bottom-left corner. It breathes, blinks and glances
 * around, sheds spores, follows the cursor with its eye, now and then waves,
 * stretches or blooms on its own, and dozes off when left alone. A click
 * makes it hop, wave and type out a line in a speech bubble; stroking it
 * pets it (blossoms open, leaves fly and hearts float up). Under reduced
 * motion it stands still and lines appear whole. The art is drawn by
 * `golem.ts` onto a small canvas, scaled up with nearest-neighbour.
 */

const TICK_MS = 1000 / 12;
const TYPE_MS = 28;
const WAVE_MS = 170;
/** Left alone this long (no petting, poking or cursor nearby), it falls asleep. */
const SLEEP_MS = 35_000;
/** Pointer travel over the golem, within one stroke, that counts as petting
 *  (more than one pass across it, so a cursor just passing by doesn't). */
const PET_PX = 140;
/** The head's centre within the canvas, for aiming the gaze. */
const HEAD_X = 15 / GW;
const HEAD_Y = 12 / GH;

type Action = "wave" | "bloom" | "stretch";
const ACTIONS: { kind: Action; ms: number }[] = [
  { kind: "wave", ms: 1600 },
  { kind: "bloom", ms: 2600 },
  { kind: "stretch", ms: 900 },
];

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function useDocumentVisible() {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return visible;
}

/** Hands out lines in a shuffled order, refilling once every line was said. */
function useLineBag() {
  const bag = useRef<string[]>([]);
  return useCallback(() => {
    if (bag.current.length === 0) {
      bag.current = [...LINES].sort(() => Math.random() - 0.5);
    }
    return bag.current.pop()!;
  }, []);
}

export default function Mascot() {
  const still = Boolean(useReducedMotion());
  const visible = useDocumentVisible();
  const accent = useAccent();
  const nextLine = useLineBag();

  const [gaze, setGaze] = useState<{ x: -1 | 0 | 1; up: boolean } | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const [happy, setHappy] = useState(false);
  const [shake, setShake] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [wavePhase, setWavePhase] = useState<0 | 1>(0);
  const [asleep, setAsleep] = useState(false);
  const [petting, setPetting] = useState(false);
  const [bloom, setBloom] = useState(0);
  const [hearts, setHearts] = useState<{ id: number; dx: number; big: boolean }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const golem = useRef<Golem | null>(null);
  const pose = useRef<Pose | null>(null);
  const pokes = useRef<number[]>([]);
  const greeted = useRef(false);
  const timers = useRef<number[]>([]);
  const lastSeen = useRef(Date.now());
  const stroke = useRef({ dist: 0, last: 0, heart: 0 });
  const petEnd = useRef(0);
  const pettedAt = useRef(0);
  const heartId = useRef(0);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const typing = line !== null && shown < line.length;
  const waving = !still && (typing || action === "wave");

  pose.current = {
    asleep,
    lookX: action === "stretch" ? 0 : gaze?.x ?? null,
    lookUp: action === "stretch" || Boolean(gaze?.up),
    happy: petting || happy,
    flare: typing,
    wave: waving ? wavePhase : null,
    bloom: Math.max(bloom, action === "bloom" ? 3 : 0),
  };

  const say = useCallback(
    (text: string) => {
      setHappy(false);
      setLine(text);
      setShown(still ? text.length : 0);
    },
    [still],
  );

  const touch = () => {
    lastSeen.current = Date.now();
  };

  // The renderer, and its clock.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = createGolem(canvas, { still });
    golem.current = g;
    g.setAccent(ACCENTS[accent].hex);
    if (pose.current) g.draw(pose.current);
    return () => {
      golem.current = null;
    };
    // The accent is applied by its own effect below; only `still` rebuilds the renderer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  useEffect(() => {
    golem.current?.setAccent(ACCENTS[accent].hex);
  }, [accent]);

  useEffect(() => {
    if (!visible || still) return;
    const id = window.setInterval(() => {
      const g = golem.current;
      if (!g || !pose.current) return;
      g.tick();
      g.draw(pose.current);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [visible, still]);

  // Without the clock (reduced motion), redraw whenever the pose changes.
  useEffect(() => {
    if (still && golem.current && pose.current) golem.current.draw(pose.current);
  });

  // Arm waving swaps the fist side faster than the clock's natural pace.
  useEffect(() => {
    if (!waving) return;
    const id = window.setInterval(() => setWavePhase((w) => (w ? 0 : 1)), WAVE_MS);
    return () => window.clearInterval(id);
  }, [waving]);

  // Now and then, a small idle action of its own.
  useEffect(() => {
    if (still || !visible || asleep) return;
    let t: number;
    const schedule = () => {
      t = window.setTimeout(() => {
        const next = pick(ACTIONS);
        setAction(next.kind);
        if (next.kind === "stretch") golem.current?.hop();
        if (next.kind === "bloom") golem.current?.rustle();
        t = window.setTimeout(() => {
          setAction(null);
          schedule();
        }, next.ms);
      }, rand(7000, 15000));
    };
    schedule();
    return () => {
      window.clearTimeout(t);
      setAction(null);
    };
  }, [still, visible, asleep]);

  // Blossoms from petting close again one by one.
  useEffect(() => {
    if (petting || bloom === 0) return;
    const id = window.setTimeout(() => setBloom((b) => Math.max(0, b - 1)), 4000);
    return () => window.clearTimeout(id);
  }, [petting, bloom]);

  // The eye follows the cursor when it is near; a cursor nearby also keeps it awake.
  useEffect(() => {
    let raf = 0;
    let x = 0;
    let y = 0;
    const update = () => {
      raf = 0;
      const el = canvasRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = x - (r.left + r.width * HEAD_X);
      const dy = y - (r.top + r.height * HEAD_Y);
      const far = Math.hypot(dx, dy);
      if (far < 220) lastSeen.current = Date.now();
      if (far > 700 || far < 24) return setGaze(null);
      const lx = dx < -30 ? -1 : dx > 30 ? 1 : 0;
      const up = dy < -50 && Math.abs(dy) > Math.abs(dx) * 0.4;
      setGaze((g) => (g && g.x === lx && g.up === up ? g : { x: lx, up }));
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  // Dozes off when left alone.
  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      if (Date.now() - lastSeen.current > SLEEP_MS) setAsleep(true);
    }, 2000);
    return () => window.clearInterval(id);
  }, [visible]);

  // Typewriter.
  useEffect(() => {
    if (!line || shown >= line.length) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), TYPE_MS);
    return () => window.clearTimeout(id);
  }, [line, shown]);

  // Once a line is out: a happy squint, then the bubble clears.
  useEffect(() => {
    if (!line || shown < line.length) return;
    setHappy(true);
    const a = window.setTimeout(() => setHappy(false), 900);
    const b = window.setTimeout(() => setLine(null), Math.max(2800, line.length * 60));
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [line, shown]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(petEnd.current);
    },
    [],
  );

  const poke = () => {
    // The click that ends a stroke is part of the petting, not a poke.
    if (petting || Date.now() - pettedAt.current < 400) return;
    touch();
    const now = Date.now();
    pokes.current = [...pokes.current.filter((t) => now - t < 3000), now];

    let text: string;
    if (asleep) {
      setAsleep(false);
      text = pick(WOKEN);
    } else if (!greeted.current) {
      greeted.current = true;
      text = HELLO;
    } else if (pokes.current.length >= 4) {
      text = pick(PESTERED);
      if (!still) {
        setShake(true);
        later(() => setShake(false), 500);
      }
    } else {
      text = nextLine();
    }
    say(text);
    golem.current?.hop();
  };

  const spawnHeart = () => {
    const id = ++heartId.current;
    setHearts((h) => [...h, { id, dx: Math.round(rand(-14, 14)), big: Math.random() < 0.3 }]);
    later(() => setHearts((h) => h.filter((x) => x.id !== id)), 1200);
  };

  const onStroke = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const now = Date.now();
    const s = stroke.current;
    if (now - s.last > 350) s.dist = 0;
    s.last = now;
    // Capped per event: the first move after entering carries the whole trip in.
    s.dist += Math.min(24, Math.hypot(e.movementX, e.movementY));
    if (s.dist < PET_PX) return;

    touch();
    if (!petting) {
      setPetting(true);
      setAsleep(false);
      golem.current?.hop();
      golem.current?.rustle();
    }
    if (!still && now - s.heart > 230) {
      s.heart = now;
      spawnHeart();
      setBloom((b) => Math.min(5, b + 1));
    }
    window.clearTimeout(petEnd.current);
    petEnd.current = window.setTimeout(() => {
      setPetting(false);
      pettedAt.current = Date.now();
      s.dist = 0;
      say(pick(PETTED));
    }, 650);
  };

  return (
    <div className="golem print:hidden">
      {line && (
        <div className="golem__bubble" aria-hidden="true">
          {line.slice(0, shown)}
          <span className="golem__ghost">{line.slice(shown)}</span>
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {line ?? ""}
      </span>
      <button
        type="button"
        className="golem__body"
        data-shake={shake || undefined}
        onClick={poke}
        onPointerMove={onStroke}
        onPointerEnter={() => {
          touch();
          stroke.current.dist = 0;
        }}
        aria-label="Moss golem. Click to hear it speak, or stroke it to pet it."
      >
        {hearts.map((h) => (
          <svg
            key={h.id}
            viewBox="0 0 7 6"
            shapeRendering="crispEdges"
            aria-hidden="true"
            className="golem__heart"
            data-big={h.big || undefined}
            style={{ "--dx": `${h.dx}px` } as CSSProperties}
          >
            {HEART.map(([c, d]) => (
              <path key={c} d={d} style={{ fill: HEART_FILL[c] }} />
            ))}
          </svg>
        ))}
        <canvas ref={canvasRef} width={GW} height={GH} aria-hidden="true" className="golem__sprite" />
      </button>
    </div>
  );
}
