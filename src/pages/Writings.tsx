import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import PostPlate from "@/components/PostPlate";
import { useMarkdownPosts } from "../hooks/useMarkdownPosts";
import { resolvePostTags } from "../lib/postTagFallbacks";
import type { PostSummary } from "../../content/posts";

type PostCardProps = { post: PostSummary; plate: number; index: number; featured?: boolean };

// Cards share the software index's grid and window chrome, with a drawn plate
// where the repos show their deployment.
const PostCard = ({ post, plate, index, featured }: PostCardProps) => {
  const tags = resolvePostTags(post);
  const href = `/writings/${post.slug}`;

  return (
    <article
      className={`repo-card post-card${featured ? " repo-card--featured" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="repo-card__preview">
        <div className="repo-window">
          <div className="repo-window__bar">
            <span className="repo-window__dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="repo-window__address">writings/{post.slug}.md</span>
            <span className="post-card__time">{post.readTime} min</span>
          </div>
          <div className="repo-window__viewport">
            <Link to={href} className="repo-window__link" aria-label={`Read ${post.title}`} tabIndex={-1}>
              <PostPlate slug={post.slug} title={post.title} plate={plate} index={index} />
            </Link>
          </div>
        </div>
      </div>

      <div className="repo-card__body">
        <p className="repo-card__index">
          {String(plate + 1).padStart(2, "0")}
          {featured && <span className="post-card__latest">latest</span>}
        </p>
        <h2 className="repo-card__title post-card__title">
          <Link to={href}>{post.title}</Link>
        </h2>
        {post.excerpt && <p className="repo-card__description post-card__excerpt">{post.excerpt}</p>}
        {tags.length > 0 && (
          <ul className="repo-card__topics" aria-label="Tags">
            {tags.slice(0, featured ? 6 : 3).map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
        <div className="repo-card__links">
          <Link to={href} className={`repo-card__link${featured ? " repo-card__link--live" : ""}`}>
            Read
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
};

const Writings = () => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { posts, loading, error } = useMarkdownPosts();

  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of resolvePostTags(post)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const allTags = [...counts.keys()];

  const filteredPosts = selectedTag
    ? posts.filter((post) => resolvePostTags(post).includes(selectedTag))
    : posts;
  const [lead, ...rest] = filteredPosts;
  // Numbers and plates follow the full index, so filtering doesn't redraw them.
  const plateOf = (post: PostSummary) => posts.indexOf(post);
  const minutes = posts.reduce((sum, post) => sum + post.readTime, 0);

  return (
    <div className="page-shell page-shell--wide animate-fade-in">
      <div className="mb-10 sm:mb-14 pb-6 sm:pb-8 border-b border-[var(--border-muted)]">
        <p className="font-pixel text-[10.5px] tracking-[0.08em] uppercase text-[var(--accent)] mb-6">
          ( 01 &mdash; WRITINGS )
        </p>
        <h1 className="text-5xl md:text-7xl font-display text-foreground tracking-[-0.01em] leading-[0.85] uppercase mb-4">
          Writings
        </h1>
        <p className="text-lg md:text-xl text-foreground max-w-2xl leading-relaxed">
          Thoughts on the arts, engineering, the esoteric and the existential.
        </p>
        {posts.length > 0 && (
          <p className="repo-index__stamp">
            <span>
              {posts.length} {posts.length === 1 ? "essay" : "essays"}
            </span>
            <span aria-hidden="true">/</span>
            <span>{minutes} min of reading</span>
          </p>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="post-filter" role="group" aria-label="Filter by tag">
          <button type="button" onClick={() => setSelectedTag(null)} aria-pressed={selectedTag === null}>
            All <span>{posts.length}</span>
          </button>
          {allTags.map((tag) => (
            <button key={tag} type="button" onClick={() => setSelectedTag(tag)} aria-pressed={selectedTag === tag}>
              {tag} <span>{counts.get(tag)}</span>
            </button>
          ))}
        </div>
      )}

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

      {lead && (
        // Keyed by the filter so the cards replay their entrance on each change.
        <div className="repo-grid" key={selectedTag ?? "all"}>
          <PostCard post={lead} plate={plateOf(lead)} index={0} featured />
          {rest.map((post, i) => (
            <PostCard key={post.slug} post={post} plate={plateOf(post)} index={i + 1} />
          ))}
        </div>
      )}

      {!loading && !error && filteredPosts.length === 0 && (
        <div className="border border-dashed border-foreground/30 px-6 py-8 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          No writings found.
        </div>
      )}
    </div>
  );
};

export default Writings;
