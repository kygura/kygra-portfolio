import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import TocTuner from "./TocTuner";

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

// Bars sit evenly down the rail, each centred in its own slot.
const barAt = (i: number, n: number) => (i + 0.5) / n;

// A press that travels less than this is a click, not a drag.
const DRAG_SLOP = 3;
// Within this many pixels of a bar, a click lands exactly on its heading.
const SNAP_PX = 7;
// One arrow press scrolls this share of the viewport.
const STEP_VH = 0.12;

// The contents sheet's open state is a per-viewer preference.
const OPEN_KEY = "post-toc-open";
const readOpen = () => {
  try {
    return localStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
};

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PostToc = ({ articleRef, contentKey }: PostTocProps) => {
  const [items, setItems] = useState<TocItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [open, setOpen] = useState(readOpen);
  const navRef = useRef<HTMLElement>(null);
  const readoutRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const press = useRef<{ y: number; moved: boolean; pointerId: number } | null>(null);

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
  }, [articleRef, contentKey]);

  /*
   * The rail is a piecewise-linear map of the article. Its top is where the
   * article starts, each bar is where its heading reaches the top of the
   * viewport, and its bottom is the end of the article. Between two bars the
   * rail scrolls linearly through that stretch of text, so a drag is as fine
   * as the pointer and still lands on headings exactly at the bars.
   */
  const anchors = useCallback(() => {
    const article = articleRef.current;
    if (!article || items.length === 0) return null;

    const vh = window.innerHeight;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    const box = article.getBoundingClientRect();
    const top = box.top + window.scrollY;
    const start = Math.min(maxScroll, Math.max(0, top - vh * 0.3));
    const end = Math.min(maxScroll, Math.max(start, top + box.height - vh * 0.7));

    const fs = [0];
    const ss = [start];
    items.forEach((item, i) => {
      const el = document.getElementById(item.id);
      const margin = el ? parseFloat(getComputedStyle(el).scrollMarginTop) || 0 : 0;
      const at = el ? el.getBoundingClientRect().top + window.scrollY - margin : start;
      fs.push(barAt(i, items.length));
      // Clamp into range and keep the map monotonic.
      ss.push(Math.min(end, Math.max(ss[ss.length - 1], at)));
    });
    fs.push(1);
    ss.push(end);
    return { fs, ss };
  }, [articleRef, items]);

  const scrollForFraction = useCallback(
    (f: number) => {
      const map = anchors();
      if (!map) return 0;
      const { fs, ss } = map;
      for (let k = 0; k < fs.length - 1; k++) {
        if (f <= fs[k + 1]) {
          const t = (f - fs[k]) / Math.max(1e-6, fs[k + 1] - fs[k]);
          return ss[k] + t * (ss[k + 1] - ss[k]);
        }
      }
      return ss[ss.length - 1];
    },
    [anchors],
  );

  const fractionForScroll = useCallback(
    (s: number) => {
      const map = anchors();
      if (!map) return 0;
      const { fs, ss } = map;
      if (s <= ss[0]) return 0;
      // The last anchor at or above s; ties resolve to the furthest one.
      let k = 0;
      for (let j = 0; j < ss.length; j++) if (ss[j] <= s) k = j;
      if (k >= ss.length - 1) return 1;
      return fs[k] + ((s - ss[k]) / (ss[k + 1] - ss[k])) * (fs[k + 1] - fs[k]);
    },
    [anchors],
  );

  // Progress is where the page sits on that map.
  useEffect(() => {
    if (items.length === 0) return;

    const update = () => setProgress(fractionForScroll(window.scrollY));

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // Late images shift the headings; re-measure when the article resizes.
    const observer = new ResizeObserver(update);
    if (articleRef.current) observer.observe(articleRef.current);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [items, articleRef, fractionForScroll]);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      // Storage blocked: the sheet just won't be remembered.
    }
    if (!open) {
      // The sheet hid with focus inside it: hand focus back to the toggle.
      if (panelRef.current?.contains(document.activeElement)) readoutRef.current?.focus();
      return;
    }
    // A press anywhere outside the rail and sheet closes the sheet.
    const onDown = (event: globalThis.PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const goTo = useCallback((top: number, smooth: boolean) => {
    window.scrollTo({ top, behavior: smooth && !prefersReducedMotion() ? "smooth" : "instant" });
  }, []);

  const jumpToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  const fractionAtPointer = (clientY: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return 0;
    return Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    press.current = { y: event.clientY, moved: false, pointerId: event.pointerId };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.pointerId !== event.pointerId) return;
    if (!p.moved && Math.abs(event.clientY - p.y) < DRAG_SLOP) return;
    if (!p.moved) {
      p.moved = true;
      setScrubbing(true);
    }
    goTo(scrollForFraction(fractionAtPointer(event.clientY)), false);
  };

  const endPress = (event: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.pointerId !== event.pointerId) return;
    press.current = null;
    setScrubbing(false);
    if (p.moved || event.type === "pointercancel") return;

    // A click: snap to the nearest bar when close, else land where pressed.
    const rect = trackRef.current?.getBoundingClientRect();
    const f = fractionAtPointer(event.clientY);
    if (rect) {
      const nearest = Math.min(items.length - 1, Math.max(0, Math.round(f * items.length - 0.5)));
      const barY = barAt(nearest, items.length) * rect.height;
      if (Math.abs(barY - f * rect.height) <= SNAP_PX) {
        jumpToId(items[nearest].id);
        return;
      }
    }
    goTo(scrollForFraction(f), true);
  };

  if (items.length < 2) return null;

  // The current section is the last bar the page has reached.
  let activeIndex = 0;
  items.forEach((_, i) => {
    if (barAt(i, items.length) <= progress + 1e-4) activeIndex = i;
  });
  const active = items[activeIndex];
  const sectionCount = items.filter((item) => item.num).length;
  const activeNum =
    items
      .slice(0, activeIndex + 1)
      .reverse()
      .find((item) => item.num)?.num ?? "01";

  // Keyboard: arrows step through the text, page keys hop between headings.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = window.innerHeight * STEP_VH * (event.shiftKey ? 3 : 1);
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        goTo(window.scrollY + step, true);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        goTo(window.scrollY - step, true);
        break;
      case "PageDown":
      case "]":
        if (activeIndex < items.length - 1) jumpToId(items[activeIndex + 1].id);
        else goTo(scrollForFraction(1), true);
        break;
      case "PageUp":
      case "[": {
        // From inside a section, the first press returns to its heading.
        const here = document.getElementById(active.id);
        const into = here ? here.getBoundingClientRect().top < -8 : false;
        if (into) jumpToId(active.id);
        else if (activeIndex > 0) jumpToId(items[activeIndex - 1].id);
        else goTo(scrollForFraction(0), true);
        break;
      }
      case "Home":
        goTo(scrollForFraction(0), true);
        break;
      case "t":
        setOpen((o) => !o);
        break;
      case "End":
        goTo(scrollForFraction(1), true);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const linkClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    jumpToId(id);
  };

  const onNavKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && open) {
      setOpen(false);
      event.stopPropagation();
    }
  };

  const pct = Math.round(progress * 100);

  return (
    <nav
      ref={navRef}
      className="post-toc"
      aria-label="On this page"
      data-scrubbing={scrubbing || undefined}
      data-open={open || undefined}
      onKeyDown={onNavKeyDown}
    >
      <button
        type="button"
        ref={readoutRef}
        className="post-toc__readout"
        aria-expanded={open}
        aria-controls="post-toc-sheet"
        title={open ? "Hide contents (t)" : "Show contents (t)"}
        onClick={() => setOpen((o) => !o)}
      >
        {activeNum}
        <span>/{String(sectionCount).padStart(2, "0")}</span>
        <span className="post-toc__caret" aria-hidden="true" />
      </button>
      <div
        className="post-toc__rail"
        role="slider"
        tabIndex={0}
        aria-label="Reading position"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${active.num ? `Section ${active.num}: ` : ""}${active.text}, ${pct}%`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onKeyDown={onKeyDown}
      >
        <span
          ref={trackRef}
          className="post-toc__track"
          aria-hidden="true"
          style={{ "--n": items.length } as CSSProperties}
        >
          <span className="post-toc__fill" style={{ transform: `scaleY(${progress})` }} />
          {items.map((item, i) => {
            const state = {
              "data-depth": item.depth,
              "data-active": i === activeIndex,
              "data-passed": i < activeIndex,
              style: { top: `${barAt(i, items.length) * 100}%` },
            };
            return (
              <span key={item.id}>
                <span className="post-toc__label" title={item.text} {...state}>
                  {item.text}
                </span>
                <span className="post-toc__bar" {...state} />
              </span>
            );
          })}
          <span className="post-toc__head-mark" style={{ top: `${progress * 100}%` }} />
        </span>
        <span className="post-toc__pct" aria-hidden="true">
          {pct}%
        </span>
      </div>

      <div ref={panelRef} className="post-toc__panel" id="post-toc-sheet" aria-hidden={!open}>
        <p className="post-toc__head">
          <span>( Contents )</span>
          <span className="post-toc__read">{pct}%</span>
          <button
            type="button"
            className="post-toc__close"
            aria-label="Hide contents"
            tabIndex={open ? undefined : -1}
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </p>
        <ol className="post-toc__list">
          {items.map((item, i) => (
            <li key={item.id} style={{ "--i": i } as CSSProperties}>
              <a
                href={`#${item.id}`}
                className="post-toc__link"
                tabIndex={open ? undefined : -1}
                data-depth={item.depth}
                data-active={i === activeIndex}
                aria-current={i === activeIndex ? "location" : undefined}
                onClick={(event) => linkClick(event, item.id)}
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
        <p className="post-toc__keys" aria-hidden="true">
          drag rail · ↑↓ scroll · [ ] section · t toggle
        </p>
      </div>
      <TocTuner target={navRef} />
    </nav>
  );
};

export default PostToc;
