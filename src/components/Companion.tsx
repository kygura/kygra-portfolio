import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { readStored, writeStored } from "@/theme/accent";

/**
 * Moss: a pixel sprite in the bottom-right corner that reads what's on
 * screen and says one thing about it. It speaks when a page opens, when the
 * visitor stops scrolling on a new section, and when clicked. Remarks come
 * from /api/companion/remark; if that is down the sprite just stays quiet.
 */

type Mood = "curious" | "amused" | "thoughtful" | "excited" | "sleepy";
type Trigger = "arrive" | "linger" | "poke";

interface Remark {
  text: string;
  mood: Mood;
}

interface Glimpse {
  path: string;
  title: string;
  heading: string;
  excerpt: string;
}

const MUTE_KEY = "nca-companion-muted";

/** Wait after a route change before reacting to the new page. */
const ARRIVE_MS = 2500;
/** How long the view must hold still to count as reading a section. */
const LINGER_MS = 6000;
/** Least gap between remarks Moss starts on its own. */
const GAP_MS = 25_000;
/** Remarks Moss starts on its own per visit; clicks don't count. */
const AUTO_LIMIT = 12;
const EXCERPT_CHARS = 2000;

const BLOCKS = "h1, h2, h3, h4, p, li, blockquote, figcaption, pre, dt, dd, td";
const HEADINGS = "h1, h2, h3";

const visible = (rect: DOMRect) => rect.bottom > 0 && rect.top < window.innerHeight && rect.height > 0;

/** The text in view inside <main>, with the heading the visitor is under. */
function readView(path: string): Glimpse {
  const main = document.getElementById("main");
  const title = document.title;
  if (!main) return { path, title, heading: "", excerpt: "" };

  const parts: string[] = [];
  let length = 0;
  for (const el of main.querySelectorAll<HTMLElement>(BLOCKS)) {
    // A paragraph inside a list item or quote is read with its parent.
    if (el.parentElement?.closest("li, blockquote") && !el.matches("li, blockquote")) continue;
    if (!visible(el.getBoundingClientRect())) continue;
    const text = el.innerText.replace(/\s+/g, " ").trim();
    if (!text) continue;
    parts.push(text);
    length += text.length + 1;
    if (length >= EXCERPT_CHARS) break;
  }

  // The last heading above the upper third of the screen, else the first one in view.
  let heading = "";
  for (const el of main.querySelectorAll<HTMLElement>(HEADINGS)) {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.35) heading = el.innerText.trim();
    else {
      if (!heading && visible(rect)) heading = el.innerText.trim();
      break;
    }
  }

  return { path, title, heading, excerpt: parts.join("\n").slice(0, EXCERPT_CHARS) };
}

/** What a view is about, to tell a new section from the one already remarked on. */
const viewKey = (g: Glimpse) => `${g.path}|${g.heading}|${g.excerpt.slice(0, 160)}`;

async function fetchRemark(glimpse: Glimpse, trigger: Trigger, signal: AbortSignal): Promise<Remark | null> {
  try {
    const response = await fetch("/api/companion/remark", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...glimpse, trigger }),
      signal,
    });
    return response.ok ? ((await response.json()) as Remark) : null;
  } catch {
    return null;
  }
}

