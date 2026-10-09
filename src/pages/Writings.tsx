import { useState } from "react";
import { Link } from "react-router-dom";
import { useMarkdownPosts } from "../hooks/useMarkdownPosts";
import { resolvePostTags } from "../lib/postTagFallbacks";

function formatPostDate(date: string): string {
  const parsedDate = new Date(date);

  if (!date || Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toISOString().slice(0, 10);
}

const Writings = () => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { posts, loading, error } = useMarkdownPosts();

  const allTags = Array.from(new Set(posts.flatMap((post) => resolvePostTags(post))));

  const filteredPosts = selectedTag
    ? posts.filter((post) => resolvePostTags(post).includes(selectedTag))
    : posts;

  let state: string | null = null;
  if (loading) state = "Loading writings…";
  else if (error) state = error;
  else if (filteredPosts.length === 0) state = "No writings found.";

  return (
    <div className="sheet page">
      <div className="session">
        <span className="session__num">Sheet <em>02</em></span>
        <h1>Contents</h1>
        <span className="session__hint">ledger · newest first</span>
      </div>
      <p className="page-lede">
        Thoughts on the arts, engineering, the esoteric and the existential.
      </p>

      <ul className="tagrow" aria-label="Filter by tag">
        {[null, ...allTags].map((tag) => (
          <li key={tag ?? "all"}>
            <button
              type="button"
              aria-pressed={selectedTag === tag}
              onClick={() => setSelectedTag(tag)}
            >
              {tag ?? "all"}
            </button>
          </li>
        ))}
      </ul>

      <section className="plate">
        <table className="ledger">
          <tbody>
            {state ? (
              <tr>
                <td className={`ledger__state${error && !loading ? " ledger__state--error" : ""}`}>
                  {state}
                </td>
              </tr>
            ) : (
              filteredPosts.map((post) => (
                <tr key={post.slug}>
                  <td className="ledger__fig">{formatPostDate(post.date)}</td>
                  <td className="ledger__title">
                    <Link to={`/writings/${post.slug}`}>
                      <b>{post.title}</b>
                    </Link>
                    <span>{post.excerpt}</span>
                  </td>
                  <td className="ledger__meta">
                    {[`${post.readTime} min`, ...resolvePostTags(post).slice(0, 2)].join(" · ")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Writings;
