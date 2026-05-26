/**
 * Build-time script: fetches all published Notion posts and:
 *  1. Writes .md files to src/posts/ (with images saved to public/images/posts/)
 *  2. Syncs markdown + index to Vercel Blob (same as the webhook does)
 *  3. Regenerates src/posts/localFallback.ts to import every synced post
 *
 * Usage: node --experimental-strip-types scripts/sync-notion-posts.ts
 * Requires: NOTION_SECRET, NOTION_DATABASE_ID (or NOTION_DATA_SOURCE_ID),
 *           NOTION_SYNC_READ_WRITE_TOKEN (or BLOB_READ_WRITE_TOKEN)
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { NotionToMarkdown } from "notion-to-md";
import { loadEnvFile } from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "src", "posts");
const IMAGES_DIR = path.join(ROOT, "public", "images", "posts");
const FALLBACK_FILE = path.join(POSTS_DIR, "localFallback.ts");

// ---- env loading ----------------------------------------------------------------

try {
  loadEnvFile(path.join(ROOT, ".env.local"));
} catch {
  // .env.local is optional in CI where vars are injected directly
}

// ---- lazy import of API helpers (they read env at call time) --------------------

const { getNotionToken, getNotionDataSourceId, getBlobToken } = await import(
  "../api/_lib/posts.ts"
);
const { listNotionPages, extractNotionPostMetadata, getNotionClient } = await import(
  "../api/_lib/notion.ts"
);
const { serializeFrontmatter, putVerifiedTextBlob, writePostsManifest } = await import(
  "../api/_lib/posts.ts"
);
const {
  postFrontmatterSchema,
  estimateReadTime,
  createExcerpt,
  sortPostsByDateDesc,
} = await import("../content/posts.ts");

// ---- image helpers --------------------------------------------------------------

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)/g;
const MAX_IMG_WIDTH = 1600;

function isNotionImage(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const h = hostname.toLowerCase();
    return (
      h.includes("secure.notion-static.com") ||
      h.includes("notion-static.com") ||
      h.includes("prod-files-secure.s3.") ||
      h.includes(".amazonaws.com")
    );
  } catch {
    return false;
  }
}

function mimeToExt(contentType: string | null): string {
  const mime = String(contentType ?? "").split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
  };
  return map[mime] ?? "";
}

async function downloadAndCompress(
  url: string,
): Promise<{ buffer: Buffer; ext: string; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed (${res.status}): ${url}`);

  const rawBuffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type");
  const fallbackExt =
    mimeToExt(contentType) ||
    new URL(url).pathname.split(".").pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, "") ||
    "jpg";

  const image = sharp(rawBuffer, { animated: true, failOnError: false });
  const meta = await image.metadata();

  if (meta.format === "gif" || (meta.pages ?? 0) > 1) {
    return { buffer: rawBuffer, ext: fallbackExt || "gif", contentType: contentType ?? "image/gif" };
  }
  if (meta.format === "svg") {
    return { buffer: rawBuffer, ext: "svg", contentType: "image/svg+xml" };
  }

  let pipeline = sharp(rawBuffer, { failOnError: false }).rotate();
  if (meta.width && meta.width > MAX_IMG_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_IMG_WIDTH, withoutEnlargement: true });
  }

  if (meta.hasAlpha) {
    const buf = await pipeline.png({ compressionLevel: 9, palette: true, quality: 80 }).toBuffer();
    return { buffer: buf, ext: "png", contentType: "image/png" };
  }

  const buf = await pipeline.jpeg({ quality: 72, mozjpeg: true, progressive: true }).toBuffer();
  return { buffer: buf, ext: "jpg", contentType: "image/jpeg" };
}

async function rewriteImages(
  markdown: string,
  postSlug: string,
): Promise<{ markdown: string; blobPaths: string[] }> {
  const matches = Array.from(String(markdown).matchAll(MARKDOWN_IMAGE_RE));
  const uniqueUrls = [...new Set(matches.map((m) => m[2] ?? "").filter(isNotionImage))];

  if (!uniqueUrls.length) return { markdown, blobPaths: [] };

  await fs.mkdir(path.join(IMAGES_DIR, postSlug), { recursive: true });

  const replacements = new Map<string, string>();
  const blobPaths: string[] = [];

  await Promise.all(
    uniqueUrls.map(async (url) => {
      const { buffer, ext, contentType } = await downloadAndCompress(url);
      const digest = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 16);
      const filename = `${digest}.${ext}`;

      // Save locally
      const localPath = path.join(IMAGES_DIR, postSlug, filename);
      await fs.writeFile(localPath, buffer);

      // Also upload to Blob
      const blobPathname = `images/${postSlug}/${filename}`;
      const { put } = await import("@vercel/blob");
      const uploaded = await put(blobPathname, buffer, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
        token: getBlobToken(),
      });

      replacements.set(url, uploaded.url);
      blobPaths.push(blobPathname);
    }),
  );

  const rewritten = String(markdown).replace(
    MARKDOWN_IMAGE_RE,
    (full, alt, url, title = "") => {
      const newUrl = replacements.get(url);
      if (!newUrl) return full;
      return title ? `![${alt}](${newUrl} "${title}")` : `![${alt}](${newUrl})`;
    },
  );

  return { markdown: rewritten, blobPaths };
}

// ---- main -----------------------------------------------------------------------

async function main() {
  console.log("Fetching published Notion pages...");

  const pages = await listNotionPages();
  const published = pages
    .map((page) => ({ page, meta: extractNotionPostMetadata(page) }))
    .filter(({ meta }) => meta.published);

  console.log(`Found ${published.length} published posts out of ${pages.length} total.`);

  if (!published.length) {
    console.log("Nothing to sync.");
    return;
  }

  await fs.mkdir(POSTS_DIR, { recursive: true });
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  const n2m = new NotionToMarkdown({ notionClient: getNotionClient() });

  type SyncedPost = { slug: string; filename: string };
  const synced: SyncedPost[] = [];

  for (const { page, meta } of published) {
    console.log(`Syncing: ${meta.title} (${meta.slug})`);

    try {
      const blocks = await n2m.pageToMarkdown(page.id);
      const result = n2m.toMarkdownString(blocks);
      const rawMarkdown = String(result.parent ?? "").trim();

      if (!rawMarkdown) {
        console.warn(`  Skipping ${meta.slug}: empty markdown`);
        continue;
      }

      const { markdown: markdownWithRemoteImages, blobPaths } = await rewriteImages(
        rawMarkdown,
        meta.slug,
      );

      const frontmatter = postFrontmatterSchema.parse({
        slug: meta.slug,
        title: meta.title,
        excerpt: meta.excerpt || createExcerpt(markdownWithRemoteImages),
        date: meta.date,
        tags: meta.tags,
        published: true,
        notionPageId: meta.pageId,
        readTime: estimateReadTime(markdownWithRemoteImages),
      });

      const fileContent = `${serializeFrontmatter(frontmatter)}\n\n${markdownWithRemoteImages.trim()}\n`;
      const mdFilename = `${meta.slug}.md`;
      const localMdPath = path.join(POSTS_DIR, mdFilename);

      await fs.writeFile(localMdPath, fileContent, "utf-8");
      console.log(`  Wrote ${localMdPath}`);

      // Sync to Vercel Blob
      await putVerifiedTextBlob(
        `posts/${meta.slug}.md`,
        fileContent,
        "text/markdown; charset=utf-8",
        "markdown",
      );

      synced.push({ slug: meta.slug, filename: mdFilename });
    } catch (err) {
      console.error(`  Failed to sync ${meta.slug}:`, err);
    }
  }

  // Update Vercel Blob posts manifest
  const summaries = synced.map(({ slug }) => {
    const entry = published.find(({ meta }) => meta.slug === slug)!;
    return {
      slug: entry.meta.slug,
      title: entry.meta.title,
      excerpt: entry.meta.excerpt,
      date: entry.meta.date,
      tags: entry.meta.tags,
      readTime: 1, // placeholder; actual value is in the md frontmatter
    };
  });
  await writePostsManifest(sortPostsByDateDesc(summaries));
  console.log("Updated Vercel Blob posts manifest.");

  // Regenerate localFallback.ts
  await regenerateFallback(synced);
  console.log(`Done. Synced ${synced.length} posts.`);
}

async function regenerateFallback(posts: { slug: string; filename: string }[]) {
  // Preserve any existing non-Notion .md files (hand-written posts)
  const existingMdFiles = (await fs.readdir(POSTS_DIR))
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ slug: f.replace(/\.md$/, ""), filename: f }));

  // Merge: synced posts take precedence, hand-written ones fill the rest
  const syncedSlugs = new Set(posts.map((p) => p.slug));
  const allPosts = [
    ...posts,
    ...existingMdFiles.filter((f) => !syncedSlugs.has(f.slug)),
  ];

  const imports = allPosts
    .map(
      ({ slug, filename }) =>
        `import ${slugToIdent(slug)} from "./${filename}?raw";`,
    )
    .join("\n");

  const rawFilesEntries = allPosts
    .map(
      ({ slug, filename }) =>
        `  { raw: ${slugToIdent(slug)}, filename: ${JSON.stringify(slug.replace(/\.md$/, ""))} },`,
    )
    .join("\n");

  const header = `// AUTO-GENERATED by scripts/sync-notion-posts.ts — do not edit by hand.
// Static local markdown fallback for when the Notion sync API is unavailable.
// Vite's ?raw imports bundle the file content at build time.`;

  const body = `
import {
  estimateReadTime,
  createExcerpt,
  normalizeSlug,
  sortPostsByDateDesc,
  type PostSummary,
  type Post,
} from "../../content/posts";

const FRONTMATTER_RE = /^---\\s*\\n([\\s\\S]*?)\\n---\\s*\\n?([\\s\\S]*)$/;

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
    for (const line of fm.split("\\n")) {
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
${rawFilesEntries}
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
`;

  await fs.writeFile(FALLBACK_FILE, `${header}\n${imports}\n${body}`, "utf-8");
  console.log(`Regenerated ${FALLBACK_FILE} with ${allPosts.length} posts.`);
}

function slugToIdent(slug: string): string {
  // Convert slug like "my-post-title" to a valid JS identifier "myPostTitle"
  return slug
    .replace(/[^a-z0-9-]/gi, "")
    .split("-")
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

await main();
