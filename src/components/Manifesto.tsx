import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Home manifesto: sits under the hero. A survey rail runs down the left edge
 * and fills as the reader scrolls; each thesis lights its numeral when it
 * comes into view. Everything settles to a still page under reduced motion.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const OPENING = "I don't have this figured out. These are a few things I keep coming back to.";

const THESES: { n: string; text: string }[] = [
  {
    n: "I",
    text: "Everything I've seen built to set people free ended up as something to get free from. I don't think that's anyone's fault. It seems to be how it goes, and I've stopped expecting otherwise.",
  },
  {
    n: "II",
    text: "Nobody handed me my freedom. What I have of it came slowly: a little money, a few skills, the knowledge that I could leave. Mostly it comes down to that. Being able to leave.",
  },
  {
    n: "III",
    text: "No church or party ever answered the big questions for me, and at some point I stopped asking them to. Some nights it's just me and the quiet. I've made a kind of peace with that.",
  },
  {
    n: "IV",
    text: "A machine can write the average sentence now, faster than I ever could. It hasn't been where I've been. That's most of the reason I still write.",
  },
  {
    n: "V",
    text: "I've left jobs, cities, whole versions of myself. The one thing I never managed to leave was me. A lamp can't light itself.",
  },
  {
    n: "VI",
    text: "I was a sprinter once. Then markets, music, code. For a long time I thought I'd failed at all of them. Now they look more like different roads, with the same person walking each one.",
  },
  {
    n: "VII",
    text: "Money is good for time and room to breathe. Past that I'm not sure what it's for. Whenever I chased winning, it slipped away. When I forgot about it and did the work, things tended to turn out fine.",
  },
];

const CLOSER = "I haven't arrived anywhere. I'm not sure there's anywhere to arrive.";

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
