import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { defineProject, type ProjectDraft } from "../lib/project-schema.ts";
import { handle, links, now, quotes } from "../content/site.ts";
import {
  LOG_COOLDOWN_MS,
  charCount,
  cooldownLeft,
  dotLeader,
  formatDate,
  formatReadTime,
  langCode,
  linkRows,
  logRows,
  matchesFilter,
  mergeEntries,
  noteRow,
  nowRows,
  parseQuote,
  pickQuote,
  projectRow,
  truncate,
  validateSign,
  type LogEntry,
} from "./model.ts";

const projectsDir = path.resolve(import.meta.dirname, "../../content/projects");
const realProjects = fs
  .readdirSync(projectsDir)
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => defineProject({ slug: f.replace(/\.yaml$/, ""), ...(yaml.load(fs.readFileSync(path.join(projectsDir, f), "utf8")) as ProjectDraft) }));

describe("format helpers", () => {
  it("truncate cuts hard with ~", () => {
    assert.equal(truncate("hyperion", 26), "hyperion");
    assert.equal(truncate("abcdefgh", 5), "abcd~");
    assert.equal(truncate("abcde", 5), "abcde");
    assert.equal(truncate("日本語テキスト", 4), "日本語~");
  });
  it("formatDate gives YYYY-MM-DD", () => {
    assert.equal(formatDate("2026-04-15T08:57:00.000Z"), "2026-04-15");
    assert.equal(formatDate("2026-09-14"), "2026-09-14");
    assert.equal(formatDate("April 2, 2026 UTC"), "2026-04-02");
    assert.equal(formatDate(""), "----------");
    assert.equal(formatDate("soon"), "----------");
  });
  it("read time is <n>m", () => {
    assert.equal(formatReadTime(7), "7m");
    assert.equal(formatReadTime(0), "--m");
  });
  it("dot leaders pad to 18", () => assert.equal(dotLeader("github"), "github ..........."));
});

describe("langCode (SPEC 5.3)", () => {
  it("maps known names", () => {
    assert.deepEqual(
      ["TypeScript", "JavaScript", "Python", "Solidity", "Go", "Rust", "C", "React", "MapLibre GL JS"].map((s) => langCode([s])),
      ["ts", "js", "py", "sol", "go", "rs", "c", "tsx", "gl"],
    );
  });
  it("falls back to 4 lowercase letters, -- when empty", () => {
    assert.equal(langCode(["Next.js"]), "next");
    assert.equal(langCode(["C++"]), "c");
    assert.equal(langCode([]), "--");
    assert.equal(langCode(undefined), "--");
  });
  it("current data yields the SPEC table", () => {
    const got = Object.fromEntries(realProjects.map((p) => [p.slug, projectRow(p).lang]));
    assert.deepEqual(got, {
      equilibria: "--",
      hyperion: "ts",
      "lexis-editorial-companion": "tsx",
      meridian: "gl",
      noted: "tsx",
      swarm: "ts",
    });
  });
});

