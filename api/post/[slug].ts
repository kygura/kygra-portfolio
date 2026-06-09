import { buildPostFromMarkdown } from "../../content/markdown.ts";
import { normalizeSlug, postSchema } from "../../content/posts.ts";
import { readPostMarkdown } from "../_lib/store.ts";

function extractSlugFromRequest(request: Request): string {
  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const slug = normalizeSlug(extractSlugFromRequest(request));
    if (!slug) {
      return Response.json({ error: "Slug is required" }, { status: 400 });
    }

    const raw = await readPostMarkdown(slug);
    if (!raw) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    const parsed = buildPostFromMarkdown(raw, slug);
    if (!parsed) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    const post = postSchema.parse({ ...parsed.summary, content: parsed.content });
    return Response.json(post, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Failed to fetch post", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch post" },
      { status: 500 },
    );
  }
}
