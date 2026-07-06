import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock } from "lucide-react";
import { useMarkdownPosts } from "../hooks/useMarkdownPosts";
import { resolvePostTags } from "../lib/postTagFallbacks";

function formatPostDate(date: string): string | null {
  const parsedDate = new Date(date);

  if (!date || Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const Writings = () => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { posts, loading, error } = useMarkdownPosts();

  const allTags = Array.from(new Set(posts.flatMap((post) => resolvePostTags(post))));

  const filteredPosts = selectedTag
    ? posts.filter((post) => resolvePostTags(post).includes(selectedTag))
    : posts;

  return (
    <div className="px-6 md:px-12 lg:px-16 py-16 max-w-[1000px] mx-auto animate-fade-in">
      <div className="mb-16 pb-8 border-b border-[var(--border-muted)] relative">
        <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-[var(--text-secondary)] mb-6">
          ( 01 &mdash; WRITINGS )
        </p>
        <h1 className="text-5xl md:text-7xl font-display text-foreground tracking-[-0.01em] leading-[0.85] uppercase mb-4 relative z-10">Writings</h1>
        <p className="text-lg md:text-xl text-foreground max-w-2xl leading-relaxed relative z-10">
          Thoughts on the arts, engineering, the esoteric and the existential.
        </p>
      </div>

      <div className="mb-16 flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedTag(null)}
          className={`font-mono text-[11px] tracking-[0.16em] px-3 py-1 border transition-colors uppercase ${
            selectedTag === null
              ? "bg-accent border-accent text-accent-foreground"
              : "border-foreground/40 text-foreground/60 hover:border-accent hover:text-accent bg-transparent"
          }`}
        >
          ALL
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
            {tag}
          </button>
        ))}
      </div>

      {loading && (
        <div className="border-2 border-dashed border-foreground/30 px-6 py-8 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Loading writings...
        </div>
      )}

      {error && !loading && (
        <div className="border-2 border-destructive px-6 py-8 text-sm uppercase tracking-[0.2em] text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-16">
        {filteredPosts.map((post, index) => {
          const formattedDate = formatPostDate(post.date);

          return (
            <article
              key={post.slug}
              className="relative group border-b-2 border-dashed border-muted pb-12 last:border-0 pl-4 transition-colors duration-300 hover:bg-accent/[0.04]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* left border sweep */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-300 ease-&lsqb;cubic-bezier(0.4,0,0.2,1)&rsqb" />

              <Link to={`/writings/${post.slug}`} className="block no-underline text-foreground">
                <header className="mb-4">
                  {formattedDate && (
                    <div className="flex items-center gap-3 mb-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      <span>{new Date(post.date).getFullYear()}</span>
                    </div>
                  )}

                  <h2 className="text-3xl md:text-5xl font-display uppercase tracking-[-0.01em] text-foreground group-hover:text-accent transition-colors duration-300 leading-[0.9] mb-4">
                    {post.title}
                  </h2>

                  <p className="text-[1.05rem] text-foreground leading-[1.75] max-w-3xl">
                    {post.excerpt}
                  </p>
                </header>

                <div className="mt-6 flex flex-wrap items-center gap-6 text-[0.7rem] text-muted-foreground uppercase tracking-widest font-bold">
                  {formattedDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-foreground/50" />
                      <span>{formattedDate}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-foreground/50" />
                    <span>{post.readTime} min read</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {resolvePostTags(post).slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="border border-foreground/30 px-2 py-0.5 text-[0.65rem] tracking-[0.1em] transition-colors duration-300 group-hover:border-accent/50 group-hover:text-accent"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </article>
          );
        })}

        {!loading && !error && filteredPosts.length === 0 && (
          <div className="border-2 border-dashed border-foreground/30 px-6 py-8 text-sm uppercase tracking-[0.2em] text-muted-foreground">
            No writings found.
          </div>
        )}
      </div>
    </div>
  );
};

export default Writings;
