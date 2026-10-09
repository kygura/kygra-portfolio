import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractPostMetadata,
  getPageDataSourceId,
} from "./metadata.ts";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeFullPage() {
  return {
    id: "abc-123",
    created_time: "2026-05-01T00:00:00.000Z",
    last_edited_time: "2026-05-24T12:00:00.000Z",
    parent: { type: "database_id", database_id: "db-999" },
    properties: {
      Title: {
        type: "title",
        title: [{ plain_text: "On the Ego" }],
      },
      "Publication Date": {
        type: "date",
        date: { start: "2026-05-24" },
      },
      Keywords: {
        type: "multi_select",
        multi_select: [{ name: "philosophy" }, { name: "self" }],
      },
      Published: {
        type: "checkbox",
        checkbox: true,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("extractPostMetadata", () => {
  it("extracts all fields from a full page fixture", () => {
    const meta = extractPostMetadata(makeFullPage());

    assert.equal(meta.pageId, "abc-123");
    assert.equal(meta.title, "On the Ego");
    assert.equal(meta.slug, "on-the-ego");
    assert.equal(meta.date, "2026-05-24");
    assert.deepEqual(meta.tags, ["philosophy", "self"]);
    assert.equal(meta.published, true);
    assert.equal(meta.excerpt, "");
    assert.equal(meta.createdTime, "2026-05-01T00:00:00.000Z");
    assert.equal(meta.lastEditedTime, "2026-05-24T12:00:00.000Z");
  });

  it("falls back to created_time when Publication Date is null", () => {
    const page = makeFullPage();
    (page.properties["Publication Date"] as any).date = null;
    const meta = extractPostMetadata(page);
    assert.equal(meta.date, "2026-05-01T00:00:00.000Z");
  });

  it("falls back to created_time when Publication Date property is absent", () => {
    const page = makeFullPage();
    delete (page.properties as any)["Publication Date"];
    const meta = extractPostMetadata(page);
    assert.equal(meta.date, "2026-05-01T00:00:00.000Z");
  });

  it("uses optional Slug rich_text in preference to title-derived slug", () => {
    const page = makeFullPage();
    (page.properties as any)["Slug"] = {
      type: "rich_text",
      rich_text: [{ plain_text: "custom-slug" }],
    };
    const meta = extractPostMetadata(page);
    assert.equal(meta.slug, "custom-slug");
  });

  it("populates excerpt from optional Description rich_text", () => {
    const page = makeFullPage();
    (page.properties as any)["Description"] = {
      type: "rich_text",
      rich_text: [{ plain_text: "A short description." }],
    };
    const meta = extractPostMetadata(page);
    assert.equal(meta.excerpt, "A short description.");
  });

  it("defaults published to false when Published checkbox is absent", () => {
    const page = makeFullPage();
    delete (page.properties as any)["Published"];
    const meta = extractPostMetadata(page);
    assert.equal(meta.published, false);
  });

  it("uses page.id as title fallback when Title is empty", () => {
    const page = makeFullPage();
    (page.properties["Title"] as any).title = [];
    const meta = extractPostMetadata(page);
    assert.equal(meta.title, "abc-123");
  });

  it("falls back to last_edited_time for createdTime when created_time is absent", () => {
    const page: any = {
      id: "xyz-456",
      last_edited_time: "2026-05-20T00:00:00.000Z",
      properties: {
        Title: { type: "title", title: [{ plain_text: "No Create Time" }] },
        "Publication Date": { type: "date", date: { start: "2026-05-20" } },
        Keywords: { type: "multi_select", multi_select: [] },
        Published: { type: "checkbox", checkbox: false },
      },
    };
    const meta = extractPostMetadata(page);
    assert.equal(meta.createdTime, "2026-05-20T00:00:00.000Z");
    assert.equal(meta.lastEditedTime, "2026-05-20T00:00:00.000Z");
  });

  it("falls back to alternate property key 'Tags' for tags", () => {
    const page = makeFullPage();
    delete (page.properties as any)["Keywords"];
    (page.properties as any)["Tags"] = {
      type: "multi_select",
      multi_select: [{ name: "alt-tag" }],
    };
    const meta = extractPostMetadata(page);
    assert.deepEqual(meta.tags, ["alt-tag"]);
  });

  it("returns empty tags array when multi_select is absent", () => {
    const page = makeFullPage();
    delete (page.properties as any)["Keywords"];
    const meta = extractPostMetadata(page);
    assert.deepEqual(meta.tags, []);
  });
});

describe("getPageDataSourceId", () => {
  it("returns data_source_id when parent type is data_source_id", () => {
    const page = { id: "p1", parent: { type: "data_source_id", data_source_id: "ds-abc" } };
    assert.equal(getPageDataSourceId(page), "ds-abc");
  });

  it("returns database_id when parent type is database_id", () => {
    const page = { id: "p2", parent: { type: "database_id", database_id: "db-xyz" } };
    assert.equal(getPageDataSourceId(page), "db-xyz");
  });

  it("returns null for unknown parent type", () => {
    const page = { id: "p3", parent: { type: "workspace" } };
    assert.equal(getPageDataSourceId(page), null);
  });

  it("returns null when parent is absent", () => {
    const page = { id: "p4" };
    assert.equal(getPageDataSourceId(page), null);
  });

  it("returns null when data_source_id value is undefined", () => {
    const page = { id: "p5", parent: { type: "data_source_id" } };
    assert.equal(getPageDataSourceId(page), null);
  });
});
