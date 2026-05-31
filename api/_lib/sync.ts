import {
  APIErrorCode,
  isFullPage,
  isNotionClientError,
  iteratePaginatedAPI,
  type Client,
} from "@notionhq/client";
import {
  createExcerpt,
  estimateReadTime,
  type NotionPostMetadata,
  type PostSummary,
} from "../../content/posts.ts";
import { serializeFrontmatter, type PostFrontmatterFields } from "../../content/markdown.ts";
import { getConfiguredDatabaseId } from "./env.ts";
import { getNotionClient, resolveDataSourceId } from "./notion/client.ts";
import { fetchAllBlocks } from "./notion/blocks.ts";
import { renderBlocksToMarkdown } from "./notion/render.ts";
import { extractPostMetadata, getPageDataSourceId } from "./notion/metadata.ts";
import { deletePostImages, processPostImages } from "./notion/images.ts";
import {
  deleteIndexEntry,
  deletePostMarkdown,
  findIndexEntryBySlug,
  listIndexEntries,
  readIndexEntry,
  removeManifestEntry,
  upsertManifestEntry,
  writeIndexEntry,
  writePostMarkdown,
} from "./store.ts";

/** Loose page shape accepted by the metadata extractor. */
type NotionPageLike = Parameters<typeof extractPostMetadata>[0] & {
  id: string;
  in_trash?: boolean;
};

export interface PageSyncResult {
  action: "published" | "deleted" | "skipped";
  pageId: string;
  slug?: string;
  previousSlug?: string;
  reason?: string;
}

export interface FullSyncResult {
  postsDiscovered: number;
  publishedCount: number;
  syncedCount: number;
  deletedCount: number;
  skippedCount: number;
  failedCount: number;
  failures: Array<{ pageId: string; message: string }>;
}

export class DuplicatePublishedSlugError extends Error {
  duplicateSlugs: string[];