describe("row view models", () => {
  it("project rows carry inspector fields and links", () => {
    const eq = projectRow(realProjects.find((p) => p.slug === "equilibria")!);
    assert.equal(eq.name, "Equilibria");
    assert.equal(eq.type, "Algorithmic Flatcoin");
    assert.equal(eq.status, "in development");
    assert.equal(eq.stack, "--");
    assert.equal(eq.live, "https://equilibria.cash");
    assert.equal(eq.src, "https://github.com/kygura/equilibria-protocol");
    assert.equal(eq.primary, eq.live);
    assert.equal(eq.dossier, "/projects/equilibria");
    const hy = projectRow(realProjects.find((p) => p.slug === "hyperion")!);
    assert.equal(hy.live, null);
    assert.equal(hy.primary, hy.src);
    assert.ok(hy.stack.length <= 24 && hy.stack.endsWith("~"));
    assert.ok(matchesFilter(hy, "TRADING"));
  });
  it("note rows: date, cut title, read time, fallback tags", () => {
    const n = noteRow({
      slug: "thaumazein",
      title: "A Philosophy of Pragmatic Sovereignty",
      excerpt: "x",
      date: "2026-04-15T08:57:00.000Z",
      tags: [],
      readTime: 3,
    });
    assert.equal(n.date, "2026-04-15");
    assert.equal(n.label, "A Philosophy of Pragm~");
    assert.equal(n.read, "3m");
    assert.deepEqual(n.tags, ["philosophy"]);
    assert.equal(n.path, "/writings/thaumazein");
    assert.ok(matchesFilter(n, "philo") && !matchesFilter(n, "politics"));
  });
  it("links section has github, email, cv, cv.pdf, log", () => {
    const rows = linkRows(links);
    assert.deepEqual(rows.map((r) => r.id), ["github", "email", "cv", "cv.pdf", "log"]);
    assert.equal(rows[1].handle, "ncerratoanton@gmail.com");
    assert.equal(rows[3].href, "/CV_NCA.pdf");
  });
  it("now has at most 3 items", () => assert.equal(nowRows([...now.items, "x", "y"]).length, 3));
  it("handle bio is <= 240 chars", () => assert.ok(handle.bio.length <= 240));
});

describe("fortune", () => {
  it("splits <br> translations", () => {
    assert.deepEqual(parseQuote("Die Welt ist meine Vorstellung. <br>The world is my representation."), {
      text: "Die Welt ist meine Vorstellung.",
      translation: "The world is my representation.",
    });
    assert.deepEqual(parseQuote("Hell is other people."), { text: "Hell is other people.", translation: null });
  });
  it("picks an index in range", () => {
    assert.equal(pickQuote(quotes.length, () => 0.9999999), quotes.length - 1);
    assert.equal(pickQuote(0), -1);
  });
});

describe("guestbook helpers", () => {
  it("validates at the trust boundary", () => {
    assert.deepEqual(validateSign("  ", " hello \u0007 "), { ok: true, name: "anon", message: "hello" });
    assert.equal(validateSign("x", "   ").ok, false);
    assert.equal(validateSign("x", "a".repeat(281)).ok, false);
    assert.equal(validateSign("x", "a".repeat(280)).ok, true);
    assert.equal(validateSign("n".repeat(33), "hi").ok, false);
    assert.equal(charCount("日本"), 2);
  });
  it("cooldown is 30s", () => {
    assert.equal(cooldownLeft(null, 5), 0);
    assert.equal(cooldownLeft(1000, 1000), LOG_COOLDOWN_MS);
    assert.equal(cooldownLeft(1000, 1000 + LOG_COOLDOWN_MS + 1), 0);
  });
  const e = (id: string, t: string, extra: Partial<LogEntry> = {}): LogEntry => ({
    id,
    name: "n",
    message: "m",
    created_at: t,
    ...extra,
  });
  it("merges by id, newest first", () => {
    const merged = mergeEntries([e("a", "2026-01-01"), e("b", "2026-01-03")], [e("a", "2026-01-01", { name: "z" }), e("c", "2026-01-02")]);
    assert.deepEqual(merged.map((x) => x.id), ["b", "c", "a"]);
    assert.equal(merged[2].name, "z");
  });
  it("log rows: + sign first, + more last, offline collapses", () => {
    const rows = logRows([e("a", "2026-01-01", { name: "a very long visitor name" })], { online: true, hasMore: true });
    assert.deepEqual(rows.map((r) => r.kind), ["sign", "entry", "more"]);
    const entry = rows[1];
    assert.ok(entry.kind === "entry" && entry.name === "a very lo~" && entry.date === "2026-01-01");
    const off = logRows([], { online: false, hasMore: true });
    assert.deepEqual(off, [{ kind: "sign", key: "sign", text: "+ sign", offline: true }]);
  });
});
