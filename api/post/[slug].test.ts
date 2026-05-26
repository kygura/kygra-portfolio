import assert from "node:assert/strict";
import test from "node:test";

import { setBlobClientForTesting } from "../_lib/posts.ts";
import { GET } from "./[slug].ts";

type TestBlobClient = NonNullable<Parameters<typeof setBlobClientForTesting>[0]>;
type TestBlobGetResult = Awaited<ReturnType<NonNullable<TestBlobClient["get"]>>>;

function createStream(text: string) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

test("/api/post/[slug] returns parsed markdown content for a valid blob", async (t) => {
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";

  setBlobClientForTesting({
    get: async () => ({
      statusCode: 200,
      headers: new Headers({
        "content-type": "text/markdown; charset=utf-8",
      }),
      stream: createStream(
        [
          "---",
          "slug: \"valid-post\"",
          "title: \"Valid Post\"",
          "excerpt: \"Example excerpt\"",
          "date: \"2026-04-20\"",
          "tags: [\"notes\"]",
          "readTime: 2",
          "published: true",
          "notionPageId: \"page-123\"",
          "---",
          "",
          "# Hello",
          "",
          "World",
          "",
        ].join("\n"),
      ),
      blob: {},
    } as TestBlobGetResult),
  });
  t.after(() => setBlobClientForTesting(null));

  const response = await GET(new Request("https://example.com/api/post/valid-post"));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.slug, "valid-post");
  assert.equal(payload.title, "Valid Post");
  assert.equal(payload.content.trim(), "# Hello\n\nWorld");
});

test("/api/post/[slug] returns an error when the markdown blob is empty", async (t) => {
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";

  setBlobClientForTesting({
    get: async () => ({
      statusCode: 200,
      headers: new Headers({
        "content-type": "text/markdown; charset=utf-8",
      }),
      stream: createStream("   \n"),
      blob: {},
    } as TestBlobGetResult),
  });
  t.after(() => setBlobClientForTesting(null));

  const response = await GET(new Request("https://example.com/api/post/empty-post"));
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.match(payload.error, /empty markdown content/);
});

test("/api/post/[slug] returns an error when the markdown blob contains HTML", async (t) => {
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";

  setBlobClientForTesting({
    get: async () => ({
      statusCode: 200,
      headers: new Headers({
        "content-type": "text/html; charset=utf-8",
      }),
      stream: createStream("<!doctype html><html><body><div id=\"root\"></div></body></html>"),
      blob: {},
    } as TestBlobGetResult),
  });
  t.after(() => setBlobClientForTesting(null));

  const response = await GET(new Request("https://example.com/api/post/html-post"));
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.match(payload.error, /HTML content-type instead of markdown/);
});
