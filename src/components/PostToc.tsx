import { useEffect, useState, type CSSProperties, type MouseEvent, type RefObject } from "react";

type TocItem = {
  id: string;
  text: string;
  depth: 2 | 3;
  /** Running section number, h2s only: "01", "02"… */
  num?: string;
};

type PostTocProps = {
  articleRef: RefObject<HTMLElement>;
  // Re-scan headings when the rendered post changes.
  contentKey: string;
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

const PostToc = ({ articleRef, contentKey }: PostTocProps) => {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Give every section heading a unique id and collect the outline.
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const seen = new Map<string, number>();
    let sections = 0;
    const headings = Array.from(article.querySelectorAll<HTMLHeadingElement>("h2, h3"));
    const next = headings.map((heading) => {
      const text = heading.textContent?.trim() ?? "";
      const base = slugify(text);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      heading.id = count ? `${base}-${count}` : base;
      const depth = heading.tagName === "H3" ? 3 : 2;
      const num = depth === 2 ? String(++sections).padStart(2, "0") : undefined;
      return { id: heading.id, text, depth, num } as TocItem;
    });

    setItems(next);
    setActiveId(next[0]?.id ?? null);
  }, [articleRef, contentKey]);

  // The active section is the last heading scrolled past the upper third;
  // progress is how much of the article has scrolled past that same line.
  useEffect(() => {
    if (items.length === 0) return;

    const update = () => {
      const article = articleRef.current;
      if (article) {
        const box = article.getBoundingClientRect();
        const read = (window.innerHeight * 0.3 - box.top) / Math.max(1, box.height - window.innerHeight * 0.4);
        setProgress(Math.min(1, Math.max(0, read)));
      }

      const threshold = window.innerHeight * 0.3;
      let current = items[0].id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= threshold) current = item.id;
      }
      setActiveId(current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items, articleRef]);

  if (items.length < 2) return null;

  const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeId));
  const sectionCount = items.filter((item) => item.num).length;
  const activeNum =
    items
      .slice(0, activeIndex + 1)
      .reverse()
      .find((item) => item.num)?.num ?? "01";

  const jumpTo = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActiveId(id);
  };

  return (
    <nav className="post-toc" aria-label="On this page">
      <div className="post-toc__rail" aria-hidden="true">
        <span className="post-toc__readout">
          {activeNum}
          <span>/{String(sectionCount).padStart(2, "0")}</span>
        </span>
        <span className="post-toc__track">
          <span className="post-toc__fill" style={{ transform: `scaleY(${progress})` }} />
          {items.map((item, i) => (
            <span
              key={item.id}
              className="post-toc__tick"
              data-depth={item.depth}
              data-active={item.id === activeId}
              data-passed={i < activeIndex}
            >
              {item.id === activeId && item.num && <span className="post-toc__tick-num">{item.num}</span>}
            </span>
          ))}
        </span>
      </div>

      <div className="post-toc__panel">
        <p className="post-toc__head">
          <span>( Contents )</span>
          <span className="post-toc__pct">{Math.round(progress * 100)}% read</span>
        </p>
        <ol className="post-toc__list">
          {items.map((item, i) => (
            <li key={item.id} style={{ "--i": i } as CSSProperties}>
              <a
                href={`#${item.id}`}
                className="post-toc__link"
                data-depth={item.depth}
                data-active={item.id === activeId}
                aria-current={item.id === activeId ? "location" : undefined}
                onClick={(event) => jumpTo(event, item.id)}
              >
                <span className="post-toc__cur" aria-hidden="true">&gt;</span>
                <span className="post-toc__num" aria-hidden="true">
                  {item.num ?? "\u2514"}
                </span>
                <span className="post-toc__text">{item.text}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
};

export default PostToc;
