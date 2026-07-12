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
  "I spend most of my waking hours talking to machines. These notes are about how I try to do that without becoming one: why the software I build looks the way it does, and what I refuse to automate away.",

  "I build software the way a cabinetmaker builds a chair: material first, ornament last. Most of what I know came from unmaking things, pulling a system apart until its assumptions sit on the bench, then rebuilding it with fewer parts and better joints. A good tool disappears into the hand. The craft is in what you leave out.",

  "My work sits at the intersection of financial apparatus and software craft. I hold that software can be beautiful as well as functional: interfaces that reduce the friction of modern information systems and do it with elegance, making the experience of using computers a strategic advantage rather than a modern hassle. Each project is an attempt to build something true within the machinery. I just wanna touch grass while the computer does stuff.",
];

const blockquote = {
  text:   "These are not products. They are tools, interfaces to view and understand reality, never to replace it. This work, is an ongoing effort for simplicity, for clarity, for beauty. To build tools that serve us, not tools that withdraw our attention to control us. It is an effort to live and work deliberately, to find the things worth doing.",
  follow: "History is not something that happens to us. It is something we do. Every moment collapses infinite possibilities into a single path. The work we do now reverberates into the future.",
};

const closer = "The ghost in the machine must remain human.";

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

        {/* Artisan closer */}
        <motion.p
          className="manifesto__p manifesto__closer"
          custom={paragraphs.length + 3}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={fadeUp}
        >
          {closer}
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
