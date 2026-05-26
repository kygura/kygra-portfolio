import { NotionToMarkdown } from "notion-to-md";
import {
  createExcerpt,
  estimateReadTime,
  postFrontmatterSchema,
  type NotionPostMetadata,
  type PostFrontmatter,
  type PostSummary,
} from "../../content/posts.ts";
import {
  cleanupPostImages,
  commitMarkdownImageAssets,
  deleteAllPostImages,
  prepareMarkdownImageAssets,
  type PreparedImageAsset,
} from "./images.ts";
import { notionMarkdownBlocksToString } from "./notion-markdown.ts";
import {
  deletePageIndexEntry,
  deletePathIfExists,
  findPageIndexEntryBySlug,
  getPostPath,
  listPageIndexEntries,
  putVerifiedTextBlob,
  readPageIndexEntry,
  removePostsManifestEntry,
  serializeFrontmatter,
  upsertPostsManifestEntry,
  writePageIndexEntry,
} from "./posts.ts";
import {
  extractNotionPostMetadata,
  getNotionClient,
  isPageInConfiguredDataSource,
  listNotionPages,
  retrieveNotionPage,
} from "./notion.ts";
import type { PageObjectResponse } from "@notionhq/client";
import type { ListBlockChildrenResponseResult } from "notion-to-md/build/types";

type PreparedPost = {
  frontmatter: PostFrontmatter;
  markdown: string;
  imageAssets: PreparedImageAsset[];
};

export type PageSyncResult = {
  action: "published" | "deleted" | "skipped";
  pageId: string;
  slug?: string;
  previousSlug?: string;
  reason?: string;
};

export type FullSyncResult = {
  postsDiscovered: number;
  publishedCount: number;
  syncedCount: number;
  deletedCount: number;
  skippedCount: number;
  failedCount: number;
  failures: Array<{
    pageId: string;
    message: string;
  }>;
};

export class DuplicatePublishedSlugError extends Error {
  duplicateSlugs: string[];

  constructor(duplicateSlugs: string[]) {
    super("Duplicate published slugs detected");
    this.name = "DuplicatePublishedSlugError";
    this.duplicateSlugs = duplicateSlugs;
  }
}

async function preparePublishedPost(
  pageId: string,
  frontmatter: PostFrontmatter,
  n2m: NotionToMarkdown,
): Promise<PreparedPost> {
  const markdownBlocks = await n2m.pageToMarkdown(pageId);
  const markdown = notionMarkdownBlocksToString(markdownBlocks, n2m);

  console.info("Generated Notion markdown blocks", {
    pageId,
    slug: frontmatter.slug,
    markdownBlockCount: markdownBlocks.length,
    generatedMarkdownLength: markdown.length,
  });

  if (!markdown.trim()) {
    throw new Error(
      `Notion page ${pageId} (${frontmatter.slug}) produced empty markdown before image rewriting`,
    );
  }

  const imageAssets = await prepareMarkdownImageAssets(markdown, {
    postSlug: frontmatter.slug,
  });

  return {
    frontmatter,
    markdown,
    imageAssets,
  };
}

function buildSummary(frontmatter: PostFrontmatter): PostSummary {
  return {
    slug: frontmatter.slug,
    title: frontmatter.title,
    excerpt: frontmatter.excerpt,
    date: frontmatter.date,
    tags: frontmatter.tags,
    readTime: frontmatter.readTime,
  };
}

function getDuplicateSlugs(slugs: string[]): string[] {
  const counts = new Map<string, number>();

  for (const slug of slugs) {
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([slug]) => slug);
}

type FileLikeBlockType = "file" | "pdf" | "video";

type FileLikeContent = {
  caption?: Array<{ plain_text?: string }>;
  type?: "external" | "file";
  external?: { url?: string };
  file?: { url?: string };
};

function getFileLikeContent(
  block: ListBlockChildrenResponseResult,
  type: FileLikeBlockType,
): FileLikeContent | null {
  const candidate = (block as Record<string, unknown>)[type];

  return candidate && typeof candidate === "object" ? (candidate as FileLikeContent) : null;
}

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathname = decodeURIComponent(parsedUrl.pathname);
    const filename = pathname.split("/").filter(Boolean).at(-1);

    return filename || fallback;
  } catch {
    return fallback;
  }
}

function transformFileLikeBlock(
  block: ListBlockChildrenResponseResult,
  type: FileLikeBlockType,
): string {
  const content = getFileLikeContent(block, type);
  const caption = content?.caption?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
  const url =
    content?.type === "external" ? content.external?.url : content?.type === "file" ? content.file?.url : "";

  if (!url) {
    return caption;
  }

  const title = caption || filenameFromUrl(url, type);
  return `[${title}](${url})`;
}

function createNotionToMarkdown() {
  const n2m = new NotionToMarkdown({
    notionClient: getNotionClient(),
  });

  for (const type of ["file", "pdf", "video"] as const) {
    n2m.setCustomTransformer(type, (block) => transformFileLikeBlock(block, type));
  }

  return n2m;
}

async function assertSlugOwnership(pageId: string, slug: string): Promise<void> {
  const existingEntry = await findPageIndexEntryBySlug(slug);

  if (existingEntry && existingEntry.pageId !== pageId) {
    throw new DuplicatePublishedSlugError([slug]);
  }
}

