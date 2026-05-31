/**
 * Tests for api/_lib/store.ts using an in-memory BlobBackend.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  setBlobBackendForTesting,
  getPostPath,
  getIndexPath,
  readManifest,
  writeManifest,
  upsertManifestEntry,
  removeManifestEntry,
  writePostMarkdown,
  readPostMarkdown,
  deletePostMarkdown,
  readIndexEntry,
  writeIndexEntry,
  deleteIndexEntry,
  listIndexEntries,
  findIndexEntryBySlug,
  type BlobBackend,
} from "./store.ts";
import type { PostSummary } from "../../content/posts.ts";

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------

function makeInMemoryBackend(): BlobBackend {
  const store = new Map<string, string>();

  return {
    async put(pathname, body, _contentType) {
      store.set(pathname, body);
      return { url: `https://fake.blob/${pathname}`, pathname };
    },
    async download(pathname) {
      return store.has(pathname) ? (store.get(pathname) ?? null) : null;
    },
    async list(prefix) {
      const results: string[] = [];
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) results.push(key);
      }
      return results;
    },
    async del(pathname) {
      store.delete(pathname);
    },
  };
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleSummaryA: PostSummary = {
  slug: "hello-world",
  title: "Hello World",
  excerpt: "A test post",
  date: "2024-01-01",
  tags: ["test"],
  readTime: 1,
};

const sampleSummaryB: PostSummary = {
  slug: "second-post",
  title: "Second Post",
  excerpt: "Another test post",
  date: "2024-02-01",
  tags: ["test", "second"],
  readTime: 2,
};

const sampleSummaryAUpdated: PostSummary = {
  ...sampleSummaryA,
  title: "Hello World (Updated)",
  excerpt: "Updated excerpt",
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let memBackend: BlobBackend;

before(() => {
  memBackend = makeInMemoryBackend();
  setBlobBackendForTesting(memBackend);
});

// ---------------------------------------------------------------------------
// path helpers
// ---------------------------------------------------------------------------

describe("path helpers", () => {
  it("getPostPath returns correct path", () => {
    assert.equal(getPostPath("hello-world"), "posts/hello-world.md");
  });

  it("getIndexPath returns correct path", () => {
    assert.equal(getIndexPath("page-123"), "index/page-123.json");
  });
});

// ---------------------------------------------------------------------------
// readManifest / writeManifest
// ---------------------------------------------------------------------------

describe("readManifest / writeManifest", () => {
  it("readManifest returns [] when manifest absent", async () => {
    const result = await readManifest();
    assert.deepEqual(result, []);
  });

  it("writeManifest then readManifest returns stored array", async () => {
    await writeManifest([sampleSummaryA, sampleSummaryB]);
    const result = await readManifest();
    // Should be sorted by date descending: B (Feb) before A (Jan)
    assert.equal(result.length, 2);
    assert.equal(result[0].slug, "second-post");
    assert.equal(result[1].slug, "hello-world");
  });

  it("readManifest returns [] on corrupt JSON", async () => {
    // Corrupt the stored manifest
    await memBackend.put("posts-manifest.json", "not valid json", "application/json");
    const result = await readManifest();
    assert.deepEqual(result, []);
    // restore a clean state for subsequent tests
    await writeManifest([sampleSummaryA]);
  });
});

// ---------------------------------------------------------------------------
// upsertManifestEntry / removeManifestEntry
// ---------------------------------------------------------------------------

describe("upsertManifestEntry / removeManifestEntry", () => {
  before(async () => {
    await writeManifest([]);
  });

  it("upsertManifestEntry adds a new entry", async () => {
    await upsertManifestEntry(sampleSummaryA);
    const manifest = await readManifest();
    assert.equal(manifest.length, 1);
    assert.equal(manifest[0].slug, "hello-world");
  });

  it("upsertManifestEntry adds a second entry", async () => {
    await upsertManifestEntry(sampleSummaryB);
    const manifest = await readManifest();
    assert.equal(manifest.length, 2);
  });

  it("upsertManifestEntry replaces existing entry with same slug (no duplicates)", async () => {
    await upsertManifestEntry(sampleSummaryAUpdated);
    const manifest = await readManifest();
    assert.equal(manifest.length, 2);
    const found = manifest.find((e) => e.slug === "hello-world");
    assert.ok(found);
    assert.equal(found.title, "Hello World (Updated)");
  });

  it("removeManifestEntry removes the slug and returns true", async () => {
    const removed = await removeManifestEntry("hello-world");
    assert.equal(removed, true);
    const manifest = await readManifest();
    assert.equal(manifest.length, 1);
    assert.equal(manifest[0].slug, "second-post");
  });

  it("removeManifestEntry returns false when slug absent", async () => {
    const removed = await removeManifestEntry("nonexistent-slug");
    assert.equal(removed, false);
  });
});

// ---------------------------------------------------------------------------
// writePostMarkdown / readPostMarkdown / deletePostMarkdown
// ---------------------------------------------------------------------------

describe("post markdown operations", () => {
  const slug = "test-markdown-post";
  const content = "# Hello\n\nThis is the post content.";

  it("readPostMarkdown returns null when absent", async () => {
    const result = await readPostMarkdown(slug);
    assert.equal(result, null);
  });

  it("writePostMarkdown + readPostMarkdown round-trip", async () => {
    const { url } = await writePostMarkdown(slug, content);
    assert.ok(typeof url === "string" && url.length > 0);
    const read = await readPostMarkdown(slug);
    assert.equal(read, content);
  });

  it("deletePostMarkdown returns true when post exists", async () => {
    const deleted = await deletePostMarkdown(slug);
    assert.equal(deleted, true);
    const read = await readPostMarkdown(slug);
    assert.equal(read, null);
  });

  it("deletePostMarkdown returns false when post absent", async () => {
    const deleted = await deletePostMarkdown(slug);
    assert.equal(deleted, false);
  });
});

// ---------------------------------------------------------------------------
// writeIndexEntry / readIndexEntry / deleteIndexEntry / listIndexEntries / findIndexEntryBySlug
// ---------------------------------------------------------------------------

describe("index entry operations", () => {
  const pageId1 = "page-abc-123";
  const slug1 = "my-first-post";
  const pageId2 = "page-def-456";
  const slug2 = "my-second-post";

  before(async () => {
    // Clean up any existing index entries from previous tests
    await memBackend.del(getIndexPath(pageId1));
    await memBackend.del(getIndexPath(pageId2));
  });

  it("readIndexEntry returns null when absent", async () => {
    const result = await readIndexEntry(pageId1);
    assert.equal(result, null);
  });

  it("writeIndexEntry + readIndexEntry round-trip", async () => {
    await writeIndexEntry(pageId1, slug1);
    const result = await readIndexEntry(pageId1);
    assert.ok(result !== null);
    assert.equal(result.pageId, pageId1);
    assert.equal(result.slug, slug1);
  });

  it("listIndexEntries returns all index entries", async () => {
    await writeIndexEntry(pageId2, slug2);
    const entries = await listIndexEntries();
    assert.equal(entries.length, 2);
    const ids = entries.map((e) => e.pageId).sort();
    assert.deepEqual(ids, [pageId1, pageId2].sort());
  });

  it("findIndexEntryBySlug finds the right entry", async () => {
    const found = await findIndexEntryBySlug(slug1);
    assert.ok(found !== null);
    assert.equal(found.pageId, pageId1);
    assert.equal(found.slug, slug1);
  });

  it("findIndexEntryBySlug returns null for unknown slug", async () => {
    const found = await findIndexEntryBySlug("nonexistent-slug");
    assert.equal(found, null);
  });

  it("deleteIndexEntry returns true when entry exists", async () => {
    const deleted = await deleteIndexEntry(pageId1);
    assert.equal(deleted, true);
    const read = await readIndexEntry(pageId1);
    assert.equal(read, null);
  });

  it("deleteIndexEntry returns false when entry absent", async () => {
    const deleted = await deleteIndexEntry(pageId1);
    assert.equal(deleted, false);
  });
});

// ---------------------------------------------------------------------------
// Restore default backend (teardown)
// ---------------------------------------------------------------------------

describe("teardown", () => {
  it("restores the default backend via setBlobBackendForTesting(null)", () => {
    setBlobBackendForTesting(null);
    // No assertion needed; the function must not throw
    assert.ok(true);
  });
});
