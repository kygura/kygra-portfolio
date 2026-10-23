import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shuffle } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useMarkdownPosts } from "../hooks/useMarkdownPosts";
import { resolvePostTags } from "../lib/postTagFallbacks";
import { makeRidge, makeSigil } from "../lib/terrain";
import { isTyping } from "../theme/keymap";
import type { PostSummary } from "../../content/posts";

/**
 * Writings as a survey of terrain. The ridge up top plots every essay as a
 * summit in the order it was written, its height the time it takes to read;
 * below, each essay gets a plate with a contour sigil seeded from its slug.
 * Hovering either one marks the same essay in both. `r` drifts to a random one.
 */

const W = 1000;
const H = 300;
const BASE = 262;
const WORDS_PER_MIN = 200;

const num = (n: number) => String(n).padStart(2, "0");

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${num(d.getUTCDate())}.${num(d.getUTCMonth() + 1)}`;
};

const longDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getUTCFullYear()}·${num(d.getUTCMonth() + 1)}·${num(d.getUTCDate())}`;
};

const monthYear = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
};

// Notion excerpts keep wiki-link brackets; they read as noise in a preview.
const cleanExcerpt = (text: string) => text.replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\s\]\s/g, " ");

const byDate = (a: PostSummary, b: PostSummary) => a.date.localeCompare(b.date);

const Sigil = ({ post }: { post: PostSummary }) => {
  const { rings, summit } = useMemo(() => makeSigil(post.slug, post.readTime), [post.slug, post.readTime]);
  return (
    <svg className="sigil" viewBox="0 0 100 100" aria-hidden="true">
      {rings.map((ring, i) => (
        <path
          key={i}
          d={ring.d}
          className={i === rings.length - 1 ? "sigil__ring sigil__ring--top" : "sigil__ring"}
          style={{ "--i": i, "--spin": `${(i % 2 ? -1 : 1) * (40 + i * 9)}s` } as React.CSSProperties}
        />
      ))}
      <path className="sigil__mark" d={`M${summit.x - 3} ${summit.y}h6M${summit.x} ${summit.y - 3}v6`} />
    </svg>
  );
};

const Meter = ({ value, max }: { value: number; max: number }) => (
  <span className="plate__meter" aria-hidden="true">
    {Array.from({ length: max }, (_, i) => (
      <i key={i} className={i < value ? "is-on" : undefined} />
    ))}
  </span>
);

