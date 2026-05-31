import { sortPostsByDateDesc } from "../content/posts.ts";
import { readManifest } from "./_lib/store.ts";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const posts = await readManifest();
    return Response.json(sortPostsByDateDesc(posts), {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Failed to list posts", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to list posts" },
      { status: 500 },
    );
  }
}
