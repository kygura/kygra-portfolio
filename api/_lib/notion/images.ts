/**
 * Notion image processing: download, compress, re-upload to Vercel Blob,
 * and rewrite markdown URLs to point at stable blob URLs.
 */

import { createHash } from "node:crypto";
import sharp from "sharp";
import { put, list, del } from "@vercel/blob";
import { getBlobToken } from "../env.ts";

// ---------------------------------------------------------------------------
// Dependency-injection interface
// ---------------------------------------------------------------------------

export interface ImageDeps {
  fetchImpl: typeof fetch;
  put: (pathname: string, body: Buffer, contentType: string) => Promise<{ url: string; pathname: string }>;
  list: (prefix: string) => Promise<string[]>;
  del: (pathname: string) => Promise<void>;
}

export function defaultImageDeps(): ImageDeps {
  const token = getBlobToken();
  return {
    fetchImpl: fetch,
    put: async (pathname, body, contentType) =>
      put(pathname, body, { access: "public", token, contentType, addRandomSuffix: false, allowOverwrite: true }),
    list: async (prefix) => {
      const result = await list({ prefix, token });
      return result.blobs.map((b) => b.pathname);
    },
    del: async (pathname) => {
      await del(pathname, { token });
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)/g;

export function isNotionImage(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname.includes("notion-static.com") ||
      hostname.includes("prod-files-secure.s3") ||
      hostname.includes(".amazonaws.com")
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// processPostImages
// ---------------------------------------------------------------------------

export async function processPostImages(
  markdown: string,
  slug: string,
  deps: ImageDeps = defaultImageDeps(),
): Promise<{ markdown: string; pathnames: string[] }> {
  // Collect unique Notion image URLs from the markdown.
  const uniqueUrls = new Set<string>();
  for (const match of markdown.matchAll(MARKDOWN_IMAGE_RE)) {
    const url = match[2];
    if (isNotionImage(url)) {
      uniqueUrls.add(url);
    }
  }

  if (uniqueUrls.size === 0) {
    return { markdown, pathnames: [] };
  }

  const mapping = new Map<string, string>();
  const collectedPathnames: string[] = [];

  await Promise.all(
    Array.from(uniqueUrls).map(async (url) => {
      try {
        const res = await deps.fetchImpl(url);
        if (!res.ok) {
          // Skip on HTTP failure — keep original URL.
          return;
        }

        const raw = Buffer.from(new Uint8Array(await res.arrayBuffer()));

        const contentTypeHeader = res.headers.get("content-type") ?? "application/octet-stream";
        // Strip parameters like "; charset=utf-8"
        const baseContentType = contentTypeHeader.split(";")[0].trim();

        let finalBuffer: Buffer;
        let ext: string;
        let finalContentType: string;

        try {
          const meta = await sharp(raw).metadata();
          const fmt = meta.format ?? "";

          if (fmt === "gif" || fmt === "svg") {
            // Pass through unchanged.
            finalBuffer = raw;
            ext = fmt;
            finalContentType = fmt === "gif" ? "image/gif" : "image/svg+xml";
          } else {
            const hasAlpha = meta.hasAlpha ?? false;
            if (hasAlpha) {
              finalBuffer = await sharp(raw)
                .rotate()
                .resize({ width: 1600, withoutEnlargement: true })
                .png()
                .toBuffer();
              ext = "png";
              finalContentType = "image/png";
            } else {
              finalBuffer = await sharp(raw)
                .rotate()
                .resize({ width: 1600, withoutEnlargement: true })
                .jpeg({ quality: 72, mozjpeg: true })
                .toBuffer();
              ext = "jpg";
              finalContentType = "image/jpeg";
            }
          }
        } catch {
          // sharp failed — fall back to raw buffer.
          finalBuffer = raw;
          // Best-effort extension from content-type.
          const ctExt = baseContentType.split("/")[1] ?? "bin";
          ext = ctExt === "jpeg" ? "jpg" : ctExt;
          finalContentType = baseContentType;
        }

        const hash = createHash("sha1").update(finalBuffer).digest("hex").slice(0, 16);
        const filename = `${hash}.${ext}`;
        const pathname = `images/${slug}/${filename}`;

        const uploaded = await deps.put(pathname, finalBuffer, finalContentType);

        mapping.set(url, uploaded.url);
        collectedPathnames.push(pathname);
      } catch {
        // Per-image failure — skip, keep original URL.
      }
    }),
  );

  // Rewrite markdown.
  const rewritten = markdown.replace(
    MARKDOWN_IMAGE_RE,
    (full, alt: string, url: string, title: string | undefined) => {
      if (!mapping.has(url)) return full;
      const newUrl = mapping.get(url)!;
      return title ? `![${alt}](${newUrl} "${title}")` : `![${alt}](${newUrl})`;
    },
  );

  return { markdown: rewritten, pathnames: collectedPathnames };
}

// ---------------------------------------------------------------------------
// deletePostImages
// ---------------------------------------------------------------------------

export async function deletePostImages(
  slug: string,
  deps: ImageDeps = defaultImageDeps(),
): Promise<number> {
  const paths = await deps.list(`images/${slug}/`);
  await Promise.all(paths.map((p) => deps.del(p)));
  return paths.length;
}
