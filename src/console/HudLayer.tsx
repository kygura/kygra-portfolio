// DOM overlay over the sky (DESIGN §8/§9): body labels, bracket reticle, leader line to the
// Inspector and the RA/DEC readout. Updated imperatively from the Sky's frame callback, never
// through React state per frame. On desktop it also docks the Inspector in 8px snaps.
import { forwardRef, useImperativeHandle, useRef, type RefObject } from "react";
import type { SkyProjection } from "../orrery/sky/load";

export interface HudContext {
  /** Selected project index. */
  sel: number;
  /** Hovered project row, or -1. */
  hov: number;
  section: string;
  /** Inspector open and floating candidates (projects section, no Reader). */
  insp: boolean;
  reader: boolean;
}

export interface HudHandle {
  frame(ps: readonly SkyProjection[]): void;
}

interface HudLayerProps {
  labels: string[];
  ctx: RefObject<HudContext>;
  inspRef: RefObject<HTMLElement>;
  stackRef: RefObject<HTMLElement>;
}

const snap8 = (v: number) => Math.round(v / 8) * 8;
const pad2 = (n: number) => String(n).padStart(2, "0");

const HudLayer = forwardRef<HudHandle, HudLayerProps>(function HudLayer({ labels, ctx, inspRef, stackRef }, ref) {
  const lbls = useRef<HTMLDivElement>(null);
  const ret = useRef<HTMLDivElement>(null);
  const line = useRef<SVGLineElement>(null);
  const ro = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      frame(ps) {
        const c = ctx.current;
        if (!c || !lbls.current || !ret.current || !line.current || !ro.current) return;
        const onProjects = c.section === "projects";
        const hi = c.hov >= 0 ? c.hov : c.sel;
        ps.forEach((q, i) => {
          const l = lbls.current!.children[i] as HTMLElement | undefined;
          if (!l) return;
          l.hidden = !q.visible;
          l.classList.toggle("on", i === hi);
          l.style.transform = `translate(${(q.x + q.rad + 4) | 0}px,${(q.y - 5) | 0}px)`;
        });
        const p = ps[hi];
        const r = ret.current;
        r.hidden = !(onProjects && !c.reader && p?.visible);
        if (!r.hidden) {
          const s = Math.max(6, (p.rad + 3) | 0);
          r.style.left = `${(p.x - s) | 0}px`;
          r.style.top = `${(p.y - s) | 0}px`;
          r.style.width = r.style.height = `${2 * s}px`;
        }
        const q = ps[c.sel];
        ro.current.textContent =
          onProjects && q
            ? `RA ${pad2(q.ra | 0)}h${pad2(((q.ra % 1) * 60) | 0)}m  DEC ${q.dec < 0 ? "-" : "+"}${pad2(Math.abs(q.dec) | 0)}  d=${q.dist.toFixed(2)}au`
            : `RA --h--m  DEC ---  sec=${c.section}`;

        const ins = inspRef.current;
        const ln = line.current;
        const desktop = innerWidth >= 1024;
        if (ins && !desktop) ins.style.visibility = "";
        if (ins && q && c.insp && desktop) {
          const sr = (stackRef.current?.getBoundingClientRect().right ?? 0) + 8;
          const w = ins.offsetWidth;
          const h = ins.offsetHeight;
          const x = Math.max(snap8(sr), Math.min(snap8(q.x + 24), innerWidth - 8 - w));
          const y = Math.max(32, Math.min(snap8(q.y + 24), innerHeight - 32 - h));
          ins.style.left = `${x}px`;
          ins.style.top = `${y}px`;
          ins.style.visibility = "";
          const s = Math.max(6, (q.rad + 3) | 0);
          ln.setAttribute("x1", String((q.x + s) | 0));
          ln.setAttribute("y1", String((q.y + s) | 0));
          ln.setAttribute("x2", String(x));
          ln.setAttribute("y2", String(y));
        } else {
          ln.setAttribute("x2", ln.getAttribute("x1") ?? "0");
          ln.setAttribute("y2", ln.getAttribute("y1") ?? "0");
        }
      },
    }),
    [ctx, inspRef, stackRef],
  );

  return (
    <div id="hud" aria-hidden="true">
      <svg id="lead">
        <line ref={line} x1="0" y1="0" x2="0" y2="0" />
      </svg>
      <div id="ret" ref={ret} hidden>
        <i />
        <i />
        <i />
        <i />
      </div>
      <div ref={lbls}>
        {labels.map((l) => (
          <div key={l} className="lbl" hidden>
            [{l}]
          </div>
        ))}
      </div>
      <div id="ro" ref={ro} />
    </div>
  );
});

export default HudLayer;
