// `/writings/:slug` (A4): post body lazy-loaded from content/writings, built from Notion at build time.
// A slug that resolves to nothing reports back so the shell can switch to the 404 Reader.
import { Suspense, lazy, useEffect } from "react";
import { useMarkdownPost } from "../hooks/useMarkdownPosts";
import { formatDate, formatReadTime, type NoteRow } from "../orrery/model";
import { resolvePostTags } from "../lib/postTagFallbacks";

// react-markdown + the highlighter load with the first post, not with the console.
const Markdown = lazy(() => import("./Markdown"));

interface PostReaderProps {
  slug: string;
  note: NoteRow | null;
  onMissing: () => void;
}

export default function PostReader({ slug, note, onMissing }: PostReaderProps) {
  const { post, loading } = useMarkdownPost(slug);
  useEffect(() => {
    if (!loading && !post) onMissing();
  }, [loading, post, onMissing]);

  const title = post?.title ?? note?.title ?? slug;
  const excerpt = post?.excerpt ?? note?.excerpt ?? "";
  const tags = note?.tags ?? (post ? resolvePostTags({ slug: post.slug, tags: post.tags ?? [] }) : []);
  const loadingLine = <p className="dim">-- loading {slug} --</p>;
  return (
    <article aria-busy={loading}>
      <header className="rh">
        <h2 className="rt">{title}</h2>
        {excerpt && <p className="lede">{excerpt}</p>}
        <dl className="meta">
          <dt>date</dt>
          <dd>{post ? formatDate(post.date) : (note?.date ?? "----------")}</dd>
          <dt>read</dt>
          <dd>{post ? formatReadTime(post.readTime) : (note?.read ?? "--m")}</dd>
          {tags.length > 0 && (
            <>
              <dt>tags</dt>
              <dd className="w">{tags.join(", ")}</dd>
            </>
          )}
        </dl>
      </header>
      {post ? (
        <Suspense fallback={loadingLine}>
          <Markdown source={post.content} />
        </Suspense>
      ) : (
        loadingLine
      )}
    </article>
  );
}
