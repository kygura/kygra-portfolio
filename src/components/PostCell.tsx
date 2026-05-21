import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { PostSummary } from "../../content/posts";

interface PostCellProps {
  post: PostSummary | null;
  loading?: boolean;
}

export default function PostCell({ post, loading }: PostCellProps) {
  if (loading) {
    return (
      <div className="canvas-cell canvas-cell--post canvas-cell--skeleton" aria-hidden="true" />
    );
  }

  if (!post) {
    return (
      <div className="canvas-cell canvas-cell--post canvas-cell--empty">
        <span className="canvas-cell__placeholder">—</span>
      </div>
    );
  }

  const year = new Date(post.date).getFullYear();
  const tag = post.tags[0] ?? null;

  return (
    <div className="canvas-cell canvas-cell--post">
      <Link
        to={`/writings/${post.slug}`}
        className="canvas-cell__post-link"
        aria-label={`Read: ${post.title}`}
      >
        <div className="canvas-cell__post-meta">
          <span>{year}</span>
          {tag && <span>{tag}</span>}
          <span>{post.readTime} min</span>
        </div>
        <h3 className="canvas-cell__post-title">{post.title}</h3>
        {post.excerpt && (
          <p className="canvas-cell__post-excerpt">{post.excerpt}</p>
        )}
        <span className="canvas-cell__post-cta">
          Read <ArrowUpRight className="inline w-3.5 h-3.5 mb-0.5" />
        </span>
      </Link>
    </div>
  );
}
