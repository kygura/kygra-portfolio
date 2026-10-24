import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { useAccent } from "@/theme/accent";
import { GH, GW, createUnit, readPalette } from "./sprite";
import type { Pose, Unit } from "./sprite";
import { HEART, HEART_FILL } from "./heart";
import { HELLO, LINES, PESTERED, PETTED, WOKEN } from "./lines";

/**
 * The ruined survey unit in the bottom-left corner (the tape deck has the
 * bottom-right). Its core pulses, its eye blinks and glances around and
 * follows the cursor when it is near, its neck servo slips now and then,
 * the wire in its empty socket sparks, it waves on its own once in a while,
 * and it powers down when left alone. A click jolts it awake, it waves and
 * types out a line in a speech bubble; stroking it pets it (its eye smiles
 * and pixel hearts float up). Under reduced motion it holds still and lines
 * appear whole. The art is drawn by `sprite.ts` onto a small canvas, scaled
 * up with nearest-neighbour, in the theme's own colours.
 */

const TICK_MS = 1000 / 12;
const TYPE_MS = 28;
const WAVE_MS = 170;
/** Left alone this long (no petting, poking or cursor nearby), it falls asleep. */
const SLEEP_MS = 35_000;
/** Pointer travel over the unit, within one stroke, that counts as petting
 *  (more than one pass across it, so a cursor just passing by doesn't). */
const PET_PX = 140;
/** The eye within the canvas, for aiming the gaze. */
const EYE_X = 15 / GW;
const EYE_Y = 9 / GH;

type Action = "wave" | "spark" | "skyward";
const ACTIONS: { kind: Action; ms: number }[] = [
  { kind: "wave", ms: 1600 },
  { kind: "spark", ms: 700 },
  { kind: "skyward", ms: 1400 },
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

export default function Companion() {
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
  const [hearts, setHearts] = useState<{ id: number; dx: number; big: boolean }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const unit = useRef<Unit | null>(null);
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
    lookX: action === "skyward" ? 0 : gaze?.x ?? null,
    lookUp: action === "skyward" || Boolean(gaze?.up),
    happy: petting || happy,
    flare: typing,
    wave: waving ? wavePhase : null,
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
    const u = createUnit(canvas, readPalette(), { still });
    unit.current = u;
    if (pose.current) u.draw(pose.current);
    return () => {
      unit.current = null;
    };
  }, [still]);

  // A theme switch rewrites the tokens; the colours are read again once it has.
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      unit.current?.setPalette(readPalette());
      if (pose.current) unit.current?.draw(pose.current);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [accent]);

  useEffect(() => {
    if (!visible || still) return;
    const id = window.setInterval(() => {
      const g = unit.current;
      if (!g || !pose.current) return;
      g.tick();
      g.draw(pose.current);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [visible, still]);

  // Without the clock (reduced motion), redraw whenever the pose changes.
  useEffect(() => {
    if (still && unit.current && pose.current) unit.current.draw(pose.current);
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
        if (next.kind === "spark") unit.current?.spark();
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
      const dx = x - (r.left + r.width * EYE_X);
      const dy = y - (r.top + r.height * EYE_Y);
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

  // Powers down when left alone.
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
    unit.current?.jolt();
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
    }
    if (!still && now - s.heart > 230) {
      s.heart = now;
      spawnHeart();
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
    <div className="unit print:hidden">
      {line && (
        <div className="unit__bubble" aria-hidden="true">
          {line.slice(0, shown)}
          <span className="unit__ghost">{line.slice(shown)}</span>
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {line ?? ""}
      </span>
      <button
        type="button"
        className="unit__body"
        data-shake={shake || undefined}
        onClick={poke}
        onPointerMove={onStroke}
        onPointerEnter={() => {
          touch();
          stroke.current.dist = 0;
        }}
        aria-label="Ruined survey robot. Click to hear it speak, or stroke it to pet it."
      >
        {hearts.map((h) => (
          <svg
            key={h.id}
            viewBox="0 0 7 6"
            shapeRendering="crispEdges"
            aria-hidden="true"
            className="unit__heart"
            data-big={h.big || undefined}
            style={{ "--dx": `${h.dx}px` } as CSSProperties}
          >
            {HEART.map(([c, d]) => (
              <path key={c} d={d} style={{ fill: HEART_FILL[c] }} />
            ))}
          </svg>
        ))}
        <canvas ref={canvasRef} width={GW} height={GH} aria-hidden="true" className="unit__sprite" />
      </button>
    </div>
  );
}
