/**
 * Build-time / manual Notion sync.
 *
 * Fetches every published page from the configured Notion data source, renders
 * it to markdown (reusing the exact same library the runtime webhook uses), and:
 *   1. writes `src/posts/<slug>.md` — the static snapshot bundled by Vite's
 *      `import.meta.glob` so the blog renders even when the API/Blob is down;
 *   2. when a Blob token is configured, seeds Vercel Blob (post bodies, the
 *      manifest, and the page→slug index) so the runtime API serves immediately.
 *
 * Usage: node --experimental-strip-types scripts/sync-notion-posts.ts
 * Requires: NOTION_SECRET, NOTION_DATA_SOURCE_ID (or NOTION_DATABASE_ID).
 * Optional: BLOB_READ_WRITE_TOKEN (or NOTION_SYNC_READ_WRITE_TOKEN) for seeding.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";
import { iteratePaginatedAPI, isFullPage } from "@notionhq/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "src", "posts");

// Load local env (.env.local preferred, then .env). In CI the vars are injected.
for (const envFile of [".env.local", ".env"]) {
  try {
    loadEnvFile(path.join(ROOT, envFile));
    break;
  } catch {
    // try the next candidate
  }
}

const { getNotionClient, resolveDataSourceId } = await import(
  "../api/_lib/notion/client.ts"
);
const { fetchAllBlocks } = await import("../api/_lib/notion/blocks.ts");
const { renderBlocksToMarkdown } = await import("../api/_lib/notion/render.ts");
const { extractPostMetadata } = await import("../api/_lib/notion/metadata.ts");
const { processPostImages } = await import("../api/_lib/notion/images.ts");
const { serializeFrontmatter } = await import("../content/markdown.ts");
const { parseFrontmatter } = await import("../content/markdown.ts");
const { createExcerpt, estimateReadTime, sortPostsByDateDesc } = await import(
  "../content/posts.ts"
);
const store = await import("../api/_lib/store.ts");
const { getBlobToken } = await import("../api/_lib/env.ts");

function hasBlobToken(): boolean {
  try {
    getBlobToken();
    return true;
  } catch {
    return false;
  }
}

async function listAllPages() {
  const client = getNotionClient();
  const dataSourceId = await resolveDataSourceId(client);
  const pages: Array<Record<string, unknown>> = [];

  for await (const result of iteratePaginatedAPI(
    (args: { data_source_id: string; start_cursor?: string; page_size?: number }) =>
      client.dataSources.query(args),
    { data_source_id: dataSourceId, page_size: 100 },
  )) {
    if (isFullPage(result)) {
      pages.push(result as unknown as Record<string, unknown>);
    }
  }

  return { client, pages };
}

async function pruneStalePosts(keepSlugs: Set<string>): Promise<void> {
  let files: string[] = [];
  try {
    files = await fs.readdir(POSTS_DIR);
  } catch {
    return;
  }

  for (const file of files) {
    if (!file.endsWith(".md")) {
      continue;
    }
    const slug = file.replace(/\.md$/, "");
    if (keepSlugs.has(slug)) {
      continue;
    }
    // Only remove files that originated from Notion (carry a notionPageId).
    const raw = await fs.readFile(path.join(POSTS_DIR, file), "utf-8");
    const { data } = parseFrontmatter(raw);
    if (data.notionPageId) {
      await fs.rm(path.join(POSTS_DIR, file));
      console.log(`  Removed stale post: ${file}`);
    }
  }
}

async function main(): Promise<void> {
  const blobEnabled = hasBlobToken();
  console.log(
    `Fetching Notion pages... (Blob seeding ${blobEnabled ? "enabled" : "disabled"})`,
  );

  const { client, pages } = await listAllPages();
  const entries = pages.map((page) => ({ page, meta: extractPostMetadata(page as never) }));
  const published = entries.filter(({ meta }) => meta.published === true);

  console.log(`Found ${published.length} published of ${entries.length} total pages.`);

  await fs.mkdir(POSTS_DIR, { recursive: true });

  const summaries: Array<{
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    tags: string[];
    readTime: number;
  }> = [];
  const syncedSlugs = new Set<string>();

  for (const { page, meta } of published) {
    console.log(`Syncing: ${meta.title} (${meta.slug})`);
    try {
      const blocks = await fetchAllBlocks((page as { id: string }).id, client);
      let markdown = renderBlocksToMarkdown(blocks);

      if (!markdown.trim()) {
        console.warn(`  Skipping ${meta.slug}: empty markdown`);
        continue;
      }

      if (blobEnabled) {
        try {
          ({ markdown } = await processPostImages(markdown, meta.slug));
        } catch (error) {
          console.warn(`  Image processing failed for ${meta.slug}, keeping remote URLs`, error);
        }
      }

      const excerpt = meta.excerpt || createExcerpt(markdown);
      const readTime = estimateReadTime(markdown);
      const fileContent = `${serializeFrontmatter({
        slug: meta.slug,
        title: meta.title,
        excerpt,
        date: meta.date,
        tags: meta.tags,
        readTime,
        published: true,
        notionPageId: meta.pageId,
      })}\n\n${markdown.trim()}\n`;

      await fs.writeFile(path.join(POSTS_DIR, `${meta.slug}.md`), fileContent, "utf-8");
      syncedSlugs.add(meta.slug);
      summaries.push({ slug: meta.slug, title: meta.title, excerpt, date: meta.date, tags: meta.tags, readTime });

      if (blobEnabled) {
        await store.writePostMarkdown(meta.slug, fileContent);
        await store.writeIndexEntry(meta.pageId, meta.slug);
      }

      console.log(`  Wrote src/posts/${meta.slug}.md`);
    } catch (error) {
      console.error(`  Failed to sync ${meta.slug}:`, error);
    }
  }

  await pruneStalePosts(syncedSlugs);

  if (blobEnabled) {
    await store.writeManifest(sortPostsByDateDesc(summaries));
    console.log("Seeded Vercel Blob manifest.");
  }

  console.log(`Done. Synced ${syncedSlugs.size} posts.`);
}

await main();
