/**
 * Mossback, the site's pet: a mossy stone titan standing on the bottom-left
 * edge of the viewport. It breathes, blinks, glances toward the cursor,
 * drifts spores, and falls asleep when the page has been still for a while.
 * Clicking pets it (it hops, a heart rises, a blossom opens). `m` or the
 * command palette tucks it away and brings it back; the choice persists.
 * On the home page it waits below the hero so it never sits on the scene.
 *
 * The sprite renderer (src/mascot/golem.ts) is a dynamic import, so the
 * first paint of a page doesn't pay for it.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ACCENTS, readStored, useAccent, writeStored } from "@/theme/accent";
import { GOLEM_EVENT } from "@/theme/keymap";
import type { Golem as Sprite } from "@/mascot/golem";

const KEY = "nca-golem";
const PETS_KEY = "nca-golem-pets";
const FPS = 12;
const SLEEP_AFTER = 45_000;
/** matches the sink transition in index.css */
const TUCK_MS = 640;

const reducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Golem() {
  const { pathname } = useLocation();
  const accent = useAccent();
  const [on, setOn] = useState(() => readStored(KEY) !== "off");
  const [risen, setRisen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [pets, setPets] = useState(() => Number.parseInt(readStored(PETS_KEY) ?? "", 10) || 0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sprite = useRef<Sprite | null>(null);
  const [ready, setReady] = useState(false);
  const live = useRef({ active: Date.now(), x: -1, accent });
  live.current.accent = accent;

  const shown = on && risen && (pathname !== "/" || pastHero);

  // m / the palette: rise out of the ground, or sink back into it
  const want = useRef(on);
  useEffect(() => {
    let timer = 0;
    let f = 0;
    const rise = () => {
      // two frames, so the sunken state paints before the transition runs
      f = requestAnimationFrame(() => (f = requestAnimationFrame(() => setRisen(true))));
    };
    const toggle = () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(f);
      want.current = !want.current;
      writeStored(KEY, want.current ? "on" : "off");
      if (want.current) {
        setOn(true);
        rise();
      } else {
        setRisen(false);
        timer = window.setTimeout(() => setOn(false), TUCK_MS);
      }
    };
    if (want.current) rise();
    window.addEventListener(GOLEM_EVENT, toggle);
    return () => {
      window.removeEventListener(GOLEM_EVENT, toggle);
      window.clearTimeout(timer);
      cancelAnimationFrame(f);
    };
  }, []);

  // home: stay underground while the hero fills the screen
  useEffect(() => {
    if (pathname !== "/") return;
    const check = () => setPastHero(window.scrollY > window.innerHeight * 0.85);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [pathname]);

  // activity keeps it awake; the pointer's x steers its glance
  useEffect(() => {
    const poke = () => {
      live.current.active = Date.now();
      if (sprite.current?.mood === "asleep") sprite.current.wake();
    };
    const move = (e: PointerEvent) => {
      live.current.x = e.clientX;
      poke();
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("keydown", poke);
    window.addEventListener("scroll", poke, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("keydown", poke);
      window.removeEventListener("scroll", poke);
    };
  }, []);

  // create the sprite while mounted
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!on || !canvas) return;
    let alive = true;
    import("@/mascot/golem").then(({ createGolem }) => {
      if (!alive) return;
      const g = createGolem(canvas, { still: reducedMotion() });
      g.setAccent(ACCENTS[live.current.accent].hex);
      g.draw();
      sprite.current = g;
      setReady(true);
    });
    return () => {
      alive = false;
      sprite.current = null;
      setReady(false);
    };
  }, [on]);

  // run it at a pixel-art cadence, only while it's on screen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!ready || !shown || !canvas || reducedMotion()) return;
    let raf = 0;
    let last = 0;
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const g = sprite.current;
      if (!g || document.hidden || now - last < 1000 / FPS) return;
      last = now;
      if (Date.now() - live.current.active > SLEEP_AFTER) g.sleep();
      const r = canvas.getBoundingClientRect();
      const dx = live.current.x < 0 ? 0 : live.current.x - (r.left + r.width / 2);
      g.look(Math.abs(dx) < 90 ? 0 : Math.sign(dx));
      g.tick();
      g.draw();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ready, shown]);

  useEffect(() => {
    sprite.current?.setAccent(ACCENTS[accent].hex);
    sprite.current?.draw();
  }, [accent]);

  const pet = () => {
    const g = sprite.current;
    if (!g) return;
    live.current.active = Date.now();
    g.pet();
    const n = pets + 1;
    setPets(n);
    writeStored(PETS_KEY, String(n));
    if (reducedMotion()) {
      // no loop runs: show the happy frame, then settle back
      g.draw();
      window.setTimeout(() => {
        for (let k = 0; k < 20; k++) g.tick();
        g.draw();
      }, 1500);
    }
  };

  if (!on) return null;

  return (
    <div className="golem" data-shown={shown || undefined}>
      <button
        type="button"
        className="golem__body"
        onClick={pet}
        onPointerEnter={() => sprite.current?.wake()}
        aria-label={`Mossback, the site's moss golem. Pet it${pets ? ` (petted ${pets} times)` : ""}.`}
        tabIndex={shown ? 0 : -1}
      >
        <canvas ref={canvasRef} className="golem__canvas" aria-hidden="true" />
        <span className="golem__tag" aria-hidden="true">
          Mossback{pets > 0 && <em> ×{pets}</em>}
        </span>
      </button>
      <button
        type="button"
        className="golem__tuck"
        onClick={() => window.dispatchEvent(new Event(GOLEM_EVENT))}
        aria-label="Tuck the golem away (press m to bring it back)"
        title="Tuck away · m brings it back"
        tabIndex={shown ? 0 : -1}
      >
        ×
      </button>
    </div>
  );
}
