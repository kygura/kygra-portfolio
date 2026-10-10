import { useCallback, useEffect, useState } from "react";
import { QUOTES_ARRAY } from "../lib/consts";

function initQuote(list: string[]) {
  const r = Math.floor(Math.random() * list.length);
  return { index: r, content: list[r] };
}

const Footer = () => {
  const [quote, setQuote] = useState(() => initQuote(QUOTES_ARRAY));

  const prev = useCallback(() => {
    setQuote((q) => (q.index <= 0 ? q : { index: q.index - 1, content: QUOTES_ARRAY[q.index - 1] }));
  }, []);
  const next = useCallback(() => {
    setQuote((q) =>
      q.index >= QUOTES_ARRAY.length - 1 ? q : { index: q.index + 1, content: QUOTES_ARRAY[q.index + 1] }
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "a" || e.key === "A") prev();
      else if (e.key === "d" || e.key === "D") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  const [line, translation] = quote.content.split("<br>");
  const year = new Date().getFullYear();

  return (
    <footer className="mono">
      <div className="colophon">
        <div>
          <b>Colophon</b>
          <ul>
            <li>Big Shoulders · Newsreader · Space Mono</li>
            <li>Vite · React · Vercel</li>
            <li>Hand-coded, no analytics, no cookies</li>
            <li>Press ` for the terminal</li>
          </ul>
        </div>
        <div>
          <b>Elsewhere</b>
          <ul>
            <li><a href="https://github.com/kygura" target="_blank" rel="noopener noreferrer">GitHub ↗</a></li>
            <li><a href="mailto:ncerratoanton@gmail.com">Mail ↗</a></li>
            <li><a href="/CV_NCA.pdf" target="_blank" rel="noopener noreferrer">CV as PDF ↗</a></li>
          </ul>
        </div>
        <div>
          <b>Margin note · {quote.index + 1}/{QUOTES_ARRAY.length}</b>
          <p className="colophon__quote">
            {line}
            {translation && <small>{translation}</small>}
          </p>
          <div className="colophon__keys">
            <button type="button" onClick={prev} disabled={quote.index === 0} aria-label="Previous quote">[A] prev</button>
            <button type="button" onClick={next} disabled={quote.index === QUOTES_ARRAY.length - 1} aria-label="Next quote">next [D]</button>
          </div>
        </div>
        <div>
          <b>Badges</b>
          <div className="badges">
            <span className="badge">HAND<br />CODED</span>
            <span className="badge badge--spot">NO<br />TRACKING</span>
            <span className="badge">MÁLAGA<br />ES</span>
            <span className="badge">88 × 31</span>
          </div>
        </div>
      </div>
      <div className="colophon__end">
        <span>© {year} Nicolás Cerrato Anton</span>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑ top</button>
      </div>
    </footer>
  );
};

export default Footer;
