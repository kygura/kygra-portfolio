import assert from "node:assert/strict";
import test from "node:test";
import {
  blocksFraming,
  buildShowcase,
  createDescriber,
  findSocialImage,
  liveUrlFor,
  rankRepos,
  readmeSummary,
  type GithubRepo,
} from "./repos.ts";

const NOW = new Date("2026-10-21T00:00:00Z");

/** GitHub's JSON README response: base64 content plus the blob SHA. */
function readmeResponse(text: string, sha = "sha-1"): Response {
  return Response.json({ sha, encoding: "base64", content: Buffer.from(text).toString("base64") });
}

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
    private: false,
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

test("flagship is an optional boost: tagged repos lead, untagged ones still show", () => {
  const ranked = rankRepos(
    [
      repo("popular", { stargazers_count: 40 }),
      repo("swarm", { topics: ["flagship"], archived: true }),
      repo("polytech", { topics: ["flagship"], private: true, pushed_at: "2026-10-20T00:00:00Z" }),
      repo("quiet"),
    ],
    "kygura",
    NOW,
    10,
  );
  assert.deepEqual(ranked.map((r) => r.name), ["polytech", "swarm", "popular", "quiet"]);
});

test("leaves out the site's own repo", () => {
  const ranked = rankRepos([repo("kygra-portfolio"), repo("lexis")], "kygura", NOW, 10, "kygra-portfolio");
  assert.deepEqual(ranked.map((r) => r.name), ["lexis"]);
});

test("drops forks, hidden repos and the profile repo, but keeps archived ones", () => {
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
  assert.deepEqual(ranked.map((r) => r.name), ["keep", "archived"]);
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

test("keeps only live deployments: frame when allowed, og:image when blocked, card when no image", async () => {
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://api.github.com/repos/kygura/framed/readme") {
      return readmeResponse("# framed\n\nA framed site that renders straight into the software index preview.");
    }
    if (url.endsWith("/readme")) return new Response("Not Found", { status: 404 });
    if (url.startsWith("https://api.github.com/users/")) {
      return Response.json([
        repo("framed", { stargazers_count: 5, homepage: "https://framed.dev", topics: ["flagship", "web"] }),
        repo("blocked", { stargazers_count: 4, homepage: "https://blocked.dev", topics: ["flagship"] }),
        repo("plain", { stargazers_count: 3, homepage: "https://plain.dev", topics: ["flagship"] }),
        repo("slow", { stargazers_count: 2, homepage: "https://slow.dev", topics: ["flagship"] }),
        repo("gone", { stargazers_count: 2, homepage: "https://gone.dev", topics: ["flagship"] }),
        repo("parked", { stargazers_count: 2, homepage: "https://parked.dev", topics: ["flagship"] }),
        repo("private-app", { private: true, homepage: "https://private.dev", topics: ["flagship"] }),
        repo("code-only", { stargazers_count: 9, topics: ["flagship"] }),
      ]);
    }
    if (url.startsWith("https://framed.dev")) return new Response("<html></html>");
    if (url.startsWith("https://blocked.dev")) {
      return new Response('<meta property="og:image" content="/card.png">', {
        headers: { "x-frame-options": "DENY" },
      });
    }
    if (url.startsWith("https://plain.dev") || url.startsWith("https://private.dev")) {
      return new Response("<title>no og</title>", { headers: { "x-frame-options": "DENY" } });
    }
    if (url.startsWith("https://slow.dev")) throw new DOMException("timed out", "TimeoutError");
    if (url.startsWith("https://parked.dev")) return new Response("gone", { status: 404 });
    throw new TypeError("fetch failed"); // gone.dev: DNS failure
  }) as typeof fetch;

  const showcase = await buildShowcase({ user: "kygura", now: NOW, fetchImpl });
  const byName = Object.fromEntries(showcase.repos.map((r) => [r.name, r]));
  const previews = Object.fromEntries(showcase.repos.map((r) => [r.name, r.preview])) as Record<string, { kind: string; src?: string }>;

  assert.deepEqual(Object.keys(byName).sort(), ["blocked", "framed", "plain", "private-app", "slow"]);
  assert.equal(byName.framed.description, "A framed site that renders straight into the software index preview.");
  assert.deepEqual(byName.framed.topics, ["web"]); // internal topics stay off the page
  assert.deepEqual(previews.framed, { kind: "frame", src: "https://framed.dev/" });
  assert.deepEqual(previews.blocked, { kind: "image", src: "https://blocked.dev/card.png" });
  assert.match(previews.plain.src ?? "", /^https:\/\/opengraph\.githubassets\.com\/\d+\/kygura\/plain$/);
  assert.match(previews.slow.src ?? "", /opengraph\.githubassets\.com/);
  assert.deepEqual(previews["private-app"], { kind: "none" }); // GitHub has no public card for it
});

