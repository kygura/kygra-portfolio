import Anthropic from "@anthropic-ai/sdk";
import { get as getBlob, put as putBlob } from "@vercel/blob";

/**
 * GET /api/github/repos — the software index, built from the GitHub API: the
 * owner's repositories that have a working live site (private ones too,
 * given a token that can read them), ranked by stars and recent pushes, each with
 * the best preview its live site allows (an embedded frame, its og:image, or
 * GitHub's generated social card).
 */

const GITHUB_API = "https://api.github.com";

/** Repos tagged with this topic never appear in the index. */
export const HIDE_TOPIC = "portfolio-hide";

/** Optional: repos tagged with this topic rank ahead of the rest. */
export const FLAGSHIP_TOPIC = "flagship";

/** Bookkeeping topics that steer the index but say nothing to a visitor. */
const INTERNAL_TOPICS = new Set([HIDE_TOPIC, FLAGSHIP_TOPIC]);

export interface GithubRepo {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  private: boolean;
  has_pages: boolean;
}

export type RepoPreview =
  | { kind: "frame"; src: string }
  | { kind: "image"; src: string }
  | { kind: "none" };

export interface ShowcaseRepo {
  name: string;
  fullName: string;
  /** Haiku's short take on the README, else its opening prose, else the "About" line. */
  description: string | null;
  url: string;
  /** Always set: repos without a working deployment never reach the page. */
  liveUrl: string;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  pushedAt: string;
  archived: boolean;
  /** Private repos get no source link: visitors would hit a 404. */
  private: boolean;
  /** GitHub's social card, the placeholder while a frame loads; private repos have none. */
  card: string | null;
  preview: RepoPreview;
}

export interface Showcase {
  user: string;
  generatedAt: string;
  repos: ShowcaseRepo[];
}

type Fetch = typeof fetch;

/** A README as GitHub serves it: the blob SHA changes whenever the text does. */
export interface Readme {
  sha: string;
  text: string;
}

/** Turns a README into a short description, or null to fall back to the excerpt. */
export type Describe = (repo: GithubRepo, readme: Readme) => Promise<string | null>;

interface ShowcaseOptions {
  /** Optional model-written descriptions; without it cards use the README excerpt. */
  describe?: Describe | null;
  user: string;
  /** The repo this site deploys from, left out so the page never frames itself. */
  selfRepo?: string | null;
  token?: string | null;
  limit?: number;
  now?: Date;
  fetchImpl?: Fetch;
}

const DAY_MS = 86_400_000;

/**
 * Stars count in full; a push in the last few weeks is worth a handful of
 * stars and fades over about two months, so a busy new repo can sit beside
 * an older starred one.
 */
export function scoreRepo(repo: GithubRepo, now: Date): number {
  const days = Math.max(0, (now.getTime() - Date.parse(repo.pushed_at)) / DAY_MS);
  return repo.stargazers_count + 6 * Math.exp(-days / 60);
}

const hasTopic = (repo: GithubRepo, topic: string) => (repo.topics ?? []).includes(topic);

/**
 * Every repo of the owner's own (archived ones included: a working deployment
 * is the bar, checked later), minus forks, hidden repos, the profile README
 * repo and this site's own repo. Flagship repos lead; stars and recency order
 * the rest.
 */
export function rankRepos(
  repos: GithubRepo[],
  user: string,
  now: Date,
  limit: number,
  selfRepo?: string | null,
): GithubRepo[] {
  const skip = new Set([user.toLowerCase(), selfRepo?.toLowerCase()]);
  return repos
    .filter((repo) => !repo.fork && !hasTopic(repo, HIDE_TOPIC) && !skip.has(repo.name.toLowerCase()))
    .sort(
      (a, b) =>
        Number(hasTopic(b, FLAGSHIP_TOPIC)) - Number(hasTopic(a, FLAGSHIP_TOPIC)) ||
        scoreRepo(b, now) - scoreRepo(a, now) ||
        b.pushed_at.localeCompare(a.pushed_at),
    )
    .slice(0, limit);
}

