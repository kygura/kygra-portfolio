import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Home manifesto: sits under the hero. A survey rail runs down the left edge
 * and fills as the reader scrolls; each thesis lights its numeral when it
 * comes into view. Everything settles to a still page under reduced motion.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const OPENING = "Life is a game none of us designed. I play it with my eyes open.";

const THESES: { n: string; text: string }[] = [
  {
    n: "I",
    text: "Every system built to free people hardens into the next one they need freeing from. Resistance comes first; the cage follows the liberation. So I build things that plan for their own obsolescence, and leave the exit unlocked.",
  },
  {
    n: "II",
    text: "Freedom was never handed out. It is earned through leverage: skill, capital, literacy, the ability to walk away. When an institution stops holding up its end, I build around it rather than petition it. Exit is speech.",
  },
  {
    n: "III",
    text: "Meaning doesn't come by subscription. No church, party or feed gets to carry the existential weight for me. You face the void alone, and whatever you build on it is yours.",
  },
  {
    n: "IV",
    text: "Machines converge on the median. Whatever signal there is lives in the tails. A real voice can't be prompted into existence; it gets lived into, through years of attention paid to particular things. Good tools give that attention back.",
  },
  {
    n: "V",
    text: "A free man can escape almost anything except himself. A lamp cannot light itself. The edge sits in the disposition, before any decision gets made, so that is where the work goes.",
  },
  {
    n: "VI",
    text: "A running track, then markets, music, code. The fields were surfaces. The will crossing them stayed constant. Sprint, build something that remembers what the sprint produced, sprint again.",
  },
  {
    n: "VII",
    text: "Money buys time and room to move. Hoarded, it is a monument to nothing. Winning is exhaust: aim at it directly and you spoil what made it. Aim at the work.",
  },
];

const CLOSER = "The seeking never arrives. That is the design.";

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