export async function deletePublishedPost(
  pageId: string,
  fallbackSlug?: string,
  reason?: string,
): Promise<PageSyncResult> {
  const existingIndex = await readPageIndexEntry(pageId);
  const candidateSlugs = [
    ...new Set(
      [existingIndex?.slug, fallbackSlug].filter((slug): slug is string => Boolean(slug)),
    ),
  ];
  let deleted = false;

  for (const slug of candidateSlugs) {
    deleted = (await deletePathIfExists(getPostPath(slug))) || deleted;
    deleted = (await removePostsManifestEntry(slug)) || deleted;
    deleted = (await deleteAllPostImages(slug)) > 0 || deleted;
  }

  deleted = (await deletePageIndexEntry(pageId)) || deleted;

  return {
    action: deleted ? "deleted" : "skipped",
    pageId,
    previousSlug: existingIndex?.slug,
    slug: fallbackSlug ?? existingIndex?.slug,
    reason,
  };
}

export async function syncPublishedNotionPage(
  page: PageObjectResponse,
  metadata: NotionPostMetadata,
  n2m = createNotionToMarkdown(),
): Promise<PageSyncResult> {
  await assertSlugOwnership(metadata.pageId, metadata.slug);

  const existingIndex = await readPageIndexEntry(metadata.pageId);
  const frontmatter = postFrontmatterSchema.parse({
    slug: metadata.slug,
    title: metadata.title,
    excerpt: metadata.excerpt,
    date: metadata.date,
    tags: metadata.tags,
    published: true,
    notionPageId: metadata.pageId,
    readTime: 1,
  });
  const prepared = await preparePublishedPost(page.id, frontmatter, n2m);
  const nextFrontmatter = postFrontmatterSchema.parse({
    ...prepared.frontmatter,
    excerpt: metadata.excerpt || createExcerpt(prepared.markdown),
    readTime: estimateReadTime(prepared.markdown),
  });
  const committedImages = await commitMarkdownImageAssets(prepared.markdown, prepared.imageAssets);
  const markdownContent = `${serializeFrontmatter(nextFrontmatter)}\n\n${committedImages.markdown.trim()}\n`;

  console.info("Prepared markdown for upload", {
    pageId: metadata.pageId,
    slug: nextFrontmatter.slug,
    finalMarkdownLength: markdownContent.length,
    finalMarkdownTrimmedLength: markdownContent.trim().length,
  });

  await putVerifiedTextBlob(
    getPostPath(nextFrontmatter.slug),
    markdownContent,
    "text/markdown; charset=utf-8",
    "markdown",
  );
  await cleanupPostImages(nextFrontmatter.slug, committedImages.pathnames);

  if (existingIndex?.slug && existingIndex.slug !== nextFrontmatter.slug) {
    await deletePathIfExists(getPostPath(existingIndex.slug));
    await removePostsManifestEntry(existingIndex.slug);
    await deleteAllPostImages(existingIndex.slug);
  }

  await upsertPostsManifestEntry(buildSummary(nextFrontmatter));
  await writePageIndexEntry({
    pageId: metadata.pageId,
    slug: nextFrontmatter.slug,
  });

  return {
    action: "published",
    pageId: metadata.pageId,
    slug: nextFrontmatter.slug,
    previousSlug: existingIndex?.slug,
  };
}

export async function syncNotionPageById(
  pageId: string,
  n2m = createNotionToMarkdown(),
): Promise<PageSyncResult> {
  const page = await retrieveNotionPage(pageId);

  if (!page || !isPageInConfiguredDataSource(page)) {
    return deletePublishedPost(pageId, undefined, "Page not found in configured data source");
  }

  const metadata = extractNotionPostMetadata(page);

  if (page.in_trash || !metadata.published) {
    return deletePublishedPost(page.id, metadata.slug, page.in_trash ? "Page trashed" : "Page unpublished");
  }

  return syncPublishedNotionPage(page, metadata, n2m);
}

export async function fullSyncNotionPosts(): Promise<FullSyncResult> {
  const pages = await listNotionPages();
  const entries = pages.map((page) => ({
    page,
    metadata: extractNotionPostMetadata(page),
  }));
  const publishedEntries = entries.filter((entry) => entry.metadata.published);
  const duplicateSlugs = getDuplicateSlugs(publishedEntries.map((entry) => entry.metadata.slug));

  if (duplicateSlugs.length > 0) {
    throw new DuplicatePublishedSlugError(duplicateSlugs);
  }

  const result: FullSyncResult = {
    postsDiscovered: entries.length,
    publishedCount: publishedEntries.length,
    syncedCount: 0,
    deletedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    failures: [],
  };
  const n2m = createNotionToMarkdown();
  const activePageIds = new Set(entries.map((entry) => entry.page.id));

  for (const entry of entries) {
    try {
      if (entry.metadata.published) {
        await syncPublishedNotionPage(entry.page, entry.metadata, n2m);
        result.syncedCount += 1;
      } else {
        const syncResult = await deletePublishedPost(
          entry.page.id,
          entry.metadata.slug,
          "Page unpublished",
        );

        if (syncResult.action === "deleted") {
          result.deletedCount += 1;
        } else {
          result.skippedCount += 1;
        }
      }
    } catch (error) {
      result.failedCount += 1;
      result.failures.push({
        pageId: entry.page.id,
        message: error instanceof Error ? error.message : "Unknown sync failure",
      });
    }
  }

  const existingIndexEntries = await listPageIndexEntries();

  for (const entry of existingIndexEntries) {
    if (activePageIds.has(entry.pageId)) {
      continue;
    }

    try {
      const syncResult = await deletePublishedPost(
        entry.pageId,
        entry.slug,
        "Page missing from configured data source",
      );

      if (syncResult.action === "deleted") {
        result.deletedCount += 1;
      } else {
        result.skippedCount += 1;
      }
    } catch (error) {
      result.failedCount += 1;
      result.failures.push({
        pageId: entry.pageId,
        message: error instanceof Error ? error.message : "Unknown delete failure",
      });
    }
  }

  return result;
}