/** The repo's homepage if it is a web URL, else its GitHub Pages site. */
export function liveUrlFor(repo: GithubRepo, user: string): string | null {
  const homepage = repo.homepage?.trim();
  if (homepage) {
    const withScheme = /^https?:\/\//i.test(homepage) ? homepage : `https://${homepage}`;
    try {
      const url = new URL(withScheme);
      if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
    } catch {
      // not a URL; fall through
    }
  }
  if (repo.has_pages) {
    const owner = user.toLowerCase();
    return repo.name.toLowerCase() === `${owner}.github.io`
      ? `https://${owner}.github.io/`
      : `https://${owner}.github.io/${repo.name}/`;
  }
  return null;
}

/** True when the response headers forbid embedding the page in our frame. */
export function blocksFraming(headers: Headers): boolean {
  const xfo = headers.get("x-frame-options");
  if (xfo && /deny|sameorigin/i.test(xfo)) return true;

  const csp = headers.get("content-security-policy");
  const ancestors = csp?.match(/frame-ancestors([^;]*)/i)?.[1].trim();
  if (ancestors !== undefined) {
    // Anything short of a wildcard would need our exact origin listed.
    return !ancestors.split(/\s+/).some((source) => source === "*" || source === "https:");
  }
  return false;
}

/** Pulls og:image / twitter:image out of the page head, resolved against the page URL. */
export function findSocialImage(html: string, pageUrl: string): string | null {
  const head = html.slice(0, 64_000);
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1].toLowerCase();
    if (key !== "og:image" && key !== "twitter:image") continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!content) continue;
    try {
      return new URL(content, pageUrl).toString();
    } catch {
      // ignore a malformed URL
    }
  }
  return null;
}

/** GitHub's generated social card; any path segment busts its cache. */
export function githubCard(fullName: string, pushedAt: string): string {
  return `https://opengraph.githubassets.com/${Date.parse(pushedAt) || 0}/${fullName}`;
}

const SUMMARY_TARGET = 280;
const SUMMARY_MAX = 600;

/** Inline markdown down to plain text: images gone, links to their label. */
function plainInline(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cuts at the last sentence end inside the limit, else the last word. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sentence = cut.search(/[.!?](?=[^.!?]*$)/);
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/**
 * The README's opening prose: paragraphs after the title, skipping badges,
 * images, HTML banners, code, tables, quotes and lists, until there is
 * enough to read as a description.
 */
export function readmeSummary(markdown: string, repoName: string): string | null {
  const blocks = markdown
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, "")
    .split(/\n\s*\n/);

  const paragraphs: string[] = [];
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block || /^(#|>|\||[-*+] |\d+[.)] |---|===|\[!\[|!\[|<)/.test(block)) continue;
    const text = plainInline(block);
    if (text.length < 40) continue; // badge rows, taglines that only repeat the name
    if (text.toLowerCase() === repoName.toLowerCase()) continue;
    paragraphs.push(text);
    if (paragraphs.join(" ").length >= SUMMARY_TARGET || paragraphs.length === 2) break;
  }
  return paragraphs.length ? clip(paragraphs.join(" "), SUMMARY_MAX) : null;
}

