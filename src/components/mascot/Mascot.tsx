import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { Arm, Eye, HEART, PALETTE, VIEW_H, VIEW_W, frame, runePaths } from "./sprite";
import { HELLO, LINES, PESTERED, PETTED, WOKEN } from "./lines";

/**
 * The moss golem in the bottom-left corner. It idles on a slow beat (head
 * bob, swaying sprout, blinks, the odd wave, stretch or bloom), follows the
 * cursor with its eye, and dozes off when left alone. A click makes it hop,
 * wave and type out a line in a speech bubble; stroking it pets it (the
 * sprout blooms and hearts float up). Under reduced motion it stands still
 * and lines appear whole.
 */

const BEAT_MS = 520;
const TYPE_MS = 28;
const WAVE_MS = 170;
/** Left alone this long (no petting, poking or cursor nearby), it falls asleep. */
const SLEEP_MS = 35_000;
/** Pointer travel over the golem, within one stroke, that counts as petting
 *  (more than one pass across it, so a cursor just passing by doesn't). */
const PET_PX = 140;
const RUNE = runePaths();

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
  const nextLine = useLineBag();

  const [beat, setBeat] = useState(0);
  const [idleEye, setIdleEye] = useState<Eye>("open");
  const [gaze, setGaze] = useState<Eye | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const [happy, setHappy] = useState(false);
  const [hop, setHop] = useState(false);
  const [shake, setShake] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [wavePhase, setWavePhase] = useState(false);
  const [asleep, setAsleep] = useState(false);
  const [petting, setPetting] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; dx: number; big: boolean }[]>([]);

  const bodyRef = useRef<HTMLButtonElement>(null);
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

  const say = useCallback(
    (text: string) => {
      setHappy(false);
      setLine(text);
      setShown(still ? text.length : 0);
    },
    [still],
  );

  const doHop = useCallback(() => {
    if (still) return;
    setHop(true);
    later(() => setHop(false), 170);
  }, [still, later]);

  const touch = () => {
    lastSeen.current = Date.now();
  };

  // Idle beat: drives the bob and the sprout.
  useEffect(() => {
    if (still || !visible) return;
    const id = window.setInterval(() => setBeat((b) => b + 1), BEAT_MS);
    return () => window.clearInterval(id);
  }, [still, visible]);

  // Arm waving runs faster than the beat.
  useEffect(() => {
    if (!waving) return;
    const id = window.setInterval(() => setWavePhase((w) => !w), WAVE_MS);
    return () => window.clearInterval(id);
  }, [waving]);

  // Blinks and glances, at random intervals.
  useEffect(() => {
    if (!visible) return;
    let t: number;
    const schedule = () => {
      t = window.setTimeout(() => {
        const roll = Math.random();
        const look: Eye = roll < 0.65 ? "blink" : roll < 0.83 ? "left" : "right";
        setIdleEye(look);
        t = window.setTimeout(() => {
          setIdleEye("open");
          schedule();
        }, look === "blink" ? 140 : rand(600, 1100));
      }, rand(1800, 4600));
    };
    schedule();
    return () => window.clearTimeout(t);
  }, [visible]);

  // Now and then, a small idle action of its own.
  useEffect(() => {
    if (still || !visible || asleep) return;
    let t: number;
    const schedule = () => {
      t = window.setTimeout(() => {
        const next = pick(ACTIONS);
        setAction(next.kind);
        if (next.kind === "stretch") doHop();
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
  }, [still, visible, asleep, doHop]);

  // The eye follows the cursor when it is near; a cursor nearby also keeps it awake.
  useEffect(() => {
    let raf = 0;
    let x = 0;
    let y = 0;
    const update = () => {
      raf = 0;
      const el = bodyRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height * 0.35);
      const far = Math.hypot(dx, dy);
      if (far < 220) lastSeen.current = Date.now();
      let next: Eye | null = null;
      if (far < 700 && far > 40) {
        const up = dy < -60 && Math.abs(dy) > Math.abs(dx) * 0.5;
        if (up) next = dx < -60 ? "upleft" : dx > 60 ? "upright" : "up";
        else if (dx < -30) next = "left";
        else if (dx > 30) next = "right";
      }
      setGaze(next);
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
    doHop();
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

  let eye: Eye;
  if (typing) eye = "big";
  else if (asleep) eye = "sleep";
  else if (petting || happy) eye = "happy";
  else if (action === "stretch") eye = "up";
  else if (idleEye === "blink") eye = "blink";
  else eye = gaze ?? idleEye;

  const arm: Arm = waving ? (wavePhase ? "up" : "wave") : "down";
  const sprout = petting || action === "bloom" ? 2 : still ? 0 : ((Math.floor((beat + 1) / 3) % 2) as 0 | 1);
  const paths = frame({
    bob: still ? 0 : ((Math.floor(beat / (asleep ? 3 : 2)) % 2) as 0 | 1),
    sprout,
    eye,
    arm,
  });

  return (
    <div
      className="golem print:hidden"
      data-still={still || undefined}
      data-asleep={asleep || undefined}
    >
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
        ref={bodyRef}
        type="button"
        className="golem__body"
        data-hop={hop || undefined}
        data-shake={shake || undefined}
        onClick={poke}
        onPointerMove={onStroke}
        onPointerEnter={() => {
          touch();
          stroke.current.dist = 0;
        }}
        aria-label="Moss golem. Click to hear it speak, or stroke it to pet it."
      >
        {!asleep && (
          <>
            <span className="golem__spore" aria-hidden="true" />
            <span className="golem__spore golem__spore--late" aria-hidden="true" />
          </>
        )}
        {asleep && !still && (
          <span className="golem__zzz" aria-hidden="true">
            <span>z</span>
            <span>z</span>
            <span>Z</span>
          </span>
        )}
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
              <path key={c} d={d} style={{ fill: PALETTE[c] }} />
            ))}
          </svg>
        ))}
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H + 1}`}
          shapeRendering="crispEdges"
          aria-hidden="true"
          className="golem__sprite"
        >
          <rect x={6} y={VIEW_H} width={VIEW_W - 12} height={1} className="golem__shadow" />
          {paths.map(([c, d]) => (
            <path key={c} d={d} style={{ fill: PALETTE[c] }} className={c === "e" ? "golem__glow" : undefined} />
          ))}
          <g className="golem__rune">
            {RUNE.map(([c, d]) => (
              <path key={c} d={d} style={{ fill: PALETTE[c] }} />
            ))}
          </g>
        </svg>
      </button>
    </div>
  );
}
