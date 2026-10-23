import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Arm, Eye, PALETTE, VIEW_H, VIEW_W, frame, runePaths } from "./sprite";
import { HELLO, LINES, PESTERED } from "./lines";

/**
 * The moss golem in the bottom-right corner. It idles on a slow beat (head
 * bob, swaying sprout, blinks and glances), and a click makes it hop, wave
 * and type out a line in a speech bubble. Under reduced motion it stands
 * still and lines appear whole.
 */

const BEAT_MS = 520;
const TYPE_MS = 28;
const RUNE = runePaths();

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

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
  const [line, setLine] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const [happy, setHappy] = useState(false);
  const [hop, setHop] = useState(false);

  const pokes = useRef<number[]>([]);
  const greeted = useRef(false);
  const timers = useRef<number[]>([]);

  const typing = line !== null && shown < line.length;

  // Idle beat: drives the bob and the sprout.
  useEffect(() => {
    if (still || !visible) return;
    const id = window.setInterval(() => setBeat((b) => b + 1), BEAT_MS);
    return () => window.clearInterval(id);
  }, [still, visible]);

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

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const poke = () => {
    const now = Date.now();
    pokes.current = [...pokes.current.filter((t) => now - t < 3000), now];

    let text: string;
    if (!greeted.current) {
      greeted.current = true;
      text = HELLO;
    } else if (pokes.current.length >= 4) {
      text = PESTERED[Math.floor(Math.random() * PESTERED.length)];
    } else {
      text = nextLine();
    }

    setHappy(false);
    setLine(text);
    setShown(still ? text.length : 0);
    if (!still) {
      setHop(true);
      timers.current.push(window.setTimeout(() => setHop(false), 170));
    }
  };

  const eye: Eye = typing ? "big" : happy ? "happy" : idleEye;
  const arm: Arm = typing && !still ? (Math.floor(shown / 5) % 2 ? "up" : "wave") : "down";
  const paths = frame({
    bob: still ? 0 : ((Math.floor(beat / 2) % 2) as 0 | 1),
    sprout: still ? 0 : ((Math.floor((beat + 1) / 3) % 2) as 0 | 1),
    eye,
    arm,
  });

  return (
    <div className="golem print:hidden" data-still={still || undefined}>
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
        data-hop={hop || undefined}
        onClick={poke}
        aria-label="Moss golem. Click to hear it speak."
      >
        <span className="golem__spore" aria-hidden="true" />
        <span className="golem__spore golem__spore--late" aria-hidden="true" />
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
