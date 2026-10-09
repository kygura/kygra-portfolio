import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPath, parseRoute, readerPath, sectionPath, stepSection, SECTIONS, type Route } from "./routes.ts";

const r = (section: Route["section"], reader: Route["reader"] = null, slug: string | null = null): Route => ({
  section,
  reader,
  slug,
});

describe("parseRoute (SPEC 4)", () => {
  const table: [string, Route][] = [
    ["/", r("projects")],
    ["/projects", r("projects")],
    ["/projects/hyperion", r("projects", "dossier", "hyperion")],
    ["/writings", r("notes")],
    ["/writings/thaumazein", r("notes", "post", "thaumazein")],
    ["/links", r("links")],
    ["/now", r("now")],
    ["/guestbook", r("log")],
    ["/cv", r("links", "cv")],
    ["/about", r(null, "about")],
    ["/does-not-exist", r("projects", "404")],
    ["/projects/a/b", r("projects", "404")],
  ];
  for (const [path, want] of table) {
    it(path, () => assert.deepEqual(parseRoute(path), want));
  }

  it("redirects /artifacts to /", () => assert.equal(parseRoute("/artifacts").redirect, "/"));
  it("ignores trailing slashes, query and hash", () => {
    assert.deepEqual(parseRoute("/writings/"), r("notes"));
    assert.deepEqual(parseRoute("/now?x=1#y"), r("now"));
  });
  it("matches fixed segments case-insensitively like react-router", () =>
    assert.deepEqual(parseRoute("/Writings"), r("notes")));
  it("decodes slugs and treats malformed escapes as 404", () => {
    assert.equal(parseRoute("/writings/a%20b").slug, "a b");
    assert.equal(parseRoute("/writings/%E0%A4%A").reader, "404");
  });
});

describe("route builders", () => {
  it("section paths", () => {
    assert.deepEqual(
      SECTIONS.map(sectionPath),
      ["/projects", "/writings", "/links", "/now", "/guestbook"],
    );
  });
  it("reader paths round-trip through parseRoute", () => {
    assert.equal(readerPath("post", "the-perpetual-i"), "/writings/the-perpetual-i");
    assert.equal(readerPath("dossier", "noted"), "/projects/noted");
    for (const p of ["/projects/noted", "/writings/thaumazein", "/cv", "/about", "/links", "/guestbook"]) {
      assert.equal(buildPath(parseRoute(p)), p);
    }
  });
  it("/about keeps the current section path", () => assert.equal(buildPath(r(null), "now"), "/now"));
  it("stepSection wraps through five sections", () => {
    assert.equal(stepSection("projects", -1), "log");
    assert.equal(stepSection("log", 1), "projects");
    assert.equal(stepSection("notes", 7), "now");
  });
});
