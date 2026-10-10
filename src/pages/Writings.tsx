import { useState } from "react";
import { Link } from "react-router-dom";
import SectionHead from "@/components/SectionHead";
import { useMarkdownPosts } from "../hooks/useMarkdownPosts";
import { resolvePostTags } from "../lib/postTagFallbacks";
import { formatLogDate } from "@/lib/format";

const Writings = () => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { posts, loading, error } = useMarkdownPosts();

  const allTags = Array.from(new Set(posts.flatMap((post) => resolvePostTags(post))));
  const filtered = selectedTag ? posts.filter((p) => resolvePostTags(p).includes(selectedTag)) : posts;

  return (
    <>
      <div className="ptitle">
        <p className="mono mute" style={{ marginTop: 0 }}>§02 — Writings</p>
        <h1 className="disp">Logbook</h1>
        <p>Thoughts on the arts, engineering, the esoteric and the existential.</p>
      </div>

      {allTags.length > 0 && (
        <div className="tags mono" role="group" aria-label="Filter by tag">
          <button type="button" aria-pressed={selectedTag === null} onClick={() => setSelectedTag(null)}>All</button>
          {allTags.map((tag) => (
            <button key={tag} type="button" aria-pressed={selectedTag === tag} onClick={() => setSelectedTag(tag)}>
              {tag}
            </button>
          ))}
        </div>
      )}

      <SectionHead
        n="02"
        title={selectedTag ? `Entries — ${selectedTag}` : "Entries"}
        right={loading ? "…" : `${String(filtered.length).padStart(2, "0")} entries`}
      />

      {loading && <div className="notice">Loading the logbook…</div>}
      {error && !loading && <div className="notice notice--err">{error}</div>}

      <div className="log">
        {filtered.map((post) => (
          <Link key={post.slug} to={`/writings/${post.slug}`} className="log__row">
            <span className="mono mute log__date">{formatLogDate(post.date)}</span>
            <span className="log__title">{post.title}</span>
            <span className="mono log__rt">{post.readTime} min</span>
            {post.excerpt && <span className="log__excerpt">{post.excerpt}</span>}
            <span className="log__tags mono">
              {resolvePostTags(post).slice(0, 4).map((t) => <span key={t}>#{t}</span>)}
            </span>
          </Link>
        ))}
        {!loading && !error && filtered.length === 0 && (
          <div className="notice">Nothing filed under that yet.</div>
        )}
      </div>
    </>
  );
};

export default Writings;
