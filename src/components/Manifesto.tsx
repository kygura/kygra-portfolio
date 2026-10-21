import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Home manifesto: sits under the hero. A survey rail runs down the left edge
 * and fills as the reader scrolls; each thesis lights its numeral when it
 * comes into view. Everything settles to a still page under reduced motion.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const OPENING = "I build small tools. These are the ideas behind them.";

const THESES: { n: string; text: string }[] = [
  {
    n: "I",
    text: "Software that frees you from one system tends to become the next one you need to leave. I assume mine will too, so it should be easy to outgrow.",
  },
  {
    n: "II",
    text: "Leaving should be cheap. Your work belongs to you, in a form you can carry out, and nothing should be built to stop you going.",
  },
  {
    n: "III",
    text: "A tool should give your attention back. No feeds, streaks or nudges designed to pull you in. It does its job and gets out of the way.",
  },
  {
    n: "IV",
    text: "When a model is involved, I describe it as what it is: a system predicting text. It has no inner life, and I won't dress it up as if it had one.",
  },
  {
    n: "V",
    text: "Defaults drift toward the median. I would rather make something with a specific shape, built by someone paying attention to particular problems, than something that fits everyone a little.",
  },
  {
    n: "VI",
    text: "When an existing tool stops serving the people using it, I build a smaller one beside it instead of waiting for it to change.",
  },
];

const CLOSER = "None of it is finished. It changes as I do.";

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
          ( 00 &mdash; NOTES )
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
