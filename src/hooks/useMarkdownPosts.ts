import { useEffect, useState } from "react";
import type { Post, PostSummary } from "../../content/posts";
import { localFallbackSummaries, localFallbackPosts } from "../posts/localFallback";

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

function normalizePostSummary(post: PostSummary): PostSummary {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    tags: Array.isArray(post.tags) ? post.tags : [],
    date: post.date,
    readTime: Number(post.readTime) || 10,
  };
}

function normalizePost(post: Post): Post {
  return {
    ...normalizePostSummary(post),
    content: post.content ?? "",
  };
}

export const useMarkdownPosts = (): UsePostsResult => {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/posts");
        if (!response.ok) {
          throw new Error(`Failed to load posts (${response.status})`);
        }

        const data = (await response.json()) as PostSummary[];
        if (cancelled) {
          return;
        }

        const sortedPosts = data
          .map(normalizePostSummary)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setPosts(sortedPosts);
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        // Fall back to local markdown files bundled at build time
        if (localFallbackSummaries.length > 0) {
          setPosts(localFallbackSummaries);
          setError(null);
        } else {
          setPosts([]);
          setError(caughtError instanceof Error ? caughtError.message : "Failed to load posts");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  return { posts, loading, error };
};

export const useMarkdownPost = (slug: string | undefined): UsePostResult => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPost() {
      if (!slug) {
        setPost(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/post/${encodeURIComponent(slug)}`);

        if (response.status === 404) {
          if (!cancelled) {
            const local = localFallbackPosts.find((p) => p.slug === slug) ?? null;
            setPost(local);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load post (${response.status})`);
        }

        const data = (await response.json()) as Post;
        if (!cancelled) {
          setPost(normalizePost(data));
        }
      } catch (caughtError) {
        if (!cancelled) {
          const local = localFallbackPosts.find((p) => p.slug === slug) ?? null;
          setPost(local);
          if (!local) {
            setError(caughtError instanceof Error ? caughtError.message : "Failed to load post");
          } else {
            setError(null);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPost();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { post, loading, error };
};
