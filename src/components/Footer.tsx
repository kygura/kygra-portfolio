import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { QUOTES_ARRAY } from "../lib/consts";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { shouldIgnoreKey } from "@/lib/keybindings";

function initQuote(list: string[]) {
  const r = Math.floor(Math.random() * list.length);
  return { index: r, content: list[r] };
}

const longestQuote = QUOTES_ARRAY.reduce((longest, q) =>
  q.length > longest.length ? q : longest
).split("<br>");

const variants = {
  enter: (d: number) => ({ opacity: 0, x: d * 40, scale: 0.97 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (d: number) => ({ opacity: 0, x: d * -30, scale: 0.97 }),
};

function QuoteLines({ lines }: { lines: string[] }) {
  return (
    <p className="footer-quote__text">
      {lines.map((line, i) => (
        <span
          key={i}
          className={
            i === 0 && lines.length > 1
              ? "footer-quote__line footer-quote__line--lead"
              : i > 0
                ? "footer-quote__line footer-quote__line--tr"
                : "footer-quote__line"
          }
        >
          {line}
        </span>
      ))}
    </p>
  );
}

const Footer = () => {
  const [currentQuote, setCurrentQuote] = useState(() => initQuote(QUOTES_ARRAY));
  const [direction, setDirection] = useState<-1 | 1>(1);

  const handlePrev = useCallback(() => {
    setCurrentQuote((prev) => {
      if (prev.index <= 0) return prev;
      setDirection(-1);
      const i = prev.index - 1;
      return { index: i, content: QUOTES_ARRAY[i] };
    });
  }, []);

  const handleNext = useCallback(() => {
    setCurrentQuote((prev) => {
      if (prev.index >= QUOTES_ARRAY.length - 1) return prev;
      setDirection(1);
      const i = prev.index + 1;
      return { index: i, content: QUOTES_ARRAY[i] };
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shouldIgnoreKey(e)) return;
      if (e.key === "a" || e.key === "A") handlePrev();
      else if (e.key === "d" || e.key === "D") handleNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePrev, handleNext]);

  const hasPrev = currentQuote.index > 0;
  const hasNext = currentQuote.index < QUOTES_ARRAY.length - 1;
  const lines = currentQuote.content.split("<br>");

  return (
    <footer className="site-footer">
      <div className="footer-quote">
        {/* Left */}
        <div className="footer-quote__nav footer-quote__nav--prev">
          <button
            type="button"
            onClick={hasPrev ? handlePrev : undefined}
            disabled={!hasPrev}
            aria-label="Previous quote"
          >
            <ArrowLeft strokeWidth={1.5} />
          </button>
          <kbd>a</kbd>
        </div>

        {/* Quote */}
        <div className="footer-quote__stage">
          {/* Hidden sizer: renders the tallest quote to reserve consistent height */}
          <div className="footer-quote__sizer" aria-hidden="true">
            <QuoteLines lines={longestQuote} />
          </div>

          {/* Animated quote overlay */}
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={currentQuote.index}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="footer-quote__current"
              aria-live="polite"
            >
              <QuoteLines lines={lines} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right */}
        <div className="footer-quote__nav footer-quote__nav--next">
          <button
            type="button"
            onClick={hasNext ? handleNext : undefined}
            disabled={!hasNext}
            aria-label="Next quote"
          >
            <ArrowRight strokeWidth={1.5} />
          </button>
          <kbd>d</kbd>
        </div>
      </div>

      <div className="footer-meta">
        <span>
          Today is{" "}
          {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}{" "}
          | {currentQuote.index + 1} / {QUOTES_ARRAY.length}
        </span>
        <span className="footer-meta__links">
          <a href="https://github.com/kygura" target="_blank" rel="noopener noreferrer">
            github / kygura
          </a>
          <Link to="/guestbook">guestbook</Link>
        </span>
      </div>
    </footer>
  );
};

export default Footer;
