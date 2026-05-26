import assert from "node:assert/strict";
import test from "node:test";

import { postSummarySchema, sortPostsByDateDesc } from "../../content/posts.ts";

test("post summaries tolerate missing dates from older Notion manifest entries", () => {
  const post = postSummarySchema.parse({
    slug: "missing-date",
    title: "Missing Date",
    readTime: 1,
  });

  assert.equal(post.date, "");
  assert.deepEqual(post.tags, []);
});

test("sortPostsByDateDesc keeps undated posts without producing NaN comparisons", () => {
  const posts = sortPostsByDateDesc([
    { slug: "undated", title: "Undated", date: "" },
    { slug: "dated", title: "Dated", date: "2026-01-01" },
  ]);

  assert.deepEqual(posts.map((post) => post.slug), ["dated", "undated"]);
});
