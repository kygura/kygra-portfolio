import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const typewriterText = "On Software Craft";

function TypewriterHeading({ inView }: { inView: boolean }) {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!inView || hasStarted.current) return;
    hasStarted.current = true;

    let i = 0;
    const interval = setInterval(() => {
      if (i < typewriterText.length) {
        setDisplayed(typewriterText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        // blink cursor for a bit then hide
        setTimeout(() => setShowCursor(false), 2400);
      }
    }, 75);

    return () => clearInterval(interval);
  }, [inView]);

  return (
    <h2 className="manifesto__hero-title">
      <span className="manifesto__hero-text">{displayed}</span>
      {showCursor && <span className="manifesto__hero-cursor" aria-hidden="true">|</span>}
    </h2>
  );
}

const paragraphs = [
  "A dissertation on my rationale and methodology for building software.",

  "The systems we inhabit are not designed for human flourishing. They are designed to extract attention, pacify ambition, and replace inner life with a curated performance of it. The interface has become the world, and it surveils you while selling you back to yourself. This is not a political crisis — every tribe has failed, in sequence, with conviction. What is broken runs deeper than policy. It is in the texture of daily life. The atomization. The screen-mediated loneliness. The feeling of being a node in a network that has forgotten about the individual node. The only way out is through. To build new tools, new interfaces, new ways of living and working that are not complicit in the machinery of control, but that reshape it from the inside out.",


  "My work sits at the intersection of financial apparatus and software craft. I'm of the opinion software can not only be purely functional, but beautiful: Interfaces that reduce the friction of modern information systems and do so in an elegant matter, making the experience of using computers an actual strategic advantage, not a modern hassle. Each project is an attempt to build something true within the machinery; Not to escape it, not to comply with it, but to reshape it from the inside. I just wanna touch grass while the computer does stuff",


];

const blockquote = {
  text:   "These are not products. They are tools, interfaces to view and understand reality, never to replace it. This work, is an ongoing effort for simplicity, for clarity, for beauty. To build tools that serve us, not tools that withdraw our attention to control us. It is an effort to live and work deliberately, to find the things worth doing.",
  follow: "History is not something that happens to us. It is something we do. Every moment collapses infinite possibilities into a single path. The work we do now reverberates into the future. Each generation inherits the spirit of its ancestors and is tasked with confronting the corruption, decay, and evil of its age with courage.",
};

export default function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });

  return (
    <section
      ref={ref}
      className="manifesto"
    >
      <div className="manifesto__inner">
        <motion.header
          className="manifesto__header"
          custom={0}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={fadeUp}
        >
          
          
          <TypewriterHeading inView={inView} />
          <motion.div
            className="manifesto__hero-line"
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ delay: 2.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] as const }}
          />
        </motion.header>

        {/* Body paragraphs */}
        {paragraphs.map((text, i) => (
          <motion.p
            key={i}
            className="manifesto__p"
            custom={i + 1}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={fadeUp}
          >
            {text}
          </motion.p>
        ))}

        {/* Blockquote */}
        <motion.blockquote
          className="manifesto__quote"
          custom={paragraphs.length + 1}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={fadeUp}
        >
          <p>{blockquote.text}</p>
        </motion.blockquote>

        <motion.p
          className="manifesto__p"
          custom={paragraphs.length + 2}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={fadeUp}
        >
          {blockquote.follow}
        </motion.p>

        {/* Signature */}
        <motion.p
          className="manifesto__signature"
          custom={paragraphs.length + 3}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={fadeUp}
        >
        -Nicolas
        </motion.p>

        {/* Divider */}
        <motion.hr
          className="smear"
          custom={paragraphs.length + 4}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={fadeUp}
        />

        {/* CTA to projects */}
        <motion.div
          className="manifesto__cta"
          custom={paragraphs.length + 5}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={fadeUp}
        >
          <Link to="/projects" className="manifesto__link">
            Explore the work
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
