import { useEffect, useState } from "react";
import { buildPostFromMarkdown } from "../../content/markdown";
import type { Post, PostSummary } from "../../content/posts";

// Both globs resolve at build time against content/writings/, which
// scripts/build-writings.ts fills from Notion before `vite build`. The manifest
// is tiny and bundled eagerly; each post body becomes its own lazily-loaded
// chunk. A missing manifest (script not run yet) yields an empty list.
const manifestModules = import.meta.glob<PostSummary[]>("../../content/writings/manifest.json", {
  eager: true,
  import: "default",
});
const postLoaders = import.meta.glob<string>("../../content/writings/*.md", {
  query: "?raw",
  import: "default",
});

const summaries: PostSummary[] = Object.values(manifestModules)[0] ?? [];

interface UsePostsResult {
  posts: PostSummary[];
  loading: boolean;
  error: string | null;
}

interface UsePostResult {
  post: Post | null;
  loading: boolean;
  error: string | null;
}

export const useMarkdownPosts = (): UsePostsResult => ({
  posts: summaries,
  loading: false,
  error: null,
});

export const useMarkdownPost = (slug: string | undefined): UsePostResult => {
  const loader = slug ? postLoaders[`../../content/writings/${slug}.md`] : undefined;
  const [state, setState] = useState<UsePostResult>({
    post: null,
    loading: Boolean(loader),
    error: null,
  });

  useEffect(() => {
    if (!slug || !loader) {
      setState({ post: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ post: null, loading: true, error: null });

    loader()
      .then((raw) => {
        if (cancelled) return;
        const parsed = buildPostFromMarkdown(raw, slug);
        setState({
          post: parsed ? { ...parsed.summary, content: parsed.content } : null,
          loading: false,
          error: null,
        });
      })
      .catch((caughtError: unknown) => {
        if (cancelled) return;
        setState({
          post: null,
          loading: false,
          error: caughtError instanceof Error ? caughtError.message : "Failed to load post",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [slug, loader]);

  return state;
};
