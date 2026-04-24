import { listPublishedPostsFromBlob } from "./_lib/posts.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const posts = await listPublishedPostsFromBlob();
    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=86400");
    return response.status(200).json(posts);
  } catch (error) {
    console.error("Failed to list posts", error);
    return response.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list posts",
    });
  }
}