const Writings = () => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { posts, loading, error } = useMarkdownPosts();
  const still = Boolean(useReducedMotion());
  const navigate = useNavigate();

  // Chronological order numbers the essays: № 01 is the first one written.
  const chrono = useMemo(() => [...posts].sort(byDate), [posts]);
  const order = useMemo(() => new Map(chrono.map((p, i) => [p.slug, i])), [chrono]);
  const maxRead = Math.max(1, ...posts.map((p) => p.readTime));
  const totalRead = posts.reduce((sum, p) => sum + p.readTime, 0);

  const ridge = useMemo(
    () =>
      makeRidge(
        chrono.map((p) => 0.18 + (p.readTime / maxRead) * 0.82),
        chrono.map((p) => p.slug).join("|"),
        { width: W, height: H, padX: 24, padTop: 54, base: BASE },
      ),
    [chrono, maxRead],
  );

  const allTags = useMemo(
    () => Array.from(new Set(posts.flatMap((post) => resolvePostTags(post)))),
    [posts],
  );
  const matches = (post: PostSummary) => !selectedTag || resolvePostTags(post).includes(selectedTag);
  const filteredPosts = posts.filter(matches);

  // The ridge readout follows hover and focus; at rest it shows the latest essay.
  const [active, setActive] = useState<number | null>(null);
  const shown = active ?? chrono.length - 1;
  const current = chrono[shown];

  const [drifting, setDrifting] = useState(false);
  const driftTimer = useRef(0);
  const drift = () => {
    const pool = chrono.filter(matches);
    if (pool.length === 0 || drifting) return;
    const target = pool[Math.floor(Math.random() * pool.length)];
    if (still) {
      navigate(`/writings/${target.slug}`);
      return;
    }
    // Skim across a few summits before landing, like a needle settling.
    setDrifting(true);
    let ticks = 0;
    const tick = () => {
      ticks += 1;
      if (ticks >= 9) {
        setActive(order.get(target.slug) ?? null);
        driftTimer.current = window.setTimeout(() => navigate(`/writings/${target.slug}`), 380);
        return;
      }
      setActive(Math.floor(Math.random() * chrono.length));
      driftTimer.current = window.setTimeout(tick, 60 + ticks * 14);
    };
    tick();
  };
  const driftRef = useRef(drift);
  driftRef.current = drift;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "r" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return;
      e.preventDefault();
      driftRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(driftTimer.current);
    };
  }, []);

  const peakRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const onPeakKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : chrono.length - 1)) % chrono.length;
    peakRefs.current[next]?.focus();
  };

  const spotlight = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  const step = (W - 48) / Math.max(1, chrono.length);
  const bands = Array.from({ length: Math.ceil(BASE / 12) }, (_, i) => BASE - i * 12);

  return (
    <div className={`page-shell page-shell--wide animate-fade-in writings${still ? " is-still" : ""}`}>
      <div className="mb-10 sm:mb-14 pb-6 sm:pb-8 border-b border-[var(--border-muted)] relative">
        <p className="font-pixel text-[10.5px] tracking-[0.08em] uppercase text-[var(--accent)] mb-6">
          ( 01 &mdash; WRITINGS )
        </p>
        <h1 className="text-5xl md:text-7xl font-display text-foreground tracking-[-0.01em] leading-[0.85] uppercase mb-4 relative z-10">
          Writings
        </h1>
        <p className="text-lg md:text-xl text-foreground max-w-2xl leading-relaxed relative z-10">
          Thoughts on the arts, engineering, the esoteric and the existential.
        </p>
        {chrono.length > 0 && (
          <p className="repo-index__stamp">
            <span>{chrono.length} essays</span>
            <span aria-hidden="true">/</span>
            <span>{totalRead} min of reading</span>
            <span aria-hidden="true">/</span>
            <span>
              {monthYear(chrono[0].date)} &ndash; {monthYear(chrono[chrono.length - 1].date)}
            </span>
          </p>
        )}
      </div>

      {chrono.length > 0 && (
        <section className="atlas" aria-label="Essays plotted by date and length">
          <div className="atlas__head">
            <span>Elevation profile</span>
            <span>height = reading time</span>
          </div>

          <div className="atlas__stage" onPointerLeave={() => !drifting && setActive(null)}>
            <svg className="atlas__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <clipPath id="atlas-ground">
                  <path d={ridge.area} />
                </clipPath>
                <linearGradient id="atlas-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--accent)" stopOpacity="0.16" />
                  <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {ridge.backs.map((d, i) => (
                <path key={i} d={d} className={`atlas__back atlas__back--${i}`} pathLength={1} />
              ))}
              <path d={ridge.area} className="atlas__area" />
              <g clipPath="url(#atlas-ground)" className="atlas__bands">
                {bands.map((y) => (
                  <line key={y} x1="0" x2={W} y1={y} y2={y} />
                ))}
              </g>
              <path d={ridge.line} className="atlas__line" pathLength={1} />
              <line x1="0" x2={W} y1={BASE} y2={BASE} className="atlas__base" />
            </svg>

            {chrono.map((post, i) => {
              const peak = ridge.peaks[i];
              return (
                <Link
                  key={post.slug}
                  ref={(el) => (peakRefs.current[i] = el)}
                  to={`/writings/${post.slug}`}
                  className={`atlas__peak${shown === i ? " is-active" : ""}${matches(post) ? "" : " is-dim"}`}
                  style={
                    {
                      left: `${((24 + step * i) / W) * 100}%`,
                      width: `${(step / W) * 100}%`,
                      "--top": `${(peak.y / H) * 100}%`,
                      "--base": `${(BASE / H) * 100}%`,
                      "--d": `${0.5 + i * 0.07}s`,
                    } as React.CSSProperties
                  }
                  aria-label={`№ ${num(i + 1)}: ${post.title}, ${post.readTime} min read`}
                  onPointerEnter={() => !drifting && setActive(i)}
                  onFocus={() => setActive(i)}
                  onKeyDown={(e) => onPeakKey(e, i)}
                >
                  <span className="atlas__drop" aria-hidden="true" />
                  <span className="atlas__flag" aria-hidden="true">
                    {num(i + 1)}
                  </span>
                  <span className="atlas__marker" aria-hidden="true" />
                  <span className="atlas__tick" aria-hidden="true">
                    {shortDate(post.date)}
                  </span>
                </Link>
              );
            })}
          </div>

          {current && (
            <div className="atlas__readout" aria-live="polite">
              <p className="atlas__readout-meta">
                <span className="atlas__readout-no">№ {num(shown + 1)}</span>
                <span>{longDate(current.date)}</span>
                <span>
                  {current.readTime} min &middot; &asymp;{(current.readTime * WORDS_PER_MIN).toLocaleString("en-US")} words
                </span>
              </p>
              <p className="atlas__readout-title">{current.title}</p>
            </div>
          )}
        </section>
      )}

      <div className="writings__controls">
        <div className="flex flex-wrap gap-2 sm:gap-3" role="group" aria-label="Filter by tag">
          {[null, ...allTags].map((tag) => (
            <button
              key={tag ?? "all"}
              type="button"
              aria-pressed={selectedTag === tag}
              onClick={() => setSelectedTag(tag)}
              className={`font-mono text-[11px] tracking-[0.16em] px-3 py-1 border transition-colors uppercase ${
                selectedTag === tag
                  ? "bg-accent border-accent text-accent-foreground"
                  : "border-foreground/40 text-foreground/60 hover:border-accent hover:text-accent bg-transparent"
              }`}
            >
              {tag ?? "All"}
            </button>
          ))}
        </div>
        <button type="button" className="writings__drift" onClick={drift} disabled={drifting} title="Open a random essay">
          <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
          {drifting ? "Drifting…" : "Drift"}
          <kbd>r</kbd>
        </button>
      </div>

      {loading && (
        <div className="border border-dashed border-foreground/30 px-6 py-8 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Loading writings...
        </div>
      )}

      {error && !loading && (
        <div className="border border-destructive px-6 py-8 text-sm uppercase tracking-[0.2em] text-destructive">
          {error}
        </div>
      )}

      <ol className="plates">
        {filteredPosts.map((post, index) => {
          const n = order.get(post.slug) ?? 0;
          const tags = resolvePostTags(post).slice(0, 3);
          return (
            <li
              key={post.slug}
              className={`plate${index === 0 && !selectedTag ? " plate--lead" : ""}${active === n ? " is-marked" : ""}`}
              style={{ animationDelay: `${index * 70}ms` }}
              onPointerMove={spotlight}
              onPointerEnter={() => !drifting && setActive(n)}
              onPointerLeave={() => !drifting && setActive(null)}
            >
              <Link to={`/writings/${post.slug}`} className="plate__link" onFocus={() => setActive(n)}>
                <span className="plate__crops" aria-hidden="true" />
                <p className="plate__meta">
                  <span className="plate__no">№ {num(n + 1)}</span>
                  <span>{longDate(post.date)}</span>
                </p>
                <Sigil post={post} />
                <h2 className="plate__title">{post.title}</h2>
                {post.excerpt && <p className="plate__excerpt">{cleanExcerpt(post.excerpt)}</p>}
                <p className="plate__foot">
                  <Meter value={post.readTime} max={maxRead} />
                  <span>{post.readTime} min</span>
                  {tags.map((tag) => (
                    <span key={tag} className="plate__tag">
                      {tag}
                    </span>
                  ))}
                </p>
              </Link>
            </li>
          );
        })}
      </ol>

      {!loading && !error && filteredPosts.length === 0 && (
        <div className="border border-dashed border-foreground/30 px-6 py-8 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          No writings found.
        </div>
      )}
    </div>
  );
};

export default Writings;
