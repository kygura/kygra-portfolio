import test from "node:test";
import assert from "node:assert/strict";
import { processPostImages, deletePostImages } from "./images.ts";
import type { ImageDeps } from "./images.ts";

// ---------------------------------------------------------------------------
// Tiny 1×1 PNG for sharp to process without network access.
// ---------------------------------------------------------------------------

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchOk(): typeof fetch {
  return ((_url: string | URL | Request, _init?: RequestInit) => {
    const ab = PNG.buffer.slice(PNG.byteOffset, PNG.byteOffset + PNG.byteLength);
    return Promise.resolve({
      ok: true,
      arrayBuffer: async () => ab,
      headers: { get: (_name: string) => "image/png" },
    } as unknown as Response);
  }) as unknown as typeof fetch;
}

function makeFetchFail(): typeof fetch {
  return ((_url: string | URL | Request, _init?: RequestInit) =>
    Promise.resolve({ ok: false } as unknown as Response)) as unknown as typeof fetch;
}

function makePut(): { fn: ImageDeps["put"]; calls: { pathname: string; contentType: string }[] } {
  const calls: { pathname: string; contentType: string }[] = [];
  const fn: ImageDeps["put"] = async (pathname, _body, contentType) => {
    calls.push({ pathname, contentType });
    return { url: `https://blob.example/${pathname}`, pathname };
  };
  return { fn, calls };
}

function makeListAndDel(pathnames: string[]): {
  list: ImageDeps["list"];
  del: ImageDeps["del"];
  deleted: string[];
} {
  const deleted: string[] = [];
  return {
    list: async (_prefix: string) => pathnames,
    del: async (pathname: string) => {
      deleted.push(pathname);
    },
    deleted,
  };
}

// ---------------------------------------------------------------------------
// Test 1: Notion image is downloaded, compressed, uploaded and URL rewritten.
// ---------------------------------------------------------------------------

test("processPostImages rewrites notion image URL and returns pathname", async () => {
  const slug = "my-post";
  const originalUrl =
    "https://prod-files-secure.s3.us-west-2.amazonaws.com/abc.png";
  const markdown = `![alt](${originalUrl})`;

  const { fn: put, calls: putCalls } = makePut();
  const deps: ImageDeps = {
    fetchImpl: makeFetchOk(),
    put,
    list: async () => [],
    del: async () => {},
  };

  const result = await processPostImages(markdown, slug, deps);

  // The original S3 URL must be gone.
  assert.ok(
    !result.markdown.includes(originalUrl),
    `Expected original URL to be rewritten, got: ${result.markdown}`,
  );
  // The new URL should point at blob.example with the correct prefix.
  assert.ok(
    result.markdown.includes(`https://blob.example/images/${slug}/`),
    `Expected blob.example URL in markdown, got: ${result.markdown}`,
  );
  assert.equal(result.pathnames.length, 1, "Expected exactly one pathname");
  assert.equal(putCalls.length, 1, "Expected put to be called once");
  assert.ok(
    putCalls[0].pathname.startsWith(`images/${slug}/`),
    `Expected pathname to start with images/${slug}/, got: ${putCalls[0].pathname}`,
  );
});

// ---------------------------------------------------------------------------
// Test 2: Non-Notion images are left untouched.
// ---------------------------------------------------------------------------

test("processPostImages leaves non-notion image untouched", async () => {
  const markdown = `![x](https://example.com/pic.png)`;

  const { fn: put, calls: putCalls } = makePut();
  const deps: ImageDeps = {
    fetchImpl: makeFetchOk(),
    put,
    list: async () => [],
    del: async () => {},
  };

  const result = await processPostImages(markdown, "slug", deps);

  assert.equal(result.markdown, markdown, "Markdown should be unchanged");
  assert.equal(result.pathnames.length, 0, "Expected no pathnames");
  assert.equal(putCalls.length, 0, "Expected put not to be called");
});

// ---------------------------------------------------------------------------
// Test 3: Failed fetch keeps original URL and does not throw.
// ---------------------------------------------------------------------------

test("processPostImages handles fetch failure gracefully (original URL preserved)", async () => {
  const originalUrl =
    "https://prod-files-secure.s3.us-west-2.amazonaws.com/fail.png";
  const markdown = `![alt](${originalUrl})`;

  const { fn: put, calls: putCalls } = makePut();
  const deps: ImageDeps = {
    fetchImpl: makeFetchFail(),
    put,
    list: async () => [],
    del: async () => {},
  };

  // Should not throw.
  const result = await processPostImages(markdown, "slug", deps);

  assert.equal(result.markdown, markdown, "Markdown should be unchanged when fetch fails");
  assert.equal(result.pathnames.length, 0, "Expected no pathnames on failure");
  assert.equal(putCalls.length, 0, "Expected put not to be called on failure");
});

// ---------------------------------------------------------------------------
// Test 4: deletePostImages calls del for each blob and returns count.
// ---------------------------------------------------------------------------

test("deletePostImages deletes all listed pathnames and returns count", async () => {
  const { list, del, deleted } = makeListAndDel([
    "images/my-post/aabbccdd.jpg",
    "images/my-post/11223344.png",
  ]);

  const deps: ImageDeps = {
    fetchImpl: fetch,
    put: async (p, _b, _ct) => ({ url: `https://blob.example/${p}`, pathname: p }),
    list,
    del,
  };

  const count = await deletePostImages("my-post", deps);

  assert.equal(count, 2, "Expected count to equal number of blobs");
  assert.equal(deleted.length, 2, "Expected del to be called twice");
  assert.ok(deleted.includes("images/my-post/aabbccdd.jpg"), "Expected first path deleted");
  assert.ok(deleted.includes("images/my-post/11223344.png"), "Expected second path deleted");
});
