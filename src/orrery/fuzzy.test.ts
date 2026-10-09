import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fuzzy, rank, segments, toRanges } from "./fuzzy.ts";

describe("fuzzy", () => {
  it("matches subsequences case-insensitively", () => {
    const m = fuzzy("TPh", "theme phosphor");
    assert.ok(m);
    assert.deepEqual(m.indices, [0, 6, 7]);
    assert.deepEqual(m.ranges, [[0, 1], [6, 8]]);
  });
  it("returns null when a character is missing or out of order", () => {
    assert.equal(fuzzy("xyz", "theme"), null);
    assert.equal(fuzzy("et", "te"), null);
  });
  it("empty query matches with score 0", () => assert.deepEqual(fuzzy("", "abc"), { score: 0, indices: [], ranges: [] }));
  it("scores by skipped characters", () => {
    assert.equal(fuzzy("mo", "motion on")?.score, 0);
    assert.equal(fuzzy("mn", "motion on")?.score, 4);
  });
  it("merges adjacent indices into ranges", () => assert.deepEqual(toRanges([1, 2, 3, 5]), [[1, 4], [5, 6]]));
  it("rank sorts by score, keeps table order on ties, and limits", () => {
    const items = ["notes", "now", "links", "log"];
    assert.deepEqual(rank("no", items, (s) => s).map((r) => r.item), ["notes", "now"]);
    assert.deepEqual(rank("l", items, (s) => s, 1).map((r) => r.item), ["links"]);
    assert.deepEqual(rank("ow", items, (s) => s).map((r) => r.item), ["now"]);
  });
  it("segments split text into highlight runs", () => {
    assert.deepEqual(segments("look", [[0, 1], [3, 4]]), [
      { text: "l", hit: true },
      { text: "oo", hit: false },
      { text: "k", hit: true },
    ]);
  });
});
