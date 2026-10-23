import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMarkdownPosts } from "../hooks/useMarkdownPosts";
import { resolvePostTags } from "../lib/postTagFallbacks";
import { sortPostsByDateDesc } from "../../content/posts";

type SortKey = "newest" | "oldest" | "shortest";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "shortest", label: "Shortest" },
];

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Date stamp in the card's corner, e.g. "05 APR 26". Empty when the post has no date.
const stamp = (date: string) => {
  const d = new Date(date);
  if (!date || Number.isNaN(d.getTime())) return "";
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
};

const pad = (n: number) => String(n).padStart(3, "0");

const Writings = () => {
  const { posts, loading, error } = useMarkdownPosts();
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState<SortKey>("newest");

  // Catalogue numbers follow the order posts were written, oldest = 001, so a
  // card keeps its number whichever drawer or sort it is seen under.
  const catalogue = useMemo(() => {
    const oldestFirst = sortPostsByDateDesc(posts).reverse();
    return new Map(oldestFirst.map((post, i) => [post.slug, i + 1]));
  }, [posts]);

  const drawers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const tag of resolvePostTags(post)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [posts]);

  const requested = params.get("tag");
  const selectedTag = requested && drawers.some(([tag]) => tag === requested) ? requested : null;

  const openDrawer = (tag: string | null) => {
    const next = new URLSearchParams(params);
    if (tag) next.set("tag", tag);
    else next.delete("tag");
    setParams(next, { replace: true });
  };

  const cards = useMemo(() => {
    const inDrawer = selectedTag
      ? posts.filter((post) => resolvePostTags(post).includes(selectedTag))
      : posts;
    const byDate = sortPostsByDateDesc(inDrawer);
    if (sort === "oldest") return byDate.reverse();
    if (sort === "shortest") return [...byDate].sort((a, b) => a.readTime - b.readTime);
    return byDate;
  }, [posts, selectedTag, sort]);

  const totalMinutes = cards.reduce((sum, post) => sum + post.readTime, 0);
  const tabs: [string | null, number][] = [[null, posts.length], ...drawers];

  return (
    <div className="page-shell page-shell--wide animate-fade-in">
      <div className="mb-10 sm:mb-14 pb-6 sm:pb-8 border-b border-[var(--border-muted)] relative">
        <p className="font-pixel text-[10.5px] tracking-[0.08em] uppercase text-[var(--accent)] mb-6">
          ( 01 &mdash; WRITINGS )
        </p>
        <h1 className="text-5xl md:text-7xl font-display text-foreground tracking-[-0.01em] leading-[0.85] uppercase mb-4 relative z-10">Writings</h1>
        <p className="text-lg md:text-xl text-foreground max-w-2xl leading-relaxed relative z-10">
          Thoughts on the arts, engineering, the esoteric and the existential.
        </p>
      </div>

      <section className="cabinet" aria-label="Writings catalogue">
        <div className="cabinet__tabs" role="tablist" aria-label="Filter by subject">
          {tabs.map(([tag, count], i) => {
            const active = tag === selectedTag;
            return (
              <button
                key={tag ?? "all"}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="cabinet-drawer"
                className={`cabinet__tab${active ? " is-active" : ""}`}
                style={{ ["--tab-y" as string]: `${(i % 3) * 2}px` }}
                onClick={() => openDrawer(tag)}
              >
                <span className="cabinet__tab-label">{tag ?? "All"}</span>
                <span className="cabinet__tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div id="cabinet-drawer" className="cabinet__drawer" role="tabpanel">
          <div className="cabinet__label">
            <div className="cabinet__label-plate">
              <span className="cabinet__label-eyebrow">Drawer</span>
              <span className="cabinet__label-name">{selectedTag ?? "Complete index"}</span>
            </div>
            <p className="cabinet__label-meta">
              {cards.length} {cards.length === 1 ? "card" : "cards"} &middot; {totalMinutes} min
            </p>
            <div className="cabinet__sort" role="group" aria-label="Sort cards">
              {SORTS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={sort === key}
                  className={`cabinet__sort-btn${sort === key ? " is-active" : ""}`}
                  onClick={() => setSort(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading && <p className="cabinet__empty">Loading writings...</p>}
          {error && !loading && <p className="cabinet__empty cabinet__empty--error">{error}</p>}

          <ol className="cabinet__cards" key={`${selectedTag ?? "all"}-${sort}`}>
            {cards.map((post, index) => {
              const tags = resolvePostTags(post);
              const date = stamp(post.date);
              return (
                <li key={post.slug} className="index-card" style={{ ["--card-i" as string]: index }}>
                  <div className="index-card__head">
                    <span className="index-card__no">&#8470; {pad(catalogue.get(post.slug) ?? 0)}</span>
                    {date && <time className="index-card__date" dateTime={post.date}>{date}</time>}
                  </div>

                  <Link to={`/writings/${post.slug}`} className="index-card__link">
                    <h2 className="index-card__title">{post.title}</h2>
                    {post.excerpt && <p className="index-card__excerpt">{post.excerpt}</p>}
                  </Link>

                  <div className="index-card__foot">
                    {tags.length > 0 && (
                      <div className="index-card__refs">
                        <span className="index-card__refs-label">See</span>
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className={`index-card__ref${tag === selectedTag ? " is-current" : ""}`}
                            onClick={() => openDrawer(tag)}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                    <span className="index-card__time" title={`${post.readTime} min read`}>
                      <span className="index-card__pips" aria-hidden="true">
                        {Array.from({ length: Math.min(post.readTime, 10) }, (_, i) => (
                          <i key={i} />
                        ))}
                      </span>
                      {post.readTime} min
                    </span>
                  </div>

                  <span className="index-card__hole" aria-hidden="true" />
                </li>
              );
            })}
          </ol>

          {!loading && !error && cards.length === 0 && (
            <p className="cabinet__empty">This drawer is empty.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Writings;
