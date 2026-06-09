/**
 * Blob storage backend for blog posts.
 * Swappable backend design so tests run without network calls.
 */

import { put, head, list, del, BlobNotFoundError } from "@vercel/blob";
import { getBlobToken } from "./env.ts";
import {
  postsManifestSchema,
  sortPostsByDateDesc,
  type PostSummary,
} from "../../content/posts.ts";

// ---------------------------------------------------------------------------
// BlobBackend interface
// ---------------------------------------------------------------------------

export interface BlobBackend {
  put(
    pathname: string,
    body: string,
    contentType: string,
  ): Promise<{ url: string; pathname: string }>;
  download(pathname: string): Promise<string | null>;
  list(prefix: string): Promise<string[]>;
  del(pathname: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Default Vercel Blob backend
// ---------------------------------------------------------------------------

const defaultBackend: BlobBackend = {
  async put(pathname, body, contentType) {
    const token = getBlobToken();
    const result = await put(pathname, body, {
      access: "public",
      token,
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { url: result.url, pathname: result.pathname };
  },

  async download(pathname) {
    const token = getBlobToken();
    try {
      const meta = await head(pathname, { token });
      const res = await fetch(meta.url);
      return res.ok ? await res.text() : null;
    } catch (e) {
      if (e instanceof BlobNotFoundError) return null;
      throw e;
    }
  },

  async list(prefix) {
    const token = getBlobToken();
    const result = await list({ prefix, token });
    return result.blobs.map((b) => b.pathname);
  },

  async del(pathname) {
    const token = getBlobToken();
    await del(pathname, { token });
  },
};

// ---------------------------------------------------------------------------
// Swappable backend for testing
// ---------------------------------------------------------------------------

let backend: BlobBackend = defaultBackend;

export function setBlobBackendForTesting(b: BlobBackend | null): void {
  backend = b ?? defaultBackend;
}

// ---------------------------------------------------------------------------
// Constants and path helpers
// ---------------------------------------------------------------------------

const MANIFEST_PATH = "posts-manifest.json";

export function getPostPath(slug: string): string {
  return `posts/${slug}.md`;
}

export function getIndexPath(pageId: string): string {
  return `index/${pageId}.json`;
}

// ---------------------------------------------------------------------------
// Manifest operations
// ---------------------------------------------------------------------------

export async function readManifest(): Promise<PostSummary[]> {
  try {
    const raw = await backend.download(MANIFEST_PATH);
    if (raw === null) return [];
    const parsed = postsManifestSchema.parse(JSON.parse(raw));
    return parsed;
  } catch {
    return [];
  }
}

export async function writeManifest(items: PostSummary[]): Promise<void> {
  await backend.put(
    MANIFEST_PATH,
    JSON.stringify(sortPostsByDateDesc(items), null, 2),
    "application/json",
  );
}

export async function upsertManifestEntry(
  summary: PostSummary,
): Promise<void> {
  const existing = await readManifest();
  const filtered = existing.filter((e) => e.slug !== summary.slug);
  filtered.push(summary);
  await writeManifest(filtered);
}

export async function removeManifestEntry(
  slug: string,
): Promise<boolean> {
  const existing = await readManifest();
  const filtered = existing.filter((e) => e.slug !== slug);
  if (filtered.length === existing.length) return false;
  await writeManifest(filtered);
  return true;
}

// ---------------------------------------------------------------------------
// Post markdown operations
// ---------------------------------------------------------------------------

export async function writePostMarkdown(
  slug: string,
  content: string,
): Promise<{ url: string }> {
  const result = await backend.put(
    getPostPath(slug),
    content,
    "text/markdown; charset=utf-8",
  );
  return { url: result.url };
}

export async function readPostMarkdown(
  slug: string,
): Promise<string | null> {
  return backend.download(getPostPath(slug));
}

export async function deletePostMarkdown(slug: string): Promise<boolean> {
  const existing = await backend.download(getPostPath(slug));
  if (existing === null) return false;
  await backend.del(getPostPath(slug));
  return true;
}

// ---------------------------------------------------------------------------
// Index entry operations
// ---------------------------------------------------------------------------

export async function readIndexEntry(
  pageId: string,
): Promise<{ pageId: string; slug: string } | null> {
  try {
    const raw = await backend.download(getIndexPath(pageId));
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.pageId === "string" &&
      typeof parsed.slug === "string"
    ) {
      return { pageId: parsed.pageId, slug: parsed.slug };
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeIndexEntry(
  pageId: string,
  slug: string,
): Promise<void> {
  await backend.put(
    getIndexPath(pageId),
    JSON.stringify({ pageId, slug }),
    "application/json",
  );
}

export async function deleteIndexEntry(pageId: string): Promise<boolean> {
  const existing = await backend.download(getIndexPath(pageId));
  if (existing === null) return false;
  await backend.del(getIndexPath(pageId));
  return true;
}

export async function listIndexEntries(): Promise<
  Array<{ pageId: string; slug: string }>
> {
  const pathnames = await backend.list("index/");
  const results: Array<{ pageId: string; slug: string }> = [];
  for (const pathname of pathnames) {
    try {
      const raw = await backend.download(pathname);
      if (raw === null) continue;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.pageId === "string" &&
        typeof parsed.slug === "string"
      ) {
        results.push({ pageId: parsed.pageId, slug: parsed.slug });
      }
    } catch {
      // skip invalid entries
    }
  }
  return results;
}

export async function findIndexEntryBySlug(
  slug: string,
): Promise<{ pageId: string; slug: string } | null> {
  const entries = await listIndexEntries();
  return entries.find((e) => e.slug === slug) ?? null;
}
