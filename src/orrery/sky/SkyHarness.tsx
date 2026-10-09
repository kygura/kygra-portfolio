// TEMPORARY harness for T3 at /__sky (T4 removes it with its route). Mounts the Sky full-viewport with real
// project bodies and minimal body labels. Query: ?pal=sodium|phosphor|oxide|coldstar &sec=0..4 &sel=<index>
// &motion=0|1 &res=120|180|240. Keys: 1-4 palette, j/k body, h/l section, m motion, t tear.
import { useEffect, useRef, useState } from "react";
import { projects } from "@/lib/projects";
import SkyFallback from "@/console/SkyFallback";
import { loadSky, type Sky } from "./load";

const PALS = ["sodium", "phosphor", "oxide", "coldstar"];

export default function SkyHarness() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const [gl, setGl] = useState<"..." | "ok" | "none">("...");
  const [stat, setStat] = useState({ fps: 0, res: 0, pal: "sodium", motion: true, sec: 0, sel: 0 });

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const ids = projects.map((p) => p.slug);
    const st = {
      pal: PALS.includes(q.get("pal") ?? "") ? (q.get("pal") as string) : "sodium",
      motion: q.has("motion") ? q.get("motion") === "1" : !matchMedia("(prefers-reduced-motion: reduce)").matches,
      sec: Number(q.get("sec") ?? 0) || 0,
      sel: Math.min(ids.length - 1, Number(q.get("sel") ?? 0) || 0),
    };
    const root = document.documentElement;
    const applyPal = () => (st.pal === "sodium" ? delete root.dataset.pal : (root.dataset.pal = st.pal));
    applyPal();
    let sky: Sky | null = null;
    let dead = false;
    const sync = (fps?: number, res?: number) => setStat((s) => ({ ...s, ...st, fps: fps ?? s.fps, res: res ?? s.res }));

    loadSky(canvas.current as HTMLCanvasElement, {
      bodies: ids,
      motion: st.motion,
      section: st.sec,
      focus: ids[st.sel],
      onStats: ({ fps, res }) => sync(fps, res),
      onFrame: (ps) => {
        const el = labels.current;
        if (!el) return;
        ps.forEach((p, i) => {
          const l = el.children[i] as HTMLElement;
          l.hidden = !p.visible;
          l.style.color = i === st.sel ? "var(--fg)" : "var(--dim)";
          l.style.transform = `translate(${(p.x + p.rad + 4) | 0}px,${(p.y - 5) | 0}px)`;
        });
      },
    }).then((s) => {
      if (dead) return s?.dispose();
      sky = s;
      setGl(s ? "ok" : "none");
      if (s && q.get("res")) s.setRes(Number(q.get("res")));
      if (s) sync(undefined, s.res());
      (window as unknown as { __sky?: Sky | null }).__sky = s;
    });

    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if ("1234".includes(k) && k.length === 1) {
        st.pal = PALS[+k - 1];
        applyPal();
        sky?.setPalette();
        sky?.tear(2);
      } else if (k === "j" || k === "k") {
        st.sel = (st.sel + (k === "j" ? 1 : -1) + ids.length) % ids.length;
        sky?.focus(ids[st.sel]);
      } else if (k === "h" || k === "l") {
        st.sec = (st.sec + (k === "l" ? 1 : -1) + 5) % 5;
        sky?.section(st.sec);
      } else if (k === "m") {
        st.motion = !st.motion;
        sky?.motion(st.motion);
      } else if (k === "t") sky?.tear(6);
      else return;
      sync();
    };
    const onPtr = (e: PointerEvent) => sky?.pointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    addEventListener("keydown", onKey);
    addEventListener("pointermove", onPtr);
    return () => {
      dead = true;
      removeEventListener("keydown", onKey);
      removeEventListener("pointermove", onPtr);
      sky?.dispose();
    };
  }, []);

  return (
    <>
      <div id="skywrap">
        <canvas id="sky" ref={canvas} hidden={gl === "none"} role="img" aria-label="low-poly orrery: project bodies orbiting a monolith" />
        {gl === "none" && <SkyFallback />}
        <div ref={labels} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {projects.map((p) => (
            <div key={p.slug} hidden style={{ position: "absolute", left: 0, top: 0, font: "8px/1 var(--fm)", textTransform: "uppercase", background: "var(--bg)", padding: "1px 2px", whiteSpace: "nowrap" }}>
              [{p.title}]
            </div>
          ))}
        </div>
      </div>
      <pre data-testid="sky-status" style={{ position: "fixed", left: 16, bottom: 8, zIndex: 4, font: "16px/1 var(--fm)", textTransform: "uppercase", background: "var(--panel)", padding: 4 }}>
        {`pal:${stat.pal} motion:${stat.motion ? "on" : "off"} ${gl === "none" ? "gl:none" : `res:${stat.res} ${stat.fps}fps`} sec:${stat.sec} sel:${stat.sel}`}
      </pre>
    </>
  );
}
