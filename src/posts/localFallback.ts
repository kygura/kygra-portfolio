// Static local markdown fallback for when the Notion sync API is unavailable.
// Vite's ?raw imports bundle the file content at build time.
import onTheStateOfThings from "./on-the-state-of-things.md?raw";
import quantumHistory from "./quantum-history.md?raw";
import theMovementOfTheWorld from "./the-movement-of-the-world.md?raw";

import {
  estimateReadTime,
  createExcerpt,
  normalizeSlug,
  sortPostsByDateDesc,
  type PostSummary,
  type Post,
} from "../../content/posts";

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;

function parseFrontmatterValue(raw: string): unknown {
  const v = raw.trim();
  if (!v) return "";
  if (v.startsWith("[") && v.endsWith("]")) {
    try {
      const arr = JSON.parse(v);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return v
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    }
  }
  if (v === "true") return true;
  if (v === "false") return false;
  const n = Number(v);
  if (!Number.isNaN(n) && v !== "") return n;
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function parseMd(raw: string, filename: string): { summary: PostSummary; content: string } | null {
  const match = raw.match(FRONTMATTER_RE);
  const frontmatter: Record<string, unknown> = {};
  let content = raw;

  if (match) {
    const [, fm, body] = match;
    content = body;
    for (const line of fm.split("\n")) {
      const colon = line.indexOf(":");
      if (colon < 1) continue;
      const key = line.slice(0, colon).trim();
      frontmatter[key] = parseFrontmatterValue(line.slice(colon + 1));
    }
  }

  const title = String(frontmatter.title ?? "").replace(/^['"]|['"]$/g, "");
  const date = String(frontmatter.date ?? "").replace(/^['"]|['"]$/g, "");
  const rawTags = frontmatter.tags;
  const tags: string[] = Array.isArray(rawTags)
    ? rawTags.map(String)
    : typeof rawTags === "string"
      ? [rawTags]
      : [];

  if (!title || !date) return null;

  const slug = normalizeSlug(
    String(frontmatter.slug ?? "").replace(/^['"]|['"]$/g, "") || filename,
  );
  const excerpt = createExcerpt(content);
  const readTime = estimateReadTime(content);

  return { summary: { slug, title, excerpt, date, tags, readTime }, content };
}

const RAW_FILES: { raw: string; filename: string }[] = [
  { raw: onTheStateOfThings, filename: "on-the-state-of-things" },
  { raw: quantumHistory, filename: "quantum-history" },
  { raw: theMovementOfTheWorld, filename: "the-movement-of-the-world" },
];

function buildFallback() {
  const summaries: PostSummary[] = [];
  const posts: Post[] = [];

  for (const { raw, filename } of RAW_FILES) {
    const parsed = parseMd(raw, filename);
    if (!parsed) continue;
    summaries.push(parsed.summary);
    posts.push({ ...parsed.summary, content: parsed.content });
  }

  return {
    summaries: sortPostsByDateDesc(summaries),
    posts: sortPostsByDateDesc(posts),
  };
}

const fallback = buildFallback();

export const localFallbackSummaries: PostSummary[] = fallback.summaries;
export const localFallbackPosts: Post[] = fallback.posts;
