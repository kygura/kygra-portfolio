import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";

/**
 * Legend: the home page's introduction, set under the hero like the key on a
 * survey sheet. The lead inks in word by word as it scrolls through the
 * viewport; the articles and the route key draw their hairlines and rise in
 * once, when they first come into view. Reduced motion shows everything at rest.
 */

const LEAD = "A good map leaves most of the world out, and that is why you can read it. I build software the same way.";

const ARTICLES = [
  { no: "01", term: "Scale", text: "Keep it small enough to hold in your head. If nobody can picture a system, nobody can fix it." },
  { no: "02", term: "Relief", text: "Make the high ground look high. A good interface shows what matters first and lets the rest recede." },
  { no: "03", term: "Bearing", text: "The model proposes and the system decides. I keep an agent's intent and the machine's permissions in separate hands." },
  { no: "04", term: "Terrain", text: "Markets, protocols and the open web shift under your feet. I build for ground that moves." },
  { no: "05", term: "Datum", text: "Every height is measured from somewhere. Mine is people: tools should help us see the world, never stand in for it." },
];

const KEY = [
  { to: "/writings", label: "Writings", note: "Essays on the arts, engineering and the existential", chord: "w" },
  { to: "/projects", label: "Software", note: "Ventures and tools, built and maintained", chord: "s" },
  { to: "/guestbook", label: "Guestbook", note: "Leave a mark on the sheet", chord: "b" },
  { to: "/cv", label: "Credentials", note: "Where I studied and what I've built", chord: "c" },
];

/** Adds `is-in` the first time the element crosses into view. */
function useSeen<T extends HTMLElement>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") return setSeen(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin, seen]);
  return [ref, seen] as const;
}

function Word({ word, i, n, progress }: { word: string; i: number; n: number; progress: MotionValue<number> }) {
  const start = i / n;
  const opacity = useTransform(progress, [start, Math.min(1, start + 2 / n)], [0.16, 1]);
  return (
    <>
      <motion.span className="legend__word" style={{ opacity }}>
        {word}
      </motion.span>{" "}
    </>
  );
}

function Lead() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.88", "end 0.48"] });
  const words = LEAD.split(" ");

  return (
    <p ref={ref} className="legend__lead">
      {reduce
        ? LEAD
        : words.map((w, i) => <Word key={i} word={w} i={i} n={words.length} progress={scrollYProgress} />)}
    </p>
  );
}

const Legend = () => {
  const [headRef, headIn] = useSeen<HTMLDivElement>();
  const [listRef, listIn] = useSeen<HTMLOListElement>();
  const [keyRef, keyIn] = useSeen<HTMLDivElement>();

  return (
    <section className="legend" aria-labelledby="legend-title">
      <div className="legend__inner">
        <aside ref={headRef} className={`legend__block${headIn ? " is-in" : ""}`}>
          <p id="legend-title" className="legend__eyebrow">( 00 / LEGEND )</p>
          <dl className="legend__readout">
            <div><dt>Sheet</dt><dd>00 of 05</dd></div>
            <div><dt>Datum</dt><dd>36.72&deg; N &middot; 4.42&deg; W</dd></div>
            <div><dt>Scale</dt><dd>1 : 1</dd></div>
          </dl>
        </aside>

        <div className="legend__body">
          <Lead />

          <p className="legend__sub">
            This is where I keep the work: software ventures, essays, and experiments in agentic systems, markets and
            the open web. The scenes above are the map. Below is the key.
          </p>

          <ol ref={listRef} className={`legend__articles${listIn ? " is-in" : ""}`}>
            {ARTICLES.map((a, i) => (
              <li key={a.no} className="legend__article" style={{ "--i": i } as CSSProperties}>
                <span className="legend__no" aria-hidden="true">
                  <i className="legend__sq" />
                  {a.no}
                </span>
                <h3 className="legend__term">{a.term}</h3>
                <p className="legend__text">{a.text}</p>
              </li>
            ))}
          </ol>

          <div ref={keyRef} className={`legend__key${keyIn ? " is-in" : ""}`}>
            <p className="legend__closer">
              The survey is ongoing<span className="legend__caret" aria-hidden="true" />
            </p>
            <ul className="legend__routes">
              {KEY.map((k, i) => (
                <li key={k.to} style={{ "--i": i } as CSSProperties}>
                  <Link to={k.to} className="legend__route" aria-keyshortcuts={`g ${k.chord}`}>
                    <i className="legend__sq" aria-hidden="true" />
                    <span className="legend__route-label">{k.label}</span>
                    <span className="legend__route-note">{k.note}</span>
                    <span className="legend__route-keys" aria-hidden="true">
                      <kbd>g</kbd>
                      <kbd>{k.chord}</kbd>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Legend;
