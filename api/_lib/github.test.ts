import assert from "node:assert/strict";
import test from "node:test";
import {
  blocksFraming,
  buildShowcase,
  findSocialImage,
  liveUrlFor,
  rankRepos,
  readmeSummary,
  type GithubRepo,
} from "./github.ts";

const NOW = new Date("2026-10-21T00:00:00Z");

function repo(name: string, overrides: Partial<GithubRepo> = {}): GithubRepo {
  return {
    name,
    full_name: `kygura/${name}`,
    html_url: `https://github.com/kygura/${name}`,
    description: null,
    homepage: null,
    stargazers_count: 0,
    forks_count: 0,
    language: "TypeScript",
    topics: [],
    pushed_at: "2026-01-01T00:00:00Z",
    fork: false,
    archived: false,
    has_pages: false,
    ...overrides,
  };
}

test("ranks by stars with a fading bonus for recent pushes", () => {
  const ranked = rankRepos(
    [
      repo("old-starred", { stargazers_count: 12, pushed_at: "2025-01-01T00:00:00Z" }),
      repo("fresh", { stargazers_count: 1, pushed_at: "2026-10-20T00:00:00Z" }),
      repo("stale", { stargazers_count: 1, pushed_at: "2025-06-01T00:00:00Z" }),
    ],
    "kygura",
    NOW,
    10,
  );
  assert.deepEqual(ranked.map((r) => r.name), ["old-starred", "fresh", "stale"]);
});

test("drops forks, archived repos, hidden repos and the profile repo", () => {
  const ranked = rankRepos(
    [
      repo("keep"),
      repo("forked", { fork: true }),
      repo("archived", { archived: true }),
      repo("hidden", { topics: ["portfolio-hide"] }),
      repo("Kygura"),
    ],
    "kygura",
    NOW,
    10,
  );
  assert.deepEqual(ranked.map((r) => r.name), ["keep"]);
});

test("live URL prefers the homepage, then GitHub Pages", () => {
  assert.equal(liveUrlFor(repo("a", { homepage: "example.com" }), "kygura"), "https://example.com/");
  assert.equal(liveUrlFor(repo("b", { homepage: "", has_pages: true }), "Kygura"), "https://kygura.github.io/b/");
  assert.equal(liveUrlFor(repo("kygura.github.io", { has_pages: true }), "kygura"), "https://kygura.github.io/");
  assert.equal(liveUrlFor(repo("c"), "kygura"), null);
});

test("detects pages that refuse to be framed", () => {
  assert.equal(blocksFraming(new Headers()), false);
  assert.equal(blocksFraming(new Headers({ "x-frame-options": "DENY" })), true);
  assert.equal(blocksFraming(new Headers({ "x-frame-options": "SAMEORIGIN" })), true);
  assert.equal(blocksFraming(new Headers({ "content-security-policy": "frame-ancestors 'self'" })), true);
  assert.equal(blocksFraming(new Headers({ "content-security-policy": "default-src 'self'; frame-ancestors *" })), false);
  assert.equal(blocksFraming(new Headers({ "content-security-policy": "default-src 'self'" })), false);
});

test("finds og:image in either attribute order and resolves relative URLs", () => {
  assert.equal(
    findSocialImage('<meta content="/og.png" property="og:image">', "https://site.dev/app/"),
    "https://site.dev/og.png",
  );
  assert.equal(
    findSocialImage('<meta name="twitter:image" content="https://cdn.dev/t.png" />', "https://site.dev"),
    "https://cdn.dev/t.png",
  );
  assert.equal(findSocialImage("<title>none</title>", "https://site.dev"), null);
});

test("builds previews: frame when allowed, og:image when blocked, card otherwise", async () => {
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://api.github.com/repos/kygura/framed/readme") {
      return new Response("# framed\n\nA framed site that renders straight into the software index preview.");
    }
    if (url.endsWith("/readme")) return new Response("Not Found", { status: 404 });
    if (url.startsWith("https://api.github.com/users/")) {
      return Response.json([
        repo("framed", { stargazers_count: 3, homepage: "https://framed.dev" }),
        repo("blocked", { stargazers_count: 2, homepage: "https://blocked.dev" }),
        repo("offline", { stargazers_count: 1, homepage: "https://offline.dev" }),
        repo("code-only"),
      ]);
    }
    if (url.startsWith("https://framed.dev")) return new Response("<html></html>");
    if (url.startsWith("https://blocked.dev")) {
      return new Response('<meta property="og:image" content="/card.png">', {
        headers: { "x-frame-options": "DENY" },
      });
    }
    throw new Error("network down");
  }) as typeof fetch;

  const showcase = await buildShowcase({ user: "kygura", now: NOW, fetchImpl });
  const descriptions = Object.fromEntries(showcase.repos.map((r) => [r.name, r.description]));
  assert.equal(descriptions.framed, "A framed site that renders straight into the software index preview.");
  assert.equal(descriptions.blocked, null); // no README, no About line
  const previews = Object.fromEntries(showcase.repos.map((r) => [r.name, r.preview]));

  assert.deepEqual(previews.framed, { kind: "frame", src: "https://framed.dev/" });
  assert.deepEqual(previews.blocked, { kind: "image", src: "https://blocked.dev/card.png" });
  assert.equal(previews.offline.kind, "image");
  assert.match(previews.offline.src, /^https:\/\/opengraph\.githubassets\.com\/\d+\/kygura\/offline$/);
  assert.match(previews["code-only"].src, /opengraph\.githubassets\.com/);
});

test("README summary skips banners, badges and code to the opening prose", () => {
  const readme = [
    "<p align=\"center\"><img src=\"logo.png\"></p>",
    "# Hyperion",
    "[![CI](https://x/badge.svg)](https://x) [![npm](https://y/badge.svg)](https://y)",
    "<!-- intro -->",
    "An **agentic** trading system for [Hyperliquid](https://hyperliquid.xyz) that turns `plain language` into orders.",
    "```bash\nbun install\n```",
    "Deterministic risk guards sit between the agent and real capital.",
    "## Install",
    "Run the thing.",
  ].join("\n\n");
  assert.equal(
    readmeSummary(readme, "hyperion"),
    "An agentic trading system for Hyperliquid that turns plain language into orders. " +
      "Deterministic risk guards sit between the agent and real capital.",
  );
});

test("README summary returns null when there is no prose, and clips long text", () => {
  assert.equal(readmeSummary("# repo\n\n- a list\n- only", "repo"), null);
  const long = readmeSummary(`${"Word ".repeat(200)}`, "repo");
  assert.ok(long && long.length <= 601 && long.endsWith("…"));
});

test("surfaces a GitHub failure instead of an empty index", async () => {
  const fetchImpl = (async () => new Response("rate limited", { status: 403 })) as typeof fetch;
  await assert.rejects(buildShowcase({ user: "kygura", fetchImpl }), /403/);
});