  constructor(duplicateSlugs: string[]) {
    super(`Duplicate published slugs detected: ${duplicateSlugs.join(", ")}`);
    this.name = "DuplicatePublishedSlugError";
    this.duplicateSlugs = duplicateSlugs;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function listAllPages(client: Client): Promise<NotionPageLike[]> {
  const dataSourceId = await resolveDataSourceId(client);
  const pages: NotionPageLike[] = [];

  for await (const result of iteratePaginatedAPI(
    (args: { data_source_id: string; start_cursor?: string; page_size?: number }) =>
      client.dataSources.query(args),
    { data_source_id: dataSourceId, page_size: 100 },
  )) {
    if (isFullPage(result)) {
      pages.push(result as unknown as NotionPageLike);
    }
  }

  return pages;
}

async function retrievePage(
  pageId: string,
  client: Client,
): Promise<NotionPageLike | null> {
  try {
    const result = await client.pages.retrieve({ page_id: pageId });
    return isFullPage(result) ? (result as unknown as NotionPageLike) : null;
  } catch (error) {
    if (
      isNotionClientError(error) &&
      (error.code === APIErrorCode.ObjectNotFound ||
        error.code === APIErrorCode.Unauthorized ||
        error.code === APIErrorCode.RestrictedResource)
    ) {
      return null;
    }
    throw error;
  }
}

async function pageBelongsToConfiguredSource(
  page: NotionPageLike,
  client: Client,
): Promise<boolean> {
  const parentId = getPageDataSourceId(page);
  if (!parentId) {
    return false;
  }

  const normalized = parentId.toLowerCase();
  const dataSourceId = (await resolveDataSourceId(client)).toLowerCase();
  if (normalized === dataSourceId) {
    return true;
  }

  const databaseId = getConfiguredDatabaseId()?.toLowerCase();
  return databaseId ? normalized === databaseId : false;
}

function findDuplicateSlugs(slugs: string[]): string[] {
  const counts = new Map<string, number>();
  for (const slug of slugs) {
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([slug]) => slug);
}

async function publishPage(
  page: NotionPageLike,
  metadata: NotionPostMetadata,
  client: Client,
): Promise<PageSyncResult> {
  const ownedElsewhere = await findIndexEntryBySlug(metadata.slug);
  if (ownedElsewhere && ownedElsewhere.pageId !== metadata.pageId) {
    throw new DuplicatePublishedSlugError([metadata.slug]);
  }

  const existingIndex = await readIndexEntry(metadata.pageId);
  const blocks = await fetchAllBlocks(page.id, client);
  const renderedMarkdown = renderBlocksToMarkdown(blocks);

  if (!renderedMarkdown.trim()) {
    throw new Error(
      `Notion page ${page.id} (${metadata.slug}) produced empty markdown`,
    );
  }

  const { markdown } = await processPostImages(renderedMarkdown, metadata.slug);
  const excerpt = metadata.excerpt || createExcerpt(markdown);
  const readTime = estimateReadTime(markdown);

  const frontmatter: PostFrontmatterFields = {
    slug: metadata.slug,
    title: metadata.title,
    excerpt,
    date: metadata.date,
    tags: metadata.tags,
    readTime,
    published: true,
    notionPageId: metadata.pageId,
  };

  const fileContent = `${serializeFrontmatter(frontmatter)}\n\n${markdown.trim()}\n`;
  await writePostMarkdown(metadata.slug, fileContent);

  // Slug changed since last sync: clean up the old artifacts.
  if (existingIndex?.slug && existingIndex.slug !== metadata.slug) {
    await deletePostMarkdown(existingIndex.slug);
    await removeManifestEntry(existingIndex.slug);
    await deletePostImages(existingIndex.slug);
  }

  const summary: PostSummary = {
    slug: metadata.slug,
    title: metadata.title,
    excerpt,
    date: metadata.date,
    tags: metadata.tags,
    readTime,
  };
  await upsertManifestEntry(summary);
  await writeIndexEntry(metadata.pageId, metadata.slug);

  return {
    action: "published",
    pageId: metadata.pageId,
    slug: metadata.slug,
    previousSlug: existingIndex?.slug,
  };
}

/** Remove a post and all of its derived artifacts from the store. */
export async function deletePost(
  pageId: string,
  fallbackSlug?: string,
  reason?: string,
): Promise<PageSyncResult> {
  const existingIndex = await readIndexEntry(pageId);
  const candidateSlugs = [
    ...new Set(
      [existingIndex?.slug, fallbackSlug].filter(
        (slug): slug is string => Boolean(slug),
      ),
    ),
  ];

  let deleted = false;
  for (const slug of candidateSlugs) {
    deleted = (await deletePostMarkdown(slug)) || deleted;
    deleted = (await removeManifestEntry(slug)) || deleted;
    deleted = (await deletePostImages(slug)) > 0 || deleted;
  }
  deleted = (await deleteIndexEntry(pageId)) || deleted;

  return {
    action: deleted ? "deleted" : "skipped",
    pageId,
    previousSlug: existingIndex?.slug,
    slug: fallbackSlug ?? existingIndex?.slug,
    reason,
  };
}

/** Sync a single Notion page by ID (the webhook entry point). */
export async function syncPageById(
  pageId: string,
  client: Client = getNotionClient(),
): Promise<PageSyncResult> {
  const page = await retrievePage(pageId, client);

  if (!page) {
    return deletePost(pageId, undefined, "Page not found");
  }

  if (!(await pageBelongsToConfiguredSource(page, client))) {
    return deletePost(pageId, undefined, "Page not in configured data source");
  }

  const metadata = extractPostMetadata(page);

  if (page.in_trash || !metadata.published) {
    return deletePost(
      page.id,
      metadata.slug,
      page.in_trash ? "Page trashed" : "Page unpublished",
    );
  }

  return publishPage(page, metadata, client);
}

/** Reconcile every page in the data source plus orphaned index entries. */
export async function fullSync(
  client: Client = getNotionClient(),
): Promise<FullSyncResult> {
  const pages = await listAllPages(client);
  const entries = pages.map((page) => ({ page, metadata: extractPostMetadata(page) }));
  const published = entries.filter((entry) => entry.metadata.published);

  const duplicates = findDuplicateSlugs(published.map((entry) => entry.metadata.slug));
  if (duplicates.length > 0) {
    throw new DuplicatePublishedSlugError(duplicates);
  }

  const result: FullSyncResult = {
    postsDiscovered: entries.length,
    publishedCount: published.length,
    syncedCount: 0,
    deletedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    failures: [],
  };
  const activePageIds = new Set(entries.map((entry) => entry.page.id));

  for (const { page, metadata } of entries) {
    try {
      if (metadata.published) {
        await publishPage(page, metadata, client);
        result.syncedCount += 1;
      } else {
        const outcome = await deletePost(page.id, metadata.slug, "Page unpublished");
        if (outcome.action === "deleted") {
          result.deletedCount += 1;
        } else {
          result.skippedCount += 1;
        }
      }
    } catch (error) {
      result.failedCount += 1;
      result.failures.push({ pageId: page.id, message: errorMessage(error) });
    }
  }

  // Delete posts whose Notion pages have vanished from the data source.
  for (const entry of await listIndexEntries()) {
    if (activePageIds.has(entry.pageId)) {
      continue;
    }
    try {
      const outcome = await deletePost(
        entry.pageId,
        entry.slug,
        "Page missing from data source",
      );
      if (outcome.action === "deleted") {
        result.deletedCount += 1;
      } else {
        result.skippedCount += 1;
      }
    } catch (error) {
      result.failedCount += 1;
      result.failures.push({ pageId: entry.pageId, message: errorMessage(error) });
    }
  }

  return result;
}