test("the cap applies after dropping repos without a deployment", async () => {
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.startsWith("https://api.github.com/users/")) {
      return Response.json([
        repo("no-site-a", { stargazers_count: 9 }),
        repo("no-site-b", { stargazers_count: 8 }),
        repo("site-a", { stargazers_count: 1, homepage: "https://a.dev" }),
        repo("site-b", { homepage: "https://b.dev" }),
      ]);
    }
    if (url.endsWith("/readme")) return new Response("", { status: 404 });
    return new Response("<html></html>");
  }) as typeof fetch;
  const showcase = await buildShowcase({ user: "kygura", now: NOW, limit: 2, fetchImpl });
  assert.deepEqual(showcase.repos.map((r) => r.name), ["site-a", "site-b"]);
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

test("model descriptions win over the README excerpt, and only kept repos are described", async () => {
  const described: string[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.startsWith("https://api.github.com/users/")) {
      return Response.json([
        repo("lexis", { stargazers_count: 3, homepage: "https://lexis.dev" }),
        repo("quiet", { stargazers_count: 2, homepage: "https://quiet.dev" }),
        repo("over-cap", { stargazers_count: 1, homepage: "https://over.dev" }),
      ]);
    }
    if (url.endsWith("/readme")) {
      return readmeResponse("# x\n\nA long enough opening paragraph that serves as the fallback excerpt.");
    }
    return new Response("<html></html>");
  }) as typeof fetch;

  const showcase = await buildShowcase({
    user: "kygura",
    now: NOW,
    limit: 2,
    fetchImpl,
    describe: async (r) => {
      described.push(r.name);
      return r.name === "lexis" ? "An editorial companion for long-form writers." : null;
    },
  });
  assert.deepEqual(described.sort(), ["lexis", "quiet"]);
  assert.equal(showcase.repos[0].description, "An editorial companion for long-form writers.");
  assert.equal(showcase.repos[1].description, "A long enough opening paragraph that serves as the fallback excerpt.");
});

function fakeClient(reply: { text: string; stop_reason?: string }, calls: unknown[]) {
  return {
    messages: {
      create: async (params: unknown) => {
        calls.push(params);
        return { stop_reason: reply.stop_reason ?? "end_turn", content: [{ type: "text", text: reply.text }] };
      },
    },
  } as never;
}

test("describer calls Haiku once per README version and rejects SKIP or refusals", async () => {
  const calls: unknown[] = [];
  const describe = createDescriber({ apiKey: "k", client: fakeClient({ text: " A terse tool. " }, calls) });
  const readme = { sha: "abc", text: "# lexis\n\nSomething." };
  assert.equal(await describe(repo("lexis"), readme), "A terse tool.");
  assert.equal(await describe(repo("lexis"), readme), "A terse tool.");
  assert.equal(calls.length, 1); // memoised by README SHA
  assert.equal((calls[0] as { model: string }).model, "claude-haiku-5-5");
  await describe(repo("lexis"), { ...readme, sha: "def" });
  assert.equal(calls.length, 2); // a changed README is described afresh

  const skip = createDescriber({ apiKey: "k", client: fakeClient({ text: "SKIP" }, []) });
  assert.equal(await skip(repo("thin"), readme), null);
  const refused = createDescriber({ apiKey: "k", client: fakeClient({ text: "x", stop_reason: "refusal" }, []) });
  assert.equal(await refused(repo("r"), readme), null);
});

test("a failed description is retried on the next request", async () => {
  let attempts = 0;
  const client = {
    messages: {
      create: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("overloaded");
        return { stop_reason: "end_turn", content: [{ type: "text", text: "Back up." }] };
      },
    },
  } as never;
  const describe = createDescriber({ apiKey: "k", client });
  const readme = { sha: "s", text: "t" };
  assert.equal(await describe(repo("a"), readme), null);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(await describe(repo("a"), readme), "Back up.");
});

test("a token switches to the owner's own listing, which includes private repos", async () => {
  const seen: string[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    seen.push(`${String(input)} ${new Headers(init?.headers).get("authorization") ?? ""}`);
    return Response.json([]);
  }) as typeof fetch;
  await buildShowcase({ user: "kygura", token: "t0k", fetchImpl });
  assert.match(seen[0], /^https:\/\/api\.github\.com\/user\/repos\?affiliation=owner&visibility=all.* Bearer t0k$/);
});

test("surfaces a GitHub failure instead of an empty index", async () => {
  const fetchImpl = (async () => new Response("rate limited", { status: 403 })) as typeof fetch;
  await assert.rejects(buildShowcase({ user: "kygura", fetchImpl }), /403/);
});
