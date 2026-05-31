// Static local markdown fallback for when the Notion sync API is unavailable.
//
// Vite's `import.meta.glob` bundles every `*.md` file in this directory at build
// time as a raw string. Parsing is delegated to the shared, defensive
// `buildPostFromMarkdown` helper, and the whole build is wrapped so a malformed
// file can never throw at import time (which previously crashed the writings
// page). An empty directory simply yields empty arrays.
import { buildPostFromMarkdown } from "../../content/markdown";
import { sortPostsByDateDesc, type Post, type PostSummary } from "../../content/posts";

const rawModules = import.meta.glob("./*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function buildFallback(): { summaries: PostSummary[]; posts: Post[] } {
  const summaries: PostSummary[] = [];
  const posts: Post[] = [];

  try {
    for (const [filePath, raw] of Object.entries(rawModules)) {
      const filename = (filePath.split("/").pop() ?? "").replace(/\.md$/, "");
      const parsed = buildPostFromMarkdown(String(raw), filename);
      if (!parsed) {
        continue;
      }
      summaries.push(parsed.summary);
      posts.push({ ...parsed.summary, content: parsed.content });
    }
  } catch {
    // Never let the fallback throw during module initialization.
    return { summaries: [], posts: [] };
  }

  return {
    summaries: sortPostsByDateDesc(summaries),
    posts: sortPostsByDateDesc(posts),
  };
}

const fallback = buildFallback();

export const localFallbackSummaries: PostSummary[] = fallback.summaries;
export const localFallbackPosts: Post[] = fallback.posts;
