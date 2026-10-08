import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { QUOTES_ARRAY } from "../lib/consts";
import { shouldIgnoreKey } from "@/lib/keybindings";

const BUILD_DATE: string =
  import.meta.env.VITE_BUILD_DATE || new Date().toISOString().slice(0, 10);

const BADGES = ["keyboard first", "no tracking", "built with vite"];

function initQuote(list: string[]) {
  const r = Math.floor(Math.random() * list.length);
  return { index: r, content: list[r] };
}

const Footer = () => {
  const [currentQuote, setCurrentQuote] = useState(() => initQuote(QUOTES_ARRAY));

  const handlePrev = useCallback(() => {
    setCurrentQuote((prev) => {
      if (prev.index <= 0) return prev;
      const i = prev.index - 1;
      return { index: i, content: QUOTES_ARRAY[i] };
    });
  }, []);

  const handleNext = useCallback(() => {
    setCurrentQuote((prev) => {
      if (prev.index >= QUOTES_ARRAY.length - 1) return prev;
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
    <footer className="colophon sheet">
      <div>
        <b>Status</b>
        <span className="colophon__status" aria-hidden="true" />
        building · last build {BUILD_DATE}
        <div className="colophon__badges">
          {BADGES.map((badge, i) => (
            <span key={badge} className={`badge${i === 0 ? " badge--acc" : ""}`}>
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div>
        <b>
          Quote {currentQuote.index + 1} / {QUOTES_ARRAY.length}
        </b>
        <blockquote className="colophon__quote" aria-live="polite">
          {lines.map((line, i) => (
            <span key={i} className={i > 0 ? "colophon__quote-tr" : undefined}>
              {line}
            </span>
          ))}
        </blockquote>
        <div className="colophon__controls">
          <button type="button" onClick={handlePrev} disabled={!hasPrev} aria-label="Previous quote">
            <kbd>a</kbd>prev
          </button>
          <button type="button" onClick={handleNext} disabled={!hasNext} aria-label="Next quote">
            <kbd>d</kbd>next
          </button>
        </div>
      </div>

      <div>
        <b>Colophon</b>
        Set in Barlow Condensed, IBM Plex Mono, Newsreader. Built with React and Vite. No
        analytics.
        <div className="colophon__links">
          <a href="https://github.com/kygura" target="_blank" rel="noopener noreferrer">
            github / kygura
          </a>
          <Link to="/guestbook">sign the guestbook</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
