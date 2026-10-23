import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useMarkdownPosts } from "../hooks/useMarkdownPosts";
import { resolvePostTags } from "../lib/postTagFallbacks";

// One tick per minute of reading, capped so long posts don't run off the ruler.
const MAX_TICKS = 12;

const pad = (n: number) => String(n).padStart(2, "0");

const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return null;
  return date
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
};

const Writings = () => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { posts, loading, error } = useMarkdownPosts();

  const tagCounts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of resolvePostTags(post)) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const allTags = Array.from(tagCounts.keys());

  // Numbers follow the full list (oldest = 01) so they stay put while filtering.
  const numbered = posts.map((post, i) => ({ post, number: posts.length - i }));
  const filteredPosts = selectedTag
    ? numbered.filter(({ post }) => resolvePostTags(post).includes(selectedTag))
    : numbered;

  const totalMinutes = posts.reduce((sum, post) => sum + post.readTime, 0);

  return (
    <div className="page-shell page-shell--wide animate-fade-in">
      <div className="mb-10 sm:mb-16 pb-6 sm:pb-8 border-b border-[var(--border-muted)] relative">
        <p className="font-pixel text-[10.5px] tracking-[0.08em] uppercase text-[var(--accent)] mb-6">
          ( 01 &mdash; WRITINGS )
        </p>
        <h1 className="text-5xl md:text-7xl font-display text-foreground tracking-[-0.01em] leading-[0.85] uppercase mb-4 relative z-10">Writings</h1>
        <p className="text-lg md:text-xl text-foreground max-w-2xl leading-relaxed relative z-10">
          Thoughts on the arts, engineering, the esoteric and the existential.
        </p>
        {posts.length > 0 && (
          <p className="writ-stats">
            <span><b>{pad(posts.length)}</b> entries</span>
            <span><b>{totalMinutes}</b> min of reading</span>
            <span><b>{pad(allTags.length)}</b> subjects</span>
          </p>
        )}
      </div>

      <div className="mb-10 sm:mb-14 flex flex-wrap gap-2 sm:gap-3">
        <button
          onClick={() => setSelectedTag(null)}
          className={`font-mono text-[11px] tracking-[0.16em] px-3 py-1 border transition-colors uppercase ${
            selectedTag === null
              ? "bg-accent border-accent text-accent-foreground"
              : "border-foreground/40 text-foreground/60 hover:border-accent hover:text-accent bg-transparent"
          }`}
        >
          ALL<sup className="writ-count">{posts.length}</sup>
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`font-mono text-[11px] tracking-[0.16em] px-3 py-1 border transition-colors uppercase ${
              selectedTag === tag
                ? "bg-accent border-accent text-accent-foreground"
                : "border-foreground/40 text-foreground/60 hover:border-accent hover:text-accent bg-transparent"
            }`}
          >
            {tag}<sup className="writ-count">{tagCounts.get(tag)}</sup>
          </button>
        ))}
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

      <ol className="writ-list" key={selectedTag ?? "all"}>
        {filteredPosts.map(({ post, number }, index) => {
          const tags = resolvePostTags(post).slice(0, 3);
          const date = formatDate(post.date);
          const ticks = Math.min(post.readTime, MAX_TICKS);

          return (
            <li
              key={post.slug}
              className="writ-entry"
              style={{ "--i": index } as CSSProperties}
            >
              <Link to={`/writings/${post.slug}`} className="writ-entry__link">
                <span className="writ-entry__no" aria-hidden="true">{pad(number)}</span>

                <div className="writ-entry__body">
                  <p className="writ-entry__kicker">
                    {date && <time dateTime={post.date}>{date}</time>}
                    {tags.length > 0 && <span>{tags.join(" / ")}</span>}
                  </p>
                  <h2 className="writ-entry__title">{post.title}</h2>
                  {post.excerpt && <p className="writ-entry__excerpt">{post.excerpt}</p>}
                </div>

                <div className="writ-entry__aside">
                  <span className="writ-entry__ruler" aria-hidden="true">
                    {Array.from({ length: MAX_TICKS }, (_, t) => (
                      <i
                        key={t}
                        className={t < ticks ? "is-on" : undefined}
                        style={{ "--t": t * 30 } as CSSProperties}
                      />
                    ))}
                  </span>
                  <span className="writ-entry__time">{post.readTime} min</span>
                  <ArrowUpRight className="writ-entry__arrow" aria-hidden="true" />
                </div>
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