async function readmeFor(
  repo: GithubRepo,
  headers: Record<string, string>,
  fetchImpl: Fetch,
): Promise<Readme | null> {
  try {
    const response = await fetchImpl(`${GITHUB_API}/repos/${repo.full_name}/readme`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { sha?: string; content?: string; encoding?: string };
    if (!body.sha || typeof body.content !== "string" || body.encoding !== "base64") return null;
    return { sha: body.sha, text: Buffer.from(body.content, "base64").toString("utf8") };
  } catch {
    return null;
  }
}

// ---- Model-written descriptions ------------------------------------------------

const DESCRIBE_MODEL = "claude-haiku-5-5";

/** Long READMEs are cut here to bound cost; the opening is what describes a project. */
const README_CHAR_LIMIT = 40_000;

const DESCRIBE_SYSTEM = [
  "You write the description line for a software project on a developer's portfolio page.",
  "Given the project's README, reply with one or two plain sentences, at most 40 words, saying what the project is and what makes it interesting.",
  "Write for a curious visitor, not a contributor: no install steps, ports, commands, file paths or badges.",
  "No markdown, no quotes, no lead-in such as 'This project'. Do not start with the project name.",
  "If the README says too little to describe the project, reply with exactly: SKIP",
].join(" ");

interface DescriberOptions {
  apiKey: string;
  /** Vercel Blob read-write token; summaries persist there across deploys. */
  blobToken?: string | null;
  blobAccess?: "public" | "private";
  client?: Pick<Anthropic, "messages">;
}

/**
 * Haiku descriptions cached by README SHA: in memory for the warm instance,
 * and in Vercel Blob (when configured) so a redeploy or cold start reuses
 * them. Keys are immutable, so an entry is written once and only a changed
 * README triggers a new call. Any failure yields null and the card falls
 * back to the README excerpt.
 */
export function createDescriber({
  apiKey,
  blobToken,
  blobAccess = "public",
  client = new Anthropic({ apiKey }),
}: DescriberOptions): Describe {
  const memo = new Map<string, Promise<string | null>>();

  const fromBlob = async (key: string): Promise<string | null> => {
    if (!blobToken) return null;
    try {
      const hit = await getBlob(key, { access: blobAccess, token: blobToken });
      return hit ? (await new Response(hit.stream).text()).trim() || null : null;
    } catch {
      return null;
    }
  };

  const toBlob = async (key: string, text: string) => {
    if (!blobToken) return;
    try {
      await putBlob(key, text, {
        access: blobAccess,
        token: blobToken,
        contentType: "text/plain; charset=utf-8",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    } catch (error) {
      console.warn("Could not cache a project description", error);
    }
  };

  const generate = async (repo: GithubRepo, readme: Readme): Promise<string | null> => {
    try {
      const response = await client.messages.create({
        model: DESCRIBE_MODEL,
        max_tokens: 400,
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
        system: DESCRIBE_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Project: ${repo.name}\n\n<readme>\n${readme.text.slice(0, README_CHAR_LIMIT)}\n</readme>`,
          },
        ],
      });
      if (response.stop_reason !== "end_turn") return null;
      const text = response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("")
        .trim();
      return text && text !== "SKIP" ? text : null;
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        console.warn(`Haiku description failed for ${repo.full_name}: ${error.status}`, error.message);
      } else {
        console.warn(`Haiku description failed for ${repo.full_name}`, error);
      }
      return null;
    }
  };

  return (repo, readme) => {
    const key = `showcase/descriptions/${repo.full_name}/${readme.sha}.txt`;
    let pending = memo.get(key);
    if (!pending) {
      pending = (async () => {
        const cached = await fromBlob(key);
        if (cached) return cached;
        const fresh = await generate(repo, readme);
        if (fresh) await toBlob(key, fresh);
        return fresh;
      })();
      memo.set(key, pending);
      // A failed attempt is retried on the next request rather than pinned.
      pending.then((value) => value ?? memo.delete(key));
    }
    return pending;
  };
}

/**
 * The best preview the live site allows, or null when the deployment is gone:
 * the host does not resolve or refuses, or the page answers 404/410. A slow
 * site, or a 403/5xx (often bot protection), keeps its card with the fallback.
 */
async function previewFor(liveUrl: string, fallback: RepoPreview, fetchImpl: Fetch): Promise<RepoPreview | null> {
  try {
    const response = await fetchImpl(liveUrl, {
      redirect: "follow",
      headers: { accept: "text/html", "user-agent": "kygra-portfolio-showcase" },
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 404 || response.status === 410) return null;
    if (!response.ok) return fallback;
    if (!blocksFraming(response.headers)) return { kind: "frame", src: response.url || liveUrl };
    const image = findSocialImage(await response.text(), response.url || liveUrl);
    return image ? { kind: "image", src: image } : fallback;
  } catch (error) {
    return error instanceof Error && error.name === "TimeoutError" ? fallback : null;
  }
}

export async function buildShowcase({
  user,
  selfRepo,
  describe,
  token,
  limit = 9,
  now = new Date(),
  fetchImpl = fetch,
}: ShowcaseOptions): Promise<Showcase> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "kygra-portfolio-showcase",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
  // A token reads the owner's own listing, private repos included; without
  // one only the public listing is reachable.
  const listing = token
    ? `${GITHUB_API}/user/repos?affiliation=owner&visibility=all&sort=pushed&per_page=100`
    : `${GITHUB_API}/users/${encodeURIComponent(user)}/repos?type=owner&sort=pushed&per_page=100`;
  const response = await fetchImpl(listing, { headers });
  if (!response.ok) {
    throw new Error(`GitHub responded ${response.status} for ${user}'s repositories`);
  }

  // Only deployed projects make the page, so rank everything, keep repos with
  // a live URL that still answers, then cap.
  const deployed = rankRepos((await response.json()) as GithubRepo[], user, now, Infinity, selfRepo).flatMap((repo) => {
    const liveUrl = liveUrlFor(repo, user);
    return liveUrl ? [{ repo, liveUrl }] : [];
  });
  const live = (
    await Promise.all(
      deployed.map(async ({ repo, liveUrl }) => {
        const card = repo.private ? null : githubCard(repo.full_name, repo.pushed_at);
        const fallback: RepoPreview = card ? { kind: "image", src: card } : { kind: "none" };
        const preview = await previewFor(liveUrl, fallback, fetchImpl);
        return preview ? [{ repo, liveUrl, card, preview }] : [];
      }),
    )
  )
    .flat()
    .slice(0, limit);

  // READMEs (and any model calls) only for the repos that make the page.
  const repos = await Promise.all(
    live.map(async ({ repo, liveUrl, card, preview }): Promise<ShowcaseRepo> => {
      const readme = await readmeFor(repo, headers, fetchImpl);
      const described = readme && describe ? await describe(repo, readme) : null;
      return {
        name: repo.name,
        fullName: repo.full_name,
        description: described ?? (readme && readmeSummary(readme.text, repo.name)) ?? repo.description,
        url: repo.html_url,
        liveUrl,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        topics: (repo.topics ?? []).filter((topic) => !INTERNAL_TOPICS.has(topic)),
        pushedAt: repo.pushed_at,
        archived: repo.archived,
        private: repo.private,
        card,
        preview,
      };
    }),
  );

  return { user, generatedAt: now.toISOString(), repos };
}

/** GitHub account whose repositories make up the software index. */
const GITHUB_USER = process.env.GITHUB_USER?.trim() || "kygura";

/**
 * Optional token for the GitHub API, needed for private repos (read access to
 * metadata and contents). Without it requests share a 60/hour limit per IP;
 * the CDN cache keeps the index well under that either way.
 */
const GITHUB_TOKEN = process.env.GITHUB_TOKEN?.trim() || null;

/**
 * Haiku descriptions need ANTHROPIC_API_KEY. They persist in Vercel Blob when
 * a read-write token is set (BLOB_READ_WRITE_TOKEN, or the store the Notion
 * pipeline used); BLOB_ACCESS must match the store's access mode.
 */
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim() || null;
const describe = ANTHROPIC_API_KEY
  ? createDescriber({
      apiKey: ANTHROPIC_API_KEY,
      blobToken: process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.NOTION_SYNC_READ_WRITE_TOKEN?.trim() || null,
      blobAccess: process.env.BLOB_ACCESS === "private" ? "private" : "public",
    })
  : null;

// ---- Handler -------------------------------------------------------------------
// This file imports no sibling modules (packages are fine): Vercel compiles
// each function to .js but keeps `.ts` import specifiers, so a relative
// import fails at runtime.

export const runtime = "nodejs";

/**
 * The CDN holds a response for an hour and serves the stale copy for a day
 * while it refreshes, so GitHub sees a handful of requests whatever the
 * traffic.
 */
export async function GET(): Promise<Response> {
  try {
    const showcase = await buildShowcase({
      user: GITHUB_USER,
      token: GITHUB_TOKEN,
      describe,
      // Vercel's system env names the repo each deployment builds from.
      selfRepo: process.env.VERCEL_GIT_REPO_SLUG,
    });
    return Response.json(showcase, {
      headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("Failed to build the software index", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load repositories" },
      { status: 502, headers: { "cache-control": "public, s-maxage=60" } },
    );
  }
}
