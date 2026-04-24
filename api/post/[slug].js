import { fetchPostFromBlob, getPostPath, normalizeSlug } from "../_lib/posts.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const slugParam = request.query?.slug;
    const slug = normalizeSlug(Array.isArray(slugParam) ? slugParam[0] : slugParam);

    if (!slug) {
      return response.status(400).json({ error: "Slug is required" });
    }

    const record = await fetchPostFromBlob(getPostPath(slug));

    if (!record || record.data.published === false) {
      return response.status(404).json({ error: "Post not found" });
    }

    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=86400");
    return response.status(200).json(record.post);
  } catch (error) {
    console.error("Failed to fetch post", error);
    return response.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch post",
    });
  }
}