export default function Companion() {
  const { pathname } = useLocation();
  const [muted, setMuted] = useState(() => readStored(MUTE_KEY) === "1");
  const [remark, setRemark] = useState<Remark | null>(null);
  const [thinking, setThinking] = useState(false);

  const busy = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const lastAt = useRef(0);
  const lastKey = useRef("");
  const autoCount = useRef(0);
  const hideTimer = useRef<number>();

  const show = useCallback((next: Remark | null) => {
    window.clearTimeout(hideTimer.current);
    setRemark(next);
    if (next) hideTimer.current = window.setTimeout(() => setRemark(null), Math.max(6000, next.text.length * 70));
  }, []);

  const speak = useCallback(
    async (trigger: Trigger) => {
      if (busy.current) return;
      if (trigger !== "poke") {
        if (muted || document.hidden || autoCount.current >= AUTO_LIMIT) return;
        if (trigger === "linger" && Date.now() - lastAt.current < GAP_MS) return;
      }
      const glimpse = readView(pathname);
      const key = viewKey(glimpse);
      if (trigger === "linger" && key === lastKey.current) return;

      busy.current = true;
      setThinking(true);
      const controller = new AbortController();
      abort.current = controller;
      const next = await fetchRemark(glimpse, trigger, controller.signal);
      busy.current = false;
      setThinking(false);
      if (controller.signal.aborted) return;

      lastAt.current = Date.now();
      lastKey.current = key;
      if (trigger !== "poke") autoCount.current++;
      if (next) show(next);
      else if (trigger === "poke") show({ text: "…my head's empty right now. try me later.", mood: "sleepy" });
    },
    [muted, pathname, show],
  );

  // A new page: drop whatever was being said and look around once it settles.
  useEffect(() => {
    abort.current?.abort();
    busy.current = false;
    setThinking(false);
    show(null);
    const timer = window.setTimeout(() => speak("arrive"), ARRIVE_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reading: the view holds still on a section it hasn't remarked on.
  useEffect(() => {
    let timer: number | undefined;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => speak("linger"), LINGER_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, [speak]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const hush = () => {
    setMuted(true);
    writeStored(MUTE_KEY, "1");
    show(null);
  };

  const poke = () => {
    if (muted) {
      setMuted(false);
      writeStored(MUTE_KEY, "0");
    }
    speak("poke");
  };

  const mood: Mood | "thinking" = thinking ? "thinking" : muted ? "sleepy" : (remark?.mood ?? "curious");

  return (
    <div className="companion" data-cursor>
      {(remark || thinking) && (
        <div className="companion-bubble" role="status" aria-live="polite">
          {thinking ? (
            <span className="companion-dots" aria-label="Moss is reading">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          ) : (
            <>
              <p>{remark?.text}</p>
              <button type="button" className="companion-hush" onClick={hush}>
                hush
              </button>
            </>
          )}
        </div>
      )}
      <button
        type="button"
        className="companion-sprite"
        onClick={poke}
        aria-label={muted ? "Wake Moss, the site companion" : "Ask Moss, the site companion, what it thinks of this"}
        title={muted ? "Moss is asleep. Click to wake." : "Moss"}
      >
        <Sprite mood={mood} />
      </button>
    </div>
  );
}

// ---- Sprite --------------------------------------------------------------------

/** 12×11 body: B accent, D deep accent, S sprout. Faces are drawn over it in the ground colour. */
const BODY = [
  ".....S......",
  "....SS.S....",
  ".....SS.....",
  "...BBBBBB...",
  "..BBBBBBBB..",
  ".BBBBBBBBBB.",
  ".BBBBBBBBBB.",
  ".BBBBBBBBBB.",
  ".BBBBBBBBBB.",
  "..DDDDDDDD..",
  "...D....D...",
];

type Px = [x: number, y: number];

const FACES: Record<Mood | "thinking", { eyes: Px[]; mouth: Px[] }> = {
  curious: { eyes: [[3, 6], [3, 7], [8, 6], [8, 7]], mouth: [[6, 8]] },
  excited: { eyes: [[3, 6], [3, 7], [8, 6], [8, 7]], mouth: [[5, 8], [6, 8]] },
  amused: { eyes: [[2, 7], [3, 6], [4, 7], [7, 7], [8, 6], [9, 7]], mouth: [[4, 8], [5, 9], [6, 9], [7, 8]] },
  thoughtful: { eyes: [[4, 6], [9, 6]], mouth: [[5, 8], [6, 8], [7, 8]] },
  thinking: { eyes: [[4, 5], [9, 5]], mouth: [[6, 8]] },
  sleepy: { eyes: [[2, 7], [3, 7], [7, 7], [8, 7]], mouth: [[5, 8]] },
};

const FILL: Record<string, string> = { B: "var(--accent)", D: "var(--accent-deep)", S: "var(--accent-deep)" };

function Sprite({ mood }: { mood: Mood | "thinking" }) {
  const face = FACES[mood];
  const open = mood !== "sleepy" && mood !== "amused";
  return (
    <svg viewBox="0 0 12 11" shapeRendering="crispEdges" aria-hidden="true" className={`companion-svg mood-${mood}`}>
      {BODY.flatMap((row, y) =>
        [...row].flatMap((cell, x) => (FILL[cell] ? [<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={FILL[cell]} />] : [])),
      )}
      <g className={open ? "companion-eyes" : undefined}>
        {face.eyes.map(([x, y]) => (
          <rect key={`e${x}-${y}`} x={x} y={y} width={1} height={1} fill="var(--bg)" />
        ))}
      </g>
      {face.mouth.map(([x, y]) => (
        <rect key={`m${x}-${y}`} x={x} y={y} width={1} height={1} fill="var(--bg)" />
      ))}
    </svg>
  );
}
