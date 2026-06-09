import assert from "node:assert/strict";
import test from "node:test";

import { serializeFrontmatter } from "../../content/markdown.ts";
import { setBlobBackendForTesting, type BlobBackend } from "../_lib/store.ts";
import { GET } from "./[slug].ts";

function memoryBackend(files: Record<string, string>): BlobBackend {
  const map = new Map(Object.entries(files));
  return {
    async put(pathname, body) {
      map.set(pathname, String(body));
      return { url: `mem://${pathname}`, pathname };
    },
    async download(pathname) {
      return map.get(pathname) ?? null;
    },
    async list(prefix) {
      return [...map.keys()].filter((key) => key.startsWith(prefix));
    },
    async del(pathname) {
      map.delete(pathname);
    },
  };
}

test("/api/post/[slug] returns the parsed post for an existing slug", async () => {
  const markdown = `${serializeFrontmatter({
    slug: "valid-post",
    title: "Valid Post",
    excerpt: "Example excerpt",
    date: "2026-04-20",
    tags: ["notes"],
    readTime: 2,
    published: true,
    notionPageId: "page-123",
  })}\n\nHello **world**.\n`;
  setBlobBackendForTesting(memoryBackend({ "posts/valid-post.md": markdown }));

  const response = await GET(new Request("https://example.com/api/post/valid-post"));
  const json = (await response.json()) as {
    slug: string;
    title: string;
    tags: string[];
    content: string;
  };

  assert.equal(response.status, 200);
  assert.equal(json.slug, "valid-post");
  assert.equal(json.title, "Valid Post");
  assert.deepEqual(json.tags, ["notes"]);
  assert.match(json.content, /Hello \*\*world\*\*\./);

  setBlobBackendForTesting(null);
});

test("/api/post/[slug] returns 404 when the post does not exist", async () => {
  setBlobBackendForTesting(memoryBackend({}));

  const response = await GET(new Request("https://example.com/api/post/missing"));
  assert.equal(response.status, 404);

  setBlobBackendForTesting(null);
});
