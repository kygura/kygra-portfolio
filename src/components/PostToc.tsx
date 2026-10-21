import { useEffect, useState, type MouseEvent, type RefObject } from "react";

type TocItem = {
  id: string;
  text: string;
  depth: 2 | 3;
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

  // Give every section heading a unique id and collect the outline.
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const seen = new Map<string, number>();
    const headings = Array.from(article.querySelectorAll<HTMLHeadingElement>("h2, h3"));
    const next = headings.map((heading) => {
      const text = heading.textContent?.trim() ?? "";
      const base = slugify(text);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      heading.id = count ? `${base}-${count}` : base;
      return { id: heading.id, text, depth: heading.tagName === "H3" ? 3 : 2 } as TocItem;
    });

    setItems(next);
    setActiveId(next[0]?.id ?? null);
  }, [articleRef, contentKey]);

  // The active section is the last heading scrolled past the upper third.
  useEffect(() => {
    if (items.length === 0) return;

    const update = () => {
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
  }, [items]);

  if (items.length < 2) return null;

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
        {items.map((item) => (
          <span
            key={item.id}
            className="post-toc__dash"
            data-depth={item.depth}
            data-active={item.id === activeId}
          />
        ))}
      </div>
      <div className="post-toc__panel">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="post-toc__link"
            data-depth={item.depth}
            data-active={item.id === activeId}
            aria-current={item.id === activeId ? "location" : undefined}
            onClick={(event) => jumpTo(event, item.id)}
          >
            {item.text}
          </a>
        ))}
      </div>
    </nav>
  );
};

export default PostToc;
