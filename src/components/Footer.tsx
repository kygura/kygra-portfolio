import { ArrowLeft, ArrowRight } from "lucide-react";
import { QUOTES_ARRAY } from "../lib/consts";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

function initQuote(list: string[]) {
  const r = Math.floor(Math.random() * list.length);
  return { index: r, content: list[r] };
}

const Footer = () => {
  const [currentQuote, setCurrentQuote] = useState(() => initQuote(QUOTES_ARRAY));
  const [direction, setDirection] = useState<-1 | 1>(1);

  const longestQuote = QUOTES_ARRAY.reduce((longest, q) =>
    q.length > longest.length ? q : longest
  ).split("<br>");

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
      if (e.key === "a" || e.key === "A") handlePrev();
      else if (e.key === "d" || e.key === "D") handleNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePrev, handleNext]);

  const hasPrev = currentQuote.index > 0;
  const hasNext = currentQuote.index < QUOTES_ARRAY.length - 1;
  const lines = currentQuote.content.split("<br>");

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 40, scale: 0.97 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) => ({ opacity: 0, x: d * -30, scale: 0.97 }),
  };

  return (
    <footer className="w-full relative overflow-hidden flex flex-col mt-auto bg-background">
      {/* Divider line */}
      <div
        className="w-full h-px mx-auto"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--border-muted) 20%, var(--border-muted) 80%, transparent)",
          maxWidth: "900px",
        }}
      />

      <div className="relative w-full max-w-4xl mx-auto py-6 sm:py-8 md:py-10 px-4 sm:px-6 flex items-center justify-center">
        {/* Left */}
        <div className="absolute left-2 sm:left-6 z-10 flex flex-col items-center gap-1 sm:gap-2">
          <button
            onClick={hasPrev ? handlePrev : undefined}
            disabled={!hasPrev}
            className={`p-1.5 sm:p-2 border border-transparent transition-all duration-300 ${
              hasPrev
                ? "hover:border-[var(--accent-terracotta)] hover:text-[var(--accent-terracotta)]"
                : "opacity-20 cursor-not-allowed hidden sm:block"
            }`}
            aria-label="Previous quote"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" strokeWidth={1.5} />
          </button>
          <span className="hidden sm:block text-[9px] font-mono text-muted-foreground tracking-widest">
            [A]
          </span>
        </div>

        {/* Quote */}
        <div className="w-full px-10 sm:px-16 md:px-24 overflow-hidden relative z-0 flex items-center">
          {/* Hidden sizer: renders the tallest quote to reserve consistent height */}
          <div
            className="w-full flex flex-col items-center invisible"
            aria-hidden="true"
          >
            <p
              className="font-serif font-normal text-lg sm:text-xl md:text-2xl tracking-[0.04em] leading-relaxed max-w-3xl break-words px-4 text-center"
              style={{ fontStyle: "italic" }}
            >
              {longestQuote.map((line, i) => (
                <span
                  key={i}
                  className={`block last:mb-0 ${
                      i === 0 && longestQuote.length > 1
                        ? "mb-4"
                        : i > 0
                          ? "text-muted-foreground font-light text-base sm:text-lg md:text-xl"
                          : ""
                    }`}
                >
                  {line}
                </span>
              ))}
            </p>
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
              className="absolute inset-0 w-full flex flex-col items-center justify-center"
            >
              <p
                className="font-serif font-normal text-lg sm:text-xl md:text-2xl text-foreground tracking-[0.04em] leading-relaxed max-w-3xl break-words px-4 text-center"
                style={{ fontStyle: "italic" }}
              >
                {lines.map((line, i) => (
                  <span
                    key={i}
                    className={`block last:mb-0 ${
                      i === 0 && lines.length > 1
                        ? "mb-4"
                        : i > 0
                          ? "text-muted-foreground font-light text-base sm:text-lg md:text-xl"
                          : ""
                    }`}
                  >
                    {line}
                  </span>
                ))}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right */}
        <div className="absolute right-2 sm:right-6 z-10 flex flex-col items-center gap-1 sm:gap-2">
          <button
            onClick={hasNext ? handleNext : undefined}
            disabled={!hasNext}
            className={`p-1.5 sm:p-2 border border-transparent transition-all duration-300 ${
              hasNext
                ? "hover:border-[var(--accent-sage)] hover:text-[var(--accent-sage)]"
                : "opacity-20 cursor-not-allowed hidden sm:block"
            }`}
            aria-label="Next quote"
          >
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" strokeWidth={1.5} />
          </button>
          <span className="hidden sm:block text-[9px] font-mono text-muted-foreground tracking-widest">
            [D]
          </span>
        </div>
      </div>

      <div className="pb-3 text-center font-mono text-[0.6rem] tracking-widest text-muted-foreground opacity-40 uppercase">
        Today is {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} | {currentQuote.index + 1} / {QUOTES_ARRAY.length}
      </div>
    </footer>
  );
};

export default Footer;
