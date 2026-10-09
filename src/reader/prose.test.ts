import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calloutTone, calloutType, headingShift, shiftedLevel, stripCallout } from "./prose.ts";

describe("callouts (A4)", () => {
  it("detects every GitHub alert marker", () => {
    for (const t of ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"]) assert.equal(calloutType(`[!${t}]\nbody`), t);
  });
  it("allows leading whitespace and any case", () => {
    assert.equal(calloutType("\n  [!note] hi"), "NOTE");
  });
  it("ignores plain quotes and markers that are not first", () => {
    assert.equal(calloutType("just a quote"), null);
    assert.equal(calloutType("see [!NOTE] later"), null);
    assert.equal(calloutType("[!DANGER] x"), null);
  });
  it("strips the marker and the whitespace after it", () => {
    assert.equal(stripCallout("[!TIP]\nUse the force."), "Use the force.");
    assert.equal(stripCallout("no marker"), "no marker");
  });
  it("maps tones: warning/caution glitch, the rest acc2", () => {
    assert.equal(calloutTone("WARNING"), "warn");
    assert.equal(calloutTone("CAUTION"), "warn");
    assert.equal(calloutTone("NOTE"), "info");
    assert.equal(calloutTone("IMPORTANT"), "info");
  });
});

describe("heading levels under the Reader title", () => {
  it("puts the shallowest heading at h3", () => {
    assert.equal(headingShift("## A\n### B"), 1);
    assert.equal(headingShift("# A\n## B"), 2);
    assert.equal(headingShift("### only"), 0);
  });
  it("ignores headings inside fenced code", () => {
    assert.equal(headingShift("```sh\n# comment\n```\n## Real"), 1);
    assert.equal(headingShift("~~~\n# x\n~~~"), 0);
  });
  it("ignores hashtags that are not headings", () => {
    assert.equal(headingShift("#tag and text\n## Real"), 1);
  });
  it("is 0 without headings", () => {
    assert.equal(headingShift("plain prose"), 0);
  });
  it("clamps shifted levels to h3..h6", () => {
    assert.equal(shiftedLevel(2, 1), 3);
    assert.equal(shiftedLevel(6, 2), 6);
    assert.equal(shiftedLevel(1, 0), 3);
  });
});
