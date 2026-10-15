import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Home manifesto: sits under the hero. A survey rail runs down the left edge
 * and fills as the reader scrolls; each thesis lights its numeral when it
 * comes into view. Everything settles to a still page under reduced motion.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const OPENING = "Everything built to set people free ends up as something they need freeing from. I build anyway.";

const THESES: { n: string; text: string }[] = [
  {
    n: "I",
    text: "Every system that frees people from the last one becomes the next one to escape. Software is no exception. I try to make things that expect to be outgrown, and leave the door open when they are.",
  },
  {
    n: "II",
    text: "When an institution stops serving the people inside it, I would rather build the road around it than petition for repairs. Exit is a form of speech. Code is a cheap way to say it.",
  },
  {
    n: "III",
    text: "A good tool hands your attention back. The ones I trust do one thing, show their workings, and never ask to be believed in. The thinking that makes you who you are should stay yours.",
  },
  {
    n: "IV",
    text: "Markets, agents, the open web, a running track before any of them. The fields were surfaces. What stayed the same was the one crossing them.",
  },
  {
    n: "V",
    text: "Winning is exhaust. Aim at it directly and you spoil whatever was producing it. So I aim at the work.",
  },
];

const CLOSER = "No final shape. Only the process, and the wonder that started it.";

const Thesis = ({ n, text, still }: { n: string; text: string; still: boolean }) => {
  const ref = useRef<HTMLLIElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -30% 0px" });
  const on = still || seen;
  return (
    <li ref={ref} className={`manifesto__thesis${on ? " is-on" : ""}`}>
      <span className="manifesto__num" aria-hidden="true">
        {n}
      </span>
      <motion.p
        initial={still ? false : { opacity: 0, y: 14 }}
        animate={on ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.9, ease: EASE }}
      >
        {text}
      </motion.p>
    </li>
  );
};

const Manifesto = () => {
  const still = Boolean(useReducedMotion());
  const ref = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const show = still || inView;

  // The rail fills from the first thesis to the last as they pass mid-screen.
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 70%", "end 55%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  const words = OPENING.split(" ");

  return (
    <section ref={ref} className="manifesto" aria-labelledby="manifesto-title">
      <div className="manifesto__inner">
        <motion.p
          className="manifesto__eyebrow"
          initial={still ? false : { opacity: 0 }}
          animate={show ? { opacity: 1 } : undefined}
          transition={{ duration: 0.8 }}
        >
          ( 00 &mdash; PREMISE )
        </motion.p>

        <h2 id="manifesto-title" className="manifesto__opening">
          {words.map((w, i) => (
            <motion.span
              key={i}
              className="manifesto__word"
              initial={still ? false : { opacity: 0, filter: "blur(6px)" }}
              animate={show ? { opacity: 1, filter: "blur(0px)" } : undefined}
              transition={{ delay: 0.15 + i * 0.045, duration: 0.7, ease: EASE }}
            >
              {w}{" "}
            </motion.span>
          ))}
        </h2>

        <div className="manifesto__body">
          <div className="manifesto__rail" aria-hidden="true">
            <motion.span style={still ? undefined : { scaleY: fill }} />
          </div>
          <ol ref={listRef} className="manifesto__list">
            {THESES.map((t) => (
              <Thesis key={t.n} {...t} still={still} />
            ))}
          </ol>
        </div>

        <motion.div
          className="manifesto__close"
          initial={still ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "0px 0px -15% 0px" }}
          transition={{ duration: 1 }}
        >
          <motion.hr
            initial={still ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: EASE }}
          />
          <p className="manifesto__closer">
            {CLOSER}
            <span className="manifesto__caret" aria-hidden="true" />
          </p>
          <nav className="manifesto__links" aria-label="Continue">
            <Link to="/writings">Read the writings &rarr;</Link>
            <Link to="/projects">See the work &rarr;</Link>
          </nav>
        </motion.div>
      </div>
    </section>
  );
};

export default Manifesto;
